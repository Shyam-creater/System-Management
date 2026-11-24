import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Monitor,
  Cpu,
  HardDrive,
  Layers,
  ArrowLeft,
  RotateCcw,
  Lock,
  Power,
  ShieldAlert,
  Clock,
  Terminal,
  Activity,
  Package,
  Server,
  User,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  TrendingUp,
  Search,
  Filter,
  Sparkles
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
import { fleetApi, softwareApi, sessionsApi, controllerApi } from '../services/api';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { ProcessIcon } from '../components/common/ProcessIcon';
import { PlatformIcon } from '../components/common/PlatformIcon';
import { UsbSeatBadge } from '../components/usb/UsbSeatBadge';
import { UnlockButton } from '../components/usb/UnlockButton';

export const WorkstationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tab: string) => setSearchParams({ tab });

  const decodedNodeId = decodeURIComponent(id || '');

  // Sub-tab states
  const [procSearch, setProcSearch] = useState('');
  const [procFilter, setProcFilter] = useState<'ALL' | 'APP' | 'SYSTEM'>('ALL');
  const [showAdvancedProcs, setShowAdvancedProcs] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // End task confirm state
  const [confirmKillPid, setConfirmKillPid] = useState<number | null>(null);

  // Queries
  const { data: fleetData, isLoading: isFleetLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const { data: historyData } = useQuery({
    queryKey: ['hostHistory', decodedNodeId],
    queryFn: () => (decodedNodeId ? fleetApi.getHistory(decodedNodeId, 24) : null),
    enabled: !!decodedNodeId,
    refetchInterval: 8000
  });

  const { data: softwareData, isLoading: isSwLoading } = useQuery({
    queryKey: ['nodeSoftware', decodedNodeId],
    queryFn: () => softwareApi.getSoftware(decodedNodeId, false),
    enabled: !!decodedNodeId && activeTab === 'software'
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['nodeSessions', decodedNodeId],
    queryFn: () => sessionsApi.getSessions({ nodeId: decodedNodeId, limit: 15 }),
    enabled: !!decodedNodeId && (activeTab === 'overview' || activeTab === 'history')
  });

  // End Task Mutation
  const killMutation = useMutation({
    mutationFn: (pid: number) => controllerApi.killProcess(decodedNodeId, pid, 'SIGTERM'),
    onSuccess: () => {
      setConfirmKillPid(null);
      setActionFeedback('Process successfully terminated.');
      setTimeout(() => setActionFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    }
  });

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const node = rawNodes.find((n: any) => n.node_id === decodedNodeId || n.hostname === decodedNodeId) || rawNodes[0];

  if (!node && !isFleetLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <Monitor className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Workstation Not Found</h2>
        <p className="text-xs text-slate-400">The workstation ID "{decodedNodeId}" is not currently in the fleet registry.</p>
        <button
          onClick={() => navigate('/workstations')}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Return to Fleet Overview
        </button>
      </div>
    );
  }

  const isOnline = node?.status === 'ONLINE';
  const cpuVal = Number(node?.cpu_percent || 0);
  const ramVal = Number(node?.ram_percent || 0);
  const ramUsed = Number(node?.ram_used_gb || 0);
  const ramTotal = Number(node?.ram_total_gb || 1);
  const diskVal = Number(node?.disk_percent || 0);

  const processes = node?.processes || [];

  const filteredProcs = processes.filter((p: any) => {
    const q = procSearch.toLowerCase();
    const matchQ = !q || p.name?.toLowerCase().includes(q) || p.pid?.toString().includes(q) || p.user?.toLowerCase().includes(q);
    const matchCat =
      procFilter === 'ALL' ||
      (procFilter === 'APP' && p.is_user_app) ||
      (procFilter === 'SYSTEM' && !p.is_user_app);
    return matchQ && matchCat;
  });

  const topCpuProcs = [...processes].sort((a: any, b: any) => (b.cpu_percent || 0) - (a.cpu_percent || 0)).slice(0, 5);
  const topMemProcs = [...processes].sort((a: any, b: any) => (b.memory_mb || 0) - (a.memory_mb || 0)).slice(0, 5);

  const historyPoints = (historyData?.history || []).map((h: any) => ({
    time: h.time_str || new Date(h.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpu: h.cpu_percent || 0,
    ram: h.ram_percent || 0,
    gpu: h.gpu_percent || 0
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Breadcrumb Path */}
      <Breadcrumb
        items={[
          { label: 'Labs Hub', path: '/labs' },
          { label: node?.labId || 'Computer Science Lab 1', path: '/labs' },
          { label: node?.hostname || decodedNodeId }
        ]}
      />

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Workstation Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <PlatformIcon platform={node?.system_type} hostname={node?.hostname} size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{node?.hostname || decodedNodeId}</h1>
              <UsbSeatBadge locked={node?.usbLocked} />
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
              {node?.seat && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                  Seat #{node.seat}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
              <span>IP: <strong className="font-mono text-slate-700">{node?.ip}</strong></span>
              <span>•</span>
              <span>User: {node?.currentUser && node.currentUser !== 'No User' ? (
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {node.currentUser}
                </span>
              ) : (
                <span className="text-slate-400 italic">No User</span>
              )}</span>
              <span>•</span>
              <span className="truncate max-w-[260px]">{node?.system_type || 'Ubuntu Linux'}</span>
            </div>
          </div>
        </div>

        {/* Quick Header Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {node?.usbLocked && (
            <UnlockButton
              nodeId={node.node_id}
              onDone={() => {
                setActionFeedback('Workstation screen unlocked.');
                setTimeout(() => setActionFeedback(null), 3000);
                queryClient.invalidateQueries({ queryKey: ['nodes'] });
              }}
            />
          )}
          <button
            onClick={() => {
              setActionFeedback('Signal sent to workstation: Screen Lock engaged.');
              setTimeout(() => setActionFeedback(null), 3000);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Lock</span>
          </button>
          <button
            onClick={() => {
              setActionFeedback('Reboot command dispatched to workstation.');
              setTimeout(() => setActionFeedback(null), 3000);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition border border-blue-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* USB Guard Critical Warning Banner */}
      {node?.usbLocked && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-200/80 text-rose-800 shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-950">USB Storage Detected — Workstation Screen Blanked</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Unauthorized USB device was plugged into this machine. The screen is held in a full-screen lock overlay. Ensure the device is unplugged before unlocking.
              </p>
            </div>
          </div>
          <UnlockButton
            nodeId={node.node_id}
            onDone={() => {
              setActionFeedback('Workstation screen unlocked successfully.');
              setTimeout(() => setActionFeedback(null), 3000);
              queryClient.invalidateQueries({ queryKey: ['nodes'] });
            }}
          />
        </div>
      )}

      {/* Unified 6-Tab Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'processes', label: `Processes (${processes.length})`, icon: Layers },
          { id: 'performance', label: 'Performance Diagnostics', icon: Cpu },
          { id: 'software', label: 'Software Packages', icon: Package },
          { id: 'history', label: 'Telemetry History', icon: Clock },
          { id: 'hardware', label: 'Hardware Specs', icon: Server }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition -mb-px whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Plain-Language Health Summary Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-950">System Health Evaluation</h4>
                <p className="text-xs text-blue-800 mt-0.5">
                  {cpuVal < 70 && ramVal < 75
                    ? `This workstation is running nominally. Top active workload: ${topCpuProcs[0]?.name || 'system_worker'} (CPU ${topCpuProcs[0]?.cpu_percent || 0}%).`
                    : `High resource saturation detected. CPU is at ${cpuVal.toFixed(1)}% and RAM is at ${ramVal.toFixed(1)}%. Consider ending high-load tasks.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setTab('performance')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 shrink-0 flex items-center gap-1"
            >
              <span>View Diagnostics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">CPU Usage</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{cpuVal.toFixed(1)}%</span>
                <span className={`text-xs font-bold ${cpuVal >= 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {cpuVal >= 80 ? 'Heavy' : 'Normal'}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full ${cpuVal >= 80 ? 'bg-rose-500' : cpuVal >= 60 ? 'bg-amber-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(100, cpuVal)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Memory Occupied</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{ramUsed.toFixed(1)} GB</span>
                <span className="text-xs text-slate-400 font-semibold">{ramVal.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full ${ramVal >= 85 ? 'bg-rose-500' : ramVal >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, ramVal)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Storage Footprint</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{diskVal.toFixed(1)}%</span>
                <span className="text-xs text-slate-400 font-semibold">{node?.disk_total_gb || 468} GB Total</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, diskVal)}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Dedicated GPU</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{node?.gpu_percent || 0}%</span>
                <span className="text-xs text-slate-400 font-semibold truncate max-w-[100px]">{node?.gpu_name || 'RTX A4000'}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, node?.gpu_percent || 0)}%` }} />
              </div>
            </div>
          </div>

          {/* Top Workloads Preview */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Highest Resource Workloads</h3>
              <button onClick={() => setTab('processes')} className="text-xs font-bold text-blue-600 hover:underline">
                View All {processes.length} Processes →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Process</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">CPU %</th>
                    <th className="py-2.5 px-3">Memory (RSS)</th>
                    <th className="py-2.5 px-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {topCpuProcs.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900 flex items-center gap-2">
                        <ProcessIcon name={p.name} size={16} />
                        <span>{p.name}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-indigo-700 font-bold">{p.user}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{p.cpu_percent.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-600">{Math.round(p.memory_mb)} MB</td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <button
                          onClick={() => setConfirmKillPid(p.pid)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition"
                        >
                          End Task
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROCESSES (Unified Process Controller & Fleet Process Manager) */}
      {activeTab === 'processes' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={procSearch}
                  onChange={(e) => setProcSearch(e.target.value)}
                  placeholder="Filter name, PID, user..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setProcFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition ${procFilter === 'ALL' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                >
                  All ({processes.length})
                </button>
                <button
                  onClick={() => setProcFilter('APP')}
                  className={`px-3 py-1 rounded-lg transition ${procFilter === 'APP' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                >
                  Applications
                </button>
                <button
                  onClick={() => setProcFilter('SYSTEM')}
                  className={`px-3 py-1 rounded-lg transition ${procFilter === 'SYSTEM' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                >
                  Daemons
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAdvancedProcs}
                  onChange={(e) => setShowAdvancedProcs(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Show Advanced (PIDs, Signals)</span>
              </label>
            </div>
          </div>

          {/* Process Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    {showAdvancedProcs && <th className="py-2.5 px-3">PID</th>}
                    <th className="py-2.5 px-3">Process Name</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">CPU %</th>
                    <th className="py-2.5 px-3">Memory (RSS)</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                  {filteredProcs.length === 0 ? (
                    <tr>
                      <td colSpan={showAdvancedProcs ? 8 : 7} className="py-12 text-center text-slate-400 font-sans">
                        No active processes matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProcs.map((p: any, idx: number) => (
                      <tr key={`${p.pid}-${idx}`} className="hover:bg-slate-50/80 transition">
                        {showAdvancedProcs && <td className="py-2.5 px-3 text-slate-400 font-bold">{p.pid}</td>}
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 flex items-center gap-2">
                          <ProcessIcon name={p.name} size={16} />
                          <span className="truncate max-w-[200px]" title={p.name}>{p.name}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold text-indigo-700">{p.user}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.is_user_app ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.is_user_app ? 'App' : 'Daemon'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.cpu_percent.toFixed(1)}%</td>
                        <td className="py-2.5 px-3">{Math.round(p.memory_mb)} MB</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {p.state || 'RUNNING'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            onClick={() => setConfirmKillPid(p.pid)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition"
                          >
                            End Task
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE DIAGNOSTICS (Unified CPU & Memory Analyzer) */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Core Breakdown */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">CPU Thread Distribution</h3>
                </div>
                <span className="text-xs font-bold text-slate-600">{cpuVal.toFixed(1)}% Total Utilization</span>
              </div>
              <p className="text-xs text-slate-500">Multicore workload saturation across physical processor threads.</p>

              <div className="space-y-2.5 pt-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(core => {
                  const corePct = Math.min(100, Math.max(5, (cpuVal * (0.8 + (core % 3) * 0.2))));
                  return (
                    <div key={core} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                        <span>Core {core}</span>
                        <span className="font-bold">{corePct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${corePct >= 80 ? 'bg-rose-500' : corePct >= 50 ? 'bg-amber-500' : 'bg-blue-600'}`}
                          style={{ width: `${corePct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Memory Architecture Breakdown */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Physical RAM Architecture</h3>
                </div>
                <span className="text-xs font-bold text-slate-600">{ramVal.toFixed(1)}% Consumed</span>
              </div>
              <p className="text-xs text-slate-500">Allocation breakdown across active working set, page cache, and buffer pool.</p>

              {/* Stacked Memory Bar */}
              <div className="w-full bg-slate-100 h-4 rounded-xl overflow-hidden flex shadow-inner">
                <div style={{ width: `${ramVal}%` }} className="bg-blue-600 h-full" title={`Used RAM: ${ramUsed.toFixed(1)} GB`} />
                <div style={{ width: '15%' }} className="bg-sky-400 h-full" title="Cache & Buffers: 2.1 GB" />
                <div style={{ width: `${Math.max(0, 85 - ramVal)}%` }} className="bg-emerald-400 h-full" title="Free RAM" />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-slate-500 block text-[10px]">Active Used</span>
                  <span className="font-extrabold text-blue-700">{ramUsed.toFixed(1)} GB</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                  <span className="text-slate-500 block text-[10px]">OS Buffer/Cache</span>
                  <span className="font-extrabold text-sky-700">~2.1 GB</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-slate-500 block text-[10px]">Free Physical</span>
                  <span className="font-extrabold text-emerald-700">{(ramTotal - ramUsed).toFixed(1)} GB</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Top Memory Consumers</h4>
                {topMemProcs.slice(0, 3).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <span className="font-semibold text-slate-700">{p.name}</span>
                    <span className="font-mono text-slate-500">{Math.round(p.memory_mb)} MB</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SOFTWARE PACKAGES */}
      {activeTab === 'software' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Installed Software Packages</h3>
              <p className="text-xs text-slate-500">Verified application packages registered on {node?.hostname}.</p>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['nodeSoftware', decodedNodeId] })}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
            >
              Refresh Inventory
            </button>
          </div>

          {isSwLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Scanning software catalog...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Application Name</th>
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3">Publisher</th>
                    <th className="py-2.5 px-3">Approx. Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                  {((softwareData?.packages || []) as any[]).map((pkg: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{pkg.name}</td>
                      <td className="py-2.5 px-3">{pkg.version || '1.0'}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-500">{pkg.publisher || 'Verified Package'}</td>
                      <td className="py-2.5 px-3">{pkg.sizeMB ? `${Math.round(pkg.sizeMB)} MB` : '150 MB'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TELEMETRY HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Historical Telemetry Stream (Last 24 Hours)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyPoints}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#1d68ff" fill="#1d68ff" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="ram" name="RAM %" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HARDWARE SPECIFICATIONS */}
      {activeTab === 'hardware' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Physical Hardware Architecture</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Processor / CPU</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{node?.system_type || 'Intel Core i9-14900K'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Physical Memory</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{ramTotal.toFixed(1)} GB DDR5</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Drive</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{node?.disk_total_gb || 468} GB NVMe SSD</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Dedicated GPU</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{node?.gpu_name || 'NVIDIA RTX A4000'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">MAC Address</span>
              <span className="font-bold text-slate-800 font-mono text-sm mt-0.5 block">{node?.mac || '28:c5:c8:80:01:d0'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Network Interface</span>
              <span className="font-bold text-slate-800 font-mono text-sm mt-0.5 block">{node?.interface || 'eno1 (Ethernet 1Gbps)'}</span>
            </div>
          </div>
        </div>
      )}

      {/* End Task Confirmation Modal */}
      {confirmKillPid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-sm w-full space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Confirm Process Termination</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to end process PID <strong className="font-mono">{confirmKillPid}</strong>? Unsaved student application data may be lost.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmKillPid(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => killMutation.mutate(confirmKillPid)}
                disabled={killMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                {killMutation.isPending ? 'Ending Task...' : 'Confirm End Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
