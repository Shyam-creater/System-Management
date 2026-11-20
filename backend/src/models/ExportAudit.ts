import mongoose, { Schema, Document } from 'mongoose';

export interface IExportAudit extends Document {
  userId: string;
  username: string;
  reportId: string;
  reportTitle: string;
  filters: Record<string, any>;
  format: 'xlsx' | 'pdf' | 'csv';
  rowCount: number;
  createdAt: Date;
}

const ExportAuditSchema = new Schema<IExportAudit>({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  reportId: { type: String, required: true, index: true },
  reportTitle: { type: String, required: true },
  filters: { type: Schema.Types.Mixed, default: {} },
  format: { type: String, enum: ['xlsx', 'pdf', 'csv'], required: true },
  rowCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false,
  collection: 'export_audits'
});

export const ExportAuditModel = mongoose.model<IExportAudit>('ExportAudit', ExportAuditSchema);
