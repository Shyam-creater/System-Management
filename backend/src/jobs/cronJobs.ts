import cron from 'node-cron';
import { reportService } from '../services/reportService.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { commandRepository } from '../repositories/commandRepository.js';
import { violationRepository } from '../repositories/violationRepository.js';
import { sessionRepo } from '../labs.js';
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
    const days = env.PROCESSSHIELD_RETENTION_DAYS || 180;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    logger.info(`[Cron] Pruning telemetry, sessions, commands, and violations older than ${days} days...`);
    try {
      const count = await telemetryRepository.pruneOldRecords(days);
      const sessCount = await sessionRepo.deleteOlderThan(cutoff);
      const cmdCount = await commandRepository.deleteOlderThan(cutoff);
      const violCount = await violationRepository.deleteOlderThan(cutoff);
      logger.info(`[Cron] Pruning complete: ${count} telemetry, ${sessCount} sessions, ${cmdCount} commands, ${violCount} violations.`);
    } catch (err) {
      logger.error(`[Cron] Error pruning historical records: ${err}`);
    }
  });

  logger.info('[Cron] Scheduled automation jobs initialized.');
};
