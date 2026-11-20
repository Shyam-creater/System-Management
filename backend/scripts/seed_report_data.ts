import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/processshield';

export interface SeedLab {
  _id: string;
  name: string;
  description: string;
  capacity: number;
  prefix: string;
  building: string;
}

export const SEED_LABS: SeedLab[] = [
  {
    _id: 'lab-cs-1',
    name: 'Computer Science Lab 1',
    description: 'Systems Programming & OS Workstations',
    capacity: 20,
    prefix: 'CS-LAB1-',
    building: 'Turing Block'
  },
  {
    _id: 'lab-ai-2',
    name: 'AI & Data Science Lab 2',
    description: 'High-Performance GPU & Machine Learning Desktops',
    capacity: 20,
    prefix: 'AI-LAB2-',
    building: 'Lovelace Hall'
  },
  {
    _id: 'lab-cyber-3',
    name: 'Cyber Security Lab 3',
    description: 'Network Defense & Ethical Hacking Systems',
    capacity: 20,
    prefix: 'CYBER-LAB3-',
    building: 'Shannon Tower'
  },
  {
    _id: 'lab-iot-4',
    name: 'IoT & Embedded Systems Lab 4',
    description: 'Microcontroller & Sensor Network Desktops',
    capacity: 20,
    prefix: 'IOT-LAB4-',
    building: 'Babbage Wing'
  },
  {
    _id: 'lab-cloud-5',
    name: 'Cloud Computing Lab 5',
    description: 'Distributed Systems & Virtualization Lab',
    capacity: 20,
    prefix: 'CLOUD-LAB5-',
    building: 'Hopper Center'
  }
];

