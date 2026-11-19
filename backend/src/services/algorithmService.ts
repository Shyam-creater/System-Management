export interface CycleResult {
  hasCycle: boolean;
  cyclePath: string[];
  involvedProcesses: string[];
}

export class WaitForGraphService {
  private adj: Map<string, Set<string>> = new Map();
  private processes: Set<string> = new Set();

  addProcess(p: string) {
    this.processes.add(p);
    if (!this.adj.has(p)) {
      this.adj.set(p, new Set());
    }
  }

  addWaitEdge(fromProc: string, toProc: string) {
    this.addProcess(fromProc);
    this.addProcess(toProc);
    this.adj.get(fromProc)!.add(toProc);
  }

  detectDeadlock(): CycleResult {
    // 0: White (unvisited), 1: Gray (in recursion stack), 2: Black (visited)
    const color = new Map<string, number>();
    const parent = new Map<string, string>();
    let cyclePath: string[] = [];

    for (const p of this.processes) {
      color.set(p, 0);
    }

    const dfs = (u: string): boolean => {
      color.set(u, 1);
      const neighbors = this.adj.get(u) || new Set();

      for (const v of neighbors) {
        if (color.get(v) === 1) {
          // Back-edge detected! Reconstruct cycle
          let curr = u;
          const path = [v, curr];
          while (curr !== v && parent.has(curr)) {
            curr = parent.get(curr)!;
            path.push(curr);
          }
          path.reverse();
          cyclePath = path;
          return true;
        }

        if (color.get(v) === 0) {
          parent.set(v, u);
          if (dfs(v)) return true;
        }
      }

      color.set(u, 2);
      return false;
    };

    for (const p of Array.from(this.processes).sort()) {
      if (color.get(p) === 0) {
        if (dfs(p)) {
          return {
            hasCycle: true,
            cyclePath,
            involvedProcesses: Array.from(new Set(cyclePath))
          };
        }
      }
    }

    return {
      hasCycle: false,
      cyclePath: [],
      involvedProcesses: []
    };
  }
}

export interface BankersResult {
  isSafe: boolean;
  safeSequence: number[];
  unsatisfiedProcesses: number[];
  needMatrix: number[][];
}

export class BankersAlgorithmService {
  checkSafety(allocation: number[][], max: number[][], available: number[]): BankersResult {
    const numProcesses = allocation.length;
    const numResources = available.length;

    // Calculate Need matrix: Need = Max - Allocation
    const need: number[][] = [];
    for (let i = 0; i < numProcesses; i++) {
      need[i] = [];
      for (let j = 0; j < numResources; j++) {
        need[i][j] = max[i][j] - allocation[i][j];
      }
    }

    const work = [...available];
    const finish = new Array(numProcesses).fill(false);
    const safeSequence: number[] = [];

    let count = 0;
    while (count < numProcesses) {
      let found = false;
      for (let p = 0; p < numProcesses; p++) {
        if (!finish[p]) {
          let canAllocate = true;
          for (let r = 0; r < numResources; r++) {
            if (need[p][r] > work[r]) {
              canAllocate = false;
              break;
            }
          }

          if (canAllocate) {
            for (let r = 0; r < numResources; r++) {
              work[r] += allocation[p][r];
            }
            safeSequence.push(p);
            finish[p] = true;
            found = true;
            count++;
          }
        }
      }

      if (!found) break;
    }

    const isSafe = count === numProcesses;
    const unsatisfiedProcesses: number[] = [];
    if (!isSafe) {
      for (let p = 0; p < numProcesses; p++) {
        if (!finish[p]) unsatisfiedProcesses.push(p);
      }
    }

    return {
      isSafe,
      safeSequence,
      unsatisfiedProcesses,
      needMatrix: need
    };
  }

  requestResources(
    processId: number,
    request: number[],
    allocation: number[][],
    max: number[][],
    available: number[]
  ): { granted: boolean; message: string; result?: BankersResult } {
    const numResources = available.length;
    const need = max[processId].map((m, j) => m - allocation[processId][j]);

    // Check 1: Request <= Need
    for (let j = 0; j < numResources; j++) {
      if (request[j] > need[j]) {
        return { granted: false, message: `Error: Process P${processId} exceeded its maximum declared claim.` };
      }
    }

    // Check 2: Request <= Available
    for (let j = 0; j < numResources; j++) {
      if (request[j] > available[j]) {
        return { granted: false, message: `Process P${processId} must wait: insufficient available resources.` };
      }
    }

    // Pretend to allocate
    const tempAvail = available.map((a, j) => a - request[j]);
    const tempAlloc = allocation.map((row, i) =>
      i === processId ? row.map((a, j) => a + request[j]) : [...row]
    );

    const safety = this.checkSafety(tempAlloc, max, tempAvail);
    if (safety.isSafe) {
      return {
        granted: true,
        message: `Resource request granted! System remains in SAFE state (Safe Sequence: ${safety.safeSequence.map(p => `P${p}`).join(' -> ')})`,
        result: safety
      };
    } else {
      return {
        granted: false,
        message: `Resource request DENIED (Rollback applied): Granting request would lead to an UNSAFE deadlock state!`,
        result: safety
      };
    }
  }
}

export const bankersService = new BankersAlgorithmService();
