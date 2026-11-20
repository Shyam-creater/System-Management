import { ExportAuditModel, IExportAudit } from '../models/ExportAudit.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryAudits: any[] = [];

export class ExportAuditRepository {
  async log(audit: Partial<IExportAudit>): Promise<any> {
    const doc = {
      _id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      ...audit,
      createdAt: new Date()
    };
    memoryAudits.push(doc);
    if (memoryAudits.length > 5000) memoryAudits.shift();

    if (isDatabaseConnected()) {
      try {
        await ExportAuditModel.create(audit);
      } catch {}
    }
    return doc;
  }

  async findRecent(limit = 100): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await ExportAuditModel.find().sort({ createdAt: -1 }).limit(limit).lean();
        if (fromDb && fromDb.length > 0) return fromDb;
      } catch {}
    }
    return memoryAudits.slice(-limit).reverse();
  }
}

export const exportAuditRepository = new ExportAuditRepository();
