import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { policyRepository } from './repositories/policyRepository.js';
import { violationRepository } from './repositories/violationRepository.js';
import { deviceRepository } from './repositories/deviceRepository.js';
import { alertRepository } from './repositories/alertRepository.js';
import { requireAdminAuth, requireAgentToken } from './middleware/auth.js';
import { logger } from './utils/logger.js';

export const policiesRouter = Router();
let io: Server | null = null;

export const setPoliciesIo = (socketIo: Server) => {
  io = socketIo;
};

// Protected system-critical processes that can NEVER be terminated or added to blocklists
const PROTECTED_PROCESSES = new Set([
  'system', 'svchost.exe', 'explorer.exe', 'winlogon.exe', 'csrss.exe',
  'lsass.exe', 'services.exe', 'python.exe', 'python3.exe', 'python', 'python3',
  'systemd', 'init', 'xorg', 'gnome-shell', 'sshd', 'launchd', 'windowserver'
]);

function validateProcessNames(processNames: string[]): { valid: boolean; rejected?: string } {
  for (const name of processNames) {
    const clean = name.trim().toLowerCase();
    if (PROTECTED_PROCESSES.has(clean)) {
      return { valid: false, rejected: name };
    }
  }
  return { valid: true };
}

// GET /api/policies - List policies (optional ?labId=)
policiesRouter.get('/policies', async (req: Request, res: Response) => {
  try {
    const labIdParam = req.query.labId as string | undefined;
    const filter = labIdParam !== undefined ? { labId: labIdParam === 'null' ? null : labIdParam } : {};
    const policies = await policyRepository.find(filter);
    return res.json({ policies });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/policies - Create a new policy (Admin required)
policiesRouter.post('/policies', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { labId, name, mode, processNames, action, activeFrom, activeTo, days, enabled } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Policy name is required' });
    }

    if (mode !== 'blocklist' && mode !== 'allowlist') {
      return res.status(400).json({ error: "mode must be either 'blocklist' or 'allowlist'" });
    }

    if (!Array.isArray(processNames) || processNames.length === 0) {
      return res.status(400).json({ error: 'processNames array is required' });
    }

    // Safety check: protect critical system processes
    const check = validateProcessNames(processNames);
    if (!check.valid) {
      return res.status(400).json({
        error: `Cannot apply policy to protected system process: '${check.rejected}'. This process is critical for OS stability.`
      });
    }

    const policy = await policyRepository.create({
      labId: labId || null,
      name,
      mode,
      processNames,
      action: action === 'kill' ? 'kill' : 'alert_only',
      activeFrom,
      activeTo,
      days,
      enabled: enabled !== undefined ? enabled : true
    });

    if (io) {
      io.emit('policy:update', { action: 'create', policy });
    }

    return res.status(201).json({ status: 'ok', policy });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/policies/:id - Update policy (Admin required)
policiesRouter.put('/policies/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updates = req.body;

    if (updates.processNames && Array.isArray(updates.processNames)) {
      const check = validateProcessNames(updates.processNames);
      if (!check.valid) {
        return res.status(400).json({
          error: `Cannot apply policy to protected system process: '${check.rejected}'. This process is critical for OS stability.`
        });
      }
    }

    const updated = await policyRepository.update(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    if (io) {
      io.emit('policy:update', { action: 'update', policy: updated });
    }

    return res.json({ status: 'ok', policy: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/policies/:id - Delete policy (Admin required)
policiesRouter.delete('/policies/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const success = await policyRepository.delete(id);
    if (!success) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    if (io) {
      io.emit('policy:update', { action: 'delete', id });
    }

    return res.json({ status: 'ok', message: 'Policy deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/policy/:nodeId - Effective policies for node (global + lab specific)
policiesRouter.get('/agent/policy/:nodeId', requireAgentToken, async (req: Request, res: Response) => {
  try {
    const nodeId = String(req.params.nodeId);
    const node = await deviceRepository.findById(nodeId);
    const labId = node?.labId || null;

    // Fetch enabled global policies and lab-specific policies
    const allPolicies = await policyRepository.find({ enabled: true });
    const effective = allPolicies.filter(p => !p.labId || p.labId === labId);

    return res.json({
      nodeId,
      labId,
      policies: effective
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/violations - Agent reports a policy violation
policiesRouter.post('/violations', requireAgentToken, async (req: Request, res: Response) => {
  try {
    const { nodeId, username, processName, action } = req.body;
    if (!nodeId || !username || !processName) {
      return res.status(400).json({ error: 'nodeId, username, and processName are required' });
    }

    const node = await deviceRepository.findById(nodeId);
    const labId = node?.labId || null;

    const violation = await violationRepository.create({
      nodeId,
      labId,
      username,
      processName,
      action: action === 'killed' ? 'killed' : 'alerted'
    });

    // Create a WARNING alert in the existing Alerts feed
    try {
      await alertRepository.create({
        node_id: nodeId,
        timestamp: Date.now(),
        time_str: new Date().toLocaleTimeString(),
        level: 'WARNING',
        category: 'Policy',
        message: `Policy violation: '${username}' executed restricted process '${processName}' (Action: ${violation.action})`,
        resolved: false
      });
    } catch (alertErr: any) {
      logger.warn(`Failed to create alert for policy violation: ${alertErr.message}`);
    }

    if (io) {
      io.emit('violation:created', violation);
      io.emit('alert:update', {
        type: 'POLICY_VIOLATION',
        nodeId,
        username,
        processName,
        action: violation.action
      });
    }

    return res.status(201).json({ status: 'ok', violation });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/violations - List violation log
policiesRouter.get('/violations', async (req: Request, res: Response) => {
  try {
    const labId = req.query.labId as string | undefined;
    const username = req.query.username as string | undefined;
    const nodeId = req.query.nodeId as string | undefined;
    const limit = parseInt(req.query.limit as string || '100', 10);

    const violations = await violationRepository.find({ labId, username, nodeId, limit });
    return res.json({ violations, total: violations.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
