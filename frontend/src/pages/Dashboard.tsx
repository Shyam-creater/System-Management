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
  User
} from 'lucide-react';
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

  // Derived metrics matching reference image defaults or live host readings
  const cpuPercent = primaryNode?.cpu_percent ?? 24.5;
  const ramTotalGb = primaryNode?.ram_total_gb ?? 32.0;
  const ramUsedGb = primaryNode?.ram_used_gb ?? 16.21;
  const ramPercent = primaryNode?.ram_percent ?? 50.6;
  const ramFreeGb = Math.max(0, +(ramTotalGb - ramUsedGb).toFixed(2)) || 15.79;
  const totalProcesses = primaryNode?.process_count ?? 682;
  const activeAlertsCount = alertsData?.total ?? 3;

  // Donut chart data for Resource Distribution
  const pieData = [
    { name: 'Used', value: ramUsedGb, color: '#1d68ff' },
    { name: 'Free', value: ramFreeGb, color: '#93c5fd' }
  ];

  // Live trend area chart data
  const chartData = [
    { time: '09:00', cpu: 22, memory: 48 },
    { time: '09:15', cpu: 28, memory: 52 },
    { time: '09:30', cpu: 24, memory: 49 },
    { time: '09:45', cpu: 38, memory: 56 },
    { time: '10:00', cpu: 32, memory: 51 },
    { time: '10:15', cpu: Math.round(cpuPercent), memory: Math.round(ramPercent) }
  ];

  // Top processes list matching reference image
  const activeProcesses: ProcessItem[] = primaryNode?.processes && primaryNode.processes.length > 0
    ? [...primaryNode.processes].sort((a, b) => b.cpu_percent - a.cpu_percent).slice(0, 5)
    : [
        { pid: 4821, ppid: 1, name: 'code', user: 'admin', is_user_app: true, category: 'App', state: 'RUNNING', cpu_percent: 12.6, memory_mb: 1240 },
        { pid: 5103, ppid: 1, name: 'chrome', user: 'admin', is_user_app: true, category: 'App', state: 'RUNNING', cpu_percent: 8.9, memory_mb: 2110 },
        { pid: 3950, ppid: 1, name: 'node', user: 'admin', is_user_app: true, category: 'App', state: 'RUNNING', cpu_percent: 4.7, memory_mb: 612 },
        { pid: 2711, ppid: 1, name: 'systemd', user: 'root', is_user_app: false, category: 'System', state: 'SLEEPING', cpu_percent: 3.2, memory_mb: 128 },
        { pid: 6302, ppid: 1, name: 'python', user: 'admin', is_user_app: true, category: 'App', state: 'RUNNING', cpu_percent: 2.9, memory_mb: 356 }
      ];

  // Application icon helper
  const getProcessIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('code') || lower.includes('vs')) {
      return (
        <span className="w-5 h-5 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-[10px]">
          ⌘
        </span>
      );
    }
    if (lower.includes('chrome') || lower.includes('browser') || lower.includes('edge')) {
      return (
        <span className="w-5 h-5 rounded bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-[10px]">
          ◎
        </span>
      );
    }
    if (lower.includes('node')) {
      return (
        <span className="w-5 h-5 rounded bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
          ⬢
        </span>
      );
    }
    if (lower.includes('python')) {
      return (
        <span className="w-5 h-5 rounded bg-sky-500/15 text-sky-600 flex items-center justify-center font-bold text-[10px]">
          🐍
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
        ⚙
      </span>
    );
  };

  // Recent alerts list matching reference image
  const recentAlerts = [
    {
      id: '1',
      title: 'High CPU Usage',
      level: 'CRITICAL',
      desc: 'CPU usage exceeded 90% on Ubuntu-Node-01',
      time: '2 min ago'
    },
    {
      id: '2',
      title: 'Memory Spike Detected',
      level: 'WARNING',
      desc: 'Memory usage at 78% on Windows-Dev-01',
      time: '7 min ago'
    },
    {
      id: '3',
      title: 'New Device Connected',
      level: 'INFO',
      desc: 'Simulator-Node-01 joined the fleet',
      time: '10 min ago'
    }
  ];

  // Monitored devices list matching reference image
  type DisplayDevice = NodeInfo | {
    node_id: string;
    hostname: string;
    ip: string;
    system_type: string;
    cpu_percent: number;
    ram_percent: number;
    is_simulated: boolean;
    labId?: string;
    seat?: number;
    currentUser?: string;
  };

  const displayDevices: DisplayDevice[] = nodes.length > 0 ? nodes : [
    { node_id: '1', hostname: 'MacBook-Pro', ip: '192.168.1.10', system_type: 'macOS', cpu_percent: 24.5, ram_percent: 50.6, is_simulated: false },
    { node_id: '2', hostname: 'Ubuntu-Node-01', ip: '192.168.1.11', system_type: 'Ubuntu Linux', cpu_percent: 18.2, ram_percent: 42.1, is_simulated: false },
    { node_id: '3', hostname: 'Windows-Dev-01', ip: '192.168.1.12', system_type: 'Windows 11', cpu_percent: 31.4, ram_percent: 67.8, is_simulated: false },
    { node_id: '4', hostname: 'Simulator-Node-01', ip: '192.168.1.101', system_type: 'Simulated VM', cpu_percent: 45.0, ram_percent: 55.0, is_simulated: true }
  ];

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
      {/* Title Bar matching reference image & web/index.html */}
      <PageHeader
        title="Fleet Overview"
        subtitle="Real-time system monitoring and distributed resource management"
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
                {cpuPercent.toFixed(1)}%
              </span>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500 mt-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>-12.8% from last hour</span>
              </div>
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
                {ramUsedGb.toFixed(2)} GB
              </span>
              <div className="text-xs font-normal text-slate-500 mt-1">
                of {ramTotalGb.toFixed(2)} GB ({ramPercent.toFixed(1)}%)
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
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500 mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+3.4% from last hour</span>
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
            <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Active Alerts</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeAlertsCount}
              </span>
              <div className="flex items-center gap-1 text-xs font-semibold text-rose-500 mt-1">
                <span>▲ +1 new alert</span>
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

          <div className="space-y-3 my-auto">
            {recentAlerts.map((alt) => (
              <div
                key={alt.id}
                className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        alt.level === 'CRITICAL'
                          ? 'bg-rose-500'
                          : alt.level === 'WARNING'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {alt.title}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                      alt.level === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700'
                        : alt.level === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {alt.level}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1 pl-4 text-[10px] text-slate-400">
                  <span className="text-slate-500 truncate">{alt.desc}</span>
                  <span className="shrink-0">{alt.time}</span>
                </div>
              </div>
            ))}
          </div>

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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2.5">PID</th>
                  <th className="pb-2.5">Process Name</th>
                  <th className="pb-2.5">CPU %</th>
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
                        {getProcessIcon(proc.name)}
                        <span className="truncate max-w-[120px]">{proc.name}</span>
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800">{proc.cpu_percent.toFixed(1)}%</td>
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
                    <span className="w-7 h-7 rounded-xl bg-white border border-slate-200/70 text-slate-700 flex items-center justify-center text-sm font-bold shadow-sm">
                      {dev.hostname.includes('Mac') ? '' : dev.hostname.includes('Ubuntu') ? '🐧' : isSim ? '📦' : '田'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {dev.hostname} {!isSim && i === 0 && '(Local)'}
                        </p>
                        {labObj && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 border border-blue-100">
                            {labObj.name}
                          </span>
                        )}
                        {dev.currentUser && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                            👤 {dev.currentUser}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        CPU: {dev.cpu_percent ? dev.cpu_percent.toFixed(1) : '24.5'}% &nbsp;
                        RAM: {dev.ram_percent ? dev.ram_percent.toFixed(1) : '50.6'}%
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
                <span>💻</span> Platform
              </span>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[160px]">
                {primaryNode?.system_type || (navigator.platform.includes('Win') ? 'Windows (NT)' : 'macOS (Darwin)')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <span>⚡</span> CPU
              </span>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[160px]">
                Apple M2 (8 cores)
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <span>💾</span> Memory
              </span>
              <span className="font-semibold text-slate-900">{ramTotalGb.toFixed(2)} GB</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <span>🗄️</span> Storage
              </span>
              <span className="font-semibold text-slate-900">
                494.38 GB (68% used)
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <span>⏱️</span> Uptime
              </span>
              <span className="font-semibold text-slate-900">
                5 days, 11 hours
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <span>🌐</span> Network
              </span>
              <span className="font-semibold text-slate-900 font-mono text-[11px] text-right truncate max-w-[160px]">
                {primaryNode?.ip ? `${primaryNode.ip} (LAN)` : '192.168.1.10 (Ethernet)'}
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      🏛️ {labs.find(l => l.id === activeModalNode.labId)?.name || 'Unassigned Lab'}
                    </span>
                    {activeModalNode.seat && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        Seat #{activeModalNode.seat}
                      </span>
                    )}
                    {activeModalNode.currentUser ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                        👤 Logged in: {activeModalNode.currentUser}
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
                              <span>👤</span> {s.username}
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
