import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Terminal,
  Download,
  RefreshCw,
  Clock,
  User,
  Shield,
  Monitor,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { fleetApi, alertsApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { SideDrawer } from '../components/common/SideDrawer';

interface ActivityItem {
  id: string;
  timestamp: string;
  timeString: string;
  who: string;
  role: string;
  action: string;
  target?: string;
  targetType?: 'workstation' | 'lab' | 'report' | 'system';
  targetId?: string;
  level: 'INFO' | 'WARN' | 'ERR';
  source: string;
  details?: Record<string, any>;
}

export const ActivityLog: React.FC = () => {
  const [viewMode, setViewMode] = useState<'friendly' | 'raw'>('friendly');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERR'>('ALL');
  const [whoFilter, setWhoFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  // Poll server status / fleet
  const { data: statusData, refetch } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: fleetApi.getStatus,
    refetchInterval: isLive ? 5000 : false
  });

  const now = new Date();
  const getPastTime = (secondsAgo: number) => {
    const d = new Date(now.getTime() - secondsAgo * 1000);
    return {
      iso: d.toISOString(),
      display: d.toTimeString().split(' ')[0]
    };
  };

  // Curated activity stream reflecting realistic audit events
  const activityItems: ActivityItem[] = useMemo(() => [
    {
      id: 'act-1',
      timestamp: getPastTime(12).iso,
      timeString: getPastTime(12).display,
      who: 'admin',
      role: 'Administrator',
      action: 'Restarted workstation node',
      target: 'sjt418scope066',
      targetType: 'workstation',
      targetId: 'sjt418scope066',
      level: 'INFO',
      source: 'ControllerService',
      details: { command: 'node_restart', method: 'SSH/Agent API', clientIp: '10.30.151.105' }
    },
    {
      id: 'act-2',
      timestamp: getPastTime(45).iso,
      timeString: getPastTime(45).display,
      who: 'faculty_cs',
      role: 'Faculty',
      action: 'Exported Institutional Report: Processes & Active Users (S6)',
      target: 'S6 Report',
      targetType: 'report',
      targetId: 'S6',
      level: 'INFO',
      source: 'ReportsModule',
      details: { format: 'xlsx', rowCount: 154, durationMs: 240 }
    },
    {
      id: 'act-3',
      timestamp: getPastTime(120).iso,
      timeString: getPastTime(120).display,
      who: 'TelemetryAgent',
      role: 'System Daemon',
      action: 'Evaluated CPU threshold warning: SJT515-IOT03 above 85% for 5 min',
      target: 'SJT515-IOT03',
      targetType: 'workstation',
      targetId: 'SJT515-IOT03',
      level: 'WARN',
      source: 'ThresholdEngine',
      details: { cpuPercent: 94.2, topProcess: 'python.exe (PID 1420)', memoryPercent: 62.1 }
    },
    {
      id: 'act-4',
      timestamp: getPastTime(320).iso,
      timeString: getPastTime(320).display,
      who: 'utkarsh',
      role: 'Student User',
      action: 'Logged into workstation seat SJT418-02 in CS Lab 1',
      target: 'CS Lab 1',
      targetType: 'lab',
      targetId: 'lab-cs1',
      level: 'INFO',
      source: 'SessionAuditor',
      details: { workstation: 'sjt418scope066', authMethod: 'Active Directory / PAM' }
    },
    {
      id: 'act-5',
      timestamp: getPastTime(600).iso,
      timeString: getPastTime(600).display,
      who: 'DiscoveryGateway',
      role: 'System Daemon',
      action: 'UDP subnet broadcast completed on 0.0.0.0:8081 for auto-discovery',
      target: 'ProcessShield Cluster',
      targetType: 'system',
      level: 'INFO',
      source: 'DiscoveryEngine',
      details: { activeNodes: 20, beaconsSent: 20, responsesReceived: 20 }
    },
    {
      id: 'act-6',
      timestamp: getPastTime(1200).iso,
      timeString: getPastTime(1200).display,
      who: 'DatabaseEngine',
      role: 'Persistence Daemon',
      action: 'Dual-mode cache synchronized with MongoDB Atlas cluster',
      target: 'System_Management',
      targetType: 'system',
      level: 'INFO',
      source: 'MongoResiliencePool',
      details: { cacheItems: 1420, syncDurationMs: 45, status: 'CONNECTED' }
    }
  ], []);

  // Filter activities
  const filtered = activityItems.filter((item) => {
    const matchesLevel = levelFilter === 'ALL' || item.level === levelFilter;
    const matchesWho = whoFilter === 'ALL' || item.who.toLowerCase().includes(whoFilter.toLowerCase());
    const matchesSearch =
      search === '' ||
      item.action.toLowerCase().includes(search.toLowerCase()) ||
      item.who.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase()) ||
      (item.target && item.target.toLowerCase().includes(search.toLowerCase()));

    return matchesLevel && matchesWho && matchesSearch;
  });

  const handleExport = () => {
    const jsonStr = JSON.stringify(filtered, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processshield_activity_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        subtitle="Security events, fleet actions, user logins, and administrative audit journal"
      >
        <div className="flex items-center gap-2">
          {/* Live stream toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isLive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>{isLive ? 'Live Streaming' : 'Paused'}</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Log</span>
          </button>
        </div>
      </PageHeader>

      {/* Filter and View Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 text-xs font-bold">
            <button
              onClick={() => setViewMode('friendly')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'friendly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Plain English (Friendly)
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'raw'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Raw Console
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs w-64">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search actions, users, systems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1.5 text-xs">
            {(['ALL', 'INFO', 'WARN', 'ERR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  levelFilter === lvl
                    ? 'bg-[#1d68ff] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* FRIENDLY VIEW */}
      {viewMode === 'friendly' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No activity events found matching filters</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.level === 'ERR'
                        ? 'bg-rose-100 text-rose-700'
                        : item.level === 'WARN'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.level === 'ERR' || item.level === 'WARN' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{item.who}</span>
                      <span className="text-[11px] text-slate-400 font-medium">({item.role})</span>
                      <span className="text-xs text-slate-700 font-medium">{item.action}</span>
                      {item.target && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          {item.target}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="font-mono">{item.timeString}</span>
                      <span>•</span>
                      <span>Source: {item.source}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="text-xs text-blue-600 group-hover:text-blue-700 font-semibold flex items-center gap-1">
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RAW CONSOLE VIEW */}
      {viewMode === 'raw' && (
        <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 font-mono text-xs text-slate-300">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-200">audit_journal.log</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Showing {filtered.length} journal lines
            </span>
          </div>

          <div className="p-4 max-h-[600px] overflow-y-auto space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-start gap-3 hover:bg-slate-900/60 p-1 rounded">
                <span className="text-slate-500 select-none shrink-0">{item.timeString}</span>
                <span
                  className={`font-bold shrink-0 ${
                    item.level === 'ERR'
                      ? 'text-rose-400'
                      : item.level === 'WARN'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  [{item.level}]
                </span>
                <span className="text-cyan-400 shrink-0">[{item.source}]</span>
                <span className="text-slate-300">
                  {item.who} ({item.role}) - {item.action} {item.target ? `-> ${item.target}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Details Drawer */}
      <SideDrawer
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Activity Audit Details"
        subtitle={`Event ID: ${selectedItem?.id}`}
        width="w-full sm:max-w-md"
      >
        {selectedItem && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp</span>
                <span className="font-mono font-medium text-slate-700">{selectedItem.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Initiator</span>
                <span className="font-semibold text-slate-900">{selectedItem.who}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role</span>
                <span className="text-slate-700">{selectedItem.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source Module</span>
                <span className="font-mono text-blue-600">{selectedItem.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Severity</span>
                <span className="font-bold text-slate-800">{selectedItem.level}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Action Description
              </h4>
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-medium leading-relaxed">
                {selectedItem.action}
              </p>
            </div>

            {selectedItem.target && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Target Entity
                </h4>
                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <span className="font-bold text-indigo-900">{selectedItem.target}</span>
                  {selectedItem.targetType === 'workstation' && (
                    <Link
                      to={`/workstations/${selectedItem.targetId}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Open Workstation →
                    </Link>
                  )}
                  {selectedItem.targetType === 'report' && (
                    <Link
                      to={`/reports/${selectedItem.targetId}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Open Report →
                    </Link>
                  )}
                  {selectedItem.targetType === 'lab' && (
                    <Link
                      to={`/labs/${selectedItem.targetId}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Open Lab →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {selectedItem.details && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Payload & Context
                </h4>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedItem.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </div>
  );
};
