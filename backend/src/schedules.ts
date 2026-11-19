import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { scheduleRepository, ScheduleRecord } from './repositories/scheduleRepository.js';
import { commandRepository } from './repositories/commandRepository.js';
import { deviceRepository } from './repositories/deviceRepository.js';
import { labRepo } from './labs.js';
import { requireAdminAuth } from './middleware/auth.js';
import { logger } from './utils/logger.js';

export const schedulesRouter = Router();
let io: Server | null = null;
let tickerInterval: NodeJS.Timeout | null = null;

export const setSchedulesIo = (socketIo: Server) => {
  io = socketIo;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * 30-second scheduler ticker that checks due schedules and dispatches commands.
 */
export function startSchedulerTicker() {
  if (tickerInterval) return;

  logger.info('[Scheduler] Autonomous lab schedule ticker started (30s interval)');

  tickerInterval = setInterval(async () => {
    try {
      const now = new Date();
      const currentDay = DAY_NAMES[now.getDay()];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      const enabledSchedules = await scheduleRepository.find({ enabled: true });

      for (const sch of enabledSchedules) {
        // Check day match
        if (sch.days && sch.days.length > 0 && !sch.days.includes(currentDay)) {
          continue;
        }

        // Check time match
        if (sch.time !== currentTimeStr) {
          continue;
        }

        // Prevent firing twice in the same minute
        if (sch.lastRunAt) {
          const last = new Date(sch.lastRunAt);
          const isSameMinute =
            last.getFullYear() === now.getFullYear() &&
            last.getMonth() === now.getMonth() &&
            last.getDate() === now.getDate() &&
            last.getHours() === now.getHours() &&
            last.getMinutes() === now.getMinutes();

          if (isSameMinute) continue;
        }

        logger.info(`[Scheduler] ⏰ Triggering schedule '${sch.name}' (${sch.type}) for lab '${sch.labId}'`);

        // Update lastRunAt immediately to prevent race conditions
        await scheduleRepository.update(sch.id, { lastRunAt: now });

        // Dispatch commands to all online nodes in this lab
        const labNodes = await deviceRepository.findByLab(sch.labId);
        let queued = 0;
        let skipped = 0;

        for (const node of labNodes) {
          const isOnline = node.status === 'ONLINE';
          if (!isOnline) {
            await commandRepository.create({
              nodeId: node.node_id,
              labId: sch.labId,
              type: sch.type as any,
              payload: sch.payload,
              createdBy: 'scheduler',
              status: 'skipped',
              result: 'skipped (offline)'
            });
            skipped++;
          } else {
            await commandRepository.create({
              nodeId: node.node_id,
              labId: sch.labId,
              type: sch.type as any,
              payload: sch.payload,
              createdBy: 'scheduler',
              status: 'pending'
            });
            queued++;
          }
        }

        if (io) {
          io.emit('schedule:triggered', {
            scheduleId: sch.id,
            name: sch.name,
            labId: sch.labId,
            type: sch.type,
            queued,
            skipped,
            triggeredAt: now.toISOString()
          });
        }
      }
    } catch (err: any) {
      logger.error(`[Scheduler] Error in schedule ticker: ${err.message}`);
    }
  }, 30000);
}

// GET /api/schedules - List schedules (optional ?labId=)
schedulesRouter.get('/schedules', async (req: Request, res: Response) => {
  try {
    const labId = req.query.labId as string | undefined;
    const schedules = await scheduleRepository.find(labId ? { labId } : {});
    return res.json({ schedules });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/schedules - Create schedule (Admin required)
schedulesRouter.post('/schedules', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { labId, name, type, days, time, payload, enabled } = req.body;

    if (!labId || !name || !type || !time) {
      return res.status(400).json({ error: 'labId, name, type, and time are required' });
    }

    if (type !== 'shutdown' && type !== 'message' && type !== 'lock') {
      return res.status(400).json({ error: "type must be 'shutdown', 'message', or 'lock'" });
    }

    // Validate time format "HH:MM"
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: "time must be in 'HH:MM' 24-hour format" });
    }

    const lab = await labRepo.getById(labId);
    if (!lab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const schedule = await scheduleRepository.create({
      labId,
      name,
      type,
      days: Array.isArray(days) && days.length > 0 ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      time,
      payload: payload || {},
      enabled: enabled !== undefined ? enabled : true
    });

    if (io) {
      io.emit('schedule:update', { action: 'create', schedule });
    }

    return res.status(201).json({ status: 'ok', schedule });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/schedules/:id - Update schedule (Admin required)
schedulesRouter.put('/schedules/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updates = req.body;

    if (updates.time && !/^\d{2}:\d{2}$/.test(updates.time)) {
      return res.status(400).json({ error: "time must be in 'HH:MM' 24-hour format" });
    }

    const updated = await scheduleRepository.update(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (io) {
      io.emit('schedule:update', { action: 'update', schedule: updated });
    }

    return res.json({ status: 'ok', schedule: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/schedules/:id - Delete schedule (Admin required)
schedulesRouter.delete('/schedules/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const success = await scheduleRepository.delete(id);
    if (!success) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (io) {
      io.emit('schedule:update', { action: 'delete', id });
    }

    return res.json({ status: 'ok', message: 'Schedule deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
