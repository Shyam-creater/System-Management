import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Share2,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  StepForward,
  Scale,
  Send,
  ShieldCheck,
  ArrowRight,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { algorithmApi } from '../services/api';
import { DeadlockSimulationResponse, BankersAlgorithmResponse } from '../types';

export const AlgorithmLab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'deadlock' | 'bankers') || 'deadlock';
  const [activeTab, setActiveTab] = useState<'deadlock' | 'bankers'>(initialTab);

  // Sync tab with URL query parameter
  const handleTabChange = (tab: 'deadlock' | 'bankers') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ==========================================
  // DEADLOCK DETECTION STATE
  // ==========================================
  const [deadlockScenario, setDeadlockScenario] = useState<'classic_2p' | 'cycle_3p' | 'safe_acyclic'>('classic_2p');
  const [deadlockResult, setDeadlockResult] = useState<DeadlockSimulationResponse | null>(null);

  const deadlockMutation = useMutation({
    mutationFn: (sc: string) => algorithmApi.runDeadlock(sc),
    onSuccess: (data) => {
      setDeadlockResult(data);
    }
  });

  const handleRunDeadlock = (scenario = deadlockScenario) => {
    setDeadlockScenario(scenario);
    deadlockMutation.mutate(scenario);
  };

  const handleResetDeadlock = () => {
    setDeadlockResult(null);
  };

  // ==========================================
  // BANKER'S ALGORITHM STATE
  // ==========================================
  const [bankersScenario, setBankersScenario] = useState<'safe' | 'unsafe'>('safe');
  const [bankersData, setBankersData] = useState<BankersAlgorithmResponse | null>(null);
  const [requestProcess, setRequestProcess] = useState<number>(1);
  const [reqA, setReqA] = useState<number>(1);
  const [reqB, setReqB] = useState<number>(0);
  const [reqC, setReqC] = useState<number>(2);
  const [requestFeedback, setRequestFeedback] = useState<{ granted?: boolean; message?: string } | null>(null);
  const [showBankersExplainer, setShowBankersExplainer] = useState(false);

  const bankersSafetyMutation = useMutation({
    mutationFn: (sc: string) => algorithmApi.runBankers(sc),
    onSuccess: (data) => {
      setBankersData(data);
      setRequestFeedback(null);
    }
  });

  const bankersRequestMutation = useMutation({
    mutationFn: (payload: any) => algorithmApi.requestResources(payload),
    onSuccess: (res) => {
      setRequestFeedback(res);
      if (res.result) {
        setBankersData((prev) => (prev ? { ...prev, ...res.result } : null));
      }
    }
  });

  const handleRunBankers = (sc: 'safe' | 'unsafe' = bankersScenario) => {
    setBankersScenario(sc);
    bankersSafetyMutation.mutate(sc);
  };

  const handleSendBankersRequest = () => {
    if (!bankersData) return;
    bankersRequestMutation.mutate({
      processId: requestProcess,
      request: [reqA, reqB, reqC],
      allocation: bankersData.allocation,
      max: bankersData.max,
      available: bankersData.available
    });
  };

  // Run default simulations on first load
  useEffect(() => {
    if (activeTab === 'deadlock' && !deadlockResult) {
      handleRunDeadlock('classic_2p');
    } else if (activeTab === 'bankers' && !bankersData) {
      handleRunBankers('safe');
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Algorithm Lab"
        subtitle="Interactive OS concurrency laboratory: Wait-For Graph Deadlock Detection & Banker's Avoidance Matrix"
      />

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => handleTabChange('deadlock')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'deadlock'
              ? 'border-[#1d68ff] text-[#1d68ff]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Deadlock Detection (DFS 3-Color)</span>
        </button>

        <button
          onClick={() => handleTabChange('bankers')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'bankers'
              ? 'border-[#1d68ff] text-[#1d68ff]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Banker's Algorithm (Safety & Allocation)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEADLOCK SIMULATOR (DFS 3-COLOR) */}
      {/* ========================================================================= */}
      {activeTab === 'deadlock' && (
        <div className="space-y-6">
          {/* STEP 1: Scenario Selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1d68ff] tracking-wider uppercase">
                Step 1: Pick a Scenario
              </span>
              <span className="text-xs text-slate-400">Choose a predefined wait-for graph structure</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleRunDeadlock('classic_2p')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  deadlockScenario === 'classic_2p'
                    ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Scenario 1</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      Deadlock
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Classic 2-Process Deadlock</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    P1 holds R1, waiting for R2. P2 holds R2, waiting for R1. Circular wait between 2 nodes.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleRunDeadlock('cycle_3p')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  deadlockScenario === 'cycle_3p'
                    ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Scenario 2</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      Deadlock
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">3-Process Circular Chain</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    P1 waiting for P2, P2 waiting for P3, and P3 waiting for P1. Multi-node cycle.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleRunDeadlock('safe_acyclic')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  deadlockScenario === 'safe_acyclic'
                    ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Scenario 3</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      Safe (No Cycle)
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Acyclic Linear Execution</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Linear dependency chain: P1 → P2 → P3. P3 terminates first, freeing resources.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: Control Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-[#1d68ff] tracking-wider uppercase">
                Step 2: Run Simulation
              </span>
              <button
                onClick={() => handleRunDeadlock(deadlockScenario)}
                disabled={deadlockMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d68ff] hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{deadlockMutation.isPending ? 'Detecting...' : 'Run DFS Detector'}</span>
              </button>

              <button
                onClick={handleResetDeadlock}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* DFS 3-Color Legend */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                DFS Colors:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
                <span>White (Unvisited)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span>Gray (Visiting)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-800" />
                <span>Black (Safe / Terminated)</span>
              </div>
            </div>
          </div>

          {/* STEP 3: Results & Graph Visualization */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1d68ff] tracking-wider uppercase">
                Step 3: Understand Results
              </span>
            </div>

            {/* Outcome Banner */}
            {deadlockResult && (
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  deadlockResult.isDeadlocked
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {deadlockResult.isDeadlocked ? (
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold">
                      {deadlockResult.isDeadlocked
                        ? 'Deadlock Detected! Circular Wait Found'
                        : 'System is SAFE. No Circular Wait Cycles'}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {deadlockResult.wfgCycleDescription || deadlockResult.description}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/70 font-bold border">
                    Processes: {deadlockResult.involvedProcesses?.length || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Visual Node Graph representation */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Wait-For Graph Topology & Cycles
              </h4>

              <div className="flex flex-wrap items-center justify-center gap-8 py-8 bg-slate-50/70 rounded-xl border border-slate-100">
                {deadlockResult?.involvedProcesses?.map((nodeId: string) => {
                  const isInCycle = deadlockResult.cyclePath?.includes(nodeId);
                  return (
                    <div key={nodeId} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md transition-all ${
                          isInCycle
                            ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                            : 'bg-white border-2 border-slate-300 text-slate-800'
                        }`}
                      >
                        {nodeId}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {isInCycle ? 'Deadlocked' : 'Safe Node'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Cycle Path representation */}
              {deadlockResult?.cyclePath && deadlockResult.cyclePath.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-2">Cycle Dependency Path:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {deadlockResult.cyclePath.map((proc: string, pIdx: number) => (
                      <React.Fragment key={pIdx}>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-mono font-bold">
                          {proc}
                        </span>
                        {pIdx < deadlockResult.cyclePath.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BANKER'S ALGORITHM SAFETY MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'bankers' && (
        <div className="space-y-6">
          {/* STEP 1: Scenario Selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1d68ff] tracking-wider uppercase">
                Step 1: Pick Allocation Scenario
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunBankers('safe')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    bankersScenario === 'safe'
                      ? 'bg-[#1d68ff] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Classic SAFE State (5 Processes, 3 Resources)
                </button>
                <button
                  onClick={() => handleRunBankers('unsafe')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    bankersScenario === 'unsafe'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  UNSAFE Starvation State
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: Safety Result Banner */}
          {bankersData && (
            <div
              className={`p-5 rounded-2xl border flex items-center justify-between ${
                bankersData.isSafe
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-3">
                {bankersData.isSafe ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <div>
                  <h3 className="text-base font-bold">
                    {bankersData.isSafe
                      ? 'System is in a SAFE State'
                      : 'System is in an UNSAFE / Deadlock Prone State'}
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5">
                    {bankersData.isSafe && bankersData.safeSequenceFormatted
                      ? `Valid execution sequence satisfying all process upper claims: < ${bankersData.safeSequenceFormatted} >`
                      : 'No valid safe sequence exists. Granting claims would trigger deadlocked hold-and-wait.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Resource Request Form */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Dynamic Resource Allocation Request
            </h4>
            <div className="flex flex-wrap items-end gap-3 text-xs">
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Process</label>
                <select
                  value={requestProcess}
                  onChange={(e) => setRequestProcess(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none"
                >
                  {[0, 1, 2, 3, 4].map((p) => (
                    <option key={p} value={p}>
                      Process P{p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Req R1 (A)</label>
                <input
                  type="number"
                  min="0"
                  value={reqA}
                  onChange={(e) => setReqA(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Req R2 (B)</label>
                <input
                  type="number"
                  min="0"
                  value={reqB}
                  onChange={(e) => setReqB(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Req R3 (C)</label>
                <input
                  type="number"
                  min="0"
                  value={reqC}
                  onChange={(e) => setReqC(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>

              <button
                onClick={handleSendBankersRequest}
                disabled={bankersRequestMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d68ff] hover:bg-blue-600 text-white font-bold transition active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Evaluate Request</span>
              </button>
            </div>

            {requestFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  requestFeedback.granted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {requestFeedback.granted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{requestFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Matrices Overview: Allocation, Max, Available, Need */}
          {bankersData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Allocation & Max Matrix */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Allocation Matrix & Max Claim
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="p-2">Process</th>
                        <th className="p-2">Allocation [A, B, C]</th>
                        <th className="p-2">Max Claim [A, B, C]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {bankersData.allocation?.map((alloc: number[], idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold font-sans text-slate-800">P{idx}</td>
                          <td className="p-2 text-blue-600 font-semibold">[{alloc.join(', ')}]</td>
                          <td className="p-2 text-slate-700">[{bankersData.max[idx]?.join(', ')}]</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Need Matrix & Available Vector */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Need Matrix (Max - Allocation)
                  </h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Available: [{bankersData.available?.join(', ')}]
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="p-2">Process</th>
                        <th className="p-2">Remaining Need [A, B, C]</th>
                        <th className="p-2">Can Satisfy?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {bankersData.needMatrix?.map((needRow: number[], idx: number) => {
                        const canSatisfy = needRow.every((val, rIdx) => val <= (bankersData.available[rIdx] || 0));
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold font-sans text-slate-800">P{idx}</td>
                            <td className="p-2 text-purple-600 font-semibold">[{needRow.join(', ')}]</td>
                            <td className="p-2 font-sans font-semibold">
                              {canSatisfy ? (
                                <span className="text-emerald-600">✓ Satisfiable</span>
                              ) : (
                                <span className="text-rose-500">✕ Needs Resources</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Explainer Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <button
              onClick={() => setShowBankersExplainer(!showBankersExplainer)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>What do these matrices mean? (OS Concepts Guide)</span>
              </div>
              {showBankersExplainer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showBankersExplainer && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  <strong>Allocation:</strong> The count of resource instances currently held by process Pi.
                </p>
                <p>
                  <strong>Max:</strong> The maximum number of resource instances process Pi may request during execution.
                </p>
                <p>
                  <strong>Available:</strong> The count of unallocated instances currently free in the operating system.
                </p>
                <p>
                  <strong>Need Matrix:</strong> Calculated as Need = Max - Allocation. A state is safe if there exists an ordering where each process can receive its remaining need and terminate.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
