import { SoftwareInventory, ISoftwareInventory, ISoftwarePackage } from '../models/SoftwareInventory.js';
import { isDatabaseConnected } from '../config/database.js';

const memorySoftware = new Map<string, any>();

export class SoftwareRepository {
  async save(node_id: string, hostname: string, packages: ISoftwarePackage[]): Promise<any> {
    const entry = {
      node_id,
      hostname,
      packages,
      total_count: packages.length,
      updated_at: Date.now() / 1000
    };
    memorySoftware.set(node_id, entry);

    if (isDatabaseConnected()) {
      try {
        await SoftwareInventory.findOneAndUpdate(
          { node_id },
          { $set: entry },
          { upsert: true, new: true }
        );
      } catch {}
    }
    return entry;
  }

  async findByNode(node_id: string): Promise<any | null> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await SoftwareInventory.findOne({ node_id }).lean();
        if (fromDb) return fromDb;
      } catch {}
    }
    return memorySoftware.get(node_id) || null;
  }

  async findAll(): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await SoftwareInventory.find().lean();
        if (fromDb && fromDb.length > 0) return fromDb;
      } catch {}
    }
    return Array.from(memorySoftware.values());
  }
}

export const softwareRepository = new SoftwareRepository();
