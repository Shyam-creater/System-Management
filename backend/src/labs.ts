import { Router, Request, Response } from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import { isDatabaseConnected } from './config/database.js';
import { deviceRepository } from './repositories/deviceRepository.js';
import { processRepository } from './repositories/processRepository.js';
import { io } from './sockets/socketHandler.js';
import { logger } from './utils/logger.js';

// ==========================================
// 1. DATA MODELS & IN-MEMORY DUAL-MODE STORE
// ==========================================

export interface ILab extends Document {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  prefix?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISession extends Document {
  id: string;
  nodeId: string;
  labId?: string | null;
  username: string;
  loginAt: Date;
  logoutAt?: Date | null;
  duration?: number; // duration in minutes
  closedBy?: 'user' | 'agent-offline' | 'admin' | 'timeout';
  active: boolean;
  createdAt: Date;
}

const LabSchema = new Schema<ILab>(
  {
    name: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    capacity: { type: Number, default: 30 },
    prefix: { type: String, default: '' }
  },
  { timestamps: true, collection: 'labs' }
);

const SessionSchema = new Schema<ISession>(
  {
    nodeId: { type: String, required: true, index: true },
    labId: { type: String, default: null, index: true },
    username: { type: String, required: true, index: true },
    loginAt: { type: Date, required: true, default: Date.now },
    logoutAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    closedBy: { type: String, enum: ['user', 'agent-offline', 'admin', 'timeout'], default: 'user' },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true, collection: 'sessions' }
);

export const LabModel = mongoose.model<ILab>('Lab', LabSchema);
export const SessionModel = mongoose.model<ISession>('Session', SessionSchema);

// In-Memory Fallback Stores
const memoryLabs = new Map<string, any>();
const memorySessions = new Map<string, any>();

// Seed default labs if store is empty
function seedDefaultLabs() {
  if (memoryLabs.size === 0) {
    const lab1 = {
      _id: 'lab-cs-1',
      id: 'lab-cs-1',
      name: 'Computer Science Lab 1',
      description: 'Systems Programming & OS Workstations',
      capacity: 30,
      prefix: 'Ubuntu',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const lab2 = {
      _id: 'lab-ai-2',
      id: 'lab-ai-2',
      name: 'AI & Data Science Lab 2',
      description: 'High-Performance GPU & Simulation Desktops',
      capacity: 25,
      prefix: 'Windows',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryLabs.set(lab1.id, lab1);
    memoryLabs.set(lab2.id, lab2);
  }
}
seedDefaultLabs();

// ==========================================
// AUTO-ASSIGNMENT HELPER
// ==========================================
export async function autoAssignUnassignedNodes(): Promise<number> {
  try {
    const allNodes = await deviceRepository.findAll(true);
    const labs = await labRepo.getAll();
    if (labs.length === 0 || allNodes.length === 0) return 0;

    let assigned = 0;
    const defaultLab = labs[0];

    for (const node of allNodes) {
      if (!node.labId) {
        let matchedLab = labs.find(l => {
          if (!l.prefix) return false;
          const p = l.prefix.toLowerCase().trim();
          return (
            (node.hostname && node.hostname.toLowerCase().includes(p)) ||
            (node.system_type && node.system_type.toLowerCase().includes(p))
          );
        });

        const targetLab = matchedLab || defaultLab;
        await deviceRepository.upsert({ node_id: node.node_id, labId: targetLab.id });
        node.labId = targetLab.id;
        assigned++;
      }
    }
    return assigned;
  } catch {
    return 0;
  }
}

// ==========================================
// 2. LAB REPOSITORY FUNCTIONS
// ==========================================

export const labRepo = {
  async getAll(): Promise<any[]> {
    if (isDatabaseConnected()) {
      try {
        const fromDb = await LabModel.find().lean();
        if (fromDb.length > 0) {
          return fromDb.map(l => ({ ...l, id: l._id.toString() }));
        }
      } catch {}
    }
    return Array.from(memoryLabs.values());
  },

  async getById(id: string): Promise<any | null> {
    if (isDatabaseConnected()) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const fromDb = await LabModel.findById(id).lean();
          if (fromDb) return { ...fromDb, id: fromDb._id.toString() };
        }
      } catch {}
    }
    return memoryLabs.get(id) || null;
  },

