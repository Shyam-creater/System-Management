import { Request, Response } from 'express';
import os from 'os';
import { deviceService } from '../services/deviceService.js';
import { isSimulatorRunning } from '../integrations/simulation.js';
import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';

export class NodeController {
  async getStatus(req: Request, res: Response) {
    const interfaces = os.networkInterfaces();
    const ifaceList: any[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        for (const a of addrs) {
          if (!a.internal && a.family === 'IPv4') {
            ifaceList.push({
              device: name,
              ip: a.address,
              mac: a.mac,
              status: 'active'
            });
          }
        }
      }
    }

    return res.json({
      server: "ProcessShield Automated Master Server (MERN Architecture)",
      hostname: os.hostname(),
      platform: process.platform,
      port: env.PORT,
      uptime_seconds: Math.floor(process.uptime()),
      simulator_running: isSimulatorRunning(),
      database: {
        type: 'MongoDB Atlas',
        connected: isDatabaseConnected(),
        name: 'System_Management'
      },
      interfaces: ifaceList
    });
  }

  async getNodes(req: Request, res: Response) {
    const result = await deviceService.getNodesOverview();
    return res.json(result);
  }

  async purgeOffline(req: Request, res: Response) {
    const deletedCount = await deviceService.purgeOfflineNodes();
    return res.json({ status: 'ok', purged_count: deletedCount });
  }

  async deleteNode(req: Request, res: Response) {
    const nodeId = req.params.id || req.body.node_id;
    if (!nodeId) {
      return res.status(400).json({ error: 'Node ID is required' });
    }
    await deviceService.deleteNode(String(nodeId));
    return res.json({ status: 'ok', message: `System ${nodeId} deleted successfully`, node_id: nodeId });
  }

  async addNode(req: Request, res: Response) {
    const { hostname, ip } = req.body;
    if (!ip && !hostname) {
      return res.status(400).json({ error: 'Hostname or IP address is required' });
    }
    const result = await deviceService.addNode(req.body);
    return res.json({ status: 'ok', message: 'Workstation successfully registered', node: result });
  }
}

export const nodeController = new NodeController();
