import { PolicyModel, IPolicy } from '../models/Policy.js';
import { isDatabaseConnected } from '../config/database.js';

export interface PolicyRecord {
  _id: string;
  id: string;
  labId?: string | null;
  name: string;
  mode: 'blocklist' | 'allowlist';
  processNames: string[];
  action: 'kill' | 'alert_only';
  activeFrom?: string;
  activeTo?: string;
  days?: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const memoryPolicies = new Map<string, PolicyRecord>();

export const policyRepository = {
  async create(data: {
    labId?: string | null;
    name: string;
    mode: 'blocklist' | 'allowlist';
    processNames: string[];
    action: 'kill' | 'alert_only';
    activeFrom?: string;
    activeTo?: string;
    days?: string[];
    enabled?: boolean;
  }): Promise<PolicyRecord> {
    const id = 'pol-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    const record: PolicyRecord = {
      _id: id,
      id,
      labId: data.labId || null,
      name: data.name,
      mode: data.mode,
      processNames: data.processNames.map(p => p.trim().toLowerCase()),
      action: data.action,
      activeFrom: data.activeFrom,
      activeTo: data.activeTo,
      days: data.days || [],
      enabled: data.enabled !== undefined ? data.enabled : true,
      createdAt: now,
      updatedAt: now
    };

    memoryPolicies.set(id, record);

    if (isDatabaseConnected()) {
      try {
        const doc = await PolicyModel.create(record);
        return { ...doc.toObject(), id: doc._id.toString() } as unknown as PolicyRecord;
      } catch {}
    }

    return record;
  },

  async findById(id: string): Promise<PolicyRecord | null> {
    if (isDatabaseConnected()) {
      try {
        const doc = await PolicyModel.findById(id).lean();
        if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as PolicyRecord;
      } catch {}
    }
    return memoryPolicies.get(id) || null;
  },

  async find(filter: { labId?: string | null; enabled?: boolean } = {}): Promise<PolicyRecord[]> {
    if (isDatabaseConnected()) {
      try {
        const q: any = {};
        if (filter.labId !== undefined) q.labId = filter.labId;
        if (filter.enabled !== undefined) q.enabled = filter.enabled;
        const docs = await PolicyModel.find(q).sort({ createdAt: -1 }).lean();
        return docs.map(d => ({ ...d, id: (d as any)._id.toString() } as unknown as PolicyRecord));
      } catch {}
    }

    const list: PolicyRecord[] = [];
    for (const pol of memoryPolicies.values()) {
      if (filter.labId !== undefined && pol.labId !== filter.labId) continue;
      if (filter.enabled !== undefined && pol.enabled !== filter.enabled) continue;
      list.push(pol);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async update(id: string, updates: Partial<PolicyRecord>): Promise<PolicyRecord | null> {
    const pol = memoryPolicies.get(id);
    if (pol) {
      Object.assign(pol, updates, { updatedAt: new Date() });
      if (updates.processNames) {
        pol.processNames = updates.processNames.map(p => p.trim().toLowerCase());
      }
    }

    if (isDatabaseConnected()) {
      try {
        const doc = await PolicyModel.findByIdAndUpdate(
          id,
          { $set: { ...updates, updatedAt: new Date() } },
          { new: true }
        ).lean();
        if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as PolicyRecord;
      } catch {}
    }

    return pol || null;
  },

  async delete(id: string): Promise<boolean> {
    const deleted = memoryPolicies.delete(id);
    if (isDatabaseConnected()) {
      try {
        const res = await PolicyModel.findByIdAndDelete(id);
        return !!res || deleted;
      } catch {}
    }
    return deleted;
  }
};
