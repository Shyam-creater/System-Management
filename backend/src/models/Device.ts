import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  node_id: string;
  hostname: string;
  ip: string;
  mac?: string;
  interface?: string;
  system_type?: string;
  cpu_model?: string;
  is_simulated: boolean;
  first_seen: number;
  last_seen: number;
  status: 'ONLINE' | 'OFFLINE';
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  is_ssh_agentless?: boolean;
  is_manual?: boolean;
  cpu_percent?: number;
  ram_percent?: number;
  ram_used_gb?: number;
  ram_total_gb?: number;
  disk_percent?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  gpu_percent?: number;
  gpu_name?: string;
  process_count?: number;
  labId?: string | null;
  seat?: number | null;
  currentUser?: string | null;
  usbLocked?: boolean;
  usbLockedAt?: Date | null;
  usbPendingCmd?: 'unlock' | 'lock' | null;
  guardLastBeat?: Date | null;
  guardAlerted?: boolean;
}

const DeviceSchema = new Schema<IDevice>({
  node_id: { type: String, required: true, unique: true, index: true },
  hostname: { type: String, required: true },
  ip: { type: String, required: true },
  mac: { type: String, default: null },
  interface: { type: String, default: null },
  system_type: { type: String, default: 'Unknown' },
  cpu_model: { type: String, default: 'Intel Core i7-10700 @ 2.90GHz' },
  is_simulated: { type: Boolean, default: false },
  first_seen: { type: Number, required: true, default: () => Date.now() / 1000 },
  last_seen: { type: Number, required: true, default: () => Date.now() / 1000 },
  status: { type: String, enum: ['ONLINE', 'OFFLINE'], default: 'ONLINE' },
  health: { type: String, enum: ['HEALTHY', 'WARNING', 'CRITICAL', 'OFFLINE'], default: 'HEALTHY' },
  is_ssh_agentless: { type: Boolean, default: false },
  is_manual: { type: Boolean, default: false },
  cpu_percent: { type: Number, default: 0 },
  ram_percent: { type: Number, default: 0 },
  ram_used_gb: { type: Number, default: 0 },
  ram_total_gb: { type: Number, default: 0 },
  disk_percent: { type: Number, default: 0 },
  disk_used_gb: { type: Number, default: 0 },
  disk_total_gb: { type: Number, default: 0 },
  gpu_percent: { type: Number, default: 0 },
  gpu_name: { type: String, default: null },
  process_count: { type: Number, default: 0 },
  labId: { type: String, default: null, index: true },
  seat: { type: Number, default: null },
  currentUser: { type: String, default: null },
  usbLocked: { type: Boolean, default: false },
  usbLockedAt: { type: Date, default: null },
  usbPendingCmd: { type: String, enum: ['unlock', 'lock', null], default: null },
  guardLastBeat: { type: Date, default: null },
  guardAlerted: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'devices'
});

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