  async create(data: { name: string; description?: string; capacity?: number; prefix?: string }): Promise<any> {
    const id = 'lab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newLab = {
      _id: id,
      id,
      name: data.name,
      description: data.description || '',
      capacity: data.capacity || 30,
      prefix: data.prefix || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryLabs.set(id, newLab);

    if (isDatabaseConnected()) {
      try {
        const doc = await LabModel.create({
          name: data.name,
          description: data.description,
          capacity: data.capacity,
          prefix: data.prefix
        });
        return { ...doc.toObject(), id: doc._id.toString() };
      } catch (err: any) {
        if (err.code === 11000) {
          throw new Error('Lab name must be unique');
        }
      }
    }
    return newLab;
  },

  async update(id: string, data: Partial<ILab>): Promise<any | null> {
    const existing = await labRepo.getById(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, updatedAt: new Date() };
    memoryLabs.set(id, updated);

    if (isDatabaseConnected()) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          await LabModel.findByIdAndUpdate(id, { $set: data }, { new: true });
        }
      } catch {}
    }
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    memoryLabs.delete(id);

    // Unassign all machines from this lab
    const nodes = await deviceRepository.findAll(true);
    for (const node of nodes) {
      if (node.labId === id) {
        await deviceRepository.upsert({ node_id: node.node_id, labId: null });
      }
    }

    if (isDatabaseConnected()) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          await LabModel.findByIdAndDelete(id);
        }
      } catch {}
    }
    return true;
  }
};

// ==========================================
// 3. SESSION REPOSITORY FUNCTIONS
// ==========================================

export const sessionRepo = {
  async getActive(nodeId: string, username?: string): Promise<any | null> {
    if (isDatabaseConnected()) {
      try {
        const query: any = { nodeId, active: true };
        if (username) query.username = username;
        const fromDb = await SessionModel.findOne(query).sort({ loginAt: -1 }).lean();
        if (fromDb) return { ...fromDb, id: fromDb._id.toString() };
      } catch {}
    }
    for (const s of memorySessions.values()) {
      if (s.nodeId === nodeId && s.active) {
        if (!username || s.username === username) return s;
      }
    }
    return null;
  },

  async create(data: { nodeId: string; labId?: string | null; username: string; loginAt?: Date }): Promise<any> {
    const id = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const newSession = {
      _id: id,
      id,
      nodeId: data.nodeId,
      labId: data.labId || null,
      username: data.username,
      loginAt: data.loginAt || new Date(),
      logoutAt: null,
      duration: 0,
      closedBy: 'user',
      active: true,
      createdAt: new Date()
    };
    memorySessions.set(id, newSession);

    if (isDatabaseConnected()) {
      try {
        const doc = await SessionModel.create(newSession);
        return { ...doc.toObject(), id: doc._id.toString() };
      } catch {}
    }
    return newSession;
  },

  async close(sessionId: string, logoutAt: Date, closedBy: 'user' | 'agent-offline' | 'admin' | 'timeout'): Promise<any> {
    const session = memorySessions.get(sessionId);
    if (session) {
      session.active = false;
      session.logoutAt = logoutAt;
      session.closedBy = closedBy;
      const durationMs = new Date(logoutAt).getTime() - new Date(session.loginAt).getTime();
      session.duration = Math.max(1, Math.round(durationMs / 60000));
      memorySessions.set(sessionId, session);
    }

    if (isDatabaseConnected()) {
      try {
        const doc = await SessionModel.findById(sessionId);
        if (doc) {
          doc.active = false;
          doc.logoutAt = logoutAt;
          doc.closedBy = closedBy;
          const durationMs = new Date(logoutAt).getTime() - new Date(doc.loginAt).getTime();
          doc.duration = Math.max(1, Math.round(durationMs / 60000));
          await doc.save();
          return { ...doc.toObject(), id: doc._id.toString() };
        }
      } catch {}
    }
    return session;
  },

  async find(filters: {
    labId?: string;
    nodeId?: string;
    username?: string;
    from?: string;
    to?: string;
    active?: boolean;
    limit?: number;
  }): Promise<any[]> {
    const limit = filters.limit ? Number(filters.limit) : 100;

    if (isDatabaseConnected()) {
      try {
        const q: any = {};
        if (filters.labId) q.labId = filters.labId;
        if (filters.nodeId) q.nodeId = filters.nodeId;
        if (filters.username) q.username = new RegExp(filters.username, 'i');
        if (filters.active !== undefined) q.active = filters.active;
        if (filters.from || filters.to) {
          q.loginAt = {};
          if (filters.from) q.loginAt.$gte = new Date(filters.from);
          if (filters.to) q.loginAt.$lte = new Date(filters.to);
        }
        const docs = await SessionModel.find(q).sort({ loginAt: -1 }).limit(limit).lean();
        if (docs.length > 0) {
          return docs.map(d => ({ ...d, id: d._id.toString() }));
        }
      } catch {}
    }

    let results = Array.from(memorySessions.values());
    if (filters.labId) results = results.filter(s => s.labId === filters.labId);
    if (filters.nodeId) results = results.filter(s => s.nodeId === filters.nodeId);
    if (filters.username) {
      const u = filters.username.toLowerCase();
      results = results.filter(s => s.username.toLowerCase().includes(u));
    }
    if (filters.active !== undefined) results = results.filter(s => Boolean(s.active) === filters.active);
    if (filters.from) {
      const fromTime = new Date(filters.from).getTime();
      results = results.filter(s => new Date(s.loginAt).getTime() >= fromTime);
    }
    if (filters.to) {
      const toTime = new Date(filters.to).getTime();
      results = results.filter(s => new Date(s.loginAt).getTime() <= toTime);
    }

    results.sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());
    return results.slice(0, limit);
  },

  async deleteOlderThan(cutoff: Date): Promise<number> {
    let deleted = 0;
    for (const [id, s] of memorySessions.entries()) {
      if (new Date(s.loginAt) < cutoff) {
        memorySessions.delete(id);
        deleted++;
      }
    }
    if (isDatabaseConnected()) {
      try {
        const res = await SessionModel.deleteMany({ loginAt: { $lt: cutoff } });
        return res.deletedCount || deleted;
      } catch {}
    }
    return deleted;
  }
};

