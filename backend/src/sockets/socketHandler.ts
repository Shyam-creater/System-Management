import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`Socket.IO client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.debug(`Socket.IO client disconnected: ${socket.id}`);
    });
  });

  logger.info('[Socket.IO] Real-time websocket gateway initialized.');
  return io;
};
