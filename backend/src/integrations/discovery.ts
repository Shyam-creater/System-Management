import dgram from 'dgram';
import os from 'os';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const DISCOVERY_PORT = env.DISCOVERY_PORT || 8081;
const MAGIC_REQUEST = 'PROCESSSHIELD_DISCOVER_V1';

export class DiscoveryService {
  private socket: dgram.Socket | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private running = false;

  start(masterPort: number) {
    if (this.running) return;
    this.running = true;

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', (err) => {
        logger.warn(`Discovery socket warning: ${err.message}`);
      });

      this.socket.on('message', (msg, rinfo) => {
        if (msg.toString().trim() === MAGIC_REQUEST) {
          const payload = Buffer.from(JSON.stringify({
            service: 'ProcessShield-Master',
            version: '2.0',
            ip: '127.0.0.1',
            port: masterPort,
            hostname: os.hostname()
          }));
          this.socket?.send(payload, rinfo.port, rinfo.address);
        }
      });

      this.socket.bind(DISCOVERY_PORT, () => {
        try {
          this.socket?.setBroadcast(true);
        } catch {}
        logger.info(`[Discovery] UDP Auto-Discovery Service listening on port ${DISCOVERY_PORT}`);
      });

      const beaconPayload = Buffer.from(JSON.stringify({
        service: 'ProcessShield-Master',
        version: '2.0',
        ip: '127.0.0.1',
        port: masterPort,
        hostname: os.hostname()
      }));

      this.intervalTimer = setInterval(() => {
        if (this.socket) {
          try {
            this.socket.send(beaconPayload, DISCOVERY_PORT, '255.255.255.255');
            this.socket.send(beaconPayload, DISCOVERY_PORT, '127.0.0.1');
          } catch {}
        }
      }, 5000);
    } catch (err: any) {
      logger.warn(`Could not start UDP discovery service: ${err.message}`);
    }
  }

  stop() {
    this.running = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }
}

export const discoveryService = new DiscoveryService();
