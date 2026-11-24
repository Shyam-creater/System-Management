import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { initSocket } from './sockets/socketHandler.js';
import { discoveryService } from './integrations/discovery.js';
import { initCronJobs } from './jobs/cronJobs.js';
import { sshService } from './services/sshService.js';
import { startSessionSweeper, setLabsIo } from './labs.js';
import { setCommandsIo } from './commands.js';
import { setPoliciesIo } from './policies.js';
import { setSchedulesIo, startSchedulerTicker } from './schedules.js';
import { initUsbGuardSockets } from './sockets/usbGuard.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
setLabsIo(io);
setCommandsIo(io);
setPoliciesIo(io);
setSchedulesIo(io);
initUsbGuardSockets(io);

// Start Server Function
async function startServer() {
  logger.info('========================================================================');
  logger.info('   PROCESSSHIELD FULLY AUTOMATED MASTER SERVER & FLEET GUARDIAN (MERN)  ');
  logger.info('========================================================================');

  // 1. Connect to MongoDB Atlas (resilient connection)
  await connectDatabase();

  // 2. Start HTTP Server
  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`[✓] Master Server listening on: http://localhost:${env.PORT}`);
    logger.info(`[*] REST API Endpoint:         http://localhost:${env.PORT}/api/status`);
    logger.info(`[*] Agent Telemetry Endpoint:  http://localhost:${env.PORT}/api/report`);
    logger.info(`[*] Frontend Client Target:    ${env.CLIENT_URL}`);

    // 3. Start UDP Discovery Beacon on Port 8081
    discoveryService.start(env.PORT);

    // 4. Initialize Cron Jobs
    initCronJobs();

    // 5. Initialize Autonomous SSH Lab Node Monitor
    sshService.startBackgroundMonitor();

    // 6. Initialize Stale Session Sweeper
    startSessionSweeper();

    // 7. Initialize Autonomous Lab Schedule Ticker
    startSchedulerTicker();

    logger.info('========================================================================');
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`\nReceived ${signal}. Shutting down ProcessShield gracefully...`);
    discoveryService.stop();
    server.close(async () => {
      await closeDatabase();
      logger.info('ProcessShield terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  logger.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
