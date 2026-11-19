import { deviceRepository } from '../repositories/deviceRepository.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { processRepository } from '../repositories/processRepository.js';
import { alertRepository } from '../repositories/alertRepository.js';
import { io } from '../sockets/socketHandler.js';
import { logger } from '../utils/logger.js';

export interface TelemetryReportPayload {
  hostname: string;
  ip: string;
  mac?: string;
  interface?: string;
  system_type?: string;
  is_simulated?: boolean;
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb?: number;
  ram_total_gb?: number;
  disk_percent: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  net_sent_kb?: number;
  net_recv_kb?: number;
  process_count?: number;
  gpu_percent?: number;
  gpu_mem_used_mb?: number;
  gpu_mem_total_mb?: number;
  gpu_name?: string;
  health?: string;
  health_reasons?: string[];
  processes?: any[];
  auth_key?: string;
}

export class TelemetryService {
  async processReport(payload: TelemetryReportPayload) {
    const now = Date.now() / 1000;
    const timeStr = new Date().toTimeString().split(' ')[0];
    const nodeId = `${payload.hostname} (${payload.ip})`;

    // 1. Evaluate Health Status and Alert Thresholds
    let computedHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    const reasons: string[] = [];

    if (payload.cpu_percent >= 85.0 || payload.ram_percent >= 90.0 || payload.disk_percent >= 90.0) {
      computedHealth = 'CRITICAL';
    } else if (payload.cpu_percent >= 70.0 || payload.ram_percent >= 75.0 || payload.disk_percent >= 80.0) {
      computedHealth = 'WARNING';
    }

    if (payload.cpu_percent >= 85.0) {
      reasons.push(`Severe CPU saturation (${Math.round(payload.cpu_percent)}%)`);
    } else if (payload.cpu_percent >= 70.0) {
      reasons.push(`Elevated CPU utilization (${Math.round(payload.cpu_percent)}%)`);
    }

    if (payload.ram_percent >= 90.0) {
      reasons.push(`Critically low RAM (${Math.round(payload.ram_percent)}%)`);
    } else if (payload.ram_percent >= 75.0) {
      reasons.push(`Elevated memory consumption (${Math.round(payload.ram_percent)}%)`);
    }

    if (payload.disk_percent >= 90.0) {
      reasons.push(`Disk storage critically full (${Math.round(payload.disk_percent)}%)`);
    } else if (payload.disk_percent >= 80.0) {
      reasons.push(`Storage volume nearly full (${Math.round(payload.disk_percent)}%)`);
    }

    if (reasons.length === 0) {
      reasons.push('Operating system operating within healthy parameters');
    }

    // 2. Upsert Device Entry
    await deviceRepository.upsert({
      node_id: nodeId,
      hostname: payload.hostname,
      ip: payload.ip,
      mac: payload.mac || undefined,
      interface: payload.interface || undefined,
      system_type: payload.system_type || 'Unknown OS',
      is_simulated: Boolean(payload.is_simulated),
      last_seen: now,
      status: 'ONLINE',
      health: computedHealth,
      cpu_percent: payload.cpu_percent,
      ram_percent: payload.ram_percent,
      ram_used_gb: payload.ram_used_gb || 0,
      ram_total_gb: payload.ram_total_gb || 0,
      disk_percent: payload.disk_percent,
      disk_used_gb: payload.disk_used_gb || 0,
      disk_total_gb: payload.disk_total_gb || 0,
      gpu_percent: payload.gpu_percent || 0,
      gpu_name: payload.gpu_name || undefined,
      process_count: payload.process_count || (payload.processes ? payload.processes.length : 0)
    });

    // 3. Save Telemetry Log
    await telemetryRepository.create({
      node_id: nodeId,
      timestamp: now,
      time_str: timeStr,
      cpu_percent: payload.cpu_percent,
      ram_percent: payload.ram_percent,
      ram_used_gb: payload.ram_used_gb || 0,
      ram_total_gb: payload.ram_total_gb || 0,
      disk_percent: payload.disk_percent,
      disk_used_gb: payload.disk_used_gb || 0,
      disk_total_gb: payload.disk_total_gb || 0,
      net_sent_kb: payload.net_sent_kb || 0,
      net_recv_kb: payload.net_recv_kb || 0,
      process_count: payload.process_count || (payload.processes ? payload.processes.length : 0),
      gpu_percent: payload.gpu_percent || 0,
      gpu_mem_used_mb: payload.gpu_mem_used_mb || 0,
      gpu_mem_total_mb: payload.gpu_mem_total_mb || 0,
      gpu_name: payload.gpu_name || '',
      health: computedHealth,
      health_reasons: reasons
    });

    // 4. Save Process Snapshot if provided
    if (payload.processes && payload.processes.length > 0) {
      await processRepository.saveSnapshot(nodeId, payload.processes);
    }

    // 5. Generate Alert if in Warning or Critical state
    if (computedHealth !== 'HEALTHY') {
      for (const r of reasons) {
        if (!r.includes('healthy parameters')) {
          await alertRepository.create({
            node_id: nodeId,
            timestamp: now,
            time_str: timeStr,
            level: computedHealth,
            message: `${payload.hostname}: ${r}`
          });
        }
      }
    }

    // 6. Broadcast Real-Time Socket.IO Telemetry Event
    if (io) {
      io.emit('telemetry:update', {
        node_id: nodeId,
        hostname: payload.hostname,
        ip: payload.ip,
        is_simulated: payload.is_simulated,
        cpu_percent: payload.cpu_percent,
        ram_percent: payload.ram_percent,
        disk_percent: payload.disk_percent,
        gpu_percent: payload.gpu_percent || 0,
        gpu_name: payload.gpu_name || '',
        health: computedHealth,
        health_reasons: reasons,
        timestamp: now,
        time_str: timeStr,
        process_count: payload.process_count || (payload.processes ? payload.processes.length : 0)
      });
    }

    return { status: 'ok', health: computedHealth, recorded_at: now };
  }

  async getHistory(nodeId: string, hours = 24, limit = 350) {
    const startTime = (Date.now() / 1000) - (hours * 3600);
    return telemetryRepository.findHistory(nodeId, startTime, limit);
  }
}

export const telemetryService = new TelemetryService();
