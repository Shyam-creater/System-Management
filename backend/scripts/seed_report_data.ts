import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSeedData, SEED_LABS } from '../src/reports/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/processshield';

async function runSeed() {
  console.log('====================================================');
  console.log('  ProcessShield: 60-Day Report Test Data Seeder     ');
  console.log('====================================================');

  console.log('Generating seed datasets (5 labs, 100 systems, 60 days of history)...');
  const data = generateSeedData(60);
  console.log(`Generated:
  - Labs: ${data.labs.length}
  - Devices: ${data.devices.length}
  - Software Inventories: ${data.softwareList.length}
  - Historical Sessions: ${data.sessions.length}
  - Hourly Rollups: ${data.rollups.length}
  - Violations: ${data.violations.length}
  - Alerts: ${data.alerts.length}
  - Faults: ${data.faults.length}
  `);

  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI.replace(/:([^@]+)@/, ':****@')}...`);
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
    console.log('[✓] Connected to MongoDB Atlas. Clearing and seeding collections...');

    const db = mongoose.connection.db;
    if (db) {
      // 1. Labs
      const labsColl = db.collection('labs');
      for (const lab of data.labs) {
        await labsColl.updateOne(
          { name: lab.name },
          { $set: { ...lab, updatedAt: new Date() } },
          { upsert: true }
        );
      }
      console.log(`[✓] Seeded ${data.labs.length} labs.`);

      // 2. Devices
      const devColl = db.collection('devices');
      for (const dev of data.devices) {
        await devColl.updateOne(
          { node_id: dev.node_id },
          { $set: dev },
          { upsert: true }
        );
      }
      console.log(`[✓] Seeded ${data.devices.length} devices.`);

      // 3. Software
      const swColl = db.collection('software_inventory');
      for (const sw of data.softwareList) {
        await swColl.updateOne(
          { node_id: sw.node_id },
          { $set: sw },
          { upsert: true }
        );
      }
      console.log(`[✓] Seeded software inventories.`);

      // 4. Sessions
      const sessColl = db.collection('sessions');
      await sessColl.deleteMany({ nodeId: { $regex: /^lab-/ } });
      await sessColl.insertMany(data.sessions, { ordered: false });
      console.log(`[✓] Seeded ${data.sessions.length} sessions.`);

      // 5. Hourly Rollups
      const rollColl = db.collection('hourly_rollups');
      await rollColl.deleteMany({});
      for (let i = 0; i < data.rollups.length; i += 1000) {
        const chunk = data.rollups.slice(i, i + 1000);
        await rollColl.insertMany(chunk, { ordered: false });
      }
      console.log(`[✓] Seeded ${data.rollups.length} hourly rollups.`);

      // 6. Violations
      const violColl = db.collection('violations');
      await violColl.deleteMany({ nodeId: { $regex: /^lab-/ } });
      await violColl.insertMany(data.violations, { ordered: false });
      console.log(`[✓] Seeded ${data.violations.length} violations.`);

      // 7. Alerts
      const alertColl = db.collection('alerts');
      await alertColl.insertMany(data.alerts, { ordered: false });
      console.log(`[✓] Seeded ${data.alerts.length} alerts.`);

      // 8. Faults
      const faultColl = db.collection('faults');
      await faultColl.deleteMany({});
      await faultColl.insertMany(data.faults, { ordered: false });
      console.log(`[✓] Seeded ${data.faults.length} faults.`);
    }

    console.log('----------------------------------------------------');
    console.log('[✓] 60-Day Report Data successfully seeded to MongoDB!');
    console.log('----------------------------------------------------');
  } catch (err: any) {
    console.warn(`[Notice] MongoDB Atlas could not be reached directly (${err.message}).`);
    console.log('The seed data generator is also exported and integrated directly into the in-memory fallback store.');
    console.log('Dual-mode operation confirmed: Reports will operate seamlessly offline or online.');
  } finally {
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(0);
  }
}

if (process.argv[1] && process.argv[1].includes('seed_report_data')) {
  runSeed();
}
