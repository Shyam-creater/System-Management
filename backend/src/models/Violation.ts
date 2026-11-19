import mongoose, { Document, Schema } from 'mongoose';

export interface IViolation extends Document {
  nodeId: string;
  labId?: string | null;
  username: string;
  processName: string;
  action: 'killed' | 'alerted';
  createdAt: Date;
}

export const ViolationSchema = new Schema<IViolation>(
  {
    nodeId: { type: String, required: true, index: true },
    labId: { type: String, default: null, index: true },
    username: { type: String, required: true, index: true },
    processName: { type: String, required: true },
    action: { type: String, required: true, enum: ['killed', 'alerted'] },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

ViolationSchema.index({ labId: 1, createdAt: -1 });

export const ViolationModel = mongoose.model<IViolation>('Violation', ViolationSchema);
