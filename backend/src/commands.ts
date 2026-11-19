import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { commandRepository, CommandRecord } from './repositories/commandRepository.js';
import { deviceRepository } from './repositories/deviceRepository.js';
import { labRepo } from './labs.js';
import { requireAdminAuth, requireAgentToken } from './middleware/auth.js';
import { AuditLog } from './models/AuditLog.js';
import { CommandType, CommandPayload } from './models/Command.js';
import { logger } from './utils/logger.js';

export const commandsRouter = Router();
let io: Server | null = null;

export const setCommandsIo = (socketIo: Server) => {
  io = socketIo;
};

const WHITELISTED_COMMANDS: CommandType[] = [
  'shutdown',
  'restart',
  'lock',
  'logoff',
  'message',
  'cancel_shutdown'
];

function sanitizeText(raw: any): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .trim()
    .slice(0, 200);
}

// POST /api/labs/:id/commands - Admin dispatches lab-wide or node-specific remote command
commandsRouter.post('/labs/:id/commands', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const labId = String(req.params.id);
    const { type, payload = {}, nodeIds } = req.body;

    if (!type || !WHITELISTED_COMMANDS.includes(type)) {
      return res.status(400).json({
        error: `Invalid command type. Must be one of: ${WHITELISTED_COMMANDS.join(', ')}`
      });
    }

    const lab = await labRepo.getById(labId);
    if (!lab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    // Get nodes in this lab
    const allLabNodes = await deviceRepository.findByLab(labId);
    let targetNodes = allLabNodes;

    // If specific nodeIds were provided, filter down to them
    if (Array.isArray(nodeIds) && nodeIds.length > 0) {
      const nodeSet = new Set(nodeIds);
      targetNodes = allLabNodes.filter(n => nodeSet.has(n.node_id));
    }

    if (targetNodes.length === 0) {
      return res.status(400).json({ error: 'No matching nodes in this lab' });
    }

    // Sanitize payload
    const sanitizedPayload: CommandPayload = {};
    if (type === 'shutdown' || type === 'restart') {
      const delay = Number(payload.delaySec);
      sanitizedPayload.delaySec = !isNaN(delay) && delay >= 0 && delay <= 3600 ? delay : 60;
      if (payload.text) sanitizedPayload.text = sanitizeText(payload.text);
    } else if (type === 'message') {
      sanitizedPayload.text = sanitizeText(payload.text || 'ProcessShield Administrative Notice');
    }

    const createdBy = req.user?.username || 'admin';
    const createdCommands: CommandRecord[] = [];
    let skippedCount = 0;
    let queuedCount = 0;

    for (const node of targetNodes) {
      const isOnline = node.status === 'ONLINE';

      if (!isOnline) {
        // Offline machines are skipped and recorded as skipped (offline)
        const skippedCmd = await commandRepository.create({
          nodeId: node.node_id,
          labId: lab.id,
          type,
          payload: sanitizedPayload,
          createdBy,
          status: 'skipped',
          result: 'skipped (offline)'
        });
        createdCommands.push(skippedCmd);
        skippedCount++;
      } else {
        const cmd = await commandRepository.create({
          nodeId: node.node_id,
          labId: lab.id,
          type,
          payload: sanitizedPayload,
          createdBy,
          status: 'pending'
        });
        createdCommands.push(cmd);
        queuedCount++;
      }
    }

    // Record in Audit Log
    try {
      await AuditLog.create({
        timestamp: Date.now(),
        level: 'INFO',
        source: 'LabManager',
        message: `Command '${type}' dispatched by ${createdBy} for lab '${lab.name}' (${queuedCount} queued, ${skippedCount} skipped)`,
        details: JSON.stringify({ type, payload: sanitizedPayload, labId: lab.id })
      });
    } catch {
      logger.info(`[Command Audit] ${createdBy} -> ${type} on ${lab.name} (${queuedCount} queued, ${skippedCount} skipped)`);
    }

    if (io) {
      io.emit('command:created', {
        labId: lab.id,
        type,
        queuedCount,
        skippedCount,
        createdBy,
        commands: createdCommands
      });
    }

    return res.json({
      status: 'ok',
      message: `Command '${type}' dispatched: ${queuedCount} queued, ${skippedCount} skipped (offline)`,
      queuedCount,
      skippedCount,
      commands: createdCommands
    });
  } catch (error: any) {
    logger.error(`Error dispatching lab command: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/labs/:id/commands - Get command history with per-node status
commandsRouter.get('/labs/:id/commands', async (req: Request, res: Response) => {
  try {
    const labId = String(req.params.id);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const commands = await commandRepository.findByLab(labId, limit);
    return res.json({ commands, total: commands.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/commands/:nodeId - Agent polls for pending commands and marks them sent
commandsRouter.get('/agent/commands/:nodeId', requireAgentToken, async (req: Request, res: Response) => {
  try {
    const nodeId = String(req.params.nodeId);
    const pending = await commandRepository.getPendingForNode(nodeId);

    if (pending.length > 0) {
      const ids = pending.map(c => c._id);
      await commandRepository.markSent(ids);

      if (io) {
        io.emit('command:sent', { nodeId, commandIds: ids });
      }
    }

    return res.json({ commands: pending });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/agent/commands/:id/ack - Agent reports execution result (done | failed)
commandsRouter.post('/agent/commands/:id/ack', requireAgentToken, async (req: Request, res: Response) => {
  try {
    const commandId = String(req.params.id);
    const { status, result } = req.body;

    if (status !== 'done' && status !== 'failed') {
      return res.status(400).json({ error: "status must be either 'done' or 'failed'" });
    }

    const updated = await commandRepository.ack(commandId, status, result);
    if (!updated) {
      return res.status(404).json({ error: 'Command not found' });
    }

    if (io) {
      io.emit('command:ack', {
        id: updated._id,
        nodeId: updated.nodeId,
        labId: updated.labId,
        status: updated.status,
        result: updated.result,
        ackAt: updated.ackAt
      });
    }

    return res.json({ status: 'ok', command: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
