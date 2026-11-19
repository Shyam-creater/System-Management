import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { deviceRepository } from '../repositories/deviceRepository.js';
import { processRepository } from '../repositories/processRepository.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { softwareRepository } from '../repositories/softwareRepository.js';
import { SSHNode } from '../models/SSHNode.js';
import { isDatabaseConnected } from '../config/database.js';
import { logger } from '../utils/logger.js';

const PYTHON_BIN = 'C:\\Users\\Administrator\\anaconda3\\python.exe';
const ROOT_DIR = path.resolve(process.cwd(), '..');
const PERSISTENT_FILE = path.join(ROOT_DIR, 'data', 'ssh_nodes.json');

const memorySSHNodes = new Map<string, any>();
let monitorInterval: NodeJS.Timeout | null = null;

export interface SSHConnectionParams {
  ip: string;
  port?: number;
  username: string;
  auth_type?: 'password' | 'key';
  password?: string;
  key_data?: string;
  key_path?: string;
  passphrase?: string;
  hostname?: string;
}

export class SSHService {
  constructor() {
    this.loadPersistentNodes();
  }

  private loadPersistentNodes() {
    try {
      if (fs.existsSync(PERSISTENT_FILE)) {
        const raw = fs.readFileSync(PERSISTENT_FILE, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.node_id) {
              memorySSHNodes.set(item.node_id, item);
            }
          }
          logger.info(`[SSHService] Loaded ${memorySSHNodes.size} persistent SSH nodes from disk.`);
        }
      }
    } catch (e: any) {
      logger.error(`[SSHService] Failed to load persistent SSH nodes: ${e.message}`);
    }
  }

  private savePersistentNodes() {
    try {
      const list = Array.from(memorySSHNodes.values());
      const dir = path.dirname(PERSISTENT_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PERSISTENT_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e: any) {
      logger.error(`[SSHService] Failed to save persistent SSH nodes: ${e.message}`);
    }
  }

  private runPythonHelper(script: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = spawn(PYTHON_BIN, ['-u', '-'], {
        cwd: ROOT_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONPATH: ROOT_DIR }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        try {
          const lines = stdout.trim().split('\n');
          let jsonLine = '';
          for (let i = lines.length - 1; i >= 0; i--) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              jsonLine = trimmed;
              break;
            }
          }
          if (!jsonLine) {
            throw new Error('No JSON output from Python. Stderr: ' + stderr);
          }
          const parsed = JSON.parse(jsonLine);
          resolve(parsed);
        } catch (err: any) {
          if (code !== 0) {
            reject(new Error(stderr || `Python exit code ${code}`));
          } else {
            reject(new Error(`Failed to parse Python JSON output: ${err.message}`));
          }
        }
      });

      child.stdin.write(script);
      child.stdin.end();
    });
  }

  async testConnection(params: SSHConnectionParams): Promise<{ success: boolean; info?: any; error?: string }> {
    const pyScript = `
import sys, json, ssh_manager
input_data = json.loads(r'''${JSON.stringify(params)}''')
ip = input_data.get('ip', '').strip()
port = int(input_data.get('port', 22))
username = input_data.get('username', 'ubuntu').strip()
auth_type = input_data.get('auth_type', 'password')
password = input_data.get('password')
key_data = input_data.get('key_data')
key_path = input_data.get('key_path')
passphrase = input_data.get('passphrase')

if not ip:
    print(json.dumps({'success': False, 'error': 'IP address is required'}))
    sys.exit(0)

if not ssh_manager.validate_ip(ip):
    print(json.dumps({'success': False, 'error': f"Invalid IP address: '{ip}'"}))
    sys.exit(0)

success, res_data = ssh_manager.test_connection(
    ip=ip, port=port, username=username,
    auth_type=auth_type, password=password,
    key_data=key_data, key_path=key_path,
    passphrase=passphrase
)

if success:
    print(json.dumps({'success': True, 'info': res_data}))
else:
    print(json.dumps({'success': False, 'error': res_data.get('error', 'SSH connection failed')}))
`;

    try {
      return await this.runPythonHelper(pyScript);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async collectNodeTelemetry(node: any, scanSoftware = false): Promise<any> {
    const pyScript = `
import sys, json, ssh_manager
node_info = json.loads(r'''${JSON.stringify(node)}''')
ip = node_info['ip']
port = int(node_info.get('port', 22))
username = node_info.get('username', 'ubuntu')
auth_type = node_info.get('auth_type', 'password')
secret = node_info.get('enc_secret', '')
key_path = node_info.get('key_path', '')
password = secret if auth_type == 'password' else None
key_data = secret if auth_type == 'key' and not key_path else None

try:
    client = ssh_manager.create_ssh_client(
        ip=ip, port=port, username=username, auth_type=auth_type,
        password=password, key_data=key_data, key_path=key_path, timeout=8
    )
    telem = ssh_manager.collect_telemetry(client, timeout=10)
    packages = []
    if ${scanSoftware ? 'True' : 'False'}:
        try:
            packages = ssh_manager.collect_installed_software(client, timeout=15)
        except Exception:
            pass
    client.close()
    print(json.dumps({'success': True, 'telemetry': telem, 'packages': packages}))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
`;

    try {
      const res = await this.runPythonHelper(pyScript);
      if (res.success && res.telemetry) {
        const t = res.telemetry;
        const nodeId = node.node_id;
        const now = Date.now() / 1000;
        const timeStr = new Date().toTimeString().split(' ')[0];

        // Evaluate health status
        let computedHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
        if (t.cpu_percent >= 85 || t.ram_percent >= 90 || t.disk_percent >= 95) {
          computedHealth = 'CRITICAL';
        } else if (t.cpu_percent >= 70 || t.ram_percent >= 75 || t.disk_percent >= 85) {
          computedHealth = 'WARNING';
        }

        // 1. Update Device repository with ALL metrics
        await deviceRepository.upsert({
          node_id: nodeId,
          hostname: t.hostname || node.hostname,
          ip: node.ip,
          mac: t.mac || null,
          interface: t.interface || 'eth0',
          system_type: `${t.os || 'Ubuntu Linux'} (${t.cpu_model || 'x86_64'})`,
          is_simulated: false,
          is_ssh_agentless: true,
          status: 'ONLINE' as const,
          health: computedHealth,
          last_seen: now,
          cpu_percent: t.cpu_percent || 0,
          ram_percent: t.ram_percent || 0,
          ram_used_gb: t.ram_used_gb || 0,
          ram_total_gb: t.ram_total_gb || 1,
          disk_percent: t.disk_percent || 0,
          disk_used_gb: t.disk_used_gb || 0,
          disk_total_gb: t.disk_total_gb || 1,
          gpu_percent: t.gpu_percent || 0,
          gpu_name: t.gpu_name || undefined,
          process_count: t.processes ? t.processes.length : 0
        });

        // 2. Save Process Snapshot into ProcessRepository
        if (t.processes && Array.isArray(t.processes)) {
          await processRepository.saveSnapshot(nodeId, t.processes);
        }

        // 3. Record historical telemetry into TelemetryRepository
        await telemetryRepository.create({
          node_id: nodeId,
          timestamp: now,
          time_str: timeStr,
          cpu_percent: t.cpu_percent || 0,
          ram_percent: t.ram_percent || 0,
          ram_used_gb: t.ram_used_gb || 0,
          ram_total_gb: t.ram_total_gb || 1,
          disk_percent: t.disk_percent || 0,
          disk_used_gb: t.disk_used_gb || 0,
          disk_total_gb: t.disk_total_gb || 1,
          process_count: t.processes ? t.processes.length : 0,
          health: computedHealth
        });

        // 4. Save Software Catalog if collected
        if (res.packages && Array.isArray(res.packages) && res.packages.length > 0) {
          await softwareRepository.save(nodeId, t.hostname || node.hostname, res.packages);
        }

        return { success: true, telemetry: t };
      } else {
        // Mark node as OFFLINE while preserving identity
        await deviceRepository.upsert({
          node_id: node.node_id,
          hostname: node.hostname,
          ip: node.ip,
          is_simulated: false,
          is_ssh_agentless: true,
          status: 'OFFLINE' as const,
          health: 'CRITICAL' as const,
          last_seen: Date.now() / 1000
        });
        return { success: false, error: res.error || 'Failed to poll SSH node' };
      }
    } catch (err: any) {
      await deviceRepository.upsert({
        node_id: node.node_id,
        hostname: node.hostname,
        ip: node.ip,
        is_simulated: false,
        is_ssh_agentless: true,
        status: 'OFFLINE' as const,
        health: 'CRITICAL' as const,
        last_seen: Date.now() / 1000
      });
      return { success: false, error: err.message };
    }
  }

  async registerSSHNode(params: SSHConnectionParams): Promise<any> {
    const testRes = await this.testConnection(params);
    if (!testRes.success) {
      throw new Error(testRes.error || 'SSH connection test failed');
    }

    const testInfo = testRes.info || {};
    const hostname = params.hostname || testInfo.hostname || params.ip;
    const nodeId = `${hostname} (${params.ip})`;

    const record = {
      node_id: nodeId,
      hostname: hostname,
      ip: params.ip,
      port: params.port || 22,
      username: params.username,
      auth_type: params.auth_type || 'password',
      enc_secret: params.password || params.key_data || '',
      key_path: params.key_path || '',
      auto_poll: true,
      poll_interval_sec: 10,
      last_status: 'ONLINE',
      last_polled: Date.now() / 1000
    };

    memorySSHNodes.set(nodeId, record);
    this.savePersistentNodes();

    if (isDatabaseConnected()) {
      try {
        await SSHNode.findOneAndUpdate(
          { node_id: nodeId },
          { $set: record },
          { upsert: true, new: true }
        );
      } catch {}
    }

    // Immediately poll and store full telemetry and processes synchronously
    try {
      await this.collectNodeTelemetry(record, false);
    } catch (e: any) {
      logger.error(`Initial telemetry poll failed for ${nodeId}: ${e.message}`);
    }

    // Scan software in background
    setTimeout(() => {
      this.scanSSHSoftware(nodeId).catch(() => {});
    }, 1000);

    return {
      status: 'ok',
      message: `Computer '${hostname}' (${params.ip}) registered successfully via SSH`,
      node_id: nodeId,
      hostname: hostname,
      ip: params.ip,
      os: testInfo.os || 'Ubuntu Linux'
    };
  }

  async getAllSSHNodes(): Promise<any[]> {
    if (memorySSHNodes.size === 0) {
      this.loadPersistentNodes();
    }
    if (isDatabaseConnected()) {
      try {
        const fromDb = await SSHNode.find().lean();
        if (fromDb.length > 0) return fromDb;
      } catch {}
    }
    return Array.from(memorySSHNodes.values());
  }

  async removeSSHNode(nodeId: string): Promise<boolean> {
    memorySSHNodes.delete(nodeId);
    this.savePersistentNodes();

    if (isDatabaseConnected()) {
      try {
        await SSHNode.deleteOne({ node_id: nodeId });
      } catch {}
    }

    await deviceRepository.purgeOffline(0);
    return true;
  }

  async pollSingleNode(nodeId: string): Promise<any> {
    let node = memorySSHNodes.get(nodeId);
    if (!node && isDatabaseConnected()) {
      node = await SSHNode.findOne({ node_id: nodeId }).lean();
    }
    if (!node) {
      throw new Error(`SSH Node not found: ${nodeId}`);
    }

    return await this.collectNodeTelemetry(node, false);
  }

  async scanSSHSoftware(nodeId: string): Promise<any[]> {
    let node = memorySSHNodes.get(nodeId);
    if (!node && isDatabaseConnected()) {
      node = await SSHNode.findOne({ node_id: nodeId }).lean();
    }
    if (!node) return [];

    const res = await this.collectNodeTelemetry(node, true);
    if (res.success) {
      const cached = await softwareRepository.findByNode(nodeId);
      return cached?.packages || [];
    }
    return [];
  }

  startBackgroundMonitor(intervalMs = 10000) {
    if (monitorInterval) return;

    logger.info(`[SSHMonitor] Autonomous SSH polling loop initialized (${intervalMs / 1000}s cadence).`);

    // Initial poll of all registered nodes
    setTimeout(async () => {
      const nodes = await this.getAllSSHNodes();
      for (const node of nodes) {
        try {
          await this.collectNodeTelemetry(node, false);
        } catch {}
      }
    }, 1500);

    monitorInterval = setInterval(async () => {
      const nodes = await this.getAllSSHNodes();
      for (const node of nodes) {
        if (!node.auto_poll && node.auto_poll !== undefined) continue;
        try {
          await this.collectNodeTelemetry(node, false);
        } catch (err: any) {
          logger.error(`[SSHMonitor] Poll error for ${node.node_id}: ${err.message}`);
        }
      }
    }, intervalMs);
  }

  stopBackgroundMonitor() {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
  }
}

export const sshService = new SSHService();
