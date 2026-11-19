import { Telemetry, ITelemetry } from '../models/Telemetry.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryTelemetry: any[] = [];

export class TelemetryRepository {
  async create(data: Partial<ITelemetry>): Promise<any> {
    memoryTelemetry.push(data);
    if (memoryTelemetry.length > 2000) {
      memoryTelemetry.shift();
    }

    if (isDatabaseConnected()) {
      try {
        await Telemetry.create(data);
      } catch {}
    }
    return data;
  }

  async findHistory(node_id: string, startTime: number, limit = 350): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await Telemetry.find({
          node_id,
          timestamp: { $gte: startTime }
        })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();
        if (fromDb.length > 0) return fromDb;
      } catch {}
    }

    return memoryTelemetry
      .filter(t => t.node_id === node_id && t.timestamp >= startTime)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async pruneOldRecords(retentionDays = 7): Promise<number> {
    const cutoff = (Date.now() / 1000) - (retentionDays * 86400);
    if (isDatabaseConnected()) {
      try {
        const res = await Telemetry.deleteMany({ timestamp: { $lt: cutoff } });
        return res.deletedCount || 0;
      } catch {}
    }
    return 0;
  }

  async count(): Promise<number> {
    if (isDatabaseConnected()) {
      try {
        return await Telemetry.countDocuments();
      } catch {}
    }
    return memoryTelemetry.length;
  }
}

export const telemetryRepository = new TelemetryRepository();
