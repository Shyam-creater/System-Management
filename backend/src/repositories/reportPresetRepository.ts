import { ReportPreset, IReportPreset } from '../models/ReportPreset.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryPresets = new Map<string, any>();

export class ReportPresetRepository {
  async create(data: Partial<IReportPreset>): Promise<any> {
    const id = 'preset-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const doc = {
      _id: id,
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryPresets.set(id, doc);

    if (isDatabaseConnected()) {
      try {
        const saved = await ReportPreset.create(data);
        return { ...saved.toObject(), id: saved._id.toString() };
      } catch {}
    }
    return doc;
  }

  async findForUser(userId: string, reportId?: string): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const query: any = {
          $or: [{ userId }, { isShared: true }]
        };
        if (reportId) query.reportId = reportId;
        const fromDb = await ReportPreset.find(query).sort({ createdAt: -1 }).lean();
        if (fromDb && fromDb.length > 0) {
          return fromDb.map(d => ({ ...d, id: d._id.toString() }));
        }
      } catch {}
    }

    const list: any[] = [];
    for (const p of memoryPresets.values()) {
      if (p.userId === userId || p.isShared) {
        if (!reportId || p.reportId === reportId) {
          list.push(p);
        }
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async delete(id: string, userId: string, isAdmin = false): Promise<boolean> {
    if (isDatabaseConnected()) {
      try {
        const query: any = { _id: id };
        if (!isAdmin) query.userId = userId;
        const res = await ReportPreset.deleteOne(query);
        if (res.deletedCount && res.deletedCount > 0) {
          memoryPresets.delete(id);
          return true;
        }
      } catch {}
    }

    const existing = memoryPresets.get(id);
    if (existing && (isAdmin || existing.userId === userId)) {
      memoryPresets.delete(id);
      return true;
    }
    return false;
  }
}

export const reportPresetRepository = new ReportPresetRepository();
