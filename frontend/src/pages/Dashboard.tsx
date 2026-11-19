import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cpu,
  HardDrive,
  Layers,
  AlertTriangle,
  BarChart2,
  PieChart as PieChartIcon,
  Monitor,
  Info,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  X,
  Box,
  GraduationCap,
  User,
  Clock,
  Network,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { PlatformIcon } from '../components/common/PlatformIcon';
import { ProcessIcon } from '../components/common/ProcessIcon';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { fleetApi, alertsApi, softwareApi, labsApi, sessionsApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessItem, NodeInfo } from '../types';

export const Dashboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'Live' | '1H' | '6H' | '24H' | '7D'>('Live');
  const [activeModalNodeId, setActiveModalNodeId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'procs' | 'hist' | 'sw' | 'sessions'>('procs');

  // Fetch nodes data
  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  // Fetch server status data
  const { data: statusData } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: fleetApi.getStatus,
    refetchInterval: 10000
  });

  // Fetch alerts data
  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAlerts(undefined, 10),
    refetchInterval: 5000
  });

  // Fetch labs data for lab filter
  const [labFilter, setLabFilter] = useState<string>('ALL');
  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs,
    refetchInterval: 10000
  });
  const labs = labsData?.labs || [];

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const nodes = rawNodes.length > 0 ? rawNodes : [];
  const primaryNode = nodes.find(n => !n.is_simulated) || nodes[0];

  // Query live history for primary node from backend
  const { data: hostHistoryData } = useQuery({
    queryKey: ['hostHistory', primaryNode?.node_id],
    queryFn: () => (primaryNode?.node_id ? fleetApi.getHistory(primaryNode.node_id, 24) : null),
    enabled: !!primaryNode?.node_id,
    refetchInterval: 8000
  });

  // Real backend metrics without dummy fallbacks
  const hasTelemetry = Boolean(primaryNode);
  const cpuPercent = primaryNode?.cpu_percent != null ? Number(primaryNode.cpu_percent) : 0;
  const ramTotalGb = primaryNode?.ram_total_gb != null ? Number(primaryNode.ram_total_gb) : 0;
  const ramUsedGb = primaryNode?.ram_used_gb != null ? Number(primaryNode.ram_used_gb) : 0;
  const ramPercent = primaryNode?.ram_percent != null ? Number(primaryNode.ram_percent) : 0;
  const ramFreeGb = Math.max(0, +(ramTotalGb - ramUsedGb).toFixed(2));
  const totalProcesses = primaryNode?.process_count ?? (primaryNode?.processes?.length || 0);
  const activeAlertsCount = alertsData?.total ?? (alertsData?.alerts?.length || 0);

  // Donut chart data for Resource Distribution
  const pieData = ramTotalGb > 0
    ? [
        { name: 'Used', value: ramUsedGb, color: '#1d68ff' },
        { name: 'Free', value: ramFreeGb, color: '#93c5fd' }
      ]
    : [
        { name: 'Used', value: 0, color: '#1d68ff' },
        { name: 'Free', value: 1, color: '#e2e8f0' }
      ];

  // Live trend area chart data from real backend history
  const rawHistory: any[] = hostHistoryData?.history || [];
  const chartData = rawHistory.length > 0
    ? [...rawHistory]
        .reverse()
        .slice(-14)
        .map((h: any) => ({
          time: new Date((h.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cpu: Math.round(h.cpu_percent ?? 0),
          memory: Math.round(h.ram_percent ?? 0)
        }))
    : [
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cpu: Math.round(cpuPercent),
          memory: Math.round(ramPercent)
        }
      ];

  // Top processes list directly from live host telemetry
  const activeProcesses: ProcessItem[] = (primaryNode?.processes && primaryNode.processes.length > 0)
    ? [...primaryNode.processes].sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0)).slice(0, 5)
    : [];

  // Recent alerts directly from alerts API
  const recentAlerts: any[] = alertsData?.alerts || [];

  // Monitored devices directly from registered nodes API
  const displayDevices: NodeInfo[] = nodes;

  // Active modal node
  const activeModalNode = activeModalNodeId ? nodes.find(n => n.node_id === activeModalNodeId) || null : null;

  // History query for modal
  const { data: histData } = useQuery({
    queryKey: ['nodeHistory', activeModalNodeId],
    queryFn: () => fleetApi.getHistory(activeModalNodeId!, 168),
    enabled: !!activeModalNodeId && modalTab === 'hist'
  });

  // Software query for modal
  const { data: modalSwData, isLoading: isModalSwLoading } = useQuery({
    queryKey: ['nodeSoftware', activeModalNodeId],
    queryFn: () => softwareApi.getSoftware(activeModalNodeId!, false),
    enabled: !!activeModalNodeId && modalTab === 'sw'
  });

  // Sessions query for modal
  const { data: modalSessionsData } = useQuery({
    queryKey: ['nodeSessions', activeModalNodeId],
    queryFn: () => (activeModalNodeId ? sessionsApi.getSessions({ nodeId: activeModalNodeId, limit: 10 }) : null),
    enabled: !!activeModalNodeId && modalTab === 'sessions'
  });

  const filteredDisplayDevices = displayDevices.filter(dev => {
    if (labFilter === 'ALL') return true;
    if (labFilter === 'UNASSIGNED') return !dev.labId;
    return dev.labId === labFilter;
  });

  return (
    <div className="space-y-6">
      {/* Title Bar matching reference image */}
      <PageHeader
        title="Dashboard"
        subtitle="Real-time system monitoring and resource management"
      />

      {/* 1. TOP 4 METRIC CARDS matching reference image layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: CPU Usage */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500">CPU Usage</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {hasTelemetry ? `${cpuPercent.toFixed(1)}%` : '0.0%'}
              </span>
              {primaryNode ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{primaryNode.hostname} (Live)</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 mt-1 block">Awaiting node telemetry</span>
              )}
            </div>
            {/* Sparkline curve matching reference image */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full stroke-blue-500 fill-none stroke-[2.4]">
                <path d="M0,28 Q20,34 35,18 T70,12 T80,16" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Memory Usage */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <HardDrive className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Memory Usage</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {hasTelemetry ? `${ramUsedGb.toFixed(2)} GB` : '0.00 GB'}
              </span>
              <div className="text-xs font-normal text-slate-500 mt-1">
                {hasTelemetry && ramTotalGb > 0
                  ? `of ${ramTotalGb.toFixed(2)} GB (${ramPercent.toFixed(1)}%)`
                  : 'Host System RAM'}
              </div>
            </div>
            {/* Sparkline curve */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full stroke-blue-500 fill-none stroke-[2.4]">
                <path d="M0,24 Q25,30 45,18 T70,22 T80,14" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Active Processes */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Active Processes</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {totalProcesses}
              </span>
              <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mt-1">
                <span>{activeProcesses.length > 0 ? `${activeProcesses.length} top CPU tasks` : 'System processes'}</span>
              </div>
            </div>
            {/* Sparkline curve */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full stroke-blue-500 fill-none stroke-[2.4]">
                <path d="M0,26 Q20,16 40,22 T65,12 T80,18" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Active Alerts */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${activeAlertsCount > 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Active Alerts</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeAlertsCount}
              </span>
              <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${activeAlertsCount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${activeAlertsCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span>{activeAlertsCount > 0 ? `${activeAlertsCount} active alert${activeAlertsCount > 1 ? 's' : ''}` : 'All nodes healthy'}</span>
              </div>
            </div>
            {/* Coral Sparkline curve matching reference image */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full stroke-rose-400 fill-none stroke-[2.4]">
                <path d="M0,26 Q25,32 45,18 T70,24 T80,14" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW (System Overview ~50%, Resource Distribution ~25%, Recent Alerts ~25%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* System Overview Chart (col-span-6) */}
        <div className="xl:col-span-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">System Overview</h2>
            </div>

            {/* Timeframe selector pills matching reference image */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-full text-xs font-semibold">
              {(['Live', '1H', '6H', '24H', '7D'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-full transition-all ${
                    timeframe === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Area Chart with smooth dual splines */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d68ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1d68ff" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU Usage" stroke="#1d68ff" strokeWidth={2.5} fillOpacity={1} fill="url(#cpuGradient)" />
                <Area type="monotone" dataKey="memory" name="Memory Usage" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#memGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend matching reference image */}
          <div className="flex items-center justify-center gap-6 mt-3 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1d68ff]" />
              <span>CPU Usage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
              <span>Memory Usage</span>
            </div>
          </div>
        </div>

        {/* Resource Distribution Donut Chart (col-span-3) - Donut and legend side-by-side */}
        <div className="xl:col-span-3 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <PieChartIcon className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Resource Distribution</h2>
          </div>

          <div className="flex items-center justify-between gap-4 my-auto">
            {/* Donut Chart with Center Text */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 leading-none">
                  {ramPercent.toFixed(1)}%
                </span>
                <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                  Memory Used
                </span>
              </div>
            </div>

            {/* Donut Legend side-by-side matching reference image */}
            <div className="space-y-2 text-xs text-slate-600 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1d68ff]" />
                  <span className="text-slate-500 font-medium">Used</span>
                </div>
                <span className="font-semibold text-slate-800">{ramUsedGb.toFixed(2)} GB</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#93c5fd]" />
                  <span className="text-slate-500 font-medium">Free</span>
                </div>
                <span className="font-semibold text-slate-800">{ramFreeGb.toFixed(2)} GB</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-slate-500 font-medium">Total</span>
                </div>
                <span className="font-semibold text-slate-800">{ramTotalGb.toFixed(2)} GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts List (col-span-3) */}
        <div className="xl:col-span-3 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Alerts</h2>
            </div>
            <Link to="/alerts" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 my-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-800">All Systems Nominal</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No active alerts reported across the fleet.</p>
            </div>
          ) : (
            <div className="space-y-3 my-auto">
              {recentAlerts.slice(0, 4).map((alt: any, idx: number) => {
                const isCritical = alt.level === 'CRITICAL' || alt.severity === 'high';
                const isWarning = alt.level === 'WARNING' || alt.severity === 'medium';
                return (
                  <div
                    key={alt._id || alt.id || idx}
                    className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isCritical
                              ? 'bg-rose-500 animate-pulse'
                              : isWarning
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {alt.title || alt.message || alt.type || 'System Event'}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          isCritical
                            ? 'bg-rose-100 text-rose-700'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {alt.level || 'INFO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1 pl-4 text-[10px] text-slate-400">
                      <span className="text-slate-500 truncate">{alt.details || alt.description || alt.message || (alt.node_id ? `Reported by ${alt.node_id}` : '')}</span>
                      <span className="shrink-0">{alt.timestamp || alt.created_at ? new Date(alt.timestamp || alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            to="/alerts"
            className="w-full mt-3 py-2 text-center text-xs font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100/60 rounded-xl transition"
          >
            Review All {activeAlertsCount} Alerts
          </Link>
        </div>
      </div>

      {/* 3. BOTTOM ROW (Top Processes ~40%, Monitored Devices ~35%, System Information ~25%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Top Processes (CPU) (col-span-5) */}
        <div className="xl:col-span-5 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Top Processes (CPU)</h2>
            </div>
            <Link to="/processes" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeProcesses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
              <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-800">No Process Telemetry</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Top processes will appear once an agent transmits telemetry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                    <th className="pb-2.5">PID</th>
                    <th className="pb-2.5">Process Name</th>
                    <th className="pb-2.5">CPU %</th>
                    <th className="pb-2.5">GPU %</th>
                    <th className="pb-2.5">Memory (RSS)</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 font-mono text-[11px]">
                  {activeProcesses.map((proc) => {
                    const isRunning = proc.state === 'RUNNING';
                    const memDisplay = proc.memory_mb >= 1000
                      ? `${(proc.memory_mb / 1024).toFixed(2)} GB`
                      : `${Math.round(proc.memory_mb)} MB`;

                    return (
                      <tr key={proc.pid} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 text-slate-500 font-semibold">{proc.pid}</td>
                        <td className="py-2.5 font-sans font-medium text-slate-800 flex items-center gap-2">
                          <ProcessIcon name={proc.name} size={18} />
                          <span className="truncate max-w-[120px] font-semibold">{proc.name}</span>
                        </td>
                        <td className="py-2.5 font-semibold text-slate-800">{(proc.cpu_percent || 0).toFixed(1)}%</td>
                        <td className="py-2.5 font-semibold text-sky-600 font-mono">{(proc.gpu_percent ?? 0).toFixed(1)}%</td>
                        <td className="py-2.5 text-slate-600">{memDisplay}</td>
                        <td className="py-2.5 text-right font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monitored Devices (col-span-4) matching reference image */}
        <div className="xl:col-span-4 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Monitored Devices</h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={labFilter}
                onChange={(e) => setLabFilter(e.target.value)}
                className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Labs</option>
                {labs.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
                <option value="UNASSIGNED">Unassigned</option>
              </select>
              <Link to="/devices" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {filteredDisplayDevices.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
              <Monitor className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-800">No Monitored Workstations</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Computers reporting to ProcessShield will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDisplayDevices.map((dev, i) => {
                const isSim = Boolean(dev.is_simulated);
                const labObj = labs.find(l => l.id === dev.labId);
                return (
                  <div
                    key={dev.node_id || i}
                    onClick={() => dev.node_id && setActiveModalNodeId(dev.node_id)}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm shrink-0">
                        <PlatformIcon hostname={dev.hostname} isSimulated={isSim} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {dev.hostname} {!isSim && i === 0 && '(Local)'}
                          </p>
                          {labObj && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" />
                              <span>{labObj.name}</span>
                            </span>
                          )}
                          {dev.currentUser && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />
                              <span>{dev.currentUser}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          CPU: {dev.cpu_percent != null ? dev.cpu_percent.toFixed(1) : '0.0'}% &nbsp;
                          RAM: {dev.ram_percent != null ? dev.ram_percent.toFixed(1) : '0.0'}%
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        dev.currentUser
                          ? 'bg-blue-600 text-white animate-pulse'
                          : isSim
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {dev.currentUser ? 'In Use' : isSim ? 'Simulated' : 'Online'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Information (col-span-3) matching reference image */}
        <div className="xl:col-span-3 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">System Information</h2>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 divide-y divide-slate-100">
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-slate-500 flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-slate-500" /> Platform
              </span>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[160px]">
                {primaryNode?.system_type || primaryNode?.platform || statusData?.platform || 'Windows (NT)'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-blue-600" /> CPU
              </span>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[160px]">
                {primaryNode?.cpu_model || (statusData?.hostname ? `${primaryNode?.cpu_count || 8} Cores` : 'x86_64 Architecture')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Memory
              </span>
              <span className="font-semibold text-slate-900">
                {primaryNode?.ram_total_gb ? `${Number(primaryNode.ram_total_gb).toFixed(2)} GB` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-slate-600" /> Storage
              </span>
              <span className="font-semibold text-slate-900">
                {primaryNode?.disk_total_gb
                  ? `${Number(primaryNode.disk_total_gb).toFixed(1)} GB (${primaryNode.disk_percent ? Number(primaryNode.disk_percent).toFixed(0) : 0}% used)`
                  : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Uptime
              </span>
              <span className="font-semibold text-slate-900">
                {primaryNode?.uptime_formatted || (primaryNode?.uptime_seconds ? `${Math.floor(primaryNode.uptime_seconds / 3600)}h ${Math.floor((primaryNode.uptime_seconds % 3600) / 60)}m` : statusData?.uptime_seconds ? `${Math.floor(statusData.uptime_seconds / 3600)} hrs` : 'Active')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-emerald-600" /> Network
              </span>
              <span className="font-semibold text-slate-900 font-mono text-[11px] text-right truncate max-w-[160px]">
                {primaryNode?.ip ? `${primaryNode.ip} (LAN)` : statusData?.interfaces?.[0]?.ip ? `${statusData.interfaces[0].ip} (LAN)` : '127.0.0.1'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED NODE INSPECTION MODAL */}
      {activeModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900">{activeModalNode.hostname}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>{labs.find(l => l.id === activeModalNode.labId)?.name || 'Unassigned Lab'}</span>
                    </span>
                    {activeModalNode.seat && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        Seat #{activeModalNode.seat}
                      </span>
                    )}
                    {activeModalNode.currentUser ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Logged in: {activeModalNode.currentUser}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Available / Idle
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    IP: {activeModalNode.ip} • OS: {activeModalNode.system_type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalNodeId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Controls */}
            <div className="flex border-b border-slate-100 px-6 gap-6 text-xs font-semibold">
              <button
                onClick={() => setModalTab('procs')}
                className={`py-3.5 border-b-2 transition ${
                  modalTab === 'procs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Processes ({activeModalNode.processes?.length || 0})
              </button>
              <button
                onClick={() => setModalTab('hist')}
                className={`py-3.5 border-b-2 transition ${
                  modalTab === 'hist' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Telemetry History
              </button>
              <button
                onClick={() => setModalTab('sessions')}
                className={`py-3.5 border-b-2 transition ${
                  modalTab === 'sessions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Student Sessions
              </button>
              <button
                onClick={() => setModalTab('sw')}
                className={`py-3.5 border-b-2 transition ${
                  modalTab === 'sw' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Software Packages
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {modalTab === 'procs' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">PID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">User</th>
                        <th className="p-3">CPU %</th>
                        <th className="p-3">GPU %</th>
                        <th className="p-3">Memory (MB)</th>
                        <th className="p-3">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeModalNode.processes || []).map((p) => (
                        <tr key={p.pid} className="hover:bg-slate-50/60">
                          <td className="p-3 text-slate-500">{p.pid}</td>
                          <td className="p-3 font-sans font-medium text-slate-800">{p.name}</td>
                          <td className="p-3 text-slate-500">{p.user}</td>
                          <td className="p-3 font-semibold text-slate-800">{p.cpu_percent}%</td>
                          <td className="p-3 font-semibold text-sky-600">{(p.gpu_percent ?? 0).toFixed(1)}%</td>
                          <td className="p-3 text-slate-600">{p.memory_mb.toFixed(1)} MB</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              {p.state}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {modalTab === 'hist' && (
                <div className="space-y-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={histData?.history || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="time_str" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="cpu_percent" stroke="#1d68ff" fill="#dbeafe" />
                        <Area type="monotone" dataKey="ram_percent" stroke="#38bdf8" fill="#e0f2fe" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {modalTab === 'sessions' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Student User</th>
                        <th className="p-3">Login Time (UTC)</th>
                        <th className="p-3">Logout Time</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(modalSessionsData?.sessions || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-400 font-sans">
                            No student sessions recorded on this desktop yet.
                          </td>
                        </tr>
                      ) : (
                        (modalSessionsData?.sessions || []).map((s: any) => (
                          <tr key={s.id || s._id} className="hover:bg-slate-50/60 font-sans">
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              <span>{s.username}</span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {new Date(s.loginAt).toLocaleString()}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {s.logoutAt ? new Date(s.logoutAt).toLocaleString() : '—'}
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {s.duration ? `${s.duration} min` : s.active ? 'In progress' : '0 min'}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.active
                                    ? 'bg-blue-100 text-blue-700 animate-pulse'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {s.active ? 'ACTIVE' : 'COMPLETED'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {modalTab === 'sw' && (
                <div className="space-y-3">
                  {isModalSwLoading ? (
                    <p className="text-center text-slate-400 py-8">Scanning software packages...</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(modalSwData?.packages || []).slice(0, 30).map((pkg: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <p className="font-bold text-slate-800 truncate">{pkg.name}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">Version: {pkg.version || 'Latest'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
