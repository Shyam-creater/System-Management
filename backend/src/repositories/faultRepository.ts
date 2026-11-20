import { FaultModel, IFault } from '../models/Fault.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryFaults: any[] = [];

export class FaultRepository {
  async insertMany(records: Partial<IFault>[]): Promise<void> {
    for (const r of records) {
      const fault = {
        _id: 'fault-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        ...r
      };
      memoryFaults.push(fault);
    }
    if (isDatabaseConnected()) {
      try {
        await FaultModel.insertMany(records);
      } catch {}
    }
  }

  async find(filter: { labId?: string; status?: string; from?: Date; to?: Date } = {}): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const query: any = {};
        if (filter.labId) query.labId = filter.labId;
        if (filter.status) query.status = filter.status;
        if (filter.from || filter.to) {
          query.reportedOn = {};
          if (filter.from) query.reportedOn.$gte = filter.from;
          if (filter.to) query.reportedOn.$lte = filter.to;
        }
        const fromDb = await FaultModel.find(query).sort({ reportedOn: -1 }).lean();
        if (fromDb && fromDb.length > 0) return fromDb;
      } catch {}
    }

    return memoryFaults.filter(f => {
      if (filter.labId && f.labId !== filter.labId) return false;
      if (filter.status && f.status !== filter.status) return false;
      if (filter.from && new Date(f.reportedOn) < filter.from) return false;
      if (filter.to && new Date(f.reportedOn) > filter.to) return false;
      return true;
    }).sort((a, b) => new Date(b.reportedOn).getTime() - new Date(a.reportedOn).getTime());
  }

  async getAll(): Promise<any[]> {
    return this.find();
  }
}

export const faultRepository = new FaultRepository();
