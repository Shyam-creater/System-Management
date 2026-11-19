import { Request, Response } from 'express';
import { WaitForGraphService, bankersService } from '../services/algorithmService.js';

export class AlgorithmController {
  async runDeadlockSimulation(req: Request, res: Response) {
    const scenario = req.body.scenario || 'classic_2p';
    const wfg = new WaitForGraphService();

    let description = '';
    if (scenario === 'classic_2p') {
      // P1 holds R1, requests R2 (held by P2)
      // P2 holds R2, requests R1 (held by P1)
      description = 'Classic 2-Process Deadlock: P1 holds R1 and wants R2; P2 holds R2 and wants R1';
      wfg.addWaitEdge('P1', 'P2');
      wfg.addWaitEdge('P2', 'P1');
    } else if (scenario === 'cycle_3p') {
      description = '3-Process Circular Wait: P1 -> P2 -> P3 -> P1';
      wfg.addWaitEdge('P1', 'P2');
      wfg.addWaitEdge('P2', 'P3');
      wfg.addWaitEdge('P3', 'P1');
    } else if (scenario === 'safe_acyclic') {
      description = 'Safe Acyclic Execution: P1 -> P2 -> P3 (No cycle)';
      wfg.addWaitEdge('P1', 'P2');
      wfg.addWaitEdge('P2', 'P3');
    }

    const deadlockResult = wfg.detectDeadlock();
    return res.json({
      scenario,
      description,
      isDeadlocked: deadlockResult.hasCycle,
      cyclePath: deadlockResult.cyclePath,
      involvedProcesses: deadlockResult.involvedProcesses,
      wfgCycleDescription: deadlockResult.hasCycle
        ? deadlockResult.cyclePath.join(' -> ')
        : 'None (Safe acyclic execution)'
    });
  }

  async runBankersSafety(req: Request, res: Response) {
    const scenario = req.body.scenario || 'safe';

    let allocation: number[][];
    let max: number[][];
    let available: number[];

    if (scenario === 'safe') {
      // Classic 5-process, 3-resource safe state
      allocation = [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2]
      ];
      max = [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3]
      ];
      available = [3, 3, 2];
    } else {
      // Unsafe case with depleted available resources
      allocation = [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2]
      ];
      max = [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3]
      ];
      available = [1, 0, 0];
    }

    const result = bankersService.checkSafety(allocation, max, available);
    return res.json({
      scenario,
      allocation,
      max,
      available,
      ...result,
      safeSequenceFormatted: result.isSafe
        ? result.safeSequence.map(p => `P${p}`).join(' -> ')
        : 'None (System in UNSAFE state)'
    });
  }

  async requestBankersResources(req: Request, res: Response) {
    const { processId, request, allocation, max, available } = req.body;
    if (processId === undefined || !request || !allocation || !max || !available) {
      return res.status(400).json({ error: 'Missing required matrices or request vector' });
    }

    const outcome = bankersService.requestResources(processId, request, allocation, max, available);
    return res.json(outcome);
  }
}

export const algorithmController = new AlgorithmController();
