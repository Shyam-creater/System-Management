import { spawn } from 'child_process';
import path from 'path';
import { softwareRepository } from '../repositories/softwareRepository.js';
import { logger } from '../utils/logger.js';
import os from 'os';

const PYTHON_BIN = process.platform === 'win32'
  ? 'C:\\Users\\Administrator\\anaconda3\\python.exe'
  : 'python3';

const SCRIPT_PATH = path.resolve(__dirname, '../../../software_inventory.py');

export class SoftwareService {
  async scanLocalSoftware(forceRefresh = false): Promise<any[]> {
    const hostname = os.hostname();
    const nodeId = `local-${hostname}`;

    if (!forceRefresh) {
      const cached = await softwareRepository.findByNode(nodeId);
      if (cached && (Date.now() / 1000 - cached.updated_at < 60)) {
        return cached.packages;
      }
    }

    const scriptDir = path.dirname(SCRIPT_PATH).replace(/\\/g, '/');
    const pythonCode = `
import json, sys
sys.path.insert(0, '${scriptDir}')
import software_inventory
pkgs = software_inventory.scan_installed_software(force_refresh=${forceRefresh ? 'True' : 'False'})
print(json.dumps(pkgs))
sys.stdout.flush()
`;

    return new Promise((resolve) => {
      const child = spawn(PYTHON_BIN, ['-u', '-']);
      let stdout = '';
      let stderr = '';
      let finished = false;

      const timer = setTimeout(async () => {
        if (!finished) {
          finished = true;
          try { child.kill(); } catch {}
          logger.warn('Software scan timed out after 12s, returning cached/fallback.');
          const cached = await softwareRepository.findByNode(nodeId);
          resolve(cached?.packages || []);
        }
      }, 12000);

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', async (code) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        if (code !== 0 || !stdout.trim()) {
          logger.error(`Error invoking software_inventory.py: ${stderr}`);
          const cached = await softwareRepository.findByNode(nodeId);
          resolve(cached?.packages || []);
          return;
        }

        try {
          const packages = JSON.parse(stdout.trim());
          await softwareRepository.save(nodeId, hostname, packages);
          resolve(packages);
        } catch (parseErr) {
          logger.error(`Failed to parse software inventory JSON: ${parseErr}`);
          resolve([]);
        }
      });

      child.stdin.write(pythonCode);
      child.stdin.end();
    });
  }

  async exportSoftware(format: 'xlsx' | 'csv'): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const todayStr = new Date().toISOString().split('T')[0];
    const exportDir = path.dirname(SCRIPT_PATH).replace(/\\/g, '/');

    const pythonCode = `
import sys, io
sys.path.insert(0, '${exportDir}')
import software_inventory
pkgs = software_inventory.scan_installed_software(force_refresh=False)
if '${format}' == 'xlsx':
    data = software_inventory.generate_software_xlsx(pkgs)
    sys.stdout.buffer.write(data)
else:
    data = software_inventory.generate_software_csv(pkgs)
    sys.stdout.buffer.write(data.encode('utf-8'))
sys.stdout.flush()
`;

    return new Promise((resolve, reject) => {
      const child = spawn(PYTHON_BIN, ['-u', '-']);
      const chunks: Buffer[] = [];
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Failed to export software inventory: ${stderr}`);
          reject(new Error(stderr || 'Export failed'));
          return;
        }

        const buffer = Buffer.concat(chunks);
        if (format === 'xlsx') {
          resolve({
            buffer,
            filename: `Installed_Software_Inventory_${todayStr}.xlsx`,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
        } else {
          resolve({
            buffer,
            filename: `Installed_Software_Inventory_${todayStr}.csv`,
            contentType: 'text/csv'
          });
        }
      });

      child.stdin.write(pythonCode);
      child.stdin.end();
    });
  }
}

export const softwareService = new SoftwareService();
