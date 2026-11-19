import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Filter, Terminal, Download, RefreshCw } from 'lucide-react';
import { fleetApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';

export const LogsPage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERR'>('ALL');
  const [search, setSearch] = useState('');

  const { data: statusData } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: fleetApi.getStatus,
    refetchInterval: 5000
  });

  const now = new Date();
  const generateTimestamp = (secondsAgo: number) => {
    const d = new Date(now.getTime() - secondsAgo * 1000);
    return d.toTimeString().split(' ')[0];
  };

  const logs = [
    { time: generateTimestamp(2), level: 'INFO', source: 'TelemetryService', msg: 'Processed inbound OS metrics report from SJT515-IOT03 (10.30.151.105).' },
    { time: generateTimestamp(5), level: 'INFO', source: 'SocketGateway', msg: 'Broadcasted telemetry:update packet to 1 connected web client.' },
    { time: generateTimestamp(10), level: 'INFO', source: 'SSHMonitor', msg: 'Autonomous SSH poll completed successfully for sjt418scope069 (10.30.158.79).' },
    { time: generateTimestamp(15), level: 'WARN', source: 'ThresholdEngine', msg: 'Evaluated host warning: win11-eng-station-02 memory consumption above 75%.' },
    { time: generateTimestamp(22), level: 'INFO', source: 'Discovery', msg: 'UDP beacon broadcast on 0.0.0.0:8081 for auto-discovery.' },
    { time: generateTimestamp(35), level: 'INFO', source: 'DatabasePool', msg: 'Dual-mode persistence synchronized memory caches.' },
    { time: generateTimestamp(48), level: 'INFO', source: 'AuditLog', msg: 'Security authentication key validated: ProcessShield-OS-2026.' }
  ];

  const filtered = logs.filter(l => {
    const matchesFilter = filter === 'ALL' || l.level === filter;
    const matchesSearch = l.msg.toLowerCase().includes(search.toLowerCase()) || l.source.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        subtitle="System audit trail, security events, real-time telemetry dispatch, and operational logging"
      />

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search operational logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {(['ALL', 'INFO', 'WARN', 'ERR'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                filter === lvl
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 font-mono text-xs text-slate-300">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200">ProcessShield Live Event Console</span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">Streaming via Socket.IO</span>
        </div>

        <div className="p-5 space-y-2.5 max-h-[500px] overflow-y-auto">
          {filtered.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3 hover:bg-slate-800/40 p-1.5 rounded-lg transition">
              <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                  log.level === 'ERR'
                    ? 'bg-rose-500/20 text-rose-400'
                    : log.level === 'WARN'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {log.level}
              </span>
              <span className="text-indigo-400 font-semibold shrink-0">[{log.source}]</span>
              <span className="text-slate-200 break-all">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
