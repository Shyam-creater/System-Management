import { reportRepository } from '../repositories/reportRepository.js';
import { deviceRepository } from '../repositories/deviceRepository.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { alertRepository } from '../repositories/alertRepository.js';

export class ReportService {
  async getAllReports() {
    return reportRepository.findAll();
  }

  async generateDailyReport() {
    const todayStr = new Date().toISOString().split('T')[0];
    const devices = await deviceRepository.findAll();
    const generatedReports: any[] = [];

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000;

    for (const d of devices) {
      const records = await telemetryRepository.findHistory(d.node_id, startOfDay, 1000);
      if (records.length === 0) {
        // Fallback to current device live metrics if no telemetry history stored today
        const curCpu = Math.round((d.cpu_percent || 0) * 10) / 10;
        const curRam = Math.round((d.ram_percent || 0) * 10) / 10;
        const curDisk = Math.round((d.disk_percent || 0) * 10) / 10;
        const curGpu = Math.round((d.gpu_percent || 0) * 10) / 10;
        const alerts = await alertRepository.findRecent(d.node_id, 50);

        const report = await reportRepository.saveReport({
          node_id: d.node_id,
          report_date: todayStr,
          hostname: d.hostname,
          is_simulated: d.is_simulated,
          avg_cpu: curCpu,
          max_cpu: curCpu,
          avg_ram: curRam,
          max_ram: curRam,
          avg_disk: curDisk,
          max_disk: curDisk,
          avg_gpu: curGpu,
          max_gpu: curGpu,
          uptime_percent: 100,
          samples_count: 1,
          alerts_count: alerts.length,
          generated_at: Date.now() / 1000,
          summary: {
            hostname: d.hostname,
            ip: d.ip,
            system_type: d.system_type,
            recent_alerts: alerts.map(a => a.message)
          }
        });
        generatedReports.push(report);
        continue;
      }

      let totalCpu = 0;
      let maxCpu = 0;
      let totalRam = 0;
      let maxRam = 0;
      let totalDisk = 0;
      let maxDisk = 0;
      let totalGpu = 0;
      let maxGpu = 0;

      for (const r of records) {
        totalCpu += r.cpu_percent || 0;
        maxCpu = Math.max(maxCpu, r.cpu_percent || 0);
        totalRam += r.ram_percent || 0;
        maxRam = Math.max(maxRam, r.ram_percent || 0);
        totalDisk += r.disk_percent || 0;
        maxDisk = Math.max(maxDisk, r.disk_percent || 0);
        totalGpu += r.gpu_percent || 0;
        maxGpu = Math.max(maxGpu, r.gpu_percent || 0);
      }

      const count = records.length;
      const avgCpu = Math.round((totalCpu / count) * 10) / 10;
      const avgRam = Math.round((totalRam / count) * 10) / 10;
      const avgDisk = Math.round((totalDisk / count) * 10) / 10;
      const avgGpu = Math.round((totalGpu / count) * 10) / 10;

      const alerts = await alertRepository.findRecent(d.node_id, 50);

      const report = await reportRepository.saveReport({
        node_id: d.node_id,
        report_date: todayStr,
        hostname: d.hostname,
        is_simulated: d.is_simulated,
        avg_cpu: avgCpu,
        max_cpu: Math.round(maxCpu * 10) / 10,
        avg_ram: avgRam,
        max_ram: Math.round(maxRam * 10) / 10,
        avg_disk: avgDisk,
        max_disk: Math.round(maxDisk * 10) / 10,
        avg_gpu: avgGpu,
        max_gpu: Math.round(maxGpu * 10) / 10,
        uptime_percent: 100,
        samples_count: count,
        alerts_count: alerts.length,
        generated_at: Date.now() / 1000,
        summary: {
          hostname: d.hostname,
          ip: d.ip,
          system_type: d.system_type,
          recent_alerts: alerts.map(a => a.message)
        }
      });

      generatedReports.push(report);
    }

    return generatedReports;
  }
}

export const reportService = new ReportService();