// ==========================================
// 4. OFFLINE SESSION SWEEPER
// ==========================================

export function startSessionSweeper() {
  logger.info('[Session Sweeper] Initialized. Sweeping stale sessions every 30 seconds.');
  setInterval(async () => {
    try {
      const nodes = await deviceRepository.findAll(true);
      const nowSec = Date.now() / 1000;

      for (const node of nodes) {
        const secondsSinceSeen = nowSec - (node.last_seen || 0);
        // If node hasn't been seen in > 60 seconds, it is offline
        if (secondsSinceSeen > 60) {
          const activeSess = await sessionRepo.getActive(node.node_id);
          if (activeSess) {
            const logoutTime = new Date((node.last_seen || nowSec) * 1000);
            await sessionRepo.close(activeSess.id, logoutTime, 'agent-offline');
            await deviceRepository.upsert({ node_id: node.node_id, currentUser: null });
            logger.info(`[Session Sweeper] Closed offline session for ${activeSess.username} on ${node.node_id}`);
            if (io) {
              io.emit('session:update', {
                nodeId: node.node_id,
                event: 'logout',
                username: activeSess.username,
                closedBy: 'agent-offline'
              });
            }
          }
        }
      }
    } catch (err) {
      logger.error(`[Session Sweeper] Error: ${err}`);
    }
  }, 30000);
}

// ==========================================
// 5. LABS & SESSIONS EXPRESS ROUTER
// ==========================================

export const labsRouter = Router();
export const setLabsIo = (_socketIo: any) => {};

