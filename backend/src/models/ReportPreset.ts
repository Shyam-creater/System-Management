import mongoose, { Schema, Document } from 'mongoose';

export interface IReportPreset extends Document {
  name: string;
  reportId: string;
  userId: string;
  isShared: boolean;
  filters: Record<string, any>;
  sort: Array<{ key: string; dir: 'asc' | 'desc' }>;
  columns: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReportPresetSchema = new Schema<IReportPreset>({
  name: { type: String, required: true },
  reportId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  isShared: { type: Boolean, default: false },
  filters: { type: Schema.Types.Mixed, default: {} },
  sort: { type: [{ key: String, dir: String }], default: [] },
  columns: { type: [String], default: [] }
}, {
  timestamps: true,
  collection: 'report_presets'
});

export const ReportPreset = mongoose.model<IReportPreset>('ReportPreset', ReportPresetSchema);
