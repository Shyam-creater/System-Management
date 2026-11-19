import cron from 'node-cron';
import { reportService } from '../services/reportService.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const initCronJobs = () => {
  // Midnight daily report generator: 0 0 * * *
  cron.schedule('0 0 * * *', async () => {
    logger.info('[Cron] Generating automated midnight daily reports...');
    try {
      const reports = await reportService.generateDailyReport();
      logger.info(`[Cron] Generated ${reports.length} daily reports.`);
    } catch (err) {
      logger.error(`[Cron] Error generating daily reports: ${err}`);
    }
  });

  // Data retention pruning: 30 1 * * *
  cron.schedule('30 1 * * *', async () => {
    logger.info(`[Cron] Pruning telemetry records older than ${env.PROCESSSHIELD_RETENTION_DAYS} days...`);
    try {
      const count = await telemetryRepository.pruneOldRecords(env.PROCESSSHIELD_RETENTION_DAYS);
      logger.info(`[Cron] Pruned ${count} old telemetry records.`);
    } catch (err) {
      logger.error(`[Cron] Error pruning old telemetry records: ${err}`);
    }
  });

  logger.info('[Cron] Scheduled automation jobs initialized.');
};
