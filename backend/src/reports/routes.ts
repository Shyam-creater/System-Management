import { Router, Request, Response } from 'express';
import { reportRegistry } from './registry.js';
import { UserScope } from './types.js';
import { exportToExcel } from './exporters/excelExporter.js';
import { exportToPdf } from './exporters/pdfExporter.js';
import { exportToCsv } from './exporters/csvExporter.js';
import { exportAuditRepository } from '../repositories/exportAuditRepository.js';
import { reportPresetRepository } from '../repositories/reportPresetRepository.js';
import { logger } from '../utils/logger.js';

export const reportsRouter = Router();

// Scope helper
function extractScope(req: any): UserScope {
  if (req.user) {
    return {
      userId: req.user.id || req.user.username || 'admin',
      username: req.user.username || 'admin',
      role: req.user.role || 'admin',
      assignedLabIds: req.user.assignedLabIds || []
    };
  }
  return {
    userId: 'admin',
    username: 'admin',
    role: 'admin',
    assignedLabIds: []
  };
}

// 1. GET /api/reports/catalog
reportsRouter.get('/catalog', (req: Request, res: Response) => {
  try {
    const scope = extractScope(req);
    const catalog = reportRegistry.getCatalog(scope);
    return res.json({ catalog });
  } catch (err: any) {
    logger.error('Error fetching report catalog:', err);
    return res.status(500).json({ error: 'Failed to retrieve report catalog' });
  }
});

// 2. POST /api/reports/:id/run
reportsRouter.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const scope = extractScope(req);
    const reportId = String(req.params.id);
    const { filters, sort, columns, page, pageSize } = req.body;

    const result = await reportRegistry.runReport(
      reportId,
      { filters, sort, columns, page, pageSize },
      scope
    );

    return res.json(result);
  } catch (err: any) {
    logger.warn(`Report run failed for "${req.params.id}": ${err.message}`);
    return res.status(400).json({ error: err.message || 'Report execution failed' });
  }
});

// 3. POST /api/reports/:id/export?format=xlsx|pdf|csv
reportsRouter.post('/:id/export', async (req: Request, res: Response) => {
  try {
    const scope = extractScope(req);
    const reportId = String(req.params.id);
    const format = (String(req.query.format || 'xlsx')).toLowerCase();
    const { filters, sort, columns } = req.body;

    const report = reportRegistry.getReport(reportId);
    if (!report) {
      return res.status(404).json({ error: `Report "${reportId}" not found` });
    }

    // Role check for viewers on restricted reports
    if (scope.role === 'viewer' && report.id === 'L9') {
      return res.status(403).json({ error: 'Unauthorized: Viewers cannot export command history' });
    }

    // Run query across full filtered set (pageSize 100000)
    const result = await reportRegistry.runReport(
      reportId,
      { filters, sort, columns, page: 1, pageSize: 100000 },
      scope
    );

    const activeColumnKeys = columns && columns.length > 0
      ? columns
      : report.columns.filter(c => c.defaultVisible).map(c => c.key);

    // Audit log entry
    await exportAuditRepository.log({
      userId: scope.userId,
      username: scope.username,
      reportId: report.id,
      reportTitle: report.title,
      filters: filters || {},
      format: format as any,
      rowCount: result.rows.length
    });

    if (format === 'xlsx') {
      await exportToExcel(res, report, result, activeColumnKeys, filters || {}, scope);
    } else if (format === 'pdf') {
      await exportToPdf(res, report, result, activeColumnKeys, filters || {}, scope);
    } else if (format === 'csv') {
      await exportToCsv(res, report, result, activeColumnKeys);
    } else {
      return res.status(400).json({ error: 'Unsupported format. Supported: xlsx, pdf, csv' });
    }
  } catch (err: any) {
    logger.error('Export failed:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Export failed' });
    }
  }
});

// 4. GET /api/reports/presets
reportsRouter.get('/presets', async (req: Request, res: Response) => {
  try {
    const scope = extractScope(req);
    const reportId = req.query.reportId ? String(req.query.reportId) : undefined;
    const presets = await reportPresetRepository.findForUser(scope.userId, reportId);
    return res.json({ presets });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load presets' });
  }
});

// 5. POST /api/reports/presets
reportsRouter.post('/presets', async (req: Request, res: Response) => {
  try {
    const scope = extractScope(req);
    const { name, reportId, isShared, filters, sort, columns } = req.body;
    if (!name || !reportId) {
      return res.status(400).json({ error: 'Preset name and reportId are required' });
    }

    const preset = await reportPresetRepository.create({
      name: name.trim(),
      reportId: reportId.toUpperCase(),
      userId: scope.userId,
      isShared: Boolean(isShared && scope.role === 'admin'),
      filters: filters || {},
      sort: sort || [],
      columns: columns || []
    });

    return res.status(201).json({ preset });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save preset' });
  }
});

// 6. DELETE /api/reports/presets/:id
reportsRouter.delete('/presets/:id', async (req: Request, res: Response) => {
  try {
    const scope = extractScope(req);
    const presetId = String(req.params.id);
    const success = await reportPresetRepository.delete(presetId, scope.userId, scope.role === 'admin');
    if (!success) {
      return res.status(404).json({ error: 'Preset not found or not authorized to delete' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete preset' });
  }
});
