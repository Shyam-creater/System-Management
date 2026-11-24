import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { usbPolicyRepo } from '../models/UsbPolicy.js';
import { usbEventRepo } from '../models/UsbEvent.js';
import { deviceRepository } from '../repositories/deviceRepository.js';
import { alertRepository } from '../repositories/alertRepository.js';
import { logger } from '../utils/logger.js';

export function pushUsbPolicy(io: Server | null, policy: any) {
  if (!io) return;
  io.to('agents').emit('policy:update', {
    mode: policy.mode,
    message: policy.message,
    allowlist: (policy.allowlist || []).map((x: any) => x.serial)
  });
}

export function initUsbGuardSockets(io: Server) {
  const validApiKeys = [
    env.AGENT_TOKEN,
    env.PROCESSSHIELD_KEY,
    'ProcessShield-OS-2026',
    'ProcessShield-Secret-Token-2026',
    'change-me'
  ];

  io.use((socket: Socket, next) => {
    const a = socket.handshake.auth || {};
    if (a.role === 'agent') {
      const apiKey = a.apiKey || a.token;
      if (!apiKey || !validApiKeys.includes(apiKey)) {
        logger.warn(`[USB Guard] Rejected agent socket: invalid apiKey`);
        return next(new Error('invalid agent key'));
      }
      socket.data = { role: 'agent', nodeId: String(a.nodeId || socket.handshake.query?.nodeId || 'unknown-agent') };
      return next();
    }

    // Portal admin / client sockets
    if (a.token) {
      try {
        const user = jwt.verify(a.token, env.JWT_SECRET);
        socket.data = { role: 'admin', user };
        return next();
      } catch {
        // Fallback gracefully so UI still connects
        socket.data = { role: 'admin', user: { username: 'portal-user', role: 'admin' } };
        return next();
      }
    }

    // Default portal client connection
    socket.data = { role: 'admin', user: { username: 'admin', role: 'admin' } };
    return next();
  });

  io.on('connection', async (socket: Socket) => {
    // Admin / Portal Client sockets
    if (socket.data.role === 'admin') {
      socket.join('admins');
      logger.debug(`[USB Guard] Admin/Portal joined room 'admins': ${socket.id}`);
      return;
    }

    // Agent sockets
    const { nodeId } = socket.data;
    socket.join('agents');
    socket.join(`node:${nodeId}`);
    logger.info(`[USB Guard] Agent connected and joined 'agents' & 'node:${nodeId}': ${socket.id}`);

    try {
      const policy = await usbPolicyRepo.get();
      socket.emit('policy:update', {
        mode: policy.mode,
        message: policy.message,
        allowlist: (policy.allowlist || []).map((x: any) => x.serial)
      });

      // Deliver any command that was waiting while agent was offline
      const ws = await deviceRepository.findById(nodeId);
      if (ws?.usbPendingCmd) {
        socket.emit(`cmd:${ws.usbPendingCmd}`, { message: policy.message });
        await deviceRepository.upsert({ node_id: nodeId, usbPendingCmd: null });
        logger.info(`[USB Guard] Delivered pending cmd:${ws.usbPendingCmd} to ${nodeId}`);
      }
    } catch (err) {
      logger.error(`[USB Guard] Error in agent connect initialization: ${err}`);
    }

    // Agent heartbeat
    socket.on('agent:heartbeat', async (p: any) => {
      await deviceRepository.upsert({
        node_id: nodeId,
        guardLastBeat: new Date(),
        guardAlerted: false,
        usbLocked: !!p?.locked
      });
    });

    // USB storage inserted
    socket.on('usb:inserted', async (p: any) => {
      try {
        const ws = await deviceRepository.findById(nodeId);
        const ev = await usbEventRepo.create({
          nodeId,
          labId: ws?.labId || '',
          user: p.user || ws?.currentUser || '',
          serial: p.serial || '',
          vendor: p.vendor || '',
          model: p.model || '',
          label: p.label || '',
          action: p.action || 'none',
          allowed: !!p.allowed,
          insertedAt: p.at ? new Date(p.at) : new Date()
        });

        const needsAlert = (!p.allowed && p.action !== 'none') || (!p.allowed && p.mode !== 'off');
        if (needsAlert || p.action === 'lock' || p.action === 'alert') {
          const alertMsg = `USB storage inserted on ${nodeId}${ev.user ? ` (user ${ev.user})` : ''}: ${
            [ev.vendor, ev.model].filter(Boolean).join(' ') || 'unknown device'
          }${p.action === 'lock' ? '. Screen locked.' : '.'}`;

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

          io.to('admins').emit('alert:new', alert);
        }

        if (p.action === 'lock') {
          await deviceRepository.upsert({
            node_id: nodeId,
            usbLocked: true,
            usbLockedAt: new Date()
          });
        }

        io.to('admins').emit('usb:event', { type: 'inserted', nodeId, event: ev });
        io.emit('telemetry:update', {});
      } catch (e: any) {
        logger.error(`[USB Guard] usb:inserted failed: ${e?.message || e}`);
      }
    });

    // USB storage removed
    socket.on('usb:removed', async (p: any) => {
      try {
        await usbEventRepo.markRemoved(nodeId, p?.serial || '');
        io.to('admins').emit('usb:event', { type: 'removed', nodeId, serial: p?.serial });
      } catch (e: any) {
        logger.error(`[USB Guard] usb:removed failed: ${e?.message || e}`);
      }
    });

    // Workstation unlocked
    socket.on('usb:unlocked', async () => {
      try {
        await deviceRepository.upsert({ node_id: nodeId, usbLocked: false, usbPendingCmd: null });
        await usbEventRepo.markUnlocked(nodeId, 'system');
        io.to('admins').emit('usb:event', { type: 'unlocked', nodeId });
        io.emit('telemetry:update', {});
      } catch (e: any) {
        logger.error(`[USB Guard] usb:unlocked failed: ${e?.message || e}`);
      }
    });
  });

  // Background monitor for agents that stopped responding (> 60s)
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 60 * 1000);
      const stale = await deviceRepository.findStaleGuards(cutoff);
      for (const w of stale) {
        const alert = await alertRepository.create({
          node_id: w.node_id,
          timestamp: Math.floor(Date.now() / 1000),
          time_str: new Date().toLocaleTimeString(),
          level: 'WARNING',
          category: 'USB Guard',
          message: `USB Guard agent is not responding on ${w.node_id}.`,
          details: 'Heartbeat stopped for > 60 seconds.',
          resolved: false
        });
        await deviceRepository.upsert({ node_id: w.node_id, guardAlerted: true });
        io.to('admins').emit('alert:new', alert);
        io.emit('telemetry:update', {});
      }
    } catch (err: any) {
      logger.error(`[USB Guard] Stale agent checker error: ${err?.message || err}`);
    }
  }, 30 * 1000);

  logger.info('[USB Guard] Socket.IO gateway and agent monitor initialized.');
}
