import mongoose, { Schema, Document } from 'mongoose';

export interface ITelemetry extends Document {
  node_id: string;
  timestamp: number;
  time_str: string;
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  net_sent_kb: number;
  net_recv_kb: number;
  process_count: number;
  gpu_percent: number;
  gpu_mem_used_mb: number;
  gpu_mem_total_mb: number;
  gpu_name: string;
  health: string;
  health_reasons?: string[];
}

const TelemetrySchema = new Schema<ITelemetry>({
  node_id: { type: String, required: true, index: true },
  timestamp: { type: Number, required: true, index: true },
  time_str: { type: String, required: true },
  cpu_percent: { type: Number, default: 0 },
  ram_percent: { type: Number, default: 0 },
  ram_used_gb: { type: Number, default: 0 },
  ram_total_gb: { type: Number, default: 0 },
  disk_percent: { type: Number, default: 0 },
  disk_used_gb: { type: Number, default: 0 },
  disk_total_gb: { type: Number, default: 0 },
  net_sent_kb: { type: Number, default: 0 },
  net_recv_kb: { type: Number, default: 0 },
  process_count: { type: Number, default: 0 },
  gpu_percent: { type: Number, default: 0 },
  gpu_mem_used_mb: { type: Number, default: 0 },
  gpu_mem_total_mb: { type: Number, default: 0 },
  gpu_name: { type: String, default: '' },
  health: { type: String, default: 'HEALTHY' },
  health_reasons: { type: [String], default: [] }
}, {
  timestamps: true,
  collection: 'telemetry'
});

TelemetrySchema.index({ node_id: 1, timestamp: -1 });

export const Telemetry = mongoose.model<ITelemetry>('Telemetry', TelemetrySchema);
