import { CommandModel, ICommand, CommandType, CommandStatus, CommandPayload } from '../models/Command.js';
import { isDatabaseConnected } from '../config/database.js';

export interface CommandRecord {
  _id: string;
  id: string;
  nodeId: string;
  labId?: string | null;
  type: CommandType;
  payload?: CommandPayload;
  status: CommandStatus;
  createdBy: string;
  createdAt: Date;
  sentAt?: Date | null;
  ackAt?: Date | null;
  result?: string | null;
}

const memoryCommands = new Map<string, CommandRecord>();

export const commandRepository = {
  async create(data: {
    nodeId: string;
    labId?: string | null;
    type: CommandType;
    payload?: CommandPayload;
    createdBy?: string;
    status?: CommandStatus;
    result?: string | null;
  }): Promise<CommandRecord> {
    const id = 'cmd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const record: CommandRecord = {
      _id: id,
      id,
      nodeId: data.nodeId,
      labId: data.labId || null,
      type: data.type,
      payload: data.payload || {},
      status: data.status || 'pending',
      createdBy: data.createdBy || 'admin',
      createdAt: new Date(),
      sentAt: null,
      ackAt: null,
      result: data.result || null
    };

    memoryCommands.set(id, record);

    if (isDatabaseConnected()) {
      try {
        const doc = await CommandModel.create(record);
        return { ...doc.toObject(), _id: doc._id.toString(), id: doc._id.toString() } as unknown as CommandRecord;
      } catch {}
    }

    return record;
  },

  async findById(id: string): Promise<CommandRecord | null> {
    if (isDatabaseConnected()) {
      try {
        const doc = await CommandModel.findById(id).lean();
        if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as CommandRecord;
      } catch {}
    }
    return memoryCommands.get(id) || null;
  },

  async findByLab(labId: string, limit = 50): Promise<CommandRecord[]> {
    if (isDatabaseConnected()) {
      try {
        const docs = await CommandModel.find({ labId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        return docs.map(d => ({ ...d, id: (d as any)._id.toString() } as unknown as CommandRecord));
      } catch {}
    }

    const list: CommandRecord[] = [];
    for (const cmd of memoryCommands.values()) {
      if (cmd.labId === labId) list.push(cmd);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  },

  async getPendingForNode(nodeId: string): Promise<CommandRecord[]> {
    if (isDatabaseConnected()) {
      try {
        const docs = await CommandModel.find({ nodeId, status: 'pending' })
          .sort({ createdAt: 1 })
          .lean();
        return docs.map(d => ({ ...d, id: (d as any)._id.toString() } as unknown as CommandRecord));
      } catch {}
    }

    const list: CommandRecord[] = [];
    for (const cmd of memoryCommands.values()) {
      if (cmd.nodeId === nodeId && cmd.status === 'pending') {
        list.push(cmd);
      }
    }
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async markSent(ids: string[]): Promise<void> {
    const now = new Date();
    for (const id of ids) {
      const cmd = memoryCommands.get(id);
      if (cmd) {
        cmd.status = 'sent';
        cmd.sentAt = now;
      }
    }

    if (isDatabaseConnected()) {
      try {
        await CommandModel.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'sent', sentAt: now } }
        );
      } catch {}
    }
  },

  async ack(id: string, status: 'done' | 'failed', result?: string): Promise<CommandRecord | null> {
    const now = new Date();
    const cmd = memoryCommands.get(id);
    if (cmd) {
      cmd.status = status;
      cmd.ackAt = now;
      cmd.result = result || status;
    }

    if (isDatabaseConnected()) {
      try {
        const doc = await CommandModel.findByIdAndUpdate(
          id,
          { $set: { status, ackAt: now, result: result || status } },
          { new: true }
        ).lean();
        if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as CommandRecord;
      } catch {}
    }

    return cmd || null;
  },

  async findAll(limit = 100): Promise<CommandRecord[]> {
    if (isDatabaseConnected()) {
      try {
        const docs = await CommandModel.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        return docs.map(d => ({ ...d, id: (d as any)._id.toString() } as unknown as CommandRecord));
      } catch {}
    }

    return Array.from(memoryCommands.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async deleteOlderThan(cutoff: Date): Promise<number> {
    let deleted = 0;
    for (const [id, cmd] of memoryCommands.entries()) {
      if (new Date(cmd.createdAt) < cutoff) {
        memoryCommands.delete(id);
        deleted++;
      }
    }

    if (isDatabaseConnected()) {
      try {
        const res = await CommandModel.deleteMany({ createdAt: { $lt: cutoff } });
        return res.deletedCount || deleted;
      } catch {}
    }

    return deleted;
  }
};