// GET /api/labs - List all labs with counts + unassigned
labsRouter.get('/labs', async (req: Request, res: Response) => {
  try {
    await autoAssignUnassignedNodes();
    const labs = await labRepo.getAll();
    const nodes = await deviceRepository.findAll(true);
    const nowSec = Date.now() / 1000;

    let unassignedCount = 0;
    const labStats: Record<string, { total: number; online: number; inUse: number }> = {};

    for (const l of labs) {
      labStats[l.id] = { total: 0, online: 0, inUse: 0 };
    }

    for (const n of nodes) {
      const isOnline = (n.is_ssh_agentless || n.is_manual) ? (n.status === 'ONLINE') : ((nowSec - (n.last_seen || 0)) <= 15.0);
      const hasUser = Boolean(n.currentUser);

      if (!n.labId || !labStats[n.labId]) {
        unassignedCount++;
      } else {
        labStats[n.labId].total++;
        if (isOnline) labStats[n.labId].online++;
        if (hasUser) labStats[n.labId].inUse++;
      }
    }

    const labsWithCounts = labs.map(l => ({
      ...l,
      total: labStats[l.id]?.total || 0,
      online: labStats[l.id]?.online || 0,
      inUse: labStats[l.id]?.inUse || 0
    }));

    return res.json({
      labs: labsWithCounts,
      unassigned: unassignedCount
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch labs' });
  }
});

// POST /api/labs - Create a lab
labsRouter.post('/labs', async (req: Request, res: Response) => {
  try {
    const { name, description, capacity, prefix } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Lab name is required' });
    }

    // Check unique
    const existing = await labRepo.getAll();
    if (existing.some(l => l.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Lab name must be unique' });
    }

    const lab = await labRepo.create({
      name: name.trim(),
      description: description?.trim() || '',
      capacity: capacity ? Number(capacity) : 30,
      prefix: prefix?.trim() || ''
    });

    if (io) io.emit('lab:update', { action: 'create', lab });
    return res.status(201).json({ lab });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create lab' });
  }
});

// GET /api/labs/:id - Get single lab
labsRouter.get('/labs/:id', async (req: Request, res: Response) => {
  const labId = String(req.params.id);
  const lab = await labRepo.getById(labId);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });
  return res.json({ lab });
});

