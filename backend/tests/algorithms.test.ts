import { bankersService, WaitForGraphService } from '../src/services/algorithmService.js';

function runAlgorithmicVerification() {
  console.log('====================================================');
  console.log('   ProcessShield Backend Algorithmic Unit Tests    ');
  console.log('====================================================');

  // Test 1: WFG Cycle Detection (Deadlock)
  console.log('\n[Test 1] Wait-For Graph: 2-Process Cycle Detection (P1 <-> P2)...');
  const wfg1 = new WaitForGraphService();
  wfg1.addWaitEdge('P1', 'P2');
  wfg1.addWaitEdge('P2', 'P1');
  const res1 = wfg1.detectDeadlock();
  if (!res1.hasCycle || res1.cyclePath.length < 2) {
    throw new Error('Test 1 Failed: Expected deadlock cycle!');
  }
  console.log(`  --> PASS: Deadlock cycle detected: ${res1.cyclePath.join(' -> ')}`);

  // Test 2: WFG Acyclic Verification (Safe)
  console.log('\n[Test 2] Wait-For Graph: Acyclic Graph (P1 -> P2 -> P3)...');
  const wfg2 = new WaitForGraphService();
  wfg2.addWaitEdge('P1', 'P2');
  wfg2.addWaitEdge('P2', 'P3');
  const res2 = wfg2.detectDeadlock();
  if (res2.hasCycle) {
    throw new Error('Test 2 Failed: Expected acyclic graph without deadlock!');
  }
  console.log('  --> PASS: Verified safe acyclic execution without deadlock.');

  // Test 3: Banker's Algorithm Safe State
  console.log("\n[Test 3] Banker's Algorithm: Classic Safe Case (5 Processes, 3 Resources)...");
  const alloc = [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
  ];
  const max = [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
  ];
  const avail = [3, 3, 2];
  const safeRes = bankersService.checkSafety(alloc, max, avail);
  if (!safeRes.isSafe || safeRes.safeSequence.length !== 5) {
    throw new Error('Test 3 Failed: Expected safe state with 5 completed processes!');
  }
  console.log(`  --> PASS: System in SAFE state. Safe Sequence: ${safeRes.safeSequence.map(p => `P${p}`).join(' -> ')}`);

  // Test 4: Banker's Algorithm Unsafe State
  console.log("\n[Test 4] Banker's Algorithm: Unsafe Case (Resource Starvation)...");
  const availUnsafe = [1, 0, 0];
  const unsafeRes = bankersService.checkSafety(alloc, max, availUnsafe);
  if (unsafeRes.isSafe) {
    throw new Error('Test 4 Failed: Expected unsafe state!');
  }
  console.log(`  --> PASS: Correctly recognized UNSAFE state. Blocked: ${unsafeRes.unsatisfiedProcesses.map(p => `P${p}`).join(', ')}`);

  // Test 5: Dynamic Resource Request with Rollback
  console.log("\n[Test 5] Banker's Algorithm: Dynamic Resource Request (P1 requests [1, 0, 2])...");
  const reqRes = bankersService.requestResources(1, [1, 0, 2], alloc, max, avail);
  if (!reqRes.granted) {
    throw new Error('Test 5 Failed: Expected request to be granted in safe state!');
  }
  console.log(`  --> PASS: ${reqRes.message}`);

  console.log('\n====================================================');
  console.log('   ALL BACKEND ALGORITHMIC TESTS PASSED (5/5)!      ');
  console.log('====================================================');
}

runAlgorithmicVerification();
