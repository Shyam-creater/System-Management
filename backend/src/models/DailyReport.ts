import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyReport extends Document {
  node_id: string;
  report_date: string;
  hostname: string;
  user?: string;
  currentUser?: string;
  is_simulated: boolean;
  avg_cpu: number;
  max_cpu: number;
  avg_ram: number;
  max_ram: number;
  avg_disk: number;
  max_disk: number;
  avg_gpu: number;
  max_gpu: number;
  uptime_percent: number;
  samples_count: number;
  alerts_count: number;
  generated_at: number;
  summary?: any;
}

const DailyReportSchema = new Schema<IDailyReport>({
  node_id: { type: String, required: true, index: true },
  report_date: { type: String, required: true, index: true },
  hostname: { type: String, required: true },
  user: { type: String, default: '' },
  currentUser: { type: String, default: '' },
  is_simulated: { type: Boolean, default: false },
  avg_cpu: { type: Number, default: 0 },
  max_cpu: { type: Number, default: 0 },
  avg_ram: { type: Number, default: 0 },
  max_ram: { type: Number, default: 0 },
  avg_disk: { type: Number, default: 0 },
  max_disk: { type: Number, default: 0 },
  avg_gpu: { type: Number, default: 0 },
  max_gpu: { type: Number, default: 0 },
  uptime_percent: { type: Number, default: 100 },
  samples_count: { type: Number, default: 0 },
  alerts_count: { type: Number, default: 0 },
  generated_at: { type: Number, required: true },
  summary: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  collection: 'daily_reports'
});

DailyReportSchema.index({ node_id: 1, report_date: 1 }, { unique: true });

export const DailyReport = mongoose.model<IDailyReport>('DailyReport', DailyReportSchema);