// PUT /api/labs/:id - Update lab
labsRouter.put('/labs/:id', async (req: Request, res: Response) => {
  try {
    const labId = String(req.params.id);
    const { name, description, capacity, prefix } = req.body;
    if (name) {
      const existing = await labRepo.getAll();
      const conflict = existing.find(l => l.id !== labId && l.name.toLowerCase() === name.trim().toLowerCase());
      if (conflict) {
        return res.status(400).json({ error: 'Lab name must be unique' });
      }
    }

    const updated = await labRepo.update(labId, {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(capacity ? { capacity: Number(capacity) } : {}),
      ...(prefix !== undefined ? { prefix: prefix.trim() } : {})
    });

    if (!updated) return res.status(404).json({ error: 'Lab not found' });
    if (io) io.emit('lab:update', { action: 'update', lab: updated });
    return res.json({ lab: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/labs/:id - Delete lab (unassigns its machines)
labsRouter.delete('/labs/:id', async (req: Request, res: Response) => {
  const labId = String(req.params.id);
  const lab = await labRepo.getById(labId);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });

  await labRepo.delete(labId);
  if (io) io.emit('lab:update', { action: 'delete', labId });
  return res.json({ status: 'ok', message: `Lab ${lab.name} deleted. Machines moved to unassigned.` });
});

// GET /api/labs/:id/overview - Machines in lab with live stats, active user & seat
labsRouter.get('/labs/:id/overview', async (req: Request, res: Response) => {
  const labId = String(req.params.id);
  const lab = await labRepo.getById(labId);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });

  await autoAssignUnassignedNodes();

  let allNodes = await deviceRepository.findAll(true);
  let labNodes = allNodes.filter(n => n.labId === labId);

  // If this lab has 0 workstations and there are unassigned machines or if this is the only lab, claim them immediately
  if (labNodes.length === 0 && allNodes.length > 0) {
    const unassigned = allNodes.filter(n => !n.labId);
    if (unassigned.length > 0) {
      for (const un of unassigned) {
        await deviceRepository.upsert({ node_id: un.node_id, labId: lab.id });
        un.labId = lab.id;
      }
      allNodes = await deviceRepository.findAll(true);
      labNodes = allNodes.filter(n => n.labId === labId);
    }
  }

  const nowSec = Date.now() / 1000;

  const machines = await Promise.all(labNodes.map(async (n: any) => {
    const rawObj = n.toObject ? n.toObject() : n;
    const secondsSinceSeen = Math.round((nowSec - (n.last_seen || 0)) * 10) / 10;
    const isOnline = (n.is_ssh_agentless || n.is_manual) ? (n.status === 'ONLINE') : (secondsSinceSeen <= 15.0);
    const snapshot = await processRepository.getLatestSnapshot(n.node_id);

    return {
      ...rawObj,
      node_id: n.node_id,
      hostname: n.hostname,
      ip: n.ip,
      mac: n.mac || null,
      interface: n.interface || null,
      isOnline,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      health: n.health || (isOnline ? 'HEALTHY' : 'OFFLINE'),
      health_reasons: n.health_reasons || [],
      is_ssh_agentless: Boolean(n.is_ssh_agentless),
      is_simulated: Boolean(n.is_simulated),
      cpu_percent: n.cpu_percent || 0,
      gpu_percent: n.gpu_percent || 0,
      gpu_name: n.gpu_name || undefined,
      ram_percent: n.ram_percent || 0,
      ram_used_gb: n.ram_used_gb || 0,
      ram_total_gb: n.ram_total_gb || 0,
      disk_percent: n.disk_percent || 0,
      disk_used_gb: n.disk_used_gb || 0,
      disk_total_gb: n.disk_total_gb || 0,
      process_count: n.process_count || (snapshot?.processes?.length || 0),
      processes: snapshot?.processes || [],
      seat: n.seat || null,
      currentUser: n.currentUser || null,
      system_type: n.system_type || 'Unknown',
      secondsSinceSeen
    };
  }));

  // Sort by seat number, then hostname
  machines.sort((a, b) => {
    if (a.seat && b.seat) return a.seat - b.seat;
    if (a.seat) return -1;
    if (b.seat) return 1;
    return a.hostname.localeCompare(b.hostname);
  });

  return res.json({
    lab,
    machines,
    total: machines.length,
    online: machines.filter(m => m.isOnline).length,
    inUse: machines.filter(m => m.currentUser).length
  });
});

// GET /api/labs/:id/usage?days=7 - Usage statistics
labsRouter.get('/labs/:id/usage', async (req: Request, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 7;
  const labId = String(req.params.id);

  const now = new Date();
  const usageDays: Array<{ date: string; sessions: number; hours: number; uniqueUsers: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd = new Date(dateStr + 'T23:59:59.999Z');

    const sessions = await sessionRepo.find({
      labId,
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
      limit: 1000
    });

    const userSet = new Set<string>();
    let totalMinutes = 0;

    for (const s of sessions) {
      userSet.add(s.username);
      totalMinutes += (s.duration || 15);
    }

    usageDays.push({
      date: dateStr,
      sessions: sessions.length,
      hours: +(totalMinutes / 60).toFixed(1),
      uniqueUsers: userSet.size
    });
  }

  return res.json({ days: usageDays });
});

// POST /api/labs/:id/assign-by-prefix - Assign machines matching hostname or OS prefix
labsRouter.post('/labs/:id/assign-by-prefix', async (req: Request, res: Response) => {
  const { prefix } = req.body;
  if (!prefix || typeof prefix !== 'string' || !prefix.trim()) {
    return res.status(400).json({ error: 'Prefix string is required' });
  }

  const labId = String(req.params.id);
  const lab = await labRepo.getById(labId);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });

  const cleanPrefix = prefix.trim().toLowerCase();
  const allNodes = await deviceRepository.findAll(true);
  let assignedCount = 0;

  for (const node of allNodes) {
    const matches =
      cleanPrefix === '*' ||
      (node.hostname && node.hostname.toLowerCase().includes(cleanPrefix)) ||
      (node.system_type && node.system_type.toLowerCase().includes(cleanPrefix));

    if (matches) {
      await deviceRepository.upsert({ node_id: node.node_id, labId: lab.id });
      assignedCount++;
    }
  }

  if (io) io.emit('lab:update', { action: 'assign', labId: lab.id, assignedCount });
  return res.json({ status: 'ok', assignedCount, message: `Assigned ${assignedCount} nodes to ${lab.name}` });
});

