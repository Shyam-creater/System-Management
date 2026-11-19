import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Scale, CheckCircle2, AlertTriangle, Play, Send, ShieldCheck, ArrowRight } from 'lucide-react';
import { algorithmApi } from '../services/api';
import { BankersAlgorithmResponse } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

export const BankersAlgorithm: React.FC = () => {
  const [scenario, setScenario] = useState<'safe' | 'unsafe'>('safe');
  const [bankersData, setBankersData] = useState<BankersAlgorithmResponse | null>(null);

  // Dynamic Request Inputs
  const [requestProcess, setRequestProcess] = useState<number>(1);
  const [reqA, setReqA] = useState<number>(1);
  const [reqB, setReqB] = useState<number>(0);
  const [reqC, setReqC] = useState<number>(2);
  const [requestFeedback, setRequestFeedback] = useState<{ granted?: boolean; message?: string } | null>(null);

  const safetyMutation = useMutation({
    mutationFn: (sc: string) => algorithmApi.runBankers(sc),
    onSuccess: (data) => {
      setBankersData(data);
      setRequestFeedback(null);
    }
  });

  const requestMutation = useMutation({
    mutationFn: (payload: any) => algorithmApi.requestResources(payload),
    onSuccess: (res) => {
      setRequestFeedback(res);
      if (res.result) {
        setBankersData(prev => prev ? { ...prev, ...res.result } : null);
      }
    }
  });

  const runSafety = (sc: 'safe' | 'unsafe') => {
    setScenario(sc);
    safetyMutation.mutate(sc);
  };

  const handleSendRequest = () => {
    if (!bankersData) return;
    requestMutation.mutate({
      processId: requestProcess,
      request: [reqA, reqB, reqC],
      allocation: bankersData.allocation,
      max: bankersData.max,
      available: bankersData.available
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banker's Algorithm"
        subtitle="Deadlock avoidance safety matrix evaluation and dynamic resource allocation"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => runSafety('safe')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
              scenario === 'safe'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Classic SAFE (5P, 3R)
          </button>
          <button
            onClick={() => runSafety('unsafe')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
              scenario === 'unsafe'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            UNSAFE Starved
          </button>
        </div>
      </PageHeader>

      {/* Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => runSafety('safe')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            scenario === 'safe'
              ? 'bg-blue-50/70 border-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase">State: SAFE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-2">Standard Safe Resource Allocation</h3>
          <p className="text-xs text-slate-500 mt-1">
            5 Processes ($P_0$ through $P_4$) and 3 Resources ($A, B, C$). Computes safe completion sequence.
          </p>
        </button>

        <button
          onClick={() => runSafety('unsafe')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            scenario === 'unsafe'
              ? 'bg-rose-50/70 border-rose-400 shadow-md shadow-rose-500/10'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase">State: UNSAFE</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-2">Resource Exhaustion & Starvation</h3>
          <p className="text-xs text-slate-500 mt-1">
            Available resource vector is depleted, causing circular dependencies and system deadlock.
          </p>
        </button>
      </div>

      {bankersData ? (
        <div className="space-y-6">
          {/* Safety Status Banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
              bankersData.isSafe
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {bankersData.isSafe ? (
                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold">
                  {bankersData.isSafe ? 'System State is SAFE' : 'System State is UNSAFE (Hazard Warning)'}
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  {bankersData.isSafe
                    ? 'All processes can finish without entering a deadlock condition.'
                    : 'System cannot guarantee completion without deadlock.'}
                </p>
              </div>
            </div>

            {bankersData.isSafe && (
              <div className="flex items-center gap-2 font-mono text-xs font-bold bg-white/80 px-3.5 py-1.5 rounded-xl border border-emerald-300/60 shadow-sm">
                <span>Safe Sequence:</span>
                <span className="text-blue-600">{bankersData.safeSequenceFormatted}</span>
              </div>
            )}
          </div>

          {/* Safe Sequence Flow Pills */}
          {bankersData.isSafe && bankersData.safeSequence && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Execution Chain:</span>
              {bankersData.safeSequence.map((pid, idx, arr) => (
                <React.Fragment key={idx}>
                  <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 shadow-sm">
                    Process P{pid}
                  </div>
                  {idx < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Allocation & Need Matrices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Allocation Matrix Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Allocation Matrix (Allocated)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="p-2.5 text-left">Process</th>
                      <th className="p-2.5">Res A</th>
                      <th className="p-2.5">Res B</th>
                      <th className="p-2.5">Res C</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {bankersData.allocation.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-bold text-left text-slate-900">P{idx}</td>
                        <td className="p-2.5 font-semibold text-blue-600">{row[0]}</td>
                        <td className="p-2.5 font-semibold text-blue-600">{row[1]}</td>
                        <td className="p-2.5 font-semibold text-blue-600">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Need Matrix Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Need Matrix (Max - Allocation)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="p-2.5 text-left">Process</th>
                      <th className="p-2.5">Res A</th>
                      <th className="p-2.5">Res B</th>
                      <th className="p-2.5">Res C</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {bankersData.needMatrix.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-bold text-left text-slate-900">P{idx}</td>
                        <td className="p-2.5 font-semibold text-amber-600">{row[0]}</td>
                        <td className="p-2.5 font-semibold text-amber-600">{row[1]}</td>
                        <td className="p-2.5 font-semibold text-amber-600">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Dynamic Resource Request Simulator */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Simulate Dynamic Resource Request ($Request_i$)</h3>
            <p className="text-xs text-slate-500">
              Test whether granting resources to a process maintains safety or forces an immediate rollback.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Process</label>
                <select
                  value={requestProcess}
                  onChange={(e) => setRequestProcess(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value={0}>P0</option>
                  <option value={1}>P1</option>
                  <option value={2}>P2</option>
                  <option value={3}>P3</option>
                  <option value={4}>P4</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Res A</label>
                <input
                  type="number"
                  min="0"
                  value={reqA}
                  onChange={(e) => setReqA(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Res B</label>
                <input
                  type="number"
                  min="0"
                  value={reqB}
                  onChange={(e) => setReqB(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Res C</label>
                <input
                  type="number"
                  min="0"
                  value={reqC}
                  onChange={(e) => setReqC(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end">
                <button
                  onClick={handleSendRequest}
                  disabled={requestMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Request</span>
                </button>
              </div>
            </div>

            {requestFeedback && (
              <div
                className={`p-4 rounded-xl border text-xs font-semibold ${
                  requestFeedback.granted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {requestFeedback.message}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Select a scenario above to compute safety states.</p>
        </div>
      )}
    </div>
  );
};
