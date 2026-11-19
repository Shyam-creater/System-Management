import { ProcessSnapshot, IProcessSnapshot, IProcessItem } from '../models/ProcessSnapshot.js';
import { isDatabaseConnected } from '../config/database.js';

const memorySnapshots = new Map<string, any>();

export class ProcessRepository {
  async saveSnapshot(node_id: string, processes: IProcessItem[]): Promise<any> {
    const snap = {
      node_id,
      updated_at: Date.now() / 1000,
      processes
    };
    memorySnapshots.set(node_id, snap);

    if (isDatabaseConnected()) {
      try {
        await ProcessSnapshot.findOneAndUpdate(
          { node_id },
          { $set: snap },
          { upsert: true, new: true }
        );
      } catch {}
    }
    return snap;
  }

  async getLatestSnapshot(node_id: string): Promise<any | null> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await ProcessSnapshot.findOne({ node_id }).lean();
        if (fromDb) return fromDb;
      } catch {}
    }
    return memorySnapshots.get(node_id) || null;
  }
}

export const processRepository = new ProcessRepository();
