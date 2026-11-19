import { Request, Response } from 'express';
import { sshService } from '../services/sshService.js';

export class SSHController {
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const result = await sshService.testConnection(req.body);
      if (result.success) {
        res.json({
          status: 'ok',
          success: true,
          message: `Successfully connected to ${result.info?.hostname || req.body.ip}`,
          info: result.info
        });
      } else {
        res.status(400).json({
          status: 'error',
          success: false,
          error: result.error || 'Failed to connect via SSH'
        });
      }
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  }

  async connectNode(req: Request, res: Response): Promise<void> {
    try {
      const result = await sshService.registerSSHNode(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ status: 'error', error: err.message });
    }
  }

  async getNodes(req: Request, res: Response): Promise<void> {
    try {
      const nodes = await sshService.getAllSSHNodes();
      res.json({ status: 'ok', count: nodes.length, nodes });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  }

  async removeNode(req: Request, res: Response): Promise<void> {
    try {
      const nodeId = req.body?.node_id || req.query?.node_id as string;
      if (!nodeId) {
        res.status(400).json({ status: 'error', error: 'node_id is required' });
        return;
      }
      await sshService.removeSSHNode(nodeId);
      res.json({ status: 'ok', message: `Successfully removed ${nodeId}` });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  }

  async pollNode(req: Request, res: Response): Promise<void> {
    try {
      const nodeId = req.body?.node_id || req.query?.node_id as string;
      if (!nodeId) {
        res.status(400).json({ status: 'error', error: 'node_id is required' });
        return;
      }
      const result = await sshService.pollSingleNode(nodeId);
      res.json({ status: 'ok', message: `Polled node ${nodeId}`, result });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  }
}

export const sshController = new SSHController();
