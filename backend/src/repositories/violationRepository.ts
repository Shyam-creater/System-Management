import { ViolationModel, IViolation } from '../models/Violation.js';
import { isDatabaseConnected } from '../config/database.js';

export interface ViolationRecord {
  _id: string;
  id: string;
  nodeId: string;
  labId?: string | null;
  username: string;
  processName: string;
  action: 'killed' | 'alerted';
  createdAt: Date;
}

const memoryViolations: ViolationRecord[] = [];

export const violationRepository = {
  async create(data: {
    nodeId: string;
    labId?: string | null;
    username: string;
    processName: string;
    action: 'killed' | 'alerted';
  }): Promise<ViolationRecord> {
    const id = 'viol-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const record: ViolationRecord = {
      _id: id,
      id,
      nodeId: data.nodeId,
      labId: data.labId || null,
      username: data.username,
      processName: data.processName,
      action: data.action,
      createdAt: new Date()
    };

    memoryViolations.unshift(record);
    if (memoryViolations.length > 5000) memoryViolations.pop();

    if (isDatabaseConnected()) {
      try {
        const doc = await ViolationModel.create(record);
        return { ...doc.toObject(), id: doc._id.toString() } as unknown as ViolationRecord;
      } catch {}
    }

    return record;
  },

  async find(filter: {
    labId?: string;
    username?: string;
    nodeId?: string;
    limit?: number;
  } = {}): Promise<ViolationRecord[]> {
    const limit = filter.limit || 100;

    if (isDatabaseConnected()) {
      try {
        const q: any = {};
        if (filter.labId) q.labId = filter.labId;
        if (filter.username) q.username = filter.username;
        if (filter.nodeId) q.nodeId = filter.nodeId;
        const docs = await ViolationModel.find(q)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        return docs.map(d => ({ ...d, id: (d as any)._id.toString() } as unknown as ViolationRecord));
      } catch {}
    }

    return memoryViolations
      .filter(v => {
        if (filter.labId && v.labId !== filter.labId) return false;
        if (filter.username && !v.username.toLowerCase().includes(filter.username.toLowerCase())) return false;
        if (filter.nodeId && v.nodeId !== filter.nodeId) return false;
        return true;
      })
      .slice(0, limit);
  },

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const initialLen = memoryViolations.length;
    for (let i = memoryViolations.length - 1; i >= 0; i--) {
      if (new Date(memoryViolations[i].createdAt) < cutoff) {
        memoryViolations.splice(i, 1);
      }
    }
    const deletedMem = initialLen - memoryViolations.length;

    if (isDatabaseConnected()) {
      try {
        const res = await ViolationModel.deleteMany({ createdAt: { $lt: cutoff } });
        return res.deletedCount || deletedMem;
      } catch {}
    }
    return deletedMem;
  }
};
