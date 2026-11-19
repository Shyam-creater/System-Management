import mongoose, { Document, Schema } from 'mongoose';

export type ScheduleActionType = 'shutdown' | 'message' | 'lock';

export interface ISchedule extends Document {
  labId: string;
  name: string;
  type: ScheduleActionType;
  days: string[]; // ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  time: string;   // "HH:MM" (server local time)
  payload?: {
    delaySec?: number;
    text?: string;
  };
  enabled: boolean;
  lastRunAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ScheduleSchema = new Schema<ISchedule>(
  {
    labId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['shutdown', 'message', 'lock'] },
    days: [{ type: String }],
    time: { type: String, required: true },
    payload: {
      delaySec: { type: Number, default: 60 },
      text: { type: String, default: '' }
    },
    enabled: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

ScheduleSchema.index({ enabled: 1, labId: 1 });

export const ScheduleModel = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
