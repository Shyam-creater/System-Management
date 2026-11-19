import { Request, Response } from 'express';
import { telemetryService } from '../services/telemetryService.js';
import { env } from '../config/env.js';

export class TelemetryController {
  async receiveReport(req: Request, res: Response) {
    const payload = req.body;

    // Validate Auth Key
    const key = req.headers['x-processshield-key'] || payload.auth_key;
    if (key && key !== env.PROCESSSHIELD_KEY) {
      return res.status(401).json({ status: 'error', message: 'Invalid security key' });
    }

    if (!payload.hostname || !payload.ip) {
      return res.status(400).json({ status: 'error', message: 'Missing hostname or IP' });
    }

    const result = await telemetryService.processReport(payload);
    return res.json(result);
  }

  async getHistory(req: Request, res: Response) {
    const nodeId = req.query.node_id as string;
    const hours = parseInt(req.query.hours as string || '24', 10);
    const limit = parseInt(req.query.limit as string || '350', 10);

    if (!nodeId) {
      return res.status(400).json({ status: 'error', message: 'node_id is required' });
    }

    const history = await telemetryService.getHistory(nodeId, hours, limit);
    return res.json({ node_id: nodeId, history });
  }
}

export const telemetryController = new TelemetryController();
