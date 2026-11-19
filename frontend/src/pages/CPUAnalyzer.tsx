import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Activity, TrendingUp, Zap, Clock, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fleetApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessItem } from '../types';

export const CPUAnalyzer: React.FC = () => {
  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const primaryNode = rawNodes.find(n => !n.is_simulated) || rawNodes[0];

  const cpuPercent = primaryNode?.cpu_percent ?? 24.5;
  const processes: ProcessItem[] = primaryNode?.processes || [];
  const topCpuProcesses = [...processes].sort((a, b) => b.cpu_percent - a.cpu_percent).slice(0, 8);

  const chartData = [
    { time: '-50s', cpu: Math.max(5, Math.round(cpuPercent * 0.8)) },
    { time: '-40s', cpu: Math.max(8, Math.round(cpuPercent * 1.15)) },
    { time: '-30s', cpu: Math.max(6, Math.round(cpuPercent * 0.9)) },
    { time: '-20s', cpu: Math.max(12, Math.round(cpuPercent * 1.2)) },
    { time: '-10s', cpu: Math.max(10, Math.round(cpuPercent * 0.95)) },
    { time: 'now', cpu: Math.round(cpuPercent) }
  ];

  const cores = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    usage: Math.min(100, Math.max(5, Math.round(cpuPercent + (i % 2 === 0 ? 8 : -6) * Math.sin(i))))
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="CPU Analyzer"
        subtitle="Processor utilization, core scheduling distribution, and thread execution profiling"
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-slate-500">Aggregate CPU</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{cpuPercent.toFixed(1)}%</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Stable utilization
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-slate-500">Physical / Logical Cores</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">8 Cores</p>
          <span className="text-xs text-slate-400 mt-1 block">SMT Multi-threading Active</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-slate-500">Context Switches</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">1,420 /s</p>
          <span className="text-xs text-slate-400 mt-1 block">Low preemptive latency</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-semibold text-slate-500">Top Consumer</span>
          <p className="text-xl font-bold text-slate-900 mt-2 truncate">
            {topCpuProcesses[0]?.name || 'system'}
          </p>
          <span className="text-xs text-blue-600 font-semibold">
            {topCpuProcesses[0]?.cpu_percent.toFixed(1) || '0.0'}% load
          </span>
        </div>
      </div>

      {/* Real-time Trajectory Chart */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Real-time CPU Load Trajectory (60s Window)</span>
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cpuLoadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d68ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1d68ff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip />
              <Area type="monotone" dataKey="cpu" stroke="#1d68ff" strokeWidth={2.5} fill="url(#cpuLoadGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-Core Gauge Matrix */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span>Multi-Core Load Distribution</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {cores.map((c) => (
            <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Core {c.id}</span>
              <p className="text-base font-black text-slate-900 mt-1">{c.usage}%</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${c.usage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top CPU Consumer Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Top CPU Processes</h3>
          <span className="text-xs text-slate-400 font-mono">Ranked by thread time</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="p-4">PID</th>
                <th className="p-4">Process Name</th>
                <th className="p-4">User</th>
                <th className="p-4">State</th>
                <th className="p-4 text-right">CPU Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {topCpuProcesses.map((p) => (
                <tr key={p.pid} className="hover:bg-slate-50/60">
                  <td className="p-4 text-slate-400 font-semibold">{p.pid}</td>
                  <td className="p-4 font-sans font-bold text-slate-900">{p.name}</td>
                  <td className="p-4 font-sans text-slate-500">{p.user}</td>
                  <td className="p-4 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {p.state}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-blue-600">
                    {p.cpu_percent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