// POST /api/labs/:id/claim-all - Assign all available/connected machines to this lab
labsRouter.post('/labs/:id/claim-all', async (req: Request, res: Response) => {
  const labId = String(req.params.id);
  const lab = await labRepo.getById(labId);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });

  const allNodes = await deviceRepository.findAll(true);
  let claimedCount = 0;

  for (const node of allNodes) {
    await deviceRepository.upsert({ node_id: node.node_id, labId: lab.id });
    claimedCount++;
  }

  if (io) io.emit('lab:update', { action: 'claim-all', labId: lab.id, claimedCount });
  return res.json({ status: 'ok', claimedCount, message: `Claimed ${claimedCount} nodes to ${lab.name}` });
});

// GET /api/labs/unassigned/nodes - Machines with no lab assigned
labsRouter.get('/labs/unassigned/nodes', async (req: Request, res: Response) => {
  const allNodes = await deviceRepository.findAll(true);
  const unassigned = allNodes.filter(n => !n.labId);
  return res.json({ nodes: unassigned, count: unassigned.length });
});

// PUT /api/nodes/assign - Assign array of nodes to a lab
labsRouter.put('/nodes/assign', async (req: Request, res: Response) => {
  const { nodeIds, labId } = req.body;
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    return res.status(400).json({ error: 'nodeIds array is required' });
  }

  if (labId) {
    const lab = await labRepo.getById(String(labId));
    if (!lab) return res.status(404).json({ error: 'Lab not found' });
  }

  let updatedCount = 0;
  for (const id of nodeIds) {
    await deviceRepository.upsert({ node_id: id, labId: labId ? String(labId) : null });
    updatedCount++;
  }

  if (io) io.emit('lab:update', { action: 'assign-batch', labId, updatedCount });
  return res.json({ status: 'ok', updatedCount });
});

