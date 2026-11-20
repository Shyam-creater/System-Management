import mongoose, { Schema, Document } from 'mongoose';

export interface IFault extends Document {
  nodeId: string;
  hostname: string;
  labId?: string | null;
  issue: string;
  status: 'open' | 'in_progress' | 'resolved';
  reportedOn: Date;
  resolvedOn?: Date | null;
  daysOpen: number;
  reportedBy?: string;
  resolutionNotes?: string;
}

const FaultSchema = new Schema<IFault>({
  nodeId: { type: String, required: true, index: true },
  hostname: { type: String, required: true },
  labId: { type: String, default: null, index: true },
  issue: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
  reportedOn: { type: Date, required: true, default: Date.now, index: true },
  resolvedOn: { type: Date, default: null },
  daysOpen: { type: Number, default: 0 },
  reportedBy: { type: String, default: 'System' },
  resolutionNotes: { type: String, default: '' }
}, {
  timestamps: true,
  collection: 'faults'
});

FaultSchema.index({ labId: 1, reportedOn: -1 });

export const FaultModel = mongoose.model<IFault>('Fault', FaultSchema);
