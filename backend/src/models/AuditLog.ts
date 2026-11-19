import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  timestamp: number;
  level: string;
  source: string;
  message: string;
  details?: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  timestamp: { type: Number, required: true, index: true },
  level: { type: String, default: 'INFO' },
  source: { type: String, default: 'ProcessShield' },
  message: { type: String, required: true },
  details: { type: String, default: '' }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
