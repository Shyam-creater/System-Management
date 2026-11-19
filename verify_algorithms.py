#!/usr/bin/env python3
"""
ProcessShield - Algorithmic Test Suite (Python Port of tests/deadlock_test.cpp)
Verifies:
  1. Wait-For Graph (WFG) 3-Color DFS Cycle Detection (Positive deadlock)
  2. Wait-For Graph Acyclic Verification (Negative case)
  3. Resource Allocation Graph (RAG) to Wait-For Graph (WFG) Reduction
  4. Banker's Algorithm Deadlock Avoidance (Safe State & Safe Sequence)
  5. Banker's Algorithm Deadlock Avoidance (Unsafe State Detection)
"""

class WaitForGraph:
    def __init__(self):
        self.adj = {}
        self.processes = set()

    def add_process(self, p):
        self.processes.add(p)
        if p not in self.adj:
            self.adj[p] = set()

    def add_wait_edge(self, from_p, to_p):
        self.add_process(from_p)
        self.add_process(to_p)
        self.adj[from_p].add(to_p)

    def detect_deadlock(self):
        # 0: White (unvisited), 1: Gray (in stack), 2: Black (finished)
        color = {p: 0 for p in self.processes}
        parent = {}
        cycle_path = []

        def dfs(u):
            nonlocal cycle_path
            color[u] = 1
            for v in self.adj.get(u, []):
                if color[v] == 1:
                    # Back-edge detected! Reconstruct cycle
                    curr = u
                    cycle_path = [v, curr]
                    while curr != v and curr in parent:
                        curr = parent[curr]
                        cycle_path.append(curr)
                    cycle_path.reverse()
                    return True
                if color[v] == 0:
                    parent[v] = u
                    if dfs(v):
                        return True
            color[u] = 2
            return False

        for p in sorted(self.processes):
            if color[p] == 0:
                if dfs(p):
                    return True, cycle_path
        return False, []

class DeadlockSimulator:
    def __init__(self):
        self.holds = {}
        self.requests = {}
        self.resource_holder = {}

    def add_allocation(self, p, r):
        self.holds.setdefault(p, []).append(r)
        self.resource_holder[r] = p

    def add_request(self, p, r):
        self.requests.setdefault(p, []).append(r)

    def build_wait_for_graph(self):
        wfg = WaitForGraph()
        for p in self.holds:
            wfg.add_process(p)
        for p in self.requests:
            wfg.add_process(p)

        for req_p, req_res_list in self.requests.items():
            for r in req_res_list:
                if r in self.resource_holder:
                    holding_p = self.resource_holder[r]
                    if req_p != holding_p:
                        wfg.add_wait_edge(req_p, holding_p)
        return wfg

    def load_classic_deadlock(self):
        # P1 holds R1, requests R2
        # P2 holds R2, requests R1
        self.add_allocation("P1", "R1")
        self.add_request("P1", "R2")
        self.add_allocation("P2", "R2")
        self.add_request("P2", "R1")

class BankersAlgorithm:
    def __init__(self, alloc, max_m, avail):
        self.alloc = [list(r) for r in alloc]
        self.max = [list(r) for r in max_m]
        self.avail = list(avail)
        self.n = len(alloc)
        self.m = len(avail)
        self.need = [
            [self.max[i][j] - self.alloc[i][j] for j in range(self.m)]
            for i in range(self.n)
        ]

    def check_safety(self):
        work = list(self.avail)
        finish = [False] * self.n
        safe_seq = []

        while len(safe_seq) < self.n:
            found = False
            for p in range(self.n):
                if not finish[p]:
                    if all(self.need[p][r] <= work[r] for r in range(self.m)):
                        for r in range(self.m):
                            work[r] += self.alloc[p][r]
                        finish[p] = True
                        safe_seq.append(p)
                        found = True
            if not found:
                break

        is_safe = (len(safe_seq) == self.n)
        unsatisfied = [p for p in range(self.n) if not finish[p]]
        return is_safe, safe_seq, unsatisfied

def run_tests():
    print("=" * 68)
    print("       ProcessShield - Algorithmic Test Suite Verification")
    print("=" * 68)

    # Test 1: WFG 2-process cycle (P1 <-> P2)
    print("\n[Test 1] Wait-For Graph: 2-Process Cycle Detection (P1 <-> P2)...")
    wfg1 = WaitForGraph()
    wfg1.add_wait_edge("P1", "P2")
    wfg1.add_wait_edge("P2", "P1")
    has_cycle, cycle = wfg1.detect_deadlock()
    assert has_cycle, "Expected cycle!"
    print(f"  --> PASS: Detected cycle correctly: {' -> '.join(cycle)}")

    # Test 2: WFG Acyclic graph (P1 -> P2 -> P3)
    print("\n[Test 2] Wait-For Graph: Acyclic Graph (P1 -> P2 -> P3)...")
    wfg2 = WaitForGraph()
    wfg2.add_wait_edge("P1", "P2")
    wfg2.add_wait_edge("P2", "P3")
    has_cycle, _ = wfg2.detect_deadlock()
    assert not has_cycle, "Expected no cycle!"
    print("  --> PASS: Correctly verified no deadlock in acyclic dependency.")

    # Test 3: Deadlock Simulator (RAG -> WFG)
    print("\n[Test 3] Deadlock Simulator: Classic RAG Simulation (RAG to WFG)...")
    sim = DeadlockSimulator()
    sim.load_classic_deadlock()
    wfg3 = sim.build_wait_for_graph()
    has_cycle, cycle = wfg3.detect_deadlock()
    assert has_cycle, "Expected deadlock in classic RAG!"
    print(f"  --> PASS: RAG correctly reduced to WFG cycle: {' -> '.join(cycle)}")

    # Test 4: Banker's Algorithm Safe Case
    print("\n[Test 4] Banker's Algorithm: Classic Safe Case...")
    # 5 processes (P0..P4), 3 resource types (A, B, C)
    alloc = [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2]
    ]
    max_m = [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3]
    ]
    avail = [3, 3, 2]
    banker_safe = BankersAlgorithm(alloc, max_m, avail)
    is_safe, seq, _ = banker_safe.check_safety()
    assert is_safe, "Expected safe state!"
    seq_str = " -> ".join(f"P{p}" for p in seq)
    print(f"  --> PASS: System in SAFE state. Safe sequence: {seq_str}")

    # Test 5: Banker's Algorithm Unsafe Case
    print("\n[Test 5] Banker's Algorithm: Unsafe Case (Resource Starvation)...")
    avail_unsafe = [1, 0, 0] # Insufficient available resources
    banker_unsafe = BankersAlgorithm(alloc, max_m, avail_unsafe)
    is_safe, _, unassigned = banker_unsafe.check_safety()
    assert not is_safe, "Expected unsafe state!"
    unassigned_str = ", ".join(f"P{p}" for p in unassigned)
    print(f"  --> PASS: Correctly recognized UNSAFE state. Blocked: {unassigned_str}")

    print("\n" + "=" * 68)
    print("       ALL ALGORITHMIC TESTS PASSED SUCCESSFULLY! (5/5)")
    print("=" * 68)

if __name__ == "__main__":
    run_tests()
