import { Device, IDevice } from '../models/Device.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryDevices = new Map<string, any>();

export class DeviceRepository {
  async findAll(includeSimulated = false): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const query: any = {
          node_id: { $not: /^lab-.*-pc\d+/i }
        };
        if (!includeSimulated) {
          query.is_simulated = { $ne: true };
        }
        const fromDb = await Device.find(query).lean();
        if (fromDb.length > 0) return fromDb;
      } catch {}
    }
    const all = Array.from(memoryDevices.values()).filter(d => !d.node_id?.match(/^lab-.*-pc\d+/i));
    return includeSimulated ? all : all.filter(d => !d.is_simulated);
  }

  async findByLab(labId: string): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        return await Device.find({
          labId,
          node_id: { $not: /^lab-.*-pc\d+/i }
        }).lean();
      } catch {}
    }
    return Array.from(memoryDevices.values()).filter(d => d.labId === labId && !d.node_id?.match(/^lab-.*-pc\d+/i));
  }

  async findUnassigned(): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        return await Device.find({ $or: [{ labId: null }, { labId: { $exists: false } }] }).lean();
      } catch {}
    }
    return Array.from(memoryDevices.values()).filter(d => !d.labId);
  }

  async findById(node_id: string): Promise<any | null> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await Device.findOne({ node_id }).lean();
        if (fromDb) return fromDb;
      } catch {}
    }
    return memoryDevices.get(node_id) || null;
  }

  async upsert(data: Partial<IDevice>): Promise<any> {
    const existing = memoryDevices.get(data.node_id!) || {};
    const finalLabId = data.labId !== undefined ? data.labId : (existing.labId || 'lab-cs-1');
    const updated = { ...existing, ...data, labId: finalLabId };
    memoryDevices.set(data.node_id!, updated);

    if (isDatabaseConnected()) {
      try {
        await Device.findOneAndUpdate(
          { node_id: data.node_id },
          { $set: { ...data, labId: finalLabId } },
          { upsert: true, new: true }
        );
      } catch {}
    }
    return updated;
  }

  async purgeDummyNodes(): Promise<number> {
    let purgedCount = 0;
    for (const [id, dev] of memoryDevices.entries()) {
      if (id.startsWith('lab-') && id.includes('-pc')) {
        memoryDevices.delete(id);
        purgedCount++;
      }
    }
    if (isDatabaseConnected()) {
      try {
        const res = await Device.deleteMany({
          node_id: { $regex: /^lab-.*-pc\d+/i }
        });
        return res.deletedCount || purgedCount;
      } catch {}
    }
    return purgedCount;
  }

  async purgeOffline(thresholdSeconds = 15): Promise<number> {
    const cutoff = (Date.now() / 1000) - thresholdSeconds;
    let purgedCount = 0;

    for (const [id, dev] of memoryDevices.entries()) {
      if (dev.is_simulated || dev.last_seen < cutoff) {
        memoryDevices.delete(id);
        purgedCount++;
      }
    }

    if (isDatabaseConnected()) {
      try {
        const res = await Device.deleteMany({
          $or: [
            { is_simulated: true },
            { last_seen: { $lt: cutoff } }
          ]
        });
        return res.deletedCount || purgedCount;
      } catch {}
    }
    return purgedCount;
  }

  async count(): Promise<number> {
    if (isDatabaseConnected()) {
      try {
        return await Device.countDocuments();
      } catch {}
    }
    return memoryDevices.size;
  }
}

export const deviceRepository = new DeviceRepository();
