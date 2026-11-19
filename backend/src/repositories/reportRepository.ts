import { DailyReport, IDailyReport } from '../models/DailyReport.js';
import { isDatabaseConnected } from '../config/database.js';

const memoryReports: any[] = [];

export class ReportRepository {
  async saveReport(data: Partial<IDailyReport>): Promise<any> {
    const existingIdx = memoryReports.findIndex(
      r => r.node_id === data.node_id && r.report_date === data.report_date
    );
    if (existingIdx >= 0) {
      memoryReports[existingIdx] = { ...memoryReports[existingIdx], ...data };
    } else {
      memoryReports.unshift(data);
    }

    if (isDatabaseConnected()) {
      try {
        await DailyReport.findOneAndUpdate(
          { node_id: data.node_id, report_date: data.report_date },
          { $set: data },
          { upsert: true, new: true }
        );
      } catch {}
    }
    return data;
  }

  async findAll(limit = 100): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await DailyReport.find()
          .sort({ report_date: -1, generated_at: -1 })
          .limit(limit)
          .lean();
        if (fromDb.length > 0) return fromDb;
      } catch {}
    }
    return memoryReports.slice(0, limit);
  }

  async count(): Promise<number> {
    if (isDatabaseConnected()) {
      try {
        return await DailyReport.countDocuments();
      } catch {}
    }
    return memoryReports.length;
  }
}

export const reportRepository = new ReportRepository();
