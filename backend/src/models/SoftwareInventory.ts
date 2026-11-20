import mongoose, { Schema, Document } from 'mongoose';

export interface ISoftwarePackage {
  name: string;
  version: string;
  publisher: string;
  category: string;
  install_path: string;
  install_date: string;
  source: string;
  summary: string;
  package_id: string;
  architecture: string;
  sizeMB?: number;
}

export interface ISoftwareInventory extends Document {
  node_id: string;
  hostname: string;
  packages: ISoftwarePackage[];
  total_count: number;
  updated_at: number;
}

const SoftwarePackageSchema = new Schema<ISoftwarePackage>({
  name: { type: String, required: true },
  version: { type: String, default: 'N/A' },
  publisher: { type: String, default: 'N/A' },
  category: { type: String, default: 'Application' },
  install_path: { type: String, default: 'N/A' },
  install_date: { type: String, default: 'N/A' },
  source: { type: String, default: 'System' },
  summary: { type: String, default: '' },
  package_id: { type: String, default: '' },
  architecture: { type: String, default: 'all' },
  sizeMB: { type: Number, default: 0 }
}, { _id: false });

const SoftwareInventorySchema = new Schema<ISoftwareInventory>({
  node_id: { type: String, required: true, unique: true, index: true },
  hostname: { type: String, required: true },
  packages: { type: [SoftwarePackageSchema], default: [] },
  total_count: { type: Number, default: 0 },
  updated_at: { type: Number, required: true }
}, {
  timestamps: true,
  collection: 'software_inventory'
});

export const SoftwareInventory = mongoose.model<ISoftwareInventory>('SoftwareInventory', SoftwareInventorySchema);