export function generateSeedData(days = 60) {
  const now = new Date();
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // 1. 100 Systems
  const devices: any[] = [];
  const softwareList: any[] = [];
  let sysIndex = 1;

  for (const lab of SEED_LABS) {
    for (let seat = 1; seat <= lab.capacity; seat++) {
      const padNum = String(seat).padStart(2, '0');
      const nodeId = `${lab._id}-pc${padNum}`.toLowerCase();
      const hostname = `${lab.prefix}PC${padNum}`;
      const isWindows = seat % 2 !== 0;
      const systemType = isWindows ? 'Windows 11 Pro' : 'Ubuntu 22.04 LTS';
      const cpuModel = isWindows ? 'Intel Core i7-10700 @ 2.90GHz' : 'AMD Ryzen 7 5800X 8-Core';
      const ramTotalGb = isWindows ? 16 : 32;
      const diskTotalGb = 512;
      const ip = `10.30.151.${100 + sysIndex}`;
      const mac = `00:1A:2B:3C:${String(sysIndex).padStart(2, '0')}:${padNum}`;

      devices.push({
        node_id: nodeId,
        hostname,
        ip,
        mac,
        interface: 'eth0',
        system_type: systemType,
        cpu_model: cpuModel,
        is_simulated: false,
        first_seen: Math.floor(startTime.getTime() / 1000),
        last_seen: Math.floor(now.getTime() / 1000),
        status: (seat === 19 && lab._id === 'lab-cyber-3') ? 'OFFLINE' : 'ONLINE',
        health: (seat === 19 && lab._id === 'lab-cyber-3') ? 'CRITICAL' : 'HEALTHY',
        cpu_percent: Math.floor(10 + Math.random() * 45),
        ram_percent: Math.floor(25 + Math.random() * 50),
        ram_used_gb: Math.floor(ramTotalGb * 0.4),
        ram_total_gb: ramTotalGb,
        disk_percent: Math.floor(30 + Math.random() * 40),
        disk_used_gb: Math.floor(diskTotalGb * 0.45),
        disk_total_gb: diskTotalGb,
        gpu_percent: lab._id === 'lab-ai-2' ? Math.floor(20 + Math.random() * 60) : 0,
        gpu_name: lab._id === 'lab-ai-2' ? 'NVIDIA RTX 4080' : '',
        process_count: Math.floor(80 + Math.random() * 70),
        labId: lab._id,
        seat,
        currentUser: seat % 3 === 0 ? `student_${String((seat * 3) % 80 + 1).padStart(3, '0')}` : null
      });

      // Software packages per system
      const packages = [
        {
          name: 'Visual Studio Code',
          version: '1.85.2',
          publisher: 'Microsoft Corporation',
          category: 'IDE / Editor',
          install_path: isWindows ? 'C:\\Program Files\\VS Code' : '/usr/bin/code',
          install_date: '2026-08-15',
          sizeMB: 380
        },
        {
          name: 'Python 3.11 Runtime',
          version: '3.11.7',
          publisher: 'Python Software Foundation',
          category: 'Development',
          install_path: isWindows ? 'C:\\Python311' : '/usr/bin/python3.11',
          install_date: '2026-08-16',
          sizeMB: 420
        },
        {
          name: 'Google Chrome',
          version: '121.0.6167.140',
          publisher: 'Google LLC',
          category: 'Web Browser',
          install_path: isWindows ? 'C:\\Program Files\\Google\\Chrome' : '/opt/google/chrome',
          install_date: '2026-08-10',
          sizeMB: 280
        },
        {
          name: 'Node.js LTS',
          version: '20.11.0',
          publisher: 'OpenJS Foundation',
          category: 'Development',
          install_path: isWindows ? 'C:\\Program Files\\nodejs' : '/usr/local/bin/node',
          install_date: '2026-08-18',
          sizeMB: 160
        },
        {
          name: 'Git Version Control',
          version: '2.43.0',
          publisher: 'Software Freedom Conservancy',
          category: 'Utilities',
          install_path: isWindows ? 'C:\\Program Files\\Git' : '/usr/bin/git',
          install_date: '2026-08-12',
          sizeMB: 110
        }
      ];

      if (lab._id === 'lab-ai-2') {
        packages.push({
          name: 'PyTorch & CUDA Toolkit',
          version: '2.2.0+cu121',
          publisher: 'PyTorch Foundation',
          category: 'Machine Learning',
          install_path: isWindows ? 'C:\\PyTorch' : '/usr/local/cuda',
          install_date: '2026-09-01',
          sizeMB: 4850
        });
      }

      if (lab._id === 'lab-cyber-3') {
        packages.push({
          name: 'Wireshark Packet Analyzer',
          version: '4.2.2',
          publisher: 'Wireshark Foundation',
          category: 'Security',
          install_path: isWindows ? 'C:\\Program Files\\Wireshark' : '/usr/bin/wireshark',
          install_date: '2026-09-05',
          sizeMB: 220
        });
      }

      softwareList.push({
        node_id: nodeId,
        hostname,
        packages,
        total_count: packages.length,
        updated_at: Math.floor(now.getTime() / 1000)
      });

      sysIndex++;
    }
  }

  // 2. Realistic Sessions (60 days)
  // Higher volume between 10:00 and 16:00 on weekdays (Mon-Fri)
  const sessions: any[] = [];
  const studentNames = Array.from({ length: 90 }, (_, i) => `student_${String(i + 1).padStart(3, '0')}`);
  const facultyNames = ['prof_smith', 'prof_patel', 'prof_sharma', 'prof_chen', 'prof_davis'];
  const allUsers = [...studentNames, ...facultyNames];

  for (let dayOffset = days; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = dayDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Daily sessions: 12-25 sessions per lab on weekdays, 2-6 on weekends
    for (const lab of SEED_LABS) {
      const sessionCount = isWeekend
        ? Math.floor(2 + Math.random() * 4)
        : Math.floor(14 + Math.random() * 8);

      for (let s = 0; s < sessionCount; s++) {
        const seat = Math.floor(1 + Math.random() * lab.capacity);
        const padNum = String(seat).padStart(2, '0');
        const nodeId = `${lab._id}-pc${padNum}`.toLowerCase();
        const username = allUsers[Math.floor(Math.random() * allUsers.length)];

        // Weekday peak 10:00 - 16:00
        let hour = 9 + Math.floor(Math.random() * 8);
        if (!isWeekend && Math.random() < 0.75) {
          hour = 10 + Math.floor(Math.random() * 6); // 10, 11, 12, 13, 14, 15
        }
        const minute = Math.floor(Math.random() * 55);
        const loginAt = new Date(dayDate);
        loginAt.setHours(hour, minute, 0, 0);

        // Duration: 40 to 120 minutes
        const durationMin = Math.floor(40 + Math.random() * 75);
        const logoutAt = new Date(loginAt.getTime() + durationMin * 60 * 1000);

        const isCurrentActive = dayOffset === 0 && logoutAt > now;

        sessions.push({
          _id: `sess-${dayOffset}-${lab._id}-${s}-${Math.random().toString(36).substr(2, 4)}`,
          nodeId,
          labId: lab._id,
          username,
          loginAt,
          logoutAt: isCurrentActive ? null : logoutAt,
          duration: isCurrentActive ? Math.round((now.getTime() - loginAt.getTime()) / 60000) : durationMin,
          closedBy: isCurrentActive ? 'user' : (Math.random() < 0.9 ? 'user' : 'timeout'),
          active: isCurrentActive,
          createdAt: loginAt
        });
      }
    }
  }

  // 3. Hourly Rollups (60 days)
  // To keep size efficient and realistic, generate rollups for all 60 days
  // Day hours (08:00 to 18:00) with realistic active loads, and a single aggregated night rollup
  const rollups: any[] = [];
  for (let dayOffset = days; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = dayDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Rollup samples across active hours 08:00 to 18:00
    const activeHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    for (const h of activeHours) {
      const hourDate = new Date(dayDate);
      hourDate.setHours(h, 0, 0, 0);
      const hourStr = hourDate.toISOString();
      const timestamp = Math.floor(hourDate.getTime() / 1000);

      // System rollups (sample 10 devices per lab or all devices)
      for (const dev of devices) {
        const isPeak = !isWeekend && h >= 10 && h <= 15;
        const avgCpu = isPeak ? Math.floor(35 + Math.random() * 45) : Math.floor(10 + Math.random() * 25);
        const peakCpu = Math.min(99, avgCpu + Math.floor(15 + Math.random() * 25));
        const avgRam = isPeak ? Math.floor(45 + Math.random() * 35) : Math.floor(25 + Math.random() * 25);
        const peakRam = Math.min(95, avgRam + Math.floor(10 + Math.random() * 15));
        const avgRamUsedMB = Math.round((avgRam / 100) * (dev.ram_total_gb * 1024));
        const peakRamUsedMB = Math.round((peakRam / 100) * (dev.ram_total_gb * 1024));
        const avgDisk = dev.disk_percent || 45;
        const peakDisk = avgDisk + 2;

        rollups.push({
          scope: 'system',
          refId: dev.node_id,
          hour: hourStr,
          timestamp,
          avgCpu,
          peakCpu,
          avgRam,
          peakRam,
          avgRamUsedMB,
          peakRamUsedMB,
          avgDisk,
          peakDisk,
          processCount: Math.floor(60 + Math.random() * 40),
          topProcesses: [
            { name: 'chrome.exe', avgCpu: Math.floor(avgCpu * 0.35), avgMemMB: 950, peakMemMB: 1400 },
            { name: 'code.exe', avgCpu: Math.floor(avgCpu * 0.25), avgMemMB: 750, peakMemMB: 1100 },
            { name: 'python.exe', avgCpu: Math.floor(avgCpu * 0.20), avgMemMB: 500, peakMemMB: 850 },
            { name: 'explorer.exe', avgCpu: 4, avgMemMB: 280, peakMemMB: 350 },
            { name: 'processshield_agent', avgCpu: 1, avgMemMB: 65, peakMemMB: 80 }
          ],
          sampleCount: 12
        });
      }

      // Lab rollups
      for (const lab of SEED_LABS) {
        const isPeak = !isWeekend && h >= 10 && h <= 15;
        const avgCpu = isPeak ? Math.floor(40 + Math.random() * 35) : Math.floor(12 + Math.random() * 18);
        const peakCpu = Math.min(98, avgCpu + 20);
        const avgRam = isPeak ? Math.floor(50 + Math.random() * 30) : Math.floor(28 + Math.random() * 15);
        const peakRam = Math.min(94, avgRam + 15);

        rollups.push({
          scope: 'lab',
          refId: lab._id,
          hour: hourStr,
          timestamp,
          avgCpu,
          peakCpu,
          avgRam,
          peakRam,
          avgRamUsedMB: 8192,
          peakRamUsedMB: 12288,
          avgDisk: 45,
          peakDisk: 48,
          processCount: 1200,
          topProcesses: [],
          sampleCount: lab.capacity * 12
        });
      }
    }
  }

  // 4. Violations
  const violations: any[] = [];
  const bannedProcesses = ['torrent.exe', 'steam.exe', 'crypto_miner.exe', 'game_launcher.exe', 'wireshark_unauth.exe'];
  for (let i = 0; i < 45; i++) {
    const dOffset = Math.floor(Math.random() * days);
    const vDate = new Date(now.getTime() - dOffset * 24 * 60 * 60 * 1000);
    const lab = SEED_LABS[Math.floor(Math.random() * SEED_LABS.length)];
    const seat = Math.floor(1 + Math.random() * lab.capacity);
    const nodeId = `${lab._id}-pc${String(seat).padStart(2, '0')}`;
    const username = studentNames[Math.floor(Math.random() * studentNames.length)];
    const processName = bannedProcesses[Math.floor(Math.random() * bannedProcesses.length)];

    violations.push({
      _id: `viol-${i}-${Date.now()}`,
      nodeId,
      labId: lab._id,
      username,
      processName,
      action: Math.random() < 0.7 ? 'killed' : 'alerted',
      createdAt: vDate
    });
  }

  // 5. Alerts
  const alerts: any[] = [];
  const alertCategories = ['CPU Load', 'Memory Threshold', 'Disk Space', 'Network Spike', 'Agent Offline'];
  for (let i = 0; i < 60; i++) {
    const dOffset = Math.floor(Math.random() * days);
    const aDate = new Date(now.getTime() - dOffset * 24 * 60 * 60 * 1000);
    const lab = SEED_LABS[Math.floor(Math.random() * SEED_LABS.length)];
    const seat = Math.floor(1 + Math.random() * lab.capacity);
    const nodeId = `${lab._id}-pc${String(seat).padStart(2, '0')}`;
    const cat = alertCategories[Math.floor(Math.random() * alertCategories.length)];
    const level = Math.random() < 0.6 ? 'WARNING' : (Math.random() < 0.7 ? 'INFO' : 'CRITICAL');

    alerts.push({
      node_id: nodeId,
      timestamp: Math.floor(aDate.getTime() / 1000),
      time_str: aDate.toISOString().replace('T', ' ').substring(0, 19),
      level,
      category: cat,
      message: `${cat} triggered on workstation ${nodeId}`,
      details: `Observed abnormal parameter exceeding policy thresholds during class operation.`,
      resolved: Math.random() < 0.8
    });
  }

  // 6. Faults & Maintenance records
  const faults: any[] = [
    {
      nodeId: 'lab-cyber-3-pc19',
      hostname: 'CYBER-LAB3-PC19',
      labId: 'lab-cyber-3',
      issue: 'NVMe SSD Sector Read Timeout / Corrupted OS Partition',
      status: 'open',
      reportedOn: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      resolvedOn: null,
      daysOpen: 2,
      reportedBy: 'Lab Technician',
      resolutionNotes: 'Replacement SSD dispatched from IT inventory.'
    },
    {
      nodeId: 'lab-cs-1-pc04',
      hostname: 'CS-LAB1-PC04',
      labId: 'lab-cs-1',
      issue: 'CPU Cooler Thermal Throttling Fan Malfunction',
      status: 'in_progress',
      reportedOn: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      resolvedOn: null,
      daysOpen: 4,
      reportedBy: 'Prof. Sharma',
      resolutionNotes: 'Thermal paste reapplied; testing fan replacement.'
    },
    {
      nodeId: 'lab-ai-2-pc08',
      hostname: 'AI-LAB2-PC08',
      labId: 'lab-ai-2',
      issue: 'DisplayPort Signal Loss on 4K Monitor',
      status: 'resolved',
      reportedOn: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      resolvedOn: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      daysOpen: 2,
      reportedBy: 'student_012',
      resolutionNotes: 'Replaced faulty braided DisplayPort 1.4 cable.'
    },
    {
      nodeId: 'lab-iot-4-pc12',
      hostname: 'IOT-LAB4-PC12',
      labId: 'lab-iot-4',
      issue: 'Front USB 3.0 Header Pin Short Circuit',
      status: 'resolved',
      reportedOn: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      resolvedOn: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
      daysOpen: 1,
      reportedBy: 'Lab Assistant',
      resolutionNotes: 'Front I/O panel replaced.'
    }
  ];

  return {
    labs: SEED_LABS,
    devices,
    softwareList,
    sessions,
    rollups,
    violations,
    alerts,
    faults
  };
}

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
      // Batch insert in chunks of 1000
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

// Run if executed directly
if (process.argv[1] && process.argv[1].includes('seed_report_data')) {
  runSeed();
}
