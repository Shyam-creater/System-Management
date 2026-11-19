import React, { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { labsApi, sessionsApi } from '../services/api';
import { LabItem, LabOverviewMachine, SessionItem } from '../types';

export const Labs: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'seatmap' | 'sessions' | 'unassigned'>('seatmap');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignPrefixOpen, setIsAssignPrefixOpen] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [seatEditNodeId, setSeatEditNodeId] = useState<string | null>(null);
  const [seatInputValue, setSeatInputValue] = useState<string>('');

  // Create Lab Form
  const [newLabName, setNewLabName] = useState('');
  const [newLabDesc, setNewLabDesc] = useState('');
  const [newLabCap, setNewLabCap] = useState(30);
  const [newLabPrefix, setNewLabPrefix] = useState('');

  // Session Filters
  const [sessionUserSearch, setSessionUserSearch] = useState('');
  const [sessionActiveOnly, setSessionActiveOnly] = useState(false);

  // Queries
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
    enabled: activeTab === 'unassigned',
    refetchInterval: 5000
  });

  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['sessions', activeLabId, sessionUserSearch, sessionActiveOnly],
    queryFn: () =>
      sessionsApi.getSessions({
        labId: activeLabId || undefined,
        username: sessionUserSearch || undefined,
        active: sessionActiveOnly ? true : undefined,
        limit: 50
      }),
    refetchInterval: 5000
  });

  const { data: usageData } = useQuery({
    queryKey: ['labUsage', activeLabId],
    queryFn: () => (activeLabId ? labsApi.getLabUsage(activeLabId, 7) : null),
    enabled: !!activeLabId
  });

  // Mutations
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

  // Calculate totals
  const totalMachines = labs.reduce((acc, l) => acc + (l.total || 0), 0);
  const totalInUse = labs.reduce((acc, l) => acc + (l.inUse || 0), 0);
  const totalOnline = labs.reduce((acc, l) => acc + (l.online || 0), 0);

  const machines: LabOverviewMachine[] = overviewData?.machines || [];
  const sessions: SessionItem[] = sessionsData?.sessions || [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <PageHeader
        title="Computer Labs"
        subtitle="Manage department lab allocations, real-time student seat maps, and session tracking"
      />

      {/* 1. TOP METRIC STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Configured Labs</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{labs.length}</div>
            <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">Department & Lab Rooms</span>
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
              {totalOnline} Online / {totalMachines - totalOnline} Offline
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

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Unassigned Machines</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{unassignedCount}</div>
            <span className="text-[11px] font-medium text-amber-600 mt-0.5 block">
              Awaiting Lab Association
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. LAB TABS & CREATION BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        {/* Lab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {labs.map((lab) => {
            const isSelected = lab.id === activeLabId && activeTab !== 'unassigned';
            return (
              <button
                key={lab.id}
                onClick={() => {
                  setSelectedLabId(lab.id);
                  if (activeTab === 'unassigned') setActiveTab('seatmap');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1d68ff] text-white shadow-md shadow-blue-500/25 font-bold scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>🏛️</span>
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

          {/* Unassigned Tab */}
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'unassigned'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 font-bold'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>📦</span>
            <span>Unassigned</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {unassignedCount}
            </span>
          </button>
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

      {/* 3. SUB-VIEW TABS (For selected lab) */}
      {activeTab !== 'unassigned' && currentLab && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('seatmap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'seatmap'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              🖥️ Live Seat Map
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'sessions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              📋 Student Login History
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPrefixInput(currentLab.prefix || '');
                setIsAssignPrefixOpen(true);
              }}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 border border-slate-200 transition"
            >
              🏷️ Assign by Prefix
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${currentLab.name}? All assigned workstations will be moved to Unassigned.`)) {
                  deleteLabMutation.mutate(currentLab.id);
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1" />
              Delete Lab
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA */}
      {activeTab === 'seatmap' && currentLab && (
        <div className="space-y-6">
          {/* Lab Header Summary */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🏛️</span> {currentLab.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLab.description || 'General Computer Lab'} • Capacity: {currentLab.capacity || 30} Seats
                {currentLab.prefix ? ` • Prefix: "${currentLab.prefix}"` : ''}
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
                Use "Assign by Prefix" to associate computers starting with a common hostname prefix, or assign machines from the Unassigned tab.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsAssignPrefixOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
                >
                  Assign by Hostname Prefix
                </button>
                <button
                  onClick={() => setActiveTab('unassigned')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  View Unassigned Desktops
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
                        : 'bg-slate-50/80 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Seat & Status Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => {
                          setSeatEditNodeId(node.node_id);
                          setSeatInputValue(String(seatNumber));
                        }}
                        title="Click to edit seat number"
                        className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition"
                      >
                        Seat #{seatNumber}
                      </button>

                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasUser
                            ? 'bg-blue-600 animate-ping'
                            : isOnline
                            ? 'bg-emerald-500'
                            : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    {/* Machine Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                        <span>{node.hostname.includes('Mac') ? '' : node.hostname.includes('Ubuntu') ? '🐧' : '田'}</span>
                        <span className="truncate">{node.hostname}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{node.ip}</p>
                    </div>

                    {/* User / Idle Status Box */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      {hasUser ? (
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold truncate block leading-tight">
                              {node.currentUser}
                            </span>
                            <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-wider block">
                              Active Student
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                          <span>{isOnline ? 'Available' : 'Offline'}</span>
                          {isOnline && (
                            <span className="text-slate-600 font-mono text-[9px]">
                              CPU {node.cpu_percent.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 7-Day Usage Trajectory for Lab */}
          {usageData?.days && usageData.days.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>📊</span> 7-Day Lab Usage & Student Engagement
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {usageData.days.map((d: any) => (
                  <div key={d.date} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{d.date.slice(5)}</span>
                    <span className="text-base font-extrabold text-blue-600 block mt-1">{d.sessions}</span>
                    <span className="text-[9px] text-slate-500 font-medium block">Sessions</span>
                    <span className="text-[9px] font-semibold text-emerald-600 mt-1 block">{d.hours} hrs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. SESSION HISTORY VIEW */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Controls & Export */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter student username..."
                  value={sessionUserSearch}
                  onChange={(e) => setSessionUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionActiveOnly}
                  onChange={(e) => setSessionActiveOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Active Only</span>
              </label>
            </div>

            <a
              href={sessionsApi.getExportUrl({
                labId: activeLabId || undefined,
                username: sessionUserSearch || undefined,
                active: sessionActiveOnly ? true : undefined
              })}
              download
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>

          {/* Session Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Student User</th>
                    <th className="px-4 py-3">Computer / Node</th>
                    <th className="px-4 py-3">Login Time (UTC)</th>
                    <th className="px-4 py-3">Logout Time</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Closed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                        No login sessions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id || s._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                            👤
                          </span>
                          <span>{s.username}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{s.nodeId}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {new Date(s.loginAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {s.logoutAt ? new Date(s.logoutAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {s.duration ? `${s.duration} min` : s.active ? 'In Progress' : '0 min'}
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-right font-medium text-slate-400 text-[11px]">
                          {s.closedBy || 'user'}
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

      {/* 6. UNASSIGNED DESKTOPS VIEW */}
      {activeTab === 'unassigned' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Unassigned Fleet Computers</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These machines are currently online or reporting to ProcessShield without a designated lab.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedData?.nodes?.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">All computers are assigned to labs!</p>
              </div>
            ) : (
              unassignedData?.nodes?.map((node: any) => (
                <div
                  key={node.node_id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block">{node.hostname}</span>
                    <span className="text-[11px] font-mono text-slate-400 truncate block">{node.ip}</span>
                  </div>

                  {/* Assign to Lab Dropdown */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        assignBatchMutation.mutate({ nodeIds: [node.node_id], labId: e.target.value });
                      }
                    }}
                    defaultValue=""
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 focus:outline-none"
                  >
                    <option value="" disabled>Assign to...</option>
                    {labs.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE LAB */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🏛️</span> Create New Lab
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lab Name *</label>
                <input
                  type="text"
                  placeholder="e.g. CS Lab 3 (Systems)"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Embedded Systems & Robotics Lab"
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    value={newLabCap}
                    onChange={(e) => setNewLabCap(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hostname Prefix</label>
                  <input
                    type="text"
                    placeholder="e.g. cslab3-"
                    value={newLabPrefix}
                    onChange={(e) => setNewLabPrefix(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newLabName.trim()) {
                    createLabMutation.mutate({
                      name: newLabName.trim(),
                      description: newLabDesc.trim(),
                      capacity: newLabCap,
                      prefix: newLabPrefix.trim()
                    });
                  }
                }}
                disabled={!newLabName.trim() || createLabMutation.isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
              >
                {createLabMutation.isPending ? 'Creating...' : 'Create Lab'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN BY PREFIX */}
      {isAssignPrefixOpen && currentLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🏷️</span> Assign Machines to {currentLab.name}
            </h3>
            <p className="text-xs text-slate-500">
              Enter a hostname prefix (e.g. <span className="font-mono font-bold">Ubuntu</span> or <span className="font-mono font-bold">lab1-</span>).
              Every connected machine whose hostname starts with this prefix will be assigned to this lab.
            </p>

            <div>
              <label className="font-semibold text-slate-700 text-xs block mb-1">Hostname Prefix *</label>
              <input
                type="text"
                placeholder="e.g. Ubuntu"
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAssignPrefixOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (prefixInput.trim()) {
                    assignPrefixMutation.mutate({ id: currentLab.id, prefix: prefixInput.trim() });
                  }
                }}
                disabled={!prefixInput.trim() || assignPrefixMutation.isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
              >
                {assignPrefixMutation.isPending ? 'Assigning...' : 'Assign Matching Desktops'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SEAT */}
      {seatEditNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xs p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Set Seat Number</h3>
            <p className="text-[11px] text-slate-500 font-mono truncate">{seatEditNodeId}</p>

            <input
              type="number"
              value={seatInputValue}
              onChange={(e) => setSeatInputValue(e.target.value)}
              placeholder="e.g. 1"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-bold"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSeatEditNodeId(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSeatMutation.mutate({
                    nodeId: seatEditNodeId,
                    seat: seatInputValue ? Number(seatInputValue) : null
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Save Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Labs;
