import { Request, Response } from 'express';
import { reportService } from '../services/reportService.js';

export class ReportController {
  async getReports(req: Request, res: Response) {
    const reports = await reportService.getAllReports();
    return res.json({ reports });
  }

  async generateReport(req: Request, res: Response) {
    const generated = await reportService.generateDailyReport();
    return res.json({ status: 'ok', generated_count: generated.length, reports: generated });
  }
}

export const reportController = new ReportController();
