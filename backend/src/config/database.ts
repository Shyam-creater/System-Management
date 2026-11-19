import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Disable Mongoose command buffering so queries fail fast instead of hanging when offline
mongoose.set('bufferCommands', false);

let isConnected = false;
let retryTimer: NodeJS.Timeout | null = null;

export const connectDatabase = async (): Promise<boolean> => {
  if (!env.MONGODB_URI) {
    logger.error('CRITICAL: MONGODB_URI environment variable is missing.');
    return false;
  }

  const sanitizedUri = env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');

  const tryConnect = async (): Promise<boolean> => {
    try {
      logger.info(`Attempting connection to MongoDB at: ${sanitizedUri}`);
      const conn = await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2000,
        socketTimeoutMS: 15000,
        maxPoolSize: 20
      });

      isConnected = true;
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }

      logger.info(`[✓] MongoDB connected successfully to database: ${conn.connection.name}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB runtime error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        logger.warn('MongoDB connection lost. Reconnecting...');
      });

      return true;
    } catch (error: any) {
      isConnected = false;
      logger.warn(`Could not connect to MongoDB Atlas (${error.message}).`);
      logger.warn(`Notice: If this is an IP whitelist issue, please add IP 182.66.218.97 (or 0.0.0.0/0) to MongoDB Atlas -> Network Access.`);
      return false;
    }
  };

  const initialSuccess = await tryConnect();
  if (!initialSuccess && !retryTimer) {
    retryTimer = setInterval(tryConnect, 60000);
  }

  return initialSuccess;
};

export const isDatabaseConnected = (): boolean => isConnected;

export const closeDatabase = async (): Promise<void> => {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
  try {
    if (isConnected) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed gracefully.');
    }
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error}`);
  }
};
