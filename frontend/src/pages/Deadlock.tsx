import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Share2, AlertTriangle, CheckCircle2, Play, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import { algorithmApi } from '../services/api';
import { DeadlockSimulationResponse } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

export const Deadlock: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState('classic_2p');
  const [result, setResult] = useState<DeadlockSimulationResponse | null>(null);

  const simulateMutation = useMutation({
    mutationFn: (scenario: string) => algorithmApi.runDeadlock(scenario),
    onSuccess: (data) => setResult(data)
  });

  const runSimulation = (scenario: string) => {
    setSelectedScenario(scenario);
    simulateMutation.mutate(scenario);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlock Simulator"
        subtitle="Depth-First Search (DFS) 3-Color cycle detection in Wait-For Graphs"
      >
        <button
          onClick={() => runSimulation(selectedScenario)}
          disabled={simulateMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{simulateMutation.isPending ? 'Analyzing Cycle...' : 'Run DFS Detector'}</span>
        </button>
      </PageHeader>

      {/* Preset Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => runSimulation('classic_2p')}
          className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            selectedScenario === 'classic_2p'
              ? 'bg-blue-50/70 border-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scenario 1</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                Deadlock
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-2">Classic 2-Process Deadlock</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              $P_1$ holds $R_1$ and wants $R_2$. $P_2$ holds $R_2$ and wants $R_1$. Circular wait between 2 nodes.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
            <span>Select Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          onClick={() => runSimulation('cycle_3p')}
          className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            selectedScenario === 'cycle_3p'
              ? 'bg-blue-50/70 border-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scenario 2</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                Deadlock
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-2">3-Process Circular Chain</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Extended circular dependency: $P_1 \to P_2 \to P_3 \to P_1$. All 3 processes blocked indefinitely.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
            <span>Select Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          onClick={() => runSimulation('safe_acyclic')}
          className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            selectedScenario === 'safe_acyclic'
              ? 'bg-blue-50/70 border-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scenario 3</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                Safe
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-2">Safe Acyclic Graph</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Linear directed chain: $P_1 \to P_2 \to P_3$. $P_3$ finishes first, releasing resources down the line.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
            <span>Select Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* Analysis Result Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Wait-For Graph (WFG) Graph Cycle Evaluation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Graph state evaluates White (unvisited), Gray (active DFS path), and Black (completed) vertices.
            </p>
          </div>

          {result && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                result.isDeadlocked
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {result.isDeadlocked ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>DEADLOCK DETECTED</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SAFE / ACYCLIC (NO DEADLOCK)</span>
                </>
              )}
            </span>
          )}
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Scenario Description:</span>
                <span className="font-bold text-slate-800">{result.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Cycle Path Traversed:</span>
                <span className="font-mono font-bold text-blue-600">
                  {result.wfgCycleDescription || 'None (Acyclic graph)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Involved Processes:</span>
                <span className="font-mono text-slate-700">
                  {result.involvedProcesses?.join(', ') || 'None'}
                </span>
              </div>
            </div>

            {/* Visual Process Cycle Flow */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-blue-50/50 via-white to-sky-50/50 border border-slate-200 flex flex-wrap items-center justify-center gap-4">
              {(result.cyclePath && result.cyclePath.length > 0 ? result.cyclePath : ['P1', 'P2', 'P3']).map((node, i, arr) => (
                <React.Fragment key={i}>
                  <div className="px-4 py-2.5 rounded-2xl bg-white border border-blue-200 shadow-sm font-bold text-xs text-blue-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Process {node}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Select a scenario above and click "Run DFS Detector".</p>
            <p className="text-xs text-slate-400 mt-1">
              Evaluates Resource Allocation Graph cycle dependencies in $O(V+E)$ complexity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
