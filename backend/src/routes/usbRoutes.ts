import { Router, Request, Response } from 'express';
import { usbPolicyRepo } from '../models/UsbPolicy.js';
import { usbEventRepo } from '../models/UsbEvent.js';
import { deviceRepository } from '../repositories/deviceRepository.js';
import { alertRepository } from '../repositories/alertRepository.js';
import { AuditLog } from '../models/AuditLog.js';
import { io } from '../sockets/socketHandler.js';
import { pushUsbPolicy } from '../sockets/usbGuard.js';
import { optionalAdminAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const usbRouter = Router();

// Apply optionalAdminAuth so req.user is populated if token is present
usbRouter.use(optionalAdminAuth);

// GET /api/usb/policy - Get current policy and allow-list
usbRouter.get('/policy', async (req: Request, res: Response) => {
  try {
    const policy = await usbPolicyRepo.get();
    return res.json(policy);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to get USB policy' });
  }
});

// PUT /api/usb/policy - Update mode or message
usbRouter.put('/policy', async (req: Request, res: Response) => {
  try {
    const { mode, message } = req.body;
    const patch: any = {};
    if (mode && ['off', 'alert', 'alert_lock'].includes(mode)) {
      patch.mode = mode;
    }
    if (typeof message === 'string') {
      patch.message = message.slice(0, 300);
    }

    const policy = await usbPolicyRepo.update(patch);
    pushUsbPolicy(io, policy);

    // Audit log
    try {
      await AuditLog.create({
        timestamp: Math.floor(Date.now() / 1000),
        level: 'INFO',
        source: 'USB Guard',
        message: `${req.user?.username || 'Admin'} updated USB Guard policy to mode: ${policy.mode}`,
        details: JSON.stringify(patch)
      });
    } catch {}

    return res.json(policy);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update USB policy' });
  }
});

// POST /api/usb/allowlist - Add allowed device
usbRouter.post('/allowlist', async (req: Request, res: Response) => {
  try {
    const { serial, owner, note } = req.body;
    if (!serial || typeof serial !== 'string' || !serial.trim()) {
      return res.status(400).json({ error: 'serial is required' });
    }

    const policy = await usbPolicyRepo.addAllowItem({
      serial: serial.trim(),
      owner: owner?.trim() || '',
      note: note?.trim() || ''
    });

    pushUsbPolicy(io, policy);

    try {
      await AuditLog.create({
        timestamp: Math.floor(Date.now() / 1000),
        level: 'INFO',
        source: 'USB Guard',
        message: `${req.user?.username || 'Admin'} added USB device serial ${serial.trim()} to allow-list`,
        details: JSON.stringify({ owner, note })
      });
    } catch {}

    return res.json(policy);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to add allow-list item' });
  }
});

// DELETE /api/usb/allowlist/:serial - Remove device from allow-list
usbRouter.delete('/allowlist/:serial', async (req: Request, res: Response) => {
  try {
    const serial = String(req.params.serial);
    const policy = await usbPolicyRepo.removeAllowItem(serial);
    pushUsbPolicy(io, policy);

    try {
      await AuditLog.create({
        timestamp: Math.floor(Date.now() / 1000),
        level: 'INFO',
        source: 'USB Guard',
        message: `${req.user?.username || 'Admin'} removed USB device serial ${serial} from allow-list`
      });
    } catch {}

    return res.json(policy);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to remove allow-list item' });
  }
});

// POST /api/usb/workstations/:nodeId/unlock - Remote unlock workstation screen
usbRouter.post('/workstations/:nodeId/unlock', async (req: Request, res: Response) => {
  try {
    const nodeId = String(req.params.nodeId);
    let online = false;

    if (io) {
      const roomSockets = await io.in(`node:${nodeId}`).fetchSockets();
      online = roomSockets.length > 0;
      if (online) {
        io.to(`node:${nodeId}`).emit('cmd:unlock');
        logger.info(`[USB Guard] Dispatched cmd:unlock to online agent ${nodeId}`);
      } else {
        await deviceRepository.upsert({ node_id: nodeId, usbPendingCmd: 'unlock', usbLocked: false });
        logger.info(`[USB Guard] Agent offline: queued pending cmd:unlock for ${nodeId}`);
      }
    }

    await deviceRepository.upsert({ node_id: nodeId, usbLocked: false });
    const unlockedBy = req.user?.username || 'admin';
    await usbEventRepo.markUnlocked(nodeId, unlockedBy);

    if (io) {
      io.to('admins').emit('usb:event', { type: 'unlocked', nodeId });
      io.emit('telemetry:update', {});
    }

    try {
      await AuditLog.create({
        timestamp: Math.floor(Date.now() / 1000),
        level: 'INFO',
        source: 'USB Guard',
        message: `${unlockedBy} remotely unlocked screen for workstation ${nodeId}`,
        details: JSON.stringify({ nodeId, delivered: online })
      });
    } catch {}

    return res.json({ ok: true, delivered: online });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to unlock workstation' });
  }
});

// POST /api/usb/workstations/:nodeId/lock - Remote blank/lock workstation screen
usbRouter.post('/workstations/:nodeId/lock', async (req: Request, res: Response) => {
  try {
    const nodeId = String(req.params.nodeId);
    const policy = await usbPolicyRepo.get();

    if (io) {
      io.to(`node:${nodeId}`).emit('cmd:lock', { message: policy.message });
      io.to('admins').emit('usb:event', { type: 'locked', nodeId });
      io.emit('telemetry:update', {});
    }

    await deviceRepository.upsert({
      node_id: nodeId,
      usbLocked: true,
      usbLockedAt: new Date()
    });

    try {
      await AuditLog.create({
        timestamp: Math.floor(Date.now() / 1000),
        level: 'WARNING',
        source: 'USB Guard',
        message: `${req.user?.username || 'Admin'} manually blanked/locked screen for workstation ${nodeId}`
      });
    } catch {}

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to lock workstation' });
  }
});

// GET /api/usb/events - USB history / audit report
usbRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const { labId, nodeId, from, to, limit } = req.query;
    const events = await usbEventRepo.find({
      labId: labId ? String(labId) : undefined,
      nodeId: nodeId ? String(nodeId) : undefined,
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
      limit: limit ? Number(limit) : 100
    });
    return res.json(events);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to get USB events' });
  }
});

