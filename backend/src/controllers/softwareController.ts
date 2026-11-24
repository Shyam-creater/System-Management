import { Request, Response } from 'express';
import { softwareService } from '../services/softwareService.js';
import { softwareRepository } from '../repositories/softwareRepository.js';
import { sshService } from '../services/sshService.js';
import { reportService } from '../services/reportService.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';

export class SoftwareController {
  async getSoftware(req: Request, res: Response) {
    const forceRefresh = req.query.refresh === '1';
    const nodeId = req.query.node_id as string;

    if (nodeId) {
      if (!forceRefresh) {
        const cached = await softwareRepository.findByNode(nodeId);
        if (cached && cached.packages && cached.packages.length > 0) {
          return res.json({
            packages: cached.packages,
            total: cached.packages.length,
            hostname: cached.hostname,
            node_id: nodeId
          });
        }
      }

      // If SSH node, scan software via SSH
      const sshNodes = await sshService.getAllSSHNodes();
      const isSSH = sshNodes.some(n => n.node_id === nodeId);
      if (isSSH) {
        const packages = await sshService.scanSSHSoftware(nodeId);
        return res.json({
          packages,
          total: packages.length,
          node_id: nodeId
        });
      }
    }

    const packages = await softwareService.scanLocalSoftware(forceRefresh);
    return res.json({ packages, total: packages.length });
  }

  async rescanSoftware(req: Request, res: Response) {
    const nodeId = req.query.node_id as string;
    if (nodeId) {
      const sshNodes = await sshService.getAllSSHNodes();
      const isSSH = sshNodes.some(n => n.node_id === nodeId);
      if (isSSH) {
        const packages = await sshService.scanSSHSoftware(nodeId);
        return res.json({
          status: 'ok',
          message: `Software inventory for ${nodeId} rescanned successfully`,
          total: packages.length,
          packages
        });
      }
    }

    const packages = await softwareService.scanLocalSoftware(true);
    return res.json({ status: 'ok', message: 'Software inventory rescanned successfully', total: packages.length });
  }

  async exportSoftware(req: Request, res: Response) {
    const exportType = (req.query.type as string) || 'software';
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'xlsx';

    // 1. Export Daily Reports with GPU Metrics
    if (exportType === 'reports') {
      try {
        let reports = await reportService.getAllReports();
        const nodeId = req.query.node_id as string;
        if (nodeId && nodeId !== 'ALL') {
          reports = reports.filter(r => r.node_id === nodeId);
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const header = 'Report Date,Node ID,Hostname,User,Type,Avg CPU (%),Peak CPU (%),Avg GPU (%),Peak GPU (%),Avg RAM (%),Peak RAM (%),Storage (%),Uptime (%),Alerts\n';
        const rows = reports.map(r => [
          r.report_date,
          `"${r.node_id}"`,
          `"${r.hostname}"`,
          `"${r.currentUser || r.summary?.currentUser || 'No User'}"`,
          r.is_simulated ? 'SIMULATED' : 'REAL',
          (r.avg_cpu || 0).toFixed(1),
          (r.max_cpu || 0).toFixed(1),
          (r.avg_gpu || 0).toFixed(1),
          (r.max_gpu || 0).toFixed(1),
          (r.avg_ram || 0).toFixed(1),
          (r.max_ram || 0).toFixed(1),
          (r.avg_disk || 0).toFixed(1),
          (r.uptime_percent || 100).toFixed(1),
          r.alerts_count || 0
        ].join(',')).join('\n');

        const csvBuffer = Buffer.from(header + rows, 'utf-8');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Daily_Reports_${todayStr}.csv"`);
        return res.send(csvBuffer);
      } catch (err: any) {
        return res.status(500).json({ error: `Export reports failed: ${err.message}` });
      }
    }

    // 2. Export Telemetry Log
    if (exportType === 'telemetry') {
      try {
        const nodeId = req.query.node_id as string;
        const hours = parseInt(req.query.hours as string || '24', 10);
        const startTime = (Date.now() / 1000) - (hours * 3600);
        const records = await telemetryRepository.findHistory(nodeId || '', startTime, 1000);
        const todayStr = new Date().toISOString().split('T')[0];
        const header = 'Timestamp,Time,Node ID,CPU (%),RAM (%),RAM Used (GB),RAM Total (GB),Storage (%),GPU (%),GPU Name,Processes,Health\n';
        const rows = records.map(t => [
          t.timestamp,
          `"${t.time_str || ''}"`,
          `"${t.node_id}"`,
          (t.cpu_percent || 0).toFixed(1),
          (t.ram_percent || 0).toFixed(1),
          (t.ram_used_gb || 0).toFixed(1),
          (t.ram_total_gb || 0).toFixed(1),
          (t.disk_percent || 0).toFixed(1),
          (t.gpu_percent || 0).toFixed(1),
          `"${t.gpu_name || ''}"`,
          t.process_count || 0,
          `"${t.health || 'HEALTHY'}"`
        ].join(',')).join('\n');

        const csvBuffer = Buffer.from(header + rows, 'utf-8');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Telemetry_${nodeId ? nodeId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'fleet'}_${todayStr}.csv"`);
        return res.send(csvBuffer);
      } catch (err: any) {
        return res.status(500).json({ error: `Export telemetry failed: ${err.message}` });
      }
    }

    // 3. Export Software Inventory
    try {
      const result = await softwareService.exportSoftware(format);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    } catch (err: any) {
      return res.status(500).json({ error: `Export failed: ${err.message}` });
    }
  }
}

export const softwareController = new SoftwareController();
