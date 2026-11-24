import mongoose, { Schema, Document } from 'mongoose';
import { isDatabaseConnected } from '../config/database.js';

export interface IAllowItem {
  serial: string;
  owner?: string;
  note?: string;
}

export interface IUsbPolicy {
  key: string;
  mode: 'off' | 'alert' | 'alert_lock';
  message: string;
  allowlist: IAllowItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const AllowItemSchema = new Schema<IAllowItem>(
  {
    serial: { type: String, required: true, trim: true },
    owner: { type: String, default: '' },
    note: { type: String, default: '' }
  },
  { _id: false }
);

const UsbPolicySchema = new Schema(
  {
    key: { type: String, default: 'global', unique: true },
    mode: { type: String, enum: ['off', 'alert', 'alert_lock'], default: 'alert_lock' },
    message: {
      type: String,
      default: 'USB storage device detected.\nThis computer is blocked.\nPlease call the lab assistant.'
    },
    allowlist: { type: [AllowItemSchema], default: [] }
  },
  { timestamps: true, collection: 'usb_policies' }
);

export const UsbPolicy = mongoose.model('UsbPolicy', UsbPolicySchema);

// In-Memory Fallback
let memoryPolicy: any = {
  key: 'global',
  mode: 'alert_lock',
  message: 'USB storage device detected.\nThis computer is blocked.\nPlease call the lab assistant.',
  allowlist: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

export const usbPolicyRepo = {
  async get(): Promise<any> {
    if (isDatabaseConnected()) {
      try {
        let policy = await UsbPolicy.findOne({ key: 'global' }).lean();
        if (!policy) {
          const created = await UsbPolicy.create({ key: 'global' });
          policy = (created as any).toObject ? (created as any).toObject() : created;
        }
        return policy;
      } catch {}
    }
    return memoryPolicy;
  },

  async update(patch: { mode?: 'off' | 'alert' | 'alert_lock'; message?: string }): Promise<any> {
    if (isDatabaseConnected()) {
      try {
        const policy = await UsbPolicy.findOneAndUpdate(
          { key: 'global' },
          { $set: patch },
          { new: true, upsert: true }
        ).lean();
        return policy;
      } catch {}
    }
    memoryPolicy = { ...memoryPolicy, ...patch, updatedAt: new Date() };
    return memoryPolicy;
  },

  async addAllowItem(item: IAllowItem): Promise<any> {
    const cleanSerial = item.serial.trim();
    if (isDatabaseConnected()) {
      try {
        let policy = await UsbPolicy.findOne({ key: 'global' });
        if (!policy) policy = await UsbPolicy.create({ key: 'global' });
        if (!policy.allowlist.some(x => x.serial.toLowerCase() === cleanSerial.toLowerCase())) {
          policy.allowlist.push({ serial: cleanSerial, owner: item.owner || '', note: item.note || '' });
          await policy.save();
        }
        return policy.toObject();
      } catch {}
    }
    if (!memoryPolicy.allowlist.some((x: any) => x.serial.toLowerCase() === cleanSerial.toLowerCase())) {
      memoryPolicy.allowlist.push({ serial: cleanSerial, owner: item.owner || '', note: item.note || '' });
      memoryPolicy.updatedAt = new Date();
    }
    return memoryPolicy;
  },

  async removeAllowItem(serial: string): Promise<any> {
    const cleanSerial = serial.trim().toLowerCase();
    if (isDatabaseConnected()) {
      try {
        const policy = await UsbPolicy.findOne({ key: 'global' });
        if (policy) {
          (policy as any).allowlist = ((policy as any).allowlist || []).filter(
            (x: any) => (x.serial || '').toLowerCase() !== cleanSerial
          );
          await policy.save();
          return policy.toObject();
        }
      } catch {}
    }
    memoryPolicy.allowlist = memoryPolicy.allowlist.filter((x: any) => x.serial.toLowerCase() !== cleanSerial);
    memoryPolicy.updatedAt = new Date();
    return memoryPolicy;
  }
};
