import { deviceRepository } from '../repositories/deviceRepository.js';
import { processRepository } from '../repositories/processRepository.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { sshService } from './sshService.js';
import { IDevice } from '../models/Device.js';

export class DeviceService {
  async getNodesOverview() {
    const devices = await deviceRepository.findAll(true);
    const now = Date.now() / 1000;

    let onlineNodes = 0;
    let offlineNodes = 0;
    let realNodes = 0;
    let simNodes = 0;
    let warningNodes = 0;
    let criticalNodes = 0;

    const nodesMap: Record<string, any> = {};

    for (const d of devices) {
      const secondsSinceSeen = Math.round((now - d.last_seen) * 10) / 10;
      const isOnline = d.is_ssh_agentless ? (d.status === 'ONLINE') : (secondsSinceSeen <= 15.0);
      const computedStatus = isOnline ? 'ONLINE' : 'OFFLINE';

      if (isOnline) {
        onlineNodes++;
        if (d.health === 'WARNING') warningNodes++;
        else if (d.health === 'CRITICAL') criticalNodes++;
      } else {
        offlineNodes++;
      }

      if (d.is_simulated) simNodes++;
      else realNodes++;

      // Fetch latest process snapshot
      const snapshot = await processRepository.getLatestSnapshot(d.node_id);

      nodesMap[d.node_id] = {
        ...d,
        status: computedStatus,
        seconds_since_seen: secondsSinceSeen,
        processes: (snapshot?.processes && snapshot.processes.length > 0) ? snapshot.processes : (d.processes || [])
      };
    }

    return {
      nodes: nodesMap,
      summary: {
        total_nodes: realNodes + simNodes,
        online_nodes: onlineNodes,
        offline_nodes: offlineNodes,
        real_nodes: realNodes,
        sim_nodes: simNodes,
        warning_nodes: warningNodes,
        critical_nodes: criticalNodes
      }
    };
  }

  async purgeOfflineNodes() {
    return deviceRepository.purgeOffline(15);
  }

  async deleteNode(nodeId: string): Promise<boolean> {
    await deviceRepository.deleteNode(nodeId);
    try {
      await sshService.removeSSHNode(nodeId);
    } catch {}
    try {
      await processRepository.deleteSnapshot(nodeId);
    } catch {}
    try {
      await telemetryRepository.deleteHistoryForNode(nodeId);
    } catch {}
    return true;
  }

  async addNode(data: {
    hostname: string;
    ip: string;
    mac?: string;
    labId?: string;
    seat?: number;
    system_type?: string;
    cpu_model?: string;
    ram_total_gb?: number;
    disk_total_gb?: number;
    status?: 'ONLINE' | 'OFFLINE';
  }) {
    const node_id = `${data.hostname || data.ip} (${data.ip})`;
    const status = data.status || 'ONLINE';
    const created = await deviceRepository.upsert({
      node_id,
      hostname: data.hostname || data.ip,
      ip: data.ip,
      mac: data.mac || undefined,
      labId: data.labId || 'lab-cs-1',
      seat: data.seat ? Number(data.seat) : null,
      system_type: data.system_type || 'Windows 11 Pro',
      cpu_model: data.cpu_model || 'Intel Core i7-10700 @ 2.90GHz',
      ram_total_gb: Number(data.ram_total_gb) || 16,
      ram_used_gb: Math.round((Number(data.ram_total_gb) || 16) * 0.35),
      ram_percent: 35,
      disk_total_gb: Number(data.disk_total_gb) || 512,
      disk_used_gb: Math.round((Number(data.disk_total_gb) || 512) * 0.4),
      disk_percent: 40,
      cpu_percent: 5,
      gpu_percent: 0,
      gpu_name: 'Integrated Graphics',
      status: status,
      health: status === 'OFFLINE' ? 'OFFLINE' : 'HEALTHY',
      first_seen: Math.floor(Date.now() / 1000),
      last_seen: Math.floor(Date.now() / 1000),
      is_simulated: false,
      is_manual: true
    });
    return created;
  }
}

export const deviceService = new DeviceService();
