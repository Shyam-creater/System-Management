import { deviceRepository } from '../repositories/deviceRepository.js';
import { processRepository } from '../repositories/processRepository.js';
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
}

export const deviceService = new DeviceService();
