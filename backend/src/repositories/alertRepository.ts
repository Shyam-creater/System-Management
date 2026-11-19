import { Alert, IAlert } from '../models/Alert.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryAlerts: any[] = [];

export class AlertRepository {
  async create(data: Partial<IAlert>): Promise<any> {
    memoryAlerts.unshift(data);
    if (memoryAlerts.length > 500) {
      memoryAlerts.pop();
    }

    if (isDatabaseConnected()) {
      try {
        await Alert.create(data);
      } catch {}
    }
    return data;
  }

  async findRecent(node_id?: string, limit = 100): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const filter = node_id ? { node_id } : {};
        const fromDb = await Alert.find(filter)
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();
        if (fromDb.length > 0) return fromDb;
      } catch {}
    }

    let filtered = memoryAlerts;
    if (node_id) {
      filtered = memoryAlerts.filter(a => a.node_id === node_id);
    }
    return filtered.slice(0, limit);
  }

  async count(): Promise<number> {
    if (isDatabaseConnected()) {
      try {
        return await Alert.countDocuments();
      } catch {}
    }
    return memoryAlerts.length;
  }
}

export const alertRepository = new AlertRepository();
