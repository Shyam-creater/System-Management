import mongoose, { Schema, Document } from 'mongoose';
import { isDatabaseConnected } from '../config/database.js';

export interface IUsbEvent {
  nodeId: string;
  labId?: string;
  user: string;
  serial: string;
  vendor: string;
  model: string;
  label: string;
  action: 'none' | 'alert' | 'lock';
  allowed: boolean;
  insertedAt: Date;
  removedAt?: Date;
  unlockedAt?: Date;
  unlockedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UsbEventSchema = new Schema(
  {
    nodeId: { type: String, index: true, required: true },
    labId: { type: String, index: true, default: '' },
    user: { type: String, default: '' },
    serial: { type: String, default: '' },
    vendor: { type: String, default: '' },
    model: { type: String, default: '' },
    label: { type: String, default: '' },
    action: { type: String, enum: ['none', 'alert', 'lock'], default: 'none' },
    allowed: { type: Boolean, default: false },
    insertedAt: { type: Date, default: Date.now, index: true },
    removedAt: { type: Date },
    unlockedAt: { type: Date },
    unlockedBy: { type: String }
  },
  { timestamps: true, collection: 'usb_events' }
);

UsbEventSchema.index({ insertedAt: -1 });

export const UsbEvent = mongoose.model('UsbEvent', UsbEventSchema);

// In-Memory Fallback
const memoryUsbEvents: any[] = [];

export const usbEventRepo = {
  async create(data: Partial<IUsbEvent>): Promise<any> {
    const ev = {
      _id: 'usb-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      ...data,
      insertedAt: data.insertedAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryUsbEvents.unshift(ev);
    if (memoryUsbEvents.length > 2000) memoryUsbEvents.pop();

    if (isDatabaseConnected()) {
      try {
        const doc = await UsbEvent.create(data);
        return doc.toObject();
      } catch {}
    }
    return ev;
  },

  async markRemoved(nodeId: string, serial: string): Promise<any> {
    if (isDatabaseConnected()) {
      try {
        await UsbEvent.findOneAndUpdate(
          { nodeId, serial: serial || '', removedAt: { $exists: false } },
          { removedAt: new Date() },
          { sort: { insertedAt: -1 } }
        );
      } catch {}
    }
    const found = memoryUsbEvents.find(e => e.nodeId === nodeId && (!serial || e.serial === serial) && !e.removedAt);
    if (found) {
      found.removedAt = new Date();
    }
  },

  async markUnlocked(nodeId: string, unlockedBy: string): Promise<any> {
    if (isDatabaseConnected()) {
      try {
        await UsbEvent.findOneAndUpdate(
          { nodeId, unlockedAt: { $exists: false }, action: 'lock' },
          { unlockedAt: new Date(), unlockedBy: unlockedBy || 'admin' },
          { sort: { insertedAt: -1 } }
        );
      } catch {}
    }
    const found = memoryUsbEvents.find(e => e.nodeId === nodeId && !e.unlockedAt && e.action === 'lock');
    if (found) {
      found.unlockedAt = new Date();
      found.unlockedBy = unlockedBy || 'admin';
    }
  },

  async find(query: { labId?: string; nodeId?: string; from?: string; to?: string; limit?: number }): Promise<any[]> {
    const limit = Math.min(Number(query.limit || 100), 500);

    if (isDatabaseConnected()) {
      try {
        const q: any = {};
        if (query.labId) q.labId = query.labId;
        if (query.nodeId) q.nodeId = query.nodeId;
        if (query.from || query.to) {
          q.insertedAt = {
            ...(query.from && { $gte: new Date(query.from) }),
            ...(query.to && { $lte: new Date(query.to) })
          };
        }
        return await UsbEvent.find(q).sort({ insertedAt: -1 }).limit(limit).lean();
      } catch {}
    }

    let results = [...memoryUsbEvents];
    if (query.labId) results = results.filter(e => e.labId === query.labId);
    if (query.nodeId) results = results.filter(e => e.nodeId === query.nodeId);
    if (query.from) {
      const fromTime = new Date(query.from).getTime();
      results = results.filter(e => new Date(e.insertedAt).getTime() >= fromTime);
    }
    if (query.to) {
      const toTime = new Date(query.to).getTime();
      results = results.filter(e => new Date(e.insertedAt).getTime() <= toTime);
    }
    return results.slice(0, limit);
  }
};
