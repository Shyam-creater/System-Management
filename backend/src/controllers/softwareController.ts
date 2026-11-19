import { Request, Response } from 'express';
import { softwareService } from '../services/softwareService.js';
import { softwareRepository } from '../repositories/softwareRepository.js';
import { sshService } from '../services/sshService.js';

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
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'xlsx';
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
