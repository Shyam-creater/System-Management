import mongoose, { Schema, Document } from 'mongoose';

export interface IProcessSummary {
  name: string;
  avgCpu: number;
  avgMemMB: number;
  peakMemMB: number;
}

export interface IHourlyRollup extends Document {
  scope: 'system' | 'lab';
  refId: string; // nodeId or labId
  hour: string;  // ISO string representing the start of the hour
  timestamp: number; // Unix timestamp in seconds
  avgCpu: number;
  peakCpu: number;
  avgRam: number;
  peakRam: number;
  avgRamUsedMB: number;
  peakRamUsedMB: number;
  avgDisk: number;
  peakDisk: number;
  processCount: number;
  topProcesses: IProcessSummary[];
  sampleCount: number;
}

const ProcessSummarySchema = new Schema<IProcessSummary>({
  name: { type: String, required: true },
  avgCpu: { type: Number, default: 0 },
  avgMemMB: { type: Number, default: 0 },
  peakMemMB: { type: Number, default: 0 }
}, { _id: false });

const HourlyRollupSchema = new Schema<IHourlyRollup>({
  scope: { type: String, enum: ['system', 'lab'], required: true, index: true },
  refId: { type: String, required: true, index: true },
  hour: { type: String, required: true, index: true },
  timestamp: { type: Number, required: true, index: true },
  avgCpu: { type: Number, default: 0 },
  peakCpu: { type: Number, default: 0 },
  avgRam: { type: Number, default: 0 },
  peakRam: { type: Number, default: 0 },
  avgRamUsedMB: { type: Number, default: 0 },
  peakRamUsedMB: { type: Number, default: 0 },
  avgDisk: { type: Number, default: 0 },
  peakDisk: { type: Number, default: 0 },
  processCount: { type: Number, default: 0 },
  topProcesses: { type: [ProcessSummarySchema], default: [] },
  sampleCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'hourly_rollups'
});

HourlyRollupSchema.index({ scope: 1, refId: 1, timestamp: -1 });
HourlyRollupSchema.index({ hour: 1, refId: 1 });

export const HourlyRollup = mongoose.model<IHourlyRollup>('HourlyRollup', HourlyRollupSchema);
