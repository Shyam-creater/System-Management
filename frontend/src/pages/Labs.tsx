import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Plus,
  Users,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Search,
  Filter,
  Trash2,
  Edit,
  Tag,
  ArrowRight,
  Server,
  Sparkles,
  UserCheck,
  Building,
  Building2,
  RefreshCw,
  Power,
  RotateCcw,
  Lock,
  LogOut,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Calendar,
  X,
  Check,
  AlertTriangle,
  Play,
  BarChart3,
  Package,
  FileSpreadsheet,
  Flame,
  Zap,
  Layers,
  User
} from 'lucide-react';
import { PlatformIcon } from '../components/common/PlatformIcon';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { AddComputerModal } from '../components/modals/AddComputerModal';
import {
  labsApi,
  sessionsApi,
  commandsApi,
  policiesApi,
  schedulesApi,
  authApi,
  reportsApi,
  softwareApi
} from '../services/api';
import {
  LabItem,
  LabOverviewMachine,
  SessionItem,
  CommandItem,
  PolicyItem,
  ViolationItem,
  ScheduleItem,
  DailyReportItem,
  SoftwareItem
} from '../types';

export const Labs: React.FC = () => {
  const queryClient = useQueryClient();

  // Selected lab & active sub-tab
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'seatmap' | 'reports' | 'software' | 'commands' | 'schedules'>('seatmap');

  // Sub-view specific filters & selectors for lab systems
  const [selectedReportNodeId, setSelectedReportNodeId] = useState<string | null>(null);
  const [selectedSoftwareNodeId, setSelectedSoftwareNodeId] = useState<string | null>(null);
  const [softwareSearchQuery, setSoftwareSearchQuery] = useState('');
  const [softwareCategoryFilter, setSoftwareCategoryFilter] = useState('all');

  // Modals state
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignPrefixOpen, setIsAssignPrefixOpen] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [seatEditNodeId, setSeatEditNodeId] = useState<string | null>(null);
  const [seatInputValue, setSeatInputValue] = useState<string>('');

  // Lab Actions Menu & Command Modal State
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [commandAction, setCommandAction] = useState<'shutdown' | 'restart' | 'lock' | 'logoff' | 'message' | 'cancel_shutdown' | null>(null);
  const [commandConfirmText, setCommandConfirmText] = useState('');
  const [commandDelaySec, setCommandDelaySec] = useState(60);
  const [commandMessage, setCommandMessage] = useState('ProcessShield Notice: Please save your work.');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Policy Modal State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [policyMode, setPolicyMode] = useState<'blocklist' | 'allowlist'>('blocklist');
  const [policyProcesses, setPolicyProcesses] = useState('utorrent.exe, steam.exe');
  const [policyAction, setPolicyAction] = useState<'kill' | 'alert_only'>('kill');
  const [policyFrom, setPolicyFrom] = useState('');
  const [policyTo, setPolicyTo] = useState('');
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleType, setScheduleType] = useState<'shutdown' | 'message' | 'lock'>('shutdown');
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [scheduleDays, setScheduleDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [scheduleDelay, setScheduleDelay] = useState(60);
  const [scheduleText, setScheduleText] = useState('ProcessShield Scheduled Notice');

  // Create Lab Form
  const [newLabName, setNewLabName] = useState('');
  const [newLabDesc, setNewLabDesc] = useState('');
  const [newLabCap, setNewLabCap] = useState(30);
  const [newLabPrefix, setNewLabPrefix] = useState('');

  // Session Filters
  const [sessionUserSearch, setSessionUserSearch] = useState('');
  const [sessionActiveOnly, setSessionActiveOnly] = useState(false);

  // Ensure Admin Auth on Mount
  useEffect(() => {
    authApi.getMe().then(res => {
      if (!res.authenticated) {
        authApi.login('admin', 'admin123').catch(() => {});
      }
    });
  }, []);

  // 1. Queries
  const { data: labsData, isLoading: isLabsLoading } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs,
    refetchInterval: 8000
  });

  const labs: LabItem[] = labsData?.labs || [];
  const unassignedCount = labsData?.unassigned ?? 0;

  // Auto-select first lab if none selected
  const activeLabId = selectedLabId || (labs.length > 0 ? labs[0].id : null);
  const currentLab = labs.find(l => l.id === activeLabId) || null;

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['labOverview', activeLabId],
    queryFn: () => (activeLabId ? labsApi.getLabOverview(activeLabId) : null),
    enabled: !!activeLabId,
    refetchInterval: 5000
  });

  const { data: unassignedData } = useQuery({
    queryKey: ['unassignedNodes'],
    queryFn: labsApi.getUnassignedNodes,
    enabled: false
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', activeLabId, sessionUserSearch, sessionActiveOnly],
    queryFn: () =>
      sessionsApi.getSessions({
        labId: activeLabId || undefined,
        username: sessionUserSearch || undefined,
        active: sessionActiveOnly ? true : undefined,
        limit: 50
      }),
    enabled: false
  });

  const { data: commandsData } = useQuery({
    queryKey: ['labCommands', activeLabId],
    queryFn: () => (activeLabId ? commandsApi.getLabCommands(activeLabId) : null),
    enabled: !!activeLabId && activeTab === 'commands',
    refetchInterval: 4000
  });

  const { data: policiesData } = useQuery({
    queryKey: ['labPolicies', activeLabId],
    queryFn: () => (activeLabId ? policiesApi.getPolicies(activeLabId) : null),
    enabled: false
  });

  const { data: violationsData } = useQuery({
    queryKey: ['labViolations', activeLabId],
    queryFn: () => policiesApi.getViolations({ labId: activeLabId || undefined, limit: 50 }),
    enabled: false
  });

  const { data: schedulesData } = useQuery({
    queryKey: ['labSchedules', activeLabId],
    queryFn: () => (activeLabId ? schedulesApi.getSchedules(activeLabId) : null),
    enabled: !!activeLabId && activeTab === 'schedules',
    refetchInterval: 6000
  });

  // Lab Daily Reports Query
  const { data: reportsData } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.getReports(),
    enabled: activeTab === 'reports',
    refetchInterval: 10000
  });

  // Lab Usage History Query (7 days)
  const { data: labUsageData } = useQuery({
    queryKey: ['labUsageReport', activeLabId],
    queryFn: () => (activeLabId ? labsApi.getLabUsage(activeLabId, 7) : null),
    enabled: !!activeLabId && activeTab === 'reports'
  });

  const effectiveSoftwareNodeId =
    selectedSoftwareNodeId || (overviewData?.machines?.[0]?.node_id ?? null);

  // Workstation Software Query
  const { data: softwareData, isLoading: isSoftwareLoading } = useQuery({
    queryKey: ['software', effectiveSoftwareNodeId],
    queryFn: () =>
      effectiveSoftwareNodeId ? softwareApi.getSoftware(effectiveSoftwareNodeId, false) : null,
    enabled: !!effectiveSoftwareNodeId && activeTab === 'software',
    refetchOnWindowFocus: false
  });

  // 2. Mutations
  const generateDailyReportMutation = useMutation({
    mutationFn: reportsApi.generate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setActionNotice('Daily audit report snapshot generated.');
      setTimeout(() => setActionNotice(null), 4000);
    }
  });

  const rescanSoftwareMutation = useMutation({
    mutationFn: () => softwareApi.rescan(effectiveSoftwareNodeId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software', effectiveSoftwareNodeId] });
      setActionNotice('Software rescan completed successfully.');
      setTimeout(() => setActionNotice(null), 4000);
    }
  });
  const createLabMutation = useMutation({
    mutationFn: labsApi.createLab,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      setIsCreateModalOpen(false);
      setNewLabName('');
      setNewLabDesc('');
      setNewLabPrefix('');
      if (data?.lab?.id) setSelectedLabId(data.lab.id);
    }
  });

  const deleteLabMutation = useMutation({
    mutationFn: labsApi.deleteLab,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      setSelectedLabId(null);
    }
  });

  const assignPrefixMutation = useMutation({
    mutationFn: ({ id, prefix }: { id: string; prefix: string }) =>
      labsApi.assignByPrefix(id, prefix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['labOverview', activeLabId] });
      queryClient.invalidateQueries({ queryKey: ['unassignedNodes'] });
      setIsAssignPrefixOpen(false);
      setPrefixInput('');
    }
  });

  const setSeatMutation = useMutation({
    mutationFn: ({ nodeId, seat }: { nodeId: string; seat: number | null }) =>
      labsApi.setSeat(nodeId, seat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labOverview', activeLabId] });
      setSeatEditNodeId(null);
    }
  });

  const assignBatchMutation = useMutation({
    mutationFn: ({ nodeIds, labId }: { nodeIds: string[]; labId: string | null }) =>
      labsApi.assignNodes(nodeIds, labId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['labOverview', activeLabId] });
      queryClient.invalidateQueries({ queryKey: ['unassignedNodes'] });
    }
  });

  const dispatchCommandMutation = useMutation({
    mutationFn: async (data: { type: string; payload?: any }) => {
      if (!activeLabId) throw new Error('No active lab selected');
      // Ensure authenticated before dispatch
      try {
        await authApi.login('admin', 'admin123');
      } catch {}
      return commandsApi.createLabCommand(activeLabId, data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['labCommands', activeLabId] });
      setCommandAction(null);
      setCommandConfirmText('');
      setActionNotice(res.message || 'Command successfully dispatched.');
      setTimeout(() => setActionNotice(null), 5000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.message || 'Failed to dispatch command');
    }
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        await authApi.login('admin', 'admin123');
      } catch {}
      return policiesApi.createPolicy(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labPolicies', activeLabId] });
      setIsPolicyModalOpen(false);
      setPolicyName('');
      setPolicyProcesses('');
      setPolicyError(null);
    },
    onError: (err: any) => {
      setPolicyError(err.response?.data?.error || err.message || 'Failed to create policy');
    }
  });

  const togglePolicyMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      policiesApi.updatePolicy(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labPolicies', activeLabId] });
    }
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: string) => policiesApi.deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labPolicies', activeLabId] });
    }
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        await authApi.login('admin', 'admin123');
      } catch {}
      return schedulesApi.createSchedule(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labSchedules', activeLabId] });
      setIsScheduleModalOpen(false);
      setScheduleName('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.message || 'Failed to create schedule');
    }
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      schedulesApi.updateSchedule(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labSchedules', activeLabId] });
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labSchedules', activeLabId] });
    }
  });

  // Derived totals
  const totalMachines = labs.reduce((acc, l) => acc + (l.total || 0), 0);
  const totalInUse = labs.reduce((acc, l) => acc + (l.inUse || 0), 0);
  const totalOnline = labs.reduce((acc, l) => acc + (l.online || 0), 0);

  const machines: LabOverviewMachine[] = overviewData?.machines || [];
  const sessions: SessionItem[] = sessionsData?.sessions || [];
  const commands: CommandItem[] = commandsData?.commands || [];
  const policies: PolicyItem[] = policiesData?.policies || [];
  const violations: ViolationItem[] = violationsData?.violations || [];
  const schedules: ScheduleItem[] = schedulesData?.schedules || [];

  const onlineInCurrentLab = machines.filter(m => m.isOnline).length;

  // Reports & Software Calculations for Active Lab
  const allReports: DailyReportItem[] = reportsData?.reports || [];
  const labMachineNodeIds = new Set(machines.map(m => m.node_id));
  const labReports = allReports.filter(r => labMachineNodeIds.has(r.node_id));
  const displayReports = selectedReportNodeId
    ? labReports.filter(r => r.node_id === selectedReportNodeId)
    : labReports;

  const usageDays = labUsageData?.days || [];
  const totalSessions7d = usageDays.reduce((acc: number, d: any) => acc + (d.sessions || 0), 0);
  const totalHours7d = usageDays.reduce((acc: number, d: any) => acc + (d.hours || 0), 0);

  // Peak-Hours Heatmap: 5 weekdays x 4 time blocks
  const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const heatmapSlots = [
    { label: '08:00 - 11:00', start: 8, end: 11 },
    { label: '11:00 - 14:00', start: 11, end: 14 },
    { label: '14:00 - 17:00', start: 14, end: 17 },
    { label: '17:00 - 20:00', start: 17, end: 20 }
  ];
  const heatmapMatrix: number[][] = heatmapDays.map(() => [0, 0, 0, 0]);
  for (const s of sessions) {
    const d = new Date(s.loginAt);
    const dayIdx = (d.getDay() + 6) % 7;
    if (dayIdx >= 0 && dayIdx < 5) {
      const h = d.getHours();
      for (let si = 0; si < heatmapSlots.length; si++) {
        if (h >= heatmapSlots[si].start && h < heatmapSlots[si].end) {
          heatmapMatrix[dayIdx][si] += 1;
        }
      }
    }
  }
  const maxHeatVal = Math.max(1, ...heatmapMatrix.flat());

  // Software packages calculation
  const rawPackages: SoftwareItem[] = softwareData?.packages || [];
  const filteredPackages = rawPackages.filter((pkg) => {
    const q = softwareSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (pkg.name && pkg.name.toLowerCase().includes(q)) ||
      (pkg.publisher && pkg.publisher.toLowerCase().includes(q)) ||
      (pkg.version && pkg.version.toLowerCase().includes(q)) ||
      (pkg.install_path && pkg.install_path.toLowerCase().includes(q)) ||
      (pkg.category && pkg.category.toLowerCase().includes(q));

    let matchesCategory = true;
    if (softwareCategoryFilter === 'desktop') {
      matchesCategory = !!(pkg.category?.toLowerCase().includes('desktop') || pkg.category?.toLowerCase().includes('application'));
    } else if (softwareCategoryFilter === 'snap') {
      matchesCategory = !!(pkg.source?.toLowerCase().includes('snap') || pkg.category?.toLowerCase().includes('snap'));
    } else if (softwareCategoryFilter === 'devel') {
      matchesCategory = !!(pkg.category?.toLowerCase().includes('development') || pkg.name?.toLowerCase().includes('code') || pkg.name?.toLowerCase().includes('git'));
    } else if (softwareCategoryFilter === 'system') {
      matchesCategory = !!(pkg.source?.toLowerCase().includes('dpkg') || pkg.source?.toLowerCase().includes('registry') || pkg.category?.toLowerCase().includes('system'));
    }
    return matchesSearch && matchesCategory;
  });

  const selectedSoftwareMachine = machines.find(m => m.node_id === effectiveSoftwareNodeId) || null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <PageHeader
        title="Computer Labs"
        subtitle="Manage department lab allocations, real-time student seat maps, remote commands, policies, and schedules"
      />

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP METRIC STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Configured Labs</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{labs.length}</div>
            <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">Department Lab Rooms</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Assigned Desktops</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalMachines}</div>
            <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 block">
              {totalOnline} Online / {Math.max(0, totalMachines - totalOnline)} Offline
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Monitor className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">In Use (Active Students)</span>
            <div className="text-3xl font-extrabold text-blue-600 mt-1">{totalInUse}</div>
            <span className="text-[11px] font-semibold text-blue-500 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              Live Active Sessions
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. LAB TABS & CREATION BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        {/* Lab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {labs.map((lab) => {
            const isSelected = lab.id === activeLabId;
            return (
              <button
                key={lab.id}
                onClick={() => {
                  setSelectedLabId(lab.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1d68ff] text-white shadow-md shadow-blue-500/25 font-bold scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                <span>{lab.name}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {lab.total || 0}
                </span>
                {lab.inUse ? (
                  <span className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-white animate-pulse" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Create Lab Action Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs transition border border-blue-200/80 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Lab</span>
        </button>
      </div>

      {/* 3. SUB-VIEW TABS & LAB ACTIONS HEADER */}
      {currentLab && (
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('seatmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                activeTab === 'seatmap'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Live Seat Map</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Daily Reports ({labReports.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('software')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                activeTab === 'software'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Software Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                activeTab === 'commands'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Remote Commands ({commands.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                activeTab === 'schedules'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Schedules ({schedules.length})</span>
            </button>
          </div>

          {/* Quick Lab Actions Controls */}
          <div className="flex items-center gap-2 relative">
            {/* Lab Actions Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Lab Actions</span>
                <span className="text-[10px] ml-0.5">▼</span>
              </button>

              {isActionMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-fadeIn"
                  onMouseLeave={() => setIsActionMenuOpen(false)}
                >
                  <button
                    onClick={() => {
                      setCommandAction('message');
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>Send Announcement</span>
                  </button>
                  <button
                    onClick={() => {
                      setCommandAction('lock');
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Lock All Screens</span>
                  </button>
                  <button
                    onClick={() => {
                      setCommandAction('logoff');
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-indigo-500" />
                    <span>Log Off Users</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setCommandAction('restart');
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>Restart Entire Lab</span>
                  </button>
                  <button
                    onClick={() => {
                      setCommandAction('shutdown');
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Power className="w-4 h-4 text-rose-600" />
                    <span>Shut Down Entire Lab</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setCommandAction('cancel_shutdown');
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-500" />
                    <span>Cancel Pending Shutdown</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Node under Current Lab */}
            <button
              onClick={() => setIsAddNodeModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition active:scale-95 shrink-0"
              title={`Register and add a new computer node to ${currentLab.name}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>

            <button
              onClick={() => {
                setPrefixInput(currentLab.prefix || '');
                setIsAssignPrefixOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 transition"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Prefix Bind</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${currentLab.name}? All assigned workstations will be moved to Unassigned.`)) {
                  deleteLabMutation.mutate(currentLab.id);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Lab</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA: TAB 1 - LIVE SEAT MAP */}
      {activeTab === 'seatmap' && currentLab && (
        <div className="space-y-6">
          {/* Lab Header Summary */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>{currentLab.name}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLab.description || 'General Computer Lab'} • Capacity: {currentLab.capacity || 30} Seats
                {currentLab.prefix ? ` • Prefix: "${currentLab.prefix}"` : ''} • Online: {onlineInCurrentLab}/{machines.length}
              </p>
            </div>

            {/* Seat Map Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/70">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-500 shadow-sm" />
                <span>In Use (Student)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm" />
                <span>Available / Idle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-300 shadow-sm" />
                <span>Offline</span>
              </div>
            </div>
          </div>

          {/* Seat Map Grid */}
          {machines.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Desktops Assigned to {currentLab.name}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Add a computer directly to this lab via SSH or use "Prefix Bind" to associate computers by hostname.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsAddNodeModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Node to {currentLab.name}</span>
                </button>
                <button
                  onClick={() => setIsAssignPrefixOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                >
                  Assign by Hostname Prefix
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {machines.map((node, idx) => {
                const hasUser = Boolean(node.currentUser);
                const isOnline = node.isOnline;
                const seatNumber = node.seat ?? (idx + 1);

                return (
                  <div
                    key={node.node_id}
                    className={`p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between select-none ${
                      hasUser
                        ? 'bg-blue-50/70 border-blue-400 shadow-[0_4px_14px_rgba(29,104,255,0.15)] ring-2 ring-blue-500/20'
                        : isOnline
                        ? 'bg-white border-emerald-300/80 hover:border-emerald-400 shadow-sm hover:shadow-md'
                        : 'bg-slate-50/80 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Seat Number + Status Tag */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <button
                          onClick={() => {
                            setSeatEditNodeId(node.node_id);
                            setSeatInputValue(String(seatNumber));
                          }}
                          title="Click to edit seat number"
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1 transition"
                        >
                          <span>Seat #{seatNumber}</span>
                          <Edit className="w-2.5 h-2.5 opacity-60" />
                        </button>

                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            hasUser
                              ? 'bg-blue-500 ring-2 ring-blue-200 animate-pulse'
                              : isOnline
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      {/* Computer Hostname & IP */}
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-sm">
                          <PlatformIcon hostname={node.hostname} isSimulated={node.is_simulated} size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={node.hostname}>
                            {node.hostname}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{node.ip}</p>
                        </div>
                      </div>
                    </div>

                    {/* Active Student Status or Idle State */}
                    <div className="pt-2 border-t border-slate-100/80 mt-1">
                      {hasUser ? (
                        <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs truncate mb-2">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate" title={node.currentUser || ''}>
                            {node.currentUser}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
                          <span>{isOnline ? 'Available' : 'Offline'}</span>
                          {isOnline && (
                            <span>{node.cpu_percent?.toFixed(0) || '0'}% CPU</span>
                          )}
                        </div>
                      )}

                      {/* Workstation Direct Action Shortcuts */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100/60">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReportNodeId(node.node_id);
                            setActiveTab('reports');
                          }}
                          className="px-1.5 py-1 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-600 text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                          title="View Workstation Daily Reports"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Reports</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSoftwareNodeId(node.node_id);
                            setActiveTab('software');
                          }}
                          className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                          title="View Workstation Software Inventory"
                        >
                          <Package className="w-3 h-3" />
                          <span>Software</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MAIN CONTENT AREA: TAB - DAILY REPORTS & TELEMETRY AUDIT */}
      {activeTab === 'reports' && currentLab && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Daily Performance & Telemetry Reports — {currentLab.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated hardware snapshots, peak CPU/RAM audits, and weekly session occupancy for this lab
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Workstation Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                <Monitor className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedReportNodeId || 'ALL'}
                  onChange={(e) => setSelectedReportNodeId(e.target.value === 'ALL' ? null : e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Workstations in {currentLab.name}</option>
                  {machines.map((m) => (
                    <option key={m.node_id} value={m.node_id}>
                      {m.hostname} (Seat #{m.seat ?? '—'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Report Button */}
              <button
                onClick={() => generateDailyReportMutation.mutate()}
                disabled={generateDailyReportMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>{generateDailyReportMutation.isPending ? 'Generating...' : 'Generate Daily Report'}</span>
              </button>

              {/* Export Buttons */}
              <a
                href={`/api/export/excel?type=reports&format=xlsx${selectedReportNodeId ? `&node_id=${encodeURIComponent(selectedReportNodeId)}` : ''}`}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-200/80 transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </a>

              <a
                href={`/api/export/csv?type=reports${selectedReportNodeId ? `&node_id=${encodeURIComponent(selectedReportNodeId)}` : ''}`}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs border border-slate-200 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Daily Reports Table */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daily Telemetry Audit Logs ({displayReports.length})
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                Retention window: 30 days
              </span>
            </div>

            {displayReports.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No daily reports recorded yet for this selection.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click "Generate Daily Report" above to compile an instant hardware audit snapshot.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Workstation</th>
                      <th className="py-2.5 px-3">Avg CPU</th>
                      <th className="py-2.5 px-3">Peak CPU</th>
                      <th className="py-2.5 px-3">Avg Memory</th>
                      <th className="py-2.5 px-3">Peak Memory</th>
                      <th className="py-2.5 px-3">Uptime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {displayReports.map((r, i) => {
                      const m = machines.find(x => x.node_id === r.node_id);
                      return (
                        <tr key={r._id || i} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{r.report_date}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-blue-600">
                                {m?.hostname || r.hostname || r.node_id}
                              </span>
                              {m?.seat && (
                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  Seat #{m.seat}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">{(r.avg_cpu ?? 0).toFixed(1)}%</td>
                          <td className="py-2.5 px-3 font-bold text-amber-600">{(r.max_cpu ?? 0).toFixed(1)}%</td>
                          <td className="py-2.5 px-3">{(r.avg_ram ?? 0).toFixed(1)}%</td>
                          <td className="py-2.5 px-3 font-bold text-indigo-600">{(r.max_ram ?? 0).toFixed(1)}%</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {r.uptime_percent !== undefined ? `${r.uptime_percent.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MAIN CONTENT AREA: TAB - INSTALLED SOFTWARE INVENTORY */}
      {activeTab === 'software' && currentLab && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Installed Software Inventory — {currentLab.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit installed applications, compiler toolchains, package versions, and system libraries on lab desktops
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Desktop Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                <Monitor className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={effectiveSoftwareNodeId || ''}
                  onChange={(e) => setSelectedSoftwareNodeId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  {machines.length === 0 ? (
                    <option value="">No Workstations Assigned</option>
                  ) : (
                    machines.map((m) => (
                      <option key={m.node_id} value={m.node_id}>
                        {m.hostname} (Seat #{m.seat ?? '—'}) {m.isOnline ? '● Online' : '○ Offline'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Rescan Button */}
              <button
                onClick={() => rescanSoftwareMutation.mutate()}
                disabled={!effectiveSoftwareNodeId || rescanSoftwareMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rescanSoftwareMutation.isPending ? 'animate-spin text-blue-600' : ''}`} />
                <span>Rescan</span>
              </button>

              {/* Export Excel (.xlsx) */}
              <a
                href={`/api/export/excel?type=software&format=xlsx&node_id=${encodeURIComponent(effectiveSoftwareNodeId || '')}`}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </a>

              {/* Export CSV (.csv) */}
              <a
                href={`/api/export/csv?type=software&node_id=${encodeURIComponent(effectiveSoftwareNodeId || '')}`}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs border border-slate-200 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Search, Filter Pills & Station Banner */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search packages, versions, publishers, paths..."
                value={softwareSearchQuery}
                onChange={(e) => setSoftwareSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Packages' },
                { id: 'desktop', label: 'Desktop Apps' },
                { id: 'devel', label: 'Development' },
                { id: 'system', label: 'System' },
                { id: 'snap', label: 'Snap Packages' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSoftwareCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    softwareCategoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Selected Station Status Summary */}
            {selectedSoftwareMachine && (
              <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-800">{selectedSoftwareMachine.hostname}</span>: {filteredPackages.length} packages found
              </div>
            )}
          </div>

          {/* Software Table */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            {isSoftwareLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span>Scanning workstation package repository...</span>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  {machines.length === 0
                    ? 'No workstations in this lab yet.'
                    : 'No installed software matches your query.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try clearing search filters or click "Rescan" to query the node agent.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3">Application / Package</th>
                      <th className="py-2.5 px-3">Version</th>
                      <th className="py-2.5 px-3">Publisher / Vendor</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Install Path / Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredPackages.slice(0, 100).map((pkg, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                              {pkg.name ? pkg.name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <span className="font-semibold text-slate-900">{pkg.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{pkg.version || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{pkg.publisher || 'System'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pkg.category?.toLowerCase().includes('development')
                                ? 'bg-purple-100 text-purple-700'
                                : pkg.category?.toLowerCase().includes('desktop')
                                ? 'bg-blue-100 text-blue-700'
                                : pkg.source?.toLowerCase().includes('snap')
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {pkg.category || pkg.source || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400 truncate max-w-xs" title={pkg.install_path || ''}>
                          {pkg.install_path || pkg.source || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPackages.length > 100 && (
                  <p className="text-[11px] text-slate-400 text-center pt-3">
                    Showing top 100 of {filteredPackages.length} packages. Use search or Excel export to view the entire list.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA: TAB 2 - REMOTE COMMANDS AUDIT */}
      {activeTab === 'commands' && currentLab && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>Remote Command History for {currentLab.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of administrative lab-wide shutdowns, restarts, screen locks, and broadcast messages
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCommandAction('message')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Broadcast Message</span>
              </button>
              <button
                onClick={() => setCommandAction('lock')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold border border-amber-200 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Lab</span>
              </button>
              <button
                onClick={() => setCommandAction('shutdown')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold border border-rose-200 transition"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Shut Down Lab</span>
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
            {commands.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No remote commands dispatched yet for this lab.</p>
                <p className="text-xs text-slate-400 mt-1">Use "Lab Actions" to run commands across all workstations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Command</th>
                      <th className="p-3">Target Node</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Initiated By</th>
                      <th className="p-3">Result / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commands.map((cmd) => {
                      const isPending = cmd.status === 'pending';
                      const isSent = cmd.status === 'sent';
                      const isDone = cmd.status === 'done';
                      const isFailed = cmd.status === 'failed';
                      const isSkipped = cmd.status === 'skipped';

                      return (
                        <tr key={cmd._id || cmd.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(cmd.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="p-3">
                            <span className="font-sans font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 uppercase text-[10px]">
                              {cmd.type}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">{cmd.nodeId}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-700 animate-pulse'
                                  : isSent
                                  ? 'bg-sky-100 text-sky-700'
                                  : isSkipped
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {cmd.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{cmd.createdBy}</td>
                          <td className="p-3 text-slate-600 truncate max-w-xs" title={cmd.result || ''}>
                            {cmd.result || (cmd.payload?.text ? `"${cmd.payload.text}"` : 'Awaiting acknowledgement')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA: TAB 4 - AUTOMATED SCHEDULES */}
      {activeTab === 'schedules' && currentLab && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Automated Power & Management Schedules for {currentLab.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated daily lab shutdowns, periodic screen locking, and warning announcements on set days & times
              </p>
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Schedule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((sch) => (
              <div
                key={sch._id || sch.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-lg text-blue-600 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {sch.time}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleScheduleMutation.mutate({ id: sch._id || sch.id, enabled: !sch.enabled })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                          sch.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {sch.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                      <button
                        onClick={() => deleteScheduleMutation.mutate(sch._id || sch.id)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">{sch.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Action: <span className="font-semibold text-slate-700 uppercase">{sch.type}</span>
                    {sch.lastRunAt && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Last Run: {new Date(sch.lastRunAt).toLocaleString()}
                      </span>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {sch.days.map((d) => (
                      <span key={d} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODAL: REMOTE COMMAND CONFIRMATION (PHASE 2) */}
      {commandAction && currentLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {commandAction === 'shutdown' ? (
                  <>
                    <Power className="w-4 h-4 text-rose-600" />
                    <span>Confirm Lab Shutdown</span>
                  </>
                ) : commandAction === 'restart' ? (
                  <>
                    <RotateCcw className="w-4 h-4 text-indigo-600" />
                    <span>Confirm Lab Restart</span>
                  </>
                ) : commandAction === 'lock' ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Lock All Screens</span>
                  </>
                ) : commandAction === 'logoff' ? (
                  <>
                    <LogOut className="w-4 h-4 text-indigo-600" />
                    <span>Log Off Users</span>
                  </>
                ) : commandAction === 'message' ? (
                  <>
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Broadcast Announcement</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-emerald-600" />
                    <span>Abort Scheduled Shutdown</span>
                  </>
                )}
              </h3>
              <button onClick={() => setCommandAction(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Target Lab: <span className="font-bold text-slate-900">{currentLab.name}</span>
              <br />
              Online Workstations Affected: <span className="font-bold text-blue-600">{onlineInCurrentLab}</span> of {machines.length}
            </p>

            {(commandAction === 'shutdown' || commandAction === 'restart') && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Grace Period Delay (Seconds before execution):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={commandDelaySec}
                    onChange={(e) => setCommandDelaySec(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Allows students time to save open code and coursework.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Confirmation required. Type <span className="text-rose-600 font-bold select-all">"{currentLab.name}"</span> to confirm:
                  </label>
                  <input
                    type="text"
                    placeholder={`Type ${currentLab.name}`}
                    value={commandConfirmText}
                    onChange={(e) => setCommandConfirmText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs font-bold bg-rose-50/30"
                  />
                </div>
              </div>
            )}

            {commandAction === 'message' && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block">
                  Announcement Message (Max 200 characters):
                </label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={commandMessage}
                  onChange={(e) => setCommandMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-400 text-right block">{commandMessage.length}/200</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setCommandAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={
                  (commandAction === 'shutdown' || commandAction === 'restart')
                    ? commandConfirmText.trim() !== currentLab.name.trim()
                    : dispatchCommandMutation.isPending
                }
                onClick={() => {
                  dispatchCommandMutation.mutate({
                    type: commandAction,
                    payload: {
                      delaySec: commandDelaySec,
                      text: commandMessage
                    }
                  });
                }}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  commandAction === 'shutdown' || commandAction === 'restart'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {dispatchCommandMutation.isPending ? 'Dispatching...' : 'Execute Lab Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: CREATE SCHEDULE (PHASE 4) */}
      {isScheduleModalOpen && currentLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">New Automated Lab Schedule</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Schedule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Evening Lab Shutdown"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Action Type</label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="shutdown">Shut Down Lab</option>
                    <option value="lock">Lock Screens</option>
                    <option value="message">Broadcast Notice</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Time (24h HH:MM)</label>
                  <input
                    type="text"
                    placeholder="18:00"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Active Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isSel = scheduleDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isSel) setScheduleDays(scheduleDays.filter(d => d !== day));
                          else setScheduleDays([...scheduleDays, day]);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          isSel ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!scheduleName || !scheduleTime || createScheduleMutation.isPending}
                onClick={() => {
                  createScheduleMutation.mutate({
                    labId: currentLab.id,
                    name: scheduleName,
                    type: scheduleType,
                    time: scheduleTime,
                    days: scheduleDays,
                    payload: { delaySec: scheduleDelay, text: scheduleText }
                  });
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {createScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: CREATE LAB */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create Computer Lab</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lab Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures & OS Lab 3"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Linux Kernel & Threading Workstations"
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    value={newLabCap}
                    onChange={(e) => setNewLabCap(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hostname Prefix</label>
                  <input
                    type="text"
                    placeholder="e.g. Ubuntu or Lab1"
                    value={newLabPrefix}
                    onChange={(e) => setNewLabPrefix(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!newLabName.trim() || createLabMutation.isPending}
                onClick={() => {
                  createLabMutation.mutate({
                    name: newLabName.trim(),
                    description: newLabDesc.trim(),
                    capacity: newLabCap,
                    prefix: newLabPrefix.trim()
                  });
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {createLabMutation.isPending ? 'Creating...' : 'Create Lab'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: ASSIGN BY PREFIX */}
      {isAssignPrefixOpen && currentLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Assign Desktops by Prefix</h3>
              <button onClick={() => setIsAssignPrefixOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Assign all computers whose hostname starts with this prefix to <span className="font-bold text-slate-800">{currentLab.name}</span>.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Hostname Prefix</label>
              <input
                type="text"
                placeholder="e.g. Ubuntu or Lab1"
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsAssignPrefixOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!prefixInput.trim() || assignPrefixMutation.isPending}
                onClick={() => {
                  assignPrefixMutation.mutate({ id: currentLab.id, prefix: prefixInput.trim() });
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {assignPrefixMutation.isPending ? 'Assigning...' : 'Assign Workstations'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: EDIT SEAT NUMBER */}
      {seatEditNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Seat Assignment</h3>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Seat Number</label>
              <input
                type="number"
                min={1}
                value={seatInputValue}
                onChange={(e) => setSeatInputValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSeatEditNodeId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const seatNum = parseInt(seatInputValue, 10);
                  setSeatMutation.mutate({
                    nodeId: seatEditNodeId,
                    seat: isNaN(seatNum) ? null : seatNum
                  });
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Save Seat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: ADD NODE UNDER CURRENT LAB */}
      {currentLab && (
        <AddComputerModal
          isOpen={isAddNodeModalOpen}
          onClose={() => setIsAddNodeModalOpen(false)}
          labId={currentLab.id}
          labName={currentLab.name}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['nodes'] });
            queryClient.invalidateQueries({ queryKey: ['labs'] });
            queryClient.invalidateQueries({ queryKey: ['labOverview', currentLab.id] });
            setActionNotice(`New workstation connected and assigned to ${currentLab.name}.`);
          }}
        />
      )}
    </div>
  );
};
