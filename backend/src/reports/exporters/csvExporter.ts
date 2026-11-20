import { Response } from 'express';
import { ReportConfig, QueryResult } from '../types.js';

export async function exportToCsv(
  res: Response,
  report: ReportConfig,
  result: QueryResult,
  activeColumnKeys: string[]
) {
  const columns = report.columns.filter(c => activeColumnKeys.includes(c.key));

  const dateStr = new Date().toISOString().split('T')[0];
  const safeTitle = report.title.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `ProcessShield_${safeTitle}_${dateStr}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Write UTF-8 BOM so Excel opens it with proper encoding
  res.write('\uFEFF');

  // Header row
  const headerLine = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',') + '\r\n';
  res.write(headerLine);

  // Data rows
  for (const row of result.rows) {
    const line = columns.map(col => {
      let val = row[col.key];
      if (val === undefined || val === null) return '""';
      if (val instanceof Date) {
        val = val.toISOString();
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',') + '\r\n';
    res.write(line);
  }

  // Totals row if present
  if (result.totals && Object.keys(result.totals).length > 0) {
    const totalsLine = columns.map((col, idx) => {
      if (idx === 0) return '"Total / Average"';
      const val = result.totals[col.key];
      if (val === undefined || val === null || val === '') return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',') + '\r\n';
    res.write(totalsLine);
  }

  res.end();
}
