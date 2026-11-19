import mongoose, { Schema, Document } from 'mongoose';

export interface IProcessItem {
  pid: number;
  ppid: number;
  name: string;
  user: string;
  is_user_app: boolean;
  category: string;
  state: string;
  cpu_percent: number;
  memory_mb: number;
}

export interface IProcessSnapshot extends Document {
  node_id: string;
  updated_at: number;
  processes: IProcessItem[];
}

const ProcessItemSchema = new Schema<IProcessItem>({
  pid: { type: Number, required: true },
  ppid: { type: Number, default: 0 },
  name: { type: String, required: true },
  user: { type: String, default: 'SYSTEM' },
  is_user_app: { type: Boolean, default: false },
  category: { type: String, default: 'Background Process' },
  state: { type: String, default: 'SLEEPING' },
  cpu_percent: { type: Number, default: 0 },
  memory_mb: { type: Number, default: 0 }
}, { _id: false });

const ProcessSnapshotSchema = new Schema<IProcessSnapshot>({
  node_id: { type: String, required: true, unique: true, index: true },
  updated_at: { type: Number, required: true },
  processes: { type: [ProcessItemSchema], default: [] }
}, {
  timestamps: true,
  collection: 'process_snapshots'
});

export const ProcessSnapshot = mongoose.model<IProcessSnapshot>('ProcessSnapshot', ProcessSnapshotSchema);
