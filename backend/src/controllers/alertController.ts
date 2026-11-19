import { Request, Response } from 'express';
import { alertRepository } from '../repositories/alertRepository.js';

export class AlertController {
  async getAlerts(req: Request, res: Response) {
    const nodeId = req.query.node_id as string;
    const limit = parseInt(req.query.limit as string || '100', 10);

    const alerts = await alertRepository.findRecent(nodeId, limit);
    return res.json({ alerts, total: alerts.length });
  }
}

export const alertController = new AlertController();
