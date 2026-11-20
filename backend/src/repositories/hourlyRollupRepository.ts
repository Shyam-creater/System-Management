import { HourlyRollup, IHourlyRollup } from '../models/HourlyRollup.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryRollups: any[] = [];

export class HourlyRollupRepository {
  async insertMany(records: Partial<IHourlyRollup>[]): Promise<void> {
    for (const r of records) {
      memoryRollups.push(r);
    }
    // Cap memory rollups to 50,000
    if (memoryRollups.length > 50000) {
      memoryRollups.splice(0, memoryRollups.length - 50000);
    }

    if (isDatabaseConnected()) {
      try {
        await HourlyRollup.insertMany(records, { ordered: false });
      } catch (err: any) {
        // ignore duplicate key errors if any
      }
    }
  }

  async findByRange(
    scope: 'system' | 'lab',
    refIds: string[],
    startTimestamp: number,
    endTimestamp: number
  ): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const query: any = {
          scope,
          timestamp: { $gte: startTimestamp, $lte: endTimestamp }
        };
        if (refIds.length > 0) {
          query.refId = { $in: refIds };
        }
        const fromDb = await HourlyRollup.find(query).sort({ timestamp: 1 }).lean();
        if (fromDb && fromDb.length > 0) return fromDb;
      } catch {}
    }

    return memoryRollups.filter(r => {
      if (r.scope !== scope) return false;
      if (refIds.length > 0 && !refIds.includes(r.refId)) return false;
      return r.timestamp >= startTimestamp && r.timestamp <= endTimestamp;
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  async getAll(): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await HourlyRollup.find().limit(5000).lean();
        if (fromDb && fromDb.length > 0) return fromDb;
      } catch {}
    }
    return memoryRollups;
  }
}

export const hourlyRollupRepository = new HourlyRollupRepository();
