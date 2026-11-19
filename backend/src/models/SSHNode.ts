import mongoose, { Schema, Document } from 'mongoose';

export interface ISSHNode extends Document {
  node_id: string;
  hostname: string;
  ip: string;
  port: number;
  username: string;
  auth_type: string;
  enc_secret?: string;
  key_path?: string;
  auto_poll: boolean;
  poll_interval_sec: number;
  consecutive_failures: number;
  last_status: string;
  last_polled: number;
  last_software_scan: number;
}

const SSHNodeSchema = new Schema<ISSHNode>({
  node_id: { type: String, required: true, unique: true, index: true },
  hostname: { type: String, required: true },
  ip: { type: String, required: true, unique: true },
  port: { type: Number, default: 22 },
  username: { type: String, required: true },
  auth_type: { type: String, default: 'password' },
  enc_secret: { type: String, default: null },
  key_path: { type: String, default: null },
  auto_poll: { type: Boolean, default: true },
  poll_interval_sec: { type: Number, default: 10 },
  consecutive_failures: { type: Number, default: 0 },
  last_status: { type: String, default: 'ONLINE' },
  last_polled: { type: Number, default: 0 },
  last_software_scan: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'ssh_nodes'
});

export const SSHNode = mongoose.model<ISSHNode>('SSHNode', SSHNodeSchema);
