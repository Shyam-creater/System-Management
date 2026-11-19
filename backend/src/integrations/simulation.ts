import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let simulatorProcess: ChildProcess | null = null;

const PYTHON_BIN = process.platform === 'win32'
  ? 'C:\\Users\\Administrator\\anaconda3\\python.exe'
  : 'python3';

const SIMULATOR_SCRIPT = path.resolve(__dirname, '../../../simulator.py');

export const toggleSimulator = (serverPort: number): boolean => {
  if (simulatorProcess && simulatorProcess.exitCode === null) {
    try {
      simulatorProcess.kill();
    } catch {}
    simulatorProcess = null;
    logger.info('[Simulator] Virtual fleet simulator stopped.');
    return false;
  } else {
    try {
      simulatorProcess = spawn(
        PYTHON_BIN,
        [
          SIMULATOR_SCRIPT,
          `--server=http://127.0.0.1:${serverPort}`,
          `--key=${env.PROCESSSHIELD_KEY}`
        ],
        { stdio: 'ignore', detached: false }
      );

      simulatorProcess.on('exit', () => {
        simulatorProcess = null;
        logger.info('[Simulator] Simulator process exited.');
      });

      logger.info(`[Simulator] Virtual fleet simulator launched pointing to http://127.0.0.1:${serverPort}`);
      return true;
    } catch (err) {
      logger.error(`Failed to launch simulator process: ${err}`);
      return false;
    }
  }
};

export const isSimulatorRunning = (): boolean => {
  return simulatorProcess !== null && simulatorProcess.exitCode === null;
};
