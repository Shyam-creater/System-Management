import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Search, Filter, Cpu, HardDrive, User, CheckCircle2 } from 'lucide-react';
import { fleetApi } from '../services/api';
import { ProcessItem } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessIcon } from '../components/common/ProcessIcon';

export const Processes: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'APP' | 'DAEMON'>('ALL');

  const { data } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const nodes = data?.nodes ? Object.values(data.nodes) : [];
  const activeNode = nodes.find(n => n.node_id === selectedNodeId) || nodes[0];
  const processes: ProcessItem[] = activeNode?.processes || [];

  const filteredProcesses = processes.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pid.toString().includes(searchQuery) ||
      p.user.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'APP' && p.is_user_app) ||
      (categoryFilter === 'DAEMON' && !p.is_user_app);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Processes"
        subtitle="Fleet-wide process monitoring, thread states, and resource consumption"
      >
        {/* Node Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Target Node:</span>
          <select
            value={activeNode?.node_id || ''}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:border-blue-500"
          >
            {nodes.map(n => (
              <option key={n.node_id} value={n.node_id}>
                {n.hostname} ({n.ip})
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      {/* Filter and Search Controls Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter processes by name, PID, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              categoryFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All ({processes.length})
          </button>
          <button
            onClick={() => setCategoryFilter('APP')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              categoryFilter === 'APP'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            User Applications
          </button>
          <button
            onClick={() => setCategoryFilter('DAEMON')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              categoryFilter === 'DAEMON'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            System Daemons
          </button>
        </div>
      </div>

      {/* Process Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="p-4">PID</th>
                <th className="p-4">Process Name</th>
                <th className="p-4">User</th>
                <th className="p-4">CPU %</th>
                <th className="p-4">Memory (RSS)</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Execution State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-sans">
                    No active processes matching current filter.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc) => {
                  const isRunning = proc.state === 'RUNNING';
                  const memDisplay = proc.memory_mb >= 1000
                    ? `${(proc.memory_mb / 1024).toFixed(2)} GB`
                    : `${Math.round(proc.memory_mb)} MB`;

                  return (
                    <tr key={proc.pid} className="hover:bg-slate-50/60 transition">
                      <td className="p-4 text-slate-400 font-semibold">{proc.pid}</td>
                      <td className="p-4 font-sans font-medium text-slate-900 flex items-center gap-2.5">
                        <ProcessIcon name={proc.name} size={18} />
                        <span className="font-semibold">{proc.name}</span>
                      </td>
                      <td className="p-4 text-slate-500 font-sans">{proc.user}</td>
                      <td className="p-4 font-semibold text-slate-900">{proc.cpu_percent.toFixed(1)}%</td>
                      <td className="p-4 text-slate-600">{memDisplay}</td>
                      <td className="p-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {proc.is_user_app ? 'Application' : 'Background'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-sans">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isRunning
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {proc.state}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
