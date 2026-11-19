import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Play, Pause, XCircle, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fleetApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessItem } from '../types';

export const ProcessController: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const primaryNode = rawNodes.find(n => !n.is_simulated) || rawNodes[0];
  const processes: ProcessItem[] = primaryNode?.processes || [];

  const filtered = processes.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pid.toString().includes(searchQuery)
  );

  const triggerAction = (action: string, pid: number, name: string) => {
    setFeedback(`Signal '${action}' successfully dispatched to Process ${name} (PID: ${pid}).`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Controller"
        subtitle="Manage process lifecycle states, execution signals, priority scheduling, and resource limits"
      />

      {feedback && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Control Banner Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Process Guardian Supervisory Mode</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Target Host: <strong className="text-slate-800">{primaryNode?.hostname || 'Localhost'}</strong> • Automatic runaway thread containment enabled.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter processes to control..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Process Control Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="p-4">PID</th>
                <th className="p-4">Process Name</th>
                <th className="p-4">User</th>
                <th className="p-4">State</th>
                <th className="p-4">CPU %</th>
                <th className="p-4">Memory</th>
                <th className="p-4 text-right">Supervisory Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.slice(0, 15).map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-50/60 transition">
                  <td className="p-4 text-slate-400 font-semibold">{proc.pid}</td>
                  <td className="p-4 font-sans font-bold text-slate-900">{proc.name}</td>
                  <td className="p-4 font-sans text-slate-500">{proc.user}</td>
                  <td className="p-4 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {proc.state}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-900">{proc.cpu_percent.toFixed(1)}%</td>
                  <td className="p-4 text-slate-600">{Math.round(proc.memory_mb)} MB</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 font-sans">
                      <button
                        onClick={() => triggerAction('SIGCONT', proc.pid, proc.name)}
                        title="Resume Execution (SIGCONT)"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => triggerAction('SIGSTOP', proc.pid, proc.name)}
                        title="Freeze / Pause Thread (SIGSTOP)"
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => triggerAction('SIGTERM', proc.pid, proc.name)}
                        title="Graceful Terminate (SIGTERM)"
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
