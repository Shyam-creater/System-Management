import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/System_Management',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  PROCESSSHIELD_KEY: process.env.PROCESSSHIELD_KEY || 'ProcessShield-OS-2026',
  PROCESSSHIELD_RETENTION_DAYS: parseInt(process.env.PROCESSSHIELD_RETENTION_DAYS || '7', 10),
  DISCOVERY_PORT: parseInt(process.env.DISCOVERY_PORT || '8081', 10),
};
