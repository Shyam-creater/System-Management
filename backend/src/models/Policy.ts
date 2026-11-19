import mongoose, { Document, Schema } from 'mongoose';

export interface IPolicy extends Document {
  labId?: string | null;
  name: string;
  mode: 'blocklist' | 'allowlist';
  processNames: string[];
  action: 'kill' | 'alert_only';
  activeFrom?: string; // "HH:MM"
  activeTo?: string;   // "HH:MM"
  days?: string[];     // ["Mon", "Tue", ...]
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PolicySchema = new Schema<IPolicy>(
  {
    labId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    mode: { type: String, required: true, enum: ['blocklist', 'allowlist'], default: 'blocklist' },
    processNames: [{ type: String, trim: true }],
    action: { type: String, required: true, enum: ['kill', 'alert_only'], default: 'alert_only' },
    activeFrom: { type: String, default: null },
    activeTo: { type: String, default: null },
    days: [{ type: String }],
    enabled: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

PolicySchema.index({ labId: 1, enabled: 1 });

export const PolicyModel = mongoose.model<IPolicy>('Policy', PolicySchema);