// PUT /api/nodes/:nodeId/seat - Set seat number for a node
labsRouter.put('/nodes/:nodeId/seat', async (req: Request, res: Response) => {
  const { seat } = req.body;
  const seatNum = seat !== undefined && seat !== null ? Number(seat) : null;
  const nodeId = String(req.params.nodeId);

  const node = await deviceRepository.findById(nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const updated = await deviceRepository.upsert({ node_id: nodeId, seat: seatNum });
  if (io) io.emit('lab:update', { action: 'seat', nodeId, seat: seatNum });
  return res.json({ status: 'ok', node: updated });
});

// DELETE /api/labs/:labId/nodes/:nodeId - Remove / delete node from a specific lab
labsRouter.delete('/labs/:labId/nodes/:nodeId', async (req: Request, res: Response) => {
  const { labId, nodeId } = req.params;
  await deviceRepository.deleteNode(String(nodeId));
  if (io) io.emit('lab:update', { action: 'delete-node', labId, nodeId });
  return res.json({ status: 'ok', message: `Workstation ${nodeId} deleted from lab` });
});

function parseTimestamp(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts === 'number') {
    return new Date(ts < 1e11 ? ts * 1000 : ts);
  }
  if (typeof ts === 'string' && /^\d+$/.test(ts.trim())) {
    const num = Number(ts.trim());
    return new Date(num < 1e11 ? num * 1000 : num);
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date() : d;
}

// POST /api/sessions/event - Agent reports login or logout
labsRouter.post('/sessions/event', async (req: Request, res: Response) => {
  try {
    const { nodeId, event, username, ts } = req.body;
    if (!nodeId || !event || !username) {
      return res.status(400).json({ error: 'nodeId, event (login|logout), and username are required' });
    }

    if (event !== 'login' && event !== 'logout') {
      return res.status(400).json({ error: "event must be either 'login' or 'logout'" });
    }

    const node = await deviceRepository.findById(nodeId);
    const labId = node?.labId || null;
    const eventTime = parseTimestamp(ts);

    if (event === 'login') {
      // Check if session is already active to prevent duplicates
      const existing = await sessionRepo.getActive(nodeId, username);
      if (!existing) {
        await sessionRepo.create({
          nodeId,
          labId,
          username,
          loginAt: eventTime
        });
      }
      await deviceRepository.upsert({ node_id: nodeId, currentUser: username });
    } else {
      // logout
      const active = await sessionRepo.getActive(nodeId, username) || await sessionRepo.getActive(nodeId);
      if (active) {
        await sessionRepo.close(active.id, eventTime, 'user');
      }
      await deviceRepository.upsert({ node_id: nodeId, currentUser: null });
    }

    if (io) {
      io.emit('session:update', {
        nodeId,
        event,
        username,
        ts: eventTime.toISOString()
      });
    }

    return res.json({ status: 'ok', event, username, nodeId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/sync - Agent full user sync at startup
labsRouter.post('/sessions/sync', async (req: Request, res: Response) => {
  try {
    const { nodeId, users, ts } = req.body;
    if (!nodeId || !Array.isArray(users)) {
      return res.status(400).json({ error: 'nodeId and users array are required' });
    }

    const node = await deviceRepository.findById(nodeId);
    const labId = node?.labId || null;
    const syncTime = parseTimestamp(ts);

    const activeSessions = await sessionRepo.find({ nodeId, active: true });
    const activeUsers = activeSessions.map(s => s.username);

    // Close sessions for users who are no longer logged in
    for (const sess of activeSessions) {
      if (!users.includes(sess.username)) {
        await sessionRepo.close(sess.id, syncTime, 'user');
      }
    }

    // Create session for any current user without an active session
    for (const u of users) {
      if (!activeUsers.includes(u)) {
        await sessionRepo.create({
          nodeId,
          labId,
          username: u,
          loginAt: syncTime
        });
      }
    }

    const currentUser = users.length > 0 ? users[0] : null;
    await deviceRepository.upsert({ node_id: nodeId, currentUser });

    if (io) {
      io.emit('session:update', {
        nodeId,
        event: 'sync',
        users
      });
    }

    return res.json({ status: 'ok', syncedUsers: users });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions - Filtered session history
labsRouter.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { labId, nodeId, username, from, to, active, limit } = req.query;
    const sessions = await sessionRepo.find({
      ...(labId ? { labId: String(labId) } : {}),
      ...(nodeId ? { nodeId: String(nodeId) } : {}),
      ...(username ? { username: String(username) } : {}),
      ...(from ? { from: String(from) } : {}),
      ...(to ? { to: String(to) } : {}),
      ...(active !== undefined ? { active: active === 'true' } : {}),
      ...(limit ? { limit: Number(limit) } : {})
    });

    return res.json({ sessions, total: sessions.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/export - CSV download of session history
labsRouter.get('/sessions/export', async (req: Request, res: Response) => {
  try {
    const { labId, nodeId, username, from, to, active } = req.query;
    const sessions = await sessionRepo.find({
      ...(labId ? { labId: String(labId) } : {}),
      ...(nodeId ? { nodeId: String(nodeId) } : {}),
      ...(username ? { username: String(username) } : {}),
      ...(from ? { from: String(from) } : {}),
      ...(to ? { to: String(to) } : {}),
      ...(active !== undefined ? { active: active === 'true' } : {}),
      limit: 5000
    });

    const labs = await labRepo.getAll();
    const labMap = new Map(labs.map(l => [l.id, l.name]));

    const header = ['Session ID', 'Computer (Node)', 'Lab', 'Username', 'Login Time (UTC)', 'Logout Time (UTC)', 'Duration (min)', 'Status', 'Closed By'];
    const rows = sessions.map(s => [
      `"${s.id || s._id}"`,
      `"${s.nodeId}"`,
      `"${labMap.get(s.labId) || s.labId || 'Unassigned'}"`,
      `"${s.username}"`,
      `"${new Date(s.loginAt).toISOString()}"`,
      s.logoutAt ? `"${new Date(s.logoutAt).toISOString()}"` : '"Active"',
      s.duration || (s.active ? Math.max(1, Math.round((Date.now() - new Date(s.loginAt).getTime()) / 60000)) : 0),
      s.active ? '"ACTIVE"' : '"COMPLETED"',
      `"${s.closedBy || 'user'}"`
    ]);

    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `processshield_sessions_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
