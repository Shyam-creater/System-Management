import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { Device } from '../src/models/Device.js';
import { Telemetry } from '../src/models/Telemetry.js';
import { ProcessSnapshot } from '../src/models/ProcessSnapshot.js';
import { Alert } from '../src/models/Alert.js';
import { DailyReport } from '../src/models/DailyReport.js';
import { SSHNode } from '../src/models/SSHNode.js';
import { AuditLog } from '../src/models/AuditLog.js';

const DB_DIR = path.resolve(__dirname, '../../data');
const SQLITE_PATH = path.join(DB_DIR, 'processshield.db');

async function migrate() {
  logger.info('====================================================');
  logger.info('   ProcessShield SQLite to MongoDB Atlas Migration   ');
  logger.info('====================================================');

  // 1. Verify and Backup SQLite Database
  if (!fs.existsSync(SQLITE_PATH)) {
    logger.warn(`No SQLite database found at ${SQLITE_PATH}. Nothing to migrate.`);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(DB_DIR, `processshield_backup_${timestamp}.db`);
  fs.copyFileSync(SQLITE_PATH, backupPath);
  logger.info(`[1/5] Backed up original SQLite database to: ${backupPath}`);

  // 2. Connect to MongoDB Atlas
  const sanitizedUri = env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
  logger.info(`[2/5] Connecting to MongoDB Atlas at: ${sanitizedUri}`);
  
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    logger.info(`[✓] MongoDB Atlas connected to database: ${mongoose.connection.name}`);
  } catch (connErr: any) {
    logger.error(`CRITICAL: Could not connect to MongoDB Atlas cluster (${connErr.message}).`);
    logger.error('----------------------------------------------------');
    logger.error('ACTION REQUIRED: Your current IP is not yet whitelisted in MongoDB Atlas.');
    logger.error('Please visit MongoDB Atlas Console -> Security -> Network Access:');
    logger.error('Add your IP: 182.66.218.97 (or add 0.0.0.0/0 to Allow Access From Anywhere).');
    logger.error('Original SQLite data is 100% safe and backed up in data/processshield.db.');
    logger.error('----------------------------------------------------');
    process.exit(1);
  }

  // 3. Open SQLite Database (Read-Only)
  const db = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);

  const queryAll = <T>(sql: string): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  };

  try {
    // 4. Migrate Nodes
    logger.info('[3/5] Migrating Registered Nodes...');
    const nodes = await queryAll<any>('SELECT * FROM nodes');
    let migratedNodes = 0;
    for (const n of nodes) {
      await Device.findOneAndUpdate(
        { node_id: n.node_id },
        {
          node_id: n.node_id,
          hostname: n.hostname,
          ip: n.ip,
          mac: n.mac,
          interface: n.interface,
          system_type: n.system_type,
          is_simulated: Boolean(n.is_simulated),
          first_seen: n.first_seen,
          last_seen: n.last_seen,
          status: n.status || 'ONLINE',
          health: n.health || 'HEALTHY'
        },
        { upsert: true, new: true }
      );
      migratedNodes++;
    }
    logger.info(`  --> Migrated ${migratedNodes}/${nodes.length} nodes.`);

    // 5. Migrate Telemetry Records
    logger.info('[4/5] Migrating Telemetry History...');
    const telemetryRows = await queryAll<any>('SELECT * FROM telemetry');
    let migratedTelemetry = 0;
    for (const t of telemetryRows) {
      let reasons: string[] = [];
      try {
        if (t.health_reasons) reasons = JSON.parse(t.health_reasons);
      } catch {}

      await Telemetry.findOneAndUpdate(
        { node_id: t.node_id, timestamp: t.timestamp },
        {
          node_id: t.node_id,
          timestamp: t.timestamp,
          time_str: t.time_str,
          cpu_percent: t.cpu_percent,
          ram_percent: t.ram_percent,
          ram_used_gb: t.ram_used_gb,
          ram_total_gb: t.ram_total_gb,
          disk_percent: t.disk_percent,
          disk_used_gb: t.disk_used_gb,
          disk_total_gb: t.disk_total_gb,
          net_sent_kb: t.net_sent_kb,
          net_recv_kb: t.net_recv_kb,
          process_count: t.process_count,
          gpu_percent: t.gpu_percent || 0,
          gpu_mem_used_mb: t.gpu_mem_used_mb || 0,
          gpu_mem_total_mb: t.gpu_mem_total_mb || 0,
          gpu_name: t.gpu_name || '',
          health: t.health || 'HEALTHY',
          health_reasons: reasons
        },
        { upsert: true }
      );
      migratedTelemetry++;
    }
    logger.info(`  --> Migrated ${migratedTelemetry}/${telemetryRows.length} telemetry records.`);

    // 6. Migrate Process Snapshots
    logger.info('Migrating Process Snapshots...');
    const procRows = await queryAll<any>('SELECT * FROM process_snapshots');
    let migratedSnapshots = 0;
    for (const p of procRows) {
      let procs = [];
      try {
        procs = JSON.parse(p.processes_json);
      } catch {}

      await ProcessSnapshot.findOneAndUpdate(
        { node_id: p.node_id },
        {
          node_id: p.node_id,
          updated_at: p.updated_at,
          processes: procs
        },
        { upsert: true }
      );
      migratedSnapshots++;
    }
    logger.info(`  --> Migrated ${migratedSnapshots}/${procRows.length} process snapshots.`);

    // 7. Migrate Alerts
    logger.info('Migrating Alerts...');
    const alertRows = await queryAll<any>('SELECT * FROM alerts');
    let migratedAlerts = 0;
    for (const a of alertRows) {
      await Alert.findOneAndUpdate(
        { node_id: a.node_id, timestamp: a.timestamp, message: a.message },
        {
          node_id: a.node_id,
          timestamp: a.timestamp,
          time_str: a.time_str,
          level: a.level,
          message: a.message,
          resolved: Boolean(a.resolved)
        },
        { upsert: true }
      );
      migratedAlerts++;
    }
    logger.info(`  --> Migrated ${migratedAlerts}/${alertRows.length} alerts.`);

    // 8. Migrate Daily Reports
    logger.info('Migrating Daily Reports...');
    const reportRows = await queryAll<any>('SELECT * FROM daily_reports');
    let migratedReports = 0;
    for (const r of reportRows) {
      let summaryObj = {};
      try {
        if (r.summary_json) summaryObj = JSON.parse(r.summary_json);
      } catch {}

      await DailyReport.findOneAndUpdate(
        { node_id: r.node_id, report_date: r.report_date },
        {
          node_id: r.node_id,
          report_date: r.report_date,
          hostname: r.hostname,
          is_simulated: Boolean(r.is_simulated),
          avg_cpu: r.avg_cpu,
          max_cpu: r.max_cpu,
          avg_ram: r.avg_ram,
          max_ram: r.max_ram,
          avg_disk: r.avg_disk,
          max_disk: r.max_disk,
          avg_gpu: r.avg_gpu,
          max_gpu: r.max_gpu,
          uptime_percent: r.uptime_percent,
          samples_count: r.samples_count,
          alerts_count: r.alerts_count,
          generated_at: r.generated_at,
          summary: summaryObj
        },
        { upsert: true }
      );
      migratedReports++;
    }
    logger.info(`  --> Migrated ${migratedReports}/${reportRows.length} daily reports.`);

    // 9. Migrate SSH Nodes if table exists
    try {
      const sshRows = await queryAll<any>('SELECT * FROM ssh_nodes');
      let migratedSSH = 0;
      for (const s of sshRows) {
        await SSHNode.findOneAndUpdate(
          { node_id: s.node_id },
          {
            node_id: s.node_id,
            hostname: s.hostname,
            ip: s.ip,
            port: s.port,
            username: s.username,
            auth_type: s.auth_type,
            enc_secret: s.enc_secret,
            key_path: s.key_path,
            auto_poll: Boolean(s.auto_poll),
            poll_interval_sec: s.poll_interval_sec,
            consecutive_failures: s.consecutive_failures,
            last_status: s.last_status,
            last_polled: s.last_polled,
            last_software_scan: s.last_software_scan
          },
          { upsert: true }
        );
        migratedSSH++;
      }
      logger.info(`  --> Migrated ${migratedSSH}/${sshRows.length} SSH nodes.`);
    } catch {}

    // 10. Audit Log for forensic logging
    await AuditLog.create({
      timestamp: Date.now() / 1000,
      level: 'INFO',
      source: 'MigrationScript',
      message: 'SQLite database successfully migrated to MongoDB Atlas',
      details: JSON.stringify({
        nodes: migratedNodes,
        telemetry: migratedTelemetry,
        snapshots: migratedSnapshots,
        alerts: migratedAlerts,
        reports: migratedReports
      })
    });

    logger.info('====================================================');
    logger.info('[5/5] Migration to MongoDB Atlas Completed Successfully!');
    logger.info('====================================================');
  } catch (err) {
    logger.error('Migration failed:', err);
    throw err;
  } finally {
    db.close();
    await mongoose.connection.close();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
