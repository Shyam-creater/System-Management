import { ScheduleModel, ISchedule, ScheduleActionType } from '../models/Schedule.js';
import { isDatabaseConnected } from '../config/database.js';

export interface ScheduleRecord {
  _id: string;
  id: string;
  labId: string;
  name: string;
  type: ScheduleActionType;
  days: string[];
  time: string;
  payload?: { delaySec?: number; text?: string };
  enabled: boolean;
  lastRunAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const memorySchedules = new Map<string, ScheduleRecord>();

export const scheduleRepository = {
  async create(data: {
    labId: string;
    name: string;
    type: ScheduleActionType;
    days: string[];
    time: string;
    payload?: { delaySec?: number; text?: string };
    enabled?: boolean;
  }): Promise<ScheduleRecord> {
    const id = 'sch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    const record: ScheduleRecord = {
      _id: id,
      id,
      labId: data.labId,
      name: data.name,
      type: data.type,
      days: data.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      time: data.time,
      payload: data.payload || {},
      enabled: data.enabled !== undefined ? data.enabled : true,
      lastRunAt: null,
      createdAt: now,
      updatedAt: now
    };

    memorySchedules.set(id, record);

    if (isDatabaseConnected()) {
      try {
        const doc = await ScheduleModel.create(record);
        return { ...doc.toObject(), id: doc._id.toString() } as unknown as ScheduleRecord;
      } catch {}
    }

    return record;
  },

  async findById(id: string): Promise<ScheduleRecord | null> {
    if (isDatabaseConnected()) {
      try {
        const doc = await ScheduleModel.findById(id).lean();
        if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as ScheduleRecord;
      } catch {}
    }
    return memorySchedules.get(id) || null;
  },

  async find(filter: { labId?: string; enabled?: boolean } = {}): Promise<ScheduleRecord[]> {
    if (isDatabaseConnected()) {
      try {
        const q: any = {};
        if (filter.labId) q.labId = filter.labId;
        if (filter.enabled !== undefined) q.enabled = filter.enabled;
        const docs = await ScheduleModel.find(q).sort({ time: 1 }).lean();
        return docs.map(d => ({ ...d, id: (d as any)._id.toString() } as unknown as ScheduleRecord));
      } catch {}
    }

    const list: ScheduleRecord[] = [];
    for (const sch of memorySchedules.values()) {
      if (filter.labId && sch.labId !== filter.labId) continue;
      if (filter.enabled !== undefined && sch.enabled !== filter.enabled) continue;
      list.push(sch);
    }
    return list.sort((a, b) => a.time.localeCompare(b.time));
  },

  async update(id: string, updates: Partial<ScheduleRecord>): Promise<ScheduleRecord | null> {
    const sch = memorySchedules.get(id);
    if (sch) {
      Object.assign(sch, updates, { updatedAt: new Date() });
    }

    if (isDatabaseConnected()) {
      try {
        const doc = await ScheduleModel.findByIdAndUpdate(
          id,
          { $set: { ...updates, updatedAt: new Date() } },
          { new: true }
        ).lean();
        if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as ScheduleRecord;
      } catch {}
    }

    return sch || null;
  },

  async delete(id: string): Promise<boolean> {
    const deleted = memorySchedules.delete(id);
    if (isDatabaseConnected()) {
      try {
        const res = await ScheduleModel.findByIdAndDelete(id);
        return !!res || deleted;
      } catch {}
    }
    return deleted;
  }
};
