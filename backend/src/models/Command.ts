import mongoose, { Document, Schema } from 'mongoose';

export type CommandType = 'shutdown' | 'restart' | 'lock' | 'logoff' | 'message' | 'cancel_shutdown';
export type CommandStatus = 'pending' | 'sent' | 'done' | 'failed' | 'skipped';

export interface CommandPayload {
  delaySec?: number;
  text?: string;
}

export interface ICommand extends Document {
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

export const CommandSchema = new Schema<ICommand>(
  {
    nodeId: { type: String, required: true, index: true },
    labId: { type: String, default: null, index: true },
    type: {
      type: String,
      required: true,
      enum: ['shutdown', 'restart', 'lock', 'logoff', 'message', 'cancel_shutdown']
    },
    payload: {
      delaySec: { type: Number, default: 60 },
      text: { type: String, default: '' }
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'sent', 'done', 'failed', 'skipped'],
      default: 'pending',
      index: true
    },
    createdBy: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now, index: true },
    sentAt: { type: Date, default: null },
    ackAt: { type: Date, default: null },
    result: { type: String, default: null }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Compound indexes for fast agent polling and lab history queries
CommandSchema.index({ nodeId: 1, status: 1 });
CommandSchema.index({ labId: 1, createdAt: -1 });

export const CommandModel = mongoose.model<ICommand>('Command', CommandSchema);
