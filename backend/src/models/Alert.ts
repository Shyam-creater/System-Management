import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  node_id: string;
  timestamp: number;
  time_str: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  category?: string;
  message: string;
  details?: string;
  resolved: boolean;
}

const AlertSchema = new Schema<IAlert>({
  node_id: { type: String, required: true, index: true },
  timestamp: { type: Number, required: true, index: true },
  time_str: { type: String, required: true },
  level: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], required: true },
  category: { type: String, default: 'System' },
  message: { type: String, required: true },
  details: { type: String, default: '' },
  resolved: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'alerts'
});

AlertSchema.index({ timestamp: -1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
