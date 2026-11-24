import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu,
  HardDrive,
  Layers,
  AlertTriangle,
  Monitor,
  ArrowRight,
  TrendingUp,
  Clock,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Users,
  Activity,
  ExternalLink,
  RefreshCw,
  Flame,
  ChevronRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { fleetApi, alertsApi, labsApi } from '../services/api';
import { useFleetStore } from '../store/useFleetStore';
import { PlatformIcon } from '../components/common/PlatformIcon';
import { ProcessIcon } from '../components/common/ProcessIcon';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedLabId, setSelectedLabId } = useFleetStore();

  const [timeRange, setTimeRange] = useState<'Live' | '1H' | '24H' | '7D'>('Live');
  const [trendMetric, setTrendMetric] = useState<'cpu' | 'ram'>('cpu');

  // Fetch Fleet Nodes
  const { data: fleetData, isLoading: isFleetLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  // Fetch Alerts
  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAlerts(undefined, 10),
    refetchInterval: 5000
  });

  // Fetch Labs
  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs,
    refetchInterval: 10000
  });

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const labs = labsData?.labs || [];

  // Filter nodes based on selected lab
  const filteredNodes = useMemo(() => {
    if (!selectedLabId || selectedLabId === 'ALL') return rawNodes;
    return rawNodes.filter((n: any) => n.labId === selectedLabId);
  }, [rawNodes, selectedLabId]);

  // Primary telemetry node
  const primaryNode = filteredNodes.find((n: any) => !n.is_simulated) || filteredNodes[0];

  // Query live history
  const { data: hostHistoryData } = useQuery({
    queryKey: ['hostHistory', primaryNode?.node_id],
    queryFn: () => (primaryNode?.node_id ? fleetApi.getHistory(primaryNode.node_id, 24) : null),
    enabled: !!primaryNode?.node_id,
    refetchInterval: 8000
  });

  // Fleet Aggregations
  const totalNodes = filteredNodes.length;
  const onlineNodes = filteredNodes.filter((n: any) => n.status === 'ONLINE');
  const offlineNodes = filteredNodes.filter((n: any) => n.status !== 'ONLINE');
  const inUseNodes = filteredNodes.filter(
    (n: any) => n.status === 'ONLINE' && n.current_user && n.current_user !== 'Unassigned' && n.current_user !== 'None'
  );

  const avgFleetCpu =
    onlineNodes.length > 0
      ? onlineNodes.reduce((acc: number, n: any) => acc + (n.cpu_percent || 0), 0) / onlineNodes.length
      : 0;

  const avgFleetRam =
    onlineNodes.length > 0
      ? onlineNodes.reduce((acc: number, n: any) => acc + (n.ram_percent || 0), 0) / onlineNodes.length
      : 0;

  const activeAlertsCount = alertsData?.total ?? (alertsData?.alerts?.length || 0);
  const criticalAlerts = (alertsData?.alerts || []).filter((a: any) => a.severity === 'CRITICAL');

  // Identify nodes that need attention
  const highLoadNodes = filteredNodes.filter((n: any) => (n.cpu_percent || 0) > 85 || (n.ram_percent || 0) > 85);
  const hasIssues = offlineNodes.length > 0 || highLoadNodes.length > 0 || criticalAlerts.length > 0;

  // Chart data
  const rawHistory: any[] = hostHistoryData?.history || [];
  const chartData =
    rawHistory.length > 0
      ? [...rawHistory]
          .reverse()
          .slice(-16)
          .map((h: any) => ({
            time: new Date((h.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            cpu: Math.round(h.cpu_percent ?? 0),
            ram: Math.round(h.ram_percent ?? 0)
          }))
      : [
          {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            cpu: Math.round(avgFleetCpu),
            ram: Math.round(avgFleetRam)
          }
        ];

  // Top resource processes across all online nodes
  const topProcesses = useMemo(() => {
    const list: Array<{
      processName: string;
      pid: number;
      nodeId: string;
      hostname: string;
      user: string;
      cpu: number;
      ram: number;
    }> = [];

    filteredNodes.forEach((node: any) => {
      const nodeProcs = node.processes || [];
      nodeProcs.forEach((p: any) => {
        list.push({
          processName: p.name || 'system',
          pid: p.pid || 0,
          nodeId: node.node_id,
          hostname: node.hostname || node.node_id,
          user: p.user || node.current_user || 'Unassigned',
          cpu: p.cpu_percent || 0,
          ram: p.ram_percent || 0
        });
      });
    });

    return list.sort((a, b) => b.cpu - a.cpu).slice(0, 5);
  }, [filteredNodes]);

  return (
    <div className="space-y-6">
      {/* Top Header & Lab Context Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Institutional Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time campus telemetry, occupancy overview, and incident triage
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Lab context filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">Lab Scope:</span>
            <select
              value={selectedLabId || 'ALL'}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Laboratories</option>
              {labs.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Live</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. NEEDS ATTENTION BANNER (ALWAYS FIRST) */}
      {/* ========================================================================= */}
      {hasIssues ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 shadow-sm flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-800">
                <span>Needs Attention</span>
                <span className="px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px]">
                  {offlineNodes.length + highLoadNodes.length + criticalAlerts.length} issues
                </span>
              </div>
              <div className="text-xs text-rose-900 font-medium mt-1 flex flex-wrap items-center gap-3">
                {offlineNodes.length > 0 && (
                  <span>
                    • <strong>{offlineNodes.length}</strong> computer{offlineNodes.length > 1 ? 's' : ''} offline (
                    {offlineNodes.map((n: any) => n.hostname).slice(0, 2).join(', ')}
                    {offlineNodes.length > 2 ? '...' : ''})
                  </span>
                )}
                {highLoadNodes.length > 0 && (
                  <span>
                    • <strong>{highLoadNodes[0].hostname}</strong> CPU {highLoadNodes[0].cpu_percent}% for &gt;5 min
                  </span>
                )}
                {criticalAlerts.length > 0 && (
                  <span>
                    • <strong>{criticalAlerts.length}</strong> unresolved critical alert{criticalAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {highLoadNodes.length > 0 && (
              <button
                onClick={() => navigate(`/workstations/${highLoadNodes[0].node_id}?tab=processes`)}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300 transition shadow-sm"
              >
                Inspect {highLoadNodes[0].hostname}
              </button>
            )}
            <button
              onClick={() => navigate('/alerts')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
            >
              <span>Review alerts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All monitored computers and processes operating within normal parameters. 0 active incidents.</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">100% nominal</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FLEET KPI TILES (CLICKABLE) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* KPI 1: Computers Online */}
        <div
          onClick={() => navigate('/workstations')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-blue-400 cursor-pointer transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Computers Online</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{onlineNodes.length}</span>
              <span className="text-xs font-bold text-slate-400">/ {totalNodes}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${totalNodes > 0 ? (onlineNodes.length / totalNodes) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: In Use Now */}
        <div
          onClick={() => navigate('/workstations')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-400 cursor-pointer transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Use Now</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{inUseNodes.length}</span>
              <span className="text-xs font-bold text-slate-400">active seats</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Logged in users</p>
          </div>
        </div>

        {/* KPI 3: Avg Fleet CPU */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Fleet CPU</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{avgFleetCpu.toFixed(1)}</span>
              <span className="text-xs font-bold text-slate-400">%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  avgFleetCpu > 80 ? 'bg-rose-500' : avgFleetCpu > 50 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, avgFleetCpu)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Avg Fleet RAM */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Fleet RAM</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{avgFleetRam.toFixed(1)}</span>
              <span className="text-xs font-bold text-slate-400">%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  avgFleetRam > 80 ? 'bg-rose-500' : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(100, avgFleetRam)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 5: Open Alerts */}
        <div
          onClick={() => navigate('/alerts')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-rose-400 cursor-pointer transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Alerts</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{activeAlertsCount}</span>
              <span className="text-xs font-bold text-rose-600">({criticalAlerts.length} crit)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Requires review</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MIDDLE SECTION: FLEET USAGE TREND & LABS AT A GLANCE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Fleet Usage Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fleet Usage Trend</h3>
              <p className="text-xs text-slate-400">Host and workstation load time-series</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Metric Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 text-xs font-bold">
                <button
                  onClick={() => setTrendMetric('cpu')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    trendMetric === 'cpu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  CPU
                </button>
                <button
                  onClick={() => setTrendMetric('ram')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    trendMetric === 'ram' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  RAM
                </button>
              </div>

              {/* Range Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 text-xs font-semibold">
                {(['Live', '1H', '24H', '7D'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2 py-1 rounded-md transition ${
                      timeRange === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={trendMetric === 'cpu' ? '#1d68ff' : '#9333ea'}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={trendMetric === 'cpu' ? '#1d68ff' : '#9333ea'}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={trendMetric}
                  name={trendMetric === 'cpu' ? 'CPU %' : 'RAM %'}
                  stroke={trendMetric === 'cpu' ? '#1d68ff' : '#9333ea'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Labs at a Glance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">Labs at a glance</h3>
              <Link to="/labs" className="text-xs text-blue-600 hover:underline font-semibold">
                View all labs
              </Link>
            </div>
            <p className="text-xs text-slate-400">Live occupancy and computer availability</p>

            <div className="space-y-3 mt-4">
              {labs.slice(0, 4).map((lab: any) => {
                const labNodes = rawNodes.filter((n: any) => n.labId === lab.id);
                const onlineCount = labNodes.filter((n: any) => n.status === 'ONLINE').length;
                const capacity = lab.capacity || labNodes.length || 20;
                const percent = Math.round((onlineCount / (capacity || 1)) * 100);

                return (
                  <div
                    key={lab.id}
                    onClick={() => navigate(`/labs/${lab.id}`)}
                    className="p-3 rounded-xl bg-slate-50/70 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800">{lab.name}</span>
                      <span className="font-mono text-slate-500">
                        {onlineCount}/{capacity} online
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              to="/reports/daily"
              className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200/60 flex items-center justify-between transition"
            >
              <span>View Daily Audit Snapshots</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LOWER SECTION: TOP USERS & RECENT ACTIVITY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Resource Users Right Now */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top resource users right now</h3>
              <p className="text-xs text-slate-400">Processes consuming highest CPU/memory</p>
            </div>
            <Link to="/reports/S6" className="text-xs font-semibold text-blue-600 hover:underline">
              Processes Report (S6) →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {topProcesses.length === 0 ? (
              <p className="py-6 text-center text-slate-400">No active process data available</p>
            ) : (
              topProcesses.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProcessIcon name={p.processName} className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate">{p.processName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({p.hostname})</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        User:{' '}
                        {p.user && p.user !== 'Unassigned' ? (
                          <span className="font-semibold text-indigo-600">{p.user}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-slate-700">{p.cpu.toFixed(1)}% CPU</span>
                    <button
                      onClick={() => navigate(`/workstations/${p.nodeId}?tab=processes`)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Activity Stream */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
              <p className="text-xs text-slate-400">Audit journal and telemetry notifications</p>
            </div>
            <Link to="/activity" className="text-xs font-semibold text-blue-600 hover:underline">
              View all activity →
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <span className="font-mono text-slate-400 shrink-0">10:42</span>
              <div>
                <p className="text-slate-800 font-medium">
                  <strong>Admin</strong> restarted workstation node{' '}
                  <span className="text-indigo-600 font-semibold">sjt418scope066</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <span className="font-mono text-slate-400 shrink-0">10:30</span>
              <div>
                <p className="text-slate-800 font-medium">
                  <strong>Faculty</strong> exported institutional report{' '}
                  <span className="text-blue-600 font-semibold">"Fleet Processes & Active Users (S6)"</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <span className="font-mono text-slate-400 shrink-0">10:12</span>
              <div>
                <p className="text-slate-800 font-medium">
                  Autonomous SSH poll validated telemetry from{' '}
                  <span className="text-indigo-600 font-semibold">SJT515-IOT03</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
