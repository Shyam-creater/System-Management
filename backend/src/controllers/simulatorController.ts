import { Request, Response } from 'express';
import { toggleSimulator, isSimulatorRunning } from '../integrations/simulation.js';
import { env } from '../config/env.js';

export class SimulatorController {
  async toggle(req: Request, res: Response) {
    const running = toggleSimulator(env.PORT);
    return res.json({ status: 'ok', running });
  }

  async getStatus(req: Request, res: Response) {
    return res.json({ running: isSimulatorRunning() });
  }
}

export const simulatorController = new SimulatorController();