// POST /api/usb/events - Fallback HTTP endpoint for agent reporting
usbRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const { nodeId, serial, vendor, model, label, action, allowed, user, at } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'nodeId required' });

    const ws = await deviceRepository.findById(nodeId);
    const ev = await usbEventRepo.create({
      nodeId,
      labId: ws?.labId || '',
      user: user || ws?.currentUser || '',
      serial: serial || '',
      vendor: vendor || '',
      model: model || '',
      label: label || '',
      action: action || 'none',
      allowed: !!allowed,
      insertedAt: at ? new Date(at) : new Date()
    });

    if (action === 'lock' || action === 'alert') {
      const alertMsg = `USB storage inserted on ${nodeId}${ev.user ? ` (user ${ev.user})` : ''}: ${
        [ev.vendor, ev.model].filter(Boolean).join(' ') || 'unknown device'
      }${action === 'lock' ? '. Screen locked.' : '.'}`;

      const alert = await alertRepository.create({
        node_id: nodeId,
        timestamp: Math.floor(Date.now() / 1000),
        time_str: new Date().toLocaleTimeString(),
        level: 'CRITICAL',
        category: 'USB Guard',
        message: alertMsg,
        details: JSON.stringify({ serial: ev.serial, action: ev.action, label: ev.label }),
        resolved: false
      });

      if (io) {
        io.to('admins').emit('alert:new', alert);
      }
    }

    if (action === 'lock') {
      await deviceRepository.upsert({
        node_id: nodeId,
        usbLocked: true,
        usbLockedAt: new Date()
      });
    }

    if (io) {
      io.to('admins').emit('usb:event', { type: 'inserted', nodeId, event: ev });
      io.emit('telemetry:update', {});
    }

    return res.json({ ok: true, event: ev });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
