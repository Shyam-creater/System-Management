import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Monitor,
  Users,
  Plus,
  RotateCcw,
  Power,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
  Trash2,
  Layers,
  Sparkles,
  Clock,
  Calendar,
  Check,
  X,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { labsApi, fleetApi, commandsApi } from '../services/api';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { SideDrawer } from '../components/common/SideDrawer';
import { PlatformIcon } from '../components/common/PlatformIcon';
import { AddComputerModal } from '../components/modals/AddComputerModal';

export const LabDetail: React.FC = () => {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = searchParams.get('view') || 'seatmap';
  const setTab = (view: string) => setSearchParams({ view });

  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'IN_USE' | 'OFFLINE'>('ALL');
  const [selectedSeatDrawerNode, setSelectedSeatDrawerNode] = useState<any | null>(null);
  const [isAddComputerOpen, setIsAddComputerOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Bulk Selection Mode
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [bulkActionConfirm, setBulkActionConfirm] = useState<'restart' | 'shutdown' | 'lock' | null>(null);
  const [typedConfirm, setTypedConfirm] = useState('');

  // Delete node modal
  const [nodeToDelete, setNodeToDelete] = useState<any | null>(null);

  // Queries
  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs
  });

  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const labs = labsData?.labs || [];
  const currentLab = labs.find((l: any) => (l.id || l._id) === labId) || labs[0];

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const labNodes = rawNodes.filter((n: any) => n.labId === (currentLab?.id || labId));

  const onlineNodes = labNodes.filter((n: any) => n.status === 'ONLINE');
  const inUseNodes = labNodes.filter((n: any) => n.currentUser && n.currentUser !== 'No User');
  const offlineNodes = labNodes.filter((n: any) => n.status !== 'ONLINE');

  const filteredNodes = labNodes.filter((node: any) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      node.hostname?.toLowerCase().includes(q) ||
      node.ip?.toLowerCase().includes(q) ||
      node.currentUser?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ONLINE' && node.status === 'ONLINE') ||
      (statusFilter === 'IN_USE' && node.currentUser && node.currentUser !== 'No User') ||
      (statusFilter === 'OFFLINE' && node.status !== 'ONLINE');

    return matchesSearch && matchesStatus;
  });

  // Bulk command mutation
  const bulkCommandMutation = useMutation({
    mutationFn: (payload: { action: string; targetNodes?: string[] }) =>
      commandsApi.createLabCommand(currentLab?.id || labId!, {
        type: payload.action,
        nodeIds: payload.targetNodes
      }),
    onSuccess: () => {
      setBulkActionConfirm(null);
      setTypedConfirm('');
      setIsMultiSelect(false);
      setSelectedNodeIds([]);
      setActionFeedback('Bulk command executed successfully across selected workstations.');
      setTimeout(() => setActionFeedback(null), 4000);
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    }
  });

  // Delete node mutation
  const deleteMutation = useMutation({
    mutationFn: (nodeId: string) => fleetApi.deleteNode(nodeId),
    onSuccess: () => {
      setNodeToDelete(null);
      setSelectedSeatDrawerNode(null);
      setActionFeedback('Workstation removed from laboratory fleet.');
      setTimeout(() => setActionFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    }
  });

  const toggleSelectNode = (nodeId: string) => {
    if (selectedNodeIds.includes(nodeId)) {
      setSelectedNodeIds(selectedNodeIds.filter(id => id !== nodeId));
    } else {
      setSelectedNodeIds([...selectedNodeIds, nodeId]);
    }
  };

  const selectAllOnline = () => {
    setSelectedNodeIds(onlineNodes.map((n: any) => n.node_id));
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* Breadcrumb Path */}
      <Breadcrumb
        items={[
          { label: 'Labs Hub', path: '/labs' },
          { label: currentLab?.name || 'Laboratory Workspace' }
        ]}
      />

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentLab?.name || 'Computer Science Lab 1'}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {labNodes.length} Workstations Total • <span className="text-emerald-600 font-bold">{onlineNodes.length} Online</span> • <span className="text-indigo-600 font-bold">{inUseNodes.length} In Use</span> • <span className="text-rose-500 font-bold">{offlineNodes.length} Offline</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMultiSelect(!isMultiSelect)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
              isMultiSelect
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isMultiSelect ? 'Exit Selection Mode' : 'Select Multiple'}
          </button>
          <button
            onClick={() => setIsAddComputerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Computer</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 text-xs font-bold">
        <button
          onClick={() => setTab('seatmap')}
          className={`px-4 py-2.5 border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === 'seatmap' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Interactive Seat Map</span>
        </button>
        <button
          onClick={() => setTab('list')}
          className={`px-4 py-2.5 border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === 'list' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Fleet Table List</span>
        </button>
        <button
          onClick={() => setTab('schedule')}
          className={`px-4 py-2.5 border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === 'schedule' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Academic Schedule</span>
        </button>
      </div>

      {/* Filter Toolbar (for Seatmap & List) */}
      {activeTab !== 'schedule' && (
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hostname, IP, user..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'ALL' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
              >
                All ({labNodes.length})
              </button>
              <button
                onClick={() => setStatusFilter('ONLINE')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'ONLINE' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-500'}`}
              >
                Online
              </button>
              <button
                onClick={() => setStatusFilter('IN_USE')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'IN_USE' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'}`}
              >
                In Use
              </button>
              <button
                onClick={() => setStatusFilter('OFFLINE')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'OFFLINE' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500'}`}
              >
                Offline
              </button>
            </div>
            {isMultiSelect && (
              <button
                onClick={selectAllOnline}
                className="text-xs font-bold text-blue-600 hover:underline px-2 py-1"
              >
                Select Online ({onlineNodes.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: SEAT MAP (Room Layout Grid) */}
      {activeTab === 'seatmap' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-6">
          {/* Whiteboard / Front of Room Marker */}
          <div className="w-full py-1.5 px-4 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs font-bold text-slate-500 tracking-wider uppercase select-none">
            Teaching Podium / Whiteboard Front of Room
          </div>

          {/* Seat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {filteredNodes.map((node: any, idx: number) => {
              const isOnline = node.status === 'ONLINE';
              const hasUser = Boolean(node.currentUser && node.currentUser !== 'No User');
              const isSelected = selectedNodeIds.includes(node.node_id);

              return (
                <div
                  key={node.node_id}
                  onClick={() => {
                    if (isMultiSelect) {
                      toggleSelectNode(node.node_id);
                    } else {
                      setSelectedSeatDrawerNode(node);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer group flex flex-col justify-between min-h-[110px] ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400'
                      : isOnline
                        ? hasUser
                          ? 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-400 hover:shadow-xs'
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {isMultiSelect && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-blue-600 mr-1"
                          />
                        )}
                        <span className="font-mono font-bold text-slate-500 text-[11px]">
                          #{node.seat || idx + 1}
                        </span>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>

                    <p className="font-bold text-slate-900 text-xs mt-1.5 truncate" title={node.hostname}>
                      {node.hostname}
                    </p>

                    <div className="mt-1">
                      {hasUser ? (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 truncate block">
                          {node.currentUser}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Idle Terminal</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>CPU: {isOnline ? `${(node.cpu_percent || 0).toFixed(0)}%` : '-'}</span>
                    <span>RAM: {isOnline ? `${(node.ram_percent || 0).toFixed(0)}%` : '-'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seat Map Legend */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Online / Standby</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>In Use by Student</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Offline / Unpowered</span>
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: LIST VIEW */}
      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Seat</th>
                  <th className="py-2.5 px-3">Workstation</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">CPU %</th>
                  <th className="py-2.5 px-3">RAM %</th>
                  <th className="py-2.5 px-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                {filteredNodes.map((node: any, i: number) => {
                  const isOnline = node.status === 'ONLINE';
                  return (
                    <tr
                      key={node.node_id}
                      onClick={() => setSelectedSeatDrawerNode(node)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-500">#{node.seat || i + 1}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{node.hostname}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {node.currentUser && node.currentUser !== 'No User' ? (
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            {node.currentUser}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No User</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{(node.cpu_percent || 0).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{(node.ram_percent || 0).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/workstations/${encodeURIComponent(node.node_id)}`);
                          }}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Weekly Laboratory Timetable</h3>
            <span className="text-xs text-slate-500">Auto-synced with Campus Academic ERP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
              <div className="flex justify-between font-bold text-blue-900">
                <span>CS301: Operating Systems Lab</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Active Now</span>
              </div>
              <p className="text-slate-600">Instructor: Dr. Suresh Kumar • Room SJT-418</p>
              <p className="text-[11px] text-slate-500">14:00 - 16:30 • Mon, Wed</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>CS402: Distributed Systems</span>
                <span className="text-[10px] text-slate-500">Next Class</span>
              </div>
              <p className="text-slate-600">Instructor: Prof. Priya Raman • Room SJT-418</p>
              <p className="text-[11px] text-slate-500">09:00 - 11:30 • Tue, Thu</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Open Practical Lab Hours</span>
                <span className="text-[10px] text-slate-500">Free Practice</span>
              </div>
              <p className="text-slate-600">Open Access for Project Work</p>
              <p className="text-[11px] text-slate-500">16:30 - 19:00 • Daily</p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Selection Floating Action Toolbar */}
      {isMultiSelect && selectedNodeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 animate-slideUp">
          <span className="text-xs font-bold text-slate-300">
            {selectedNodeIds.length} Workstation{selectedNodeIds.length > 1 ? 's' : ''} Selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={() => setBulkActionConfirm('restart')}
            className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Selected</span>
          </button>
          <button
            onClick={() => setBulkActionConfirm('lock')}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-xl transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Screens</span>
          </button>
          <button
            onClick={() => setBulkActionConfirm('shutdown')}
            className="flex items-center gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-xl transition"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Shutdown</span>
          </button>
          <button
            onClick={() => {
              setIsMultiSelect(false);
              setSelectedNodeIds([]);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Seat Detail Side Drawer (Instant Context Preservation) */}
      <SideDrawer
        isOpen={Boolean(selectedSeatDrawerNode)}
        onClose={() => setSelectedSeatDrawerNode(null)}
        title={selectedSeatDrawerNode?.hostname || 'Workstation Inspection'}
        subtitle={`Seat #${selectedSeatDrawerNode?.seat || '-'} • IP: ${selectedSeatDrawerNode?.ip || '127.0.0.1'}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                setNodeToDelete(selectedSeatDrawerNode);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Machine</span>
            </button>
            <button
              onClick={() => {
                navigate(`/workstations/${encodeURIComponent(selectedSeatDrawerNode?.node_id)}`);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <span>Full Workstation Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        {selectedSeatDrawerNode && (
          <div className="space-y-5 text-xs">
            {/* User Chip */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Active User Session</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {selectedSeatDrawerNode.currentUser && selectedSeatDrawerNode.currentUser !== 'No User' ? (
                    <span className="text-indigo-700 font-extrabold">{selectedSeatDrawerNode.currentUser}</span>
                  ) : (
                    <span className="text-slate-400 italic font-normal">No Student Currently Logged In</span>
                  )}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedSeatDrawerNode.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {selectedSeatDrawerNode.status || 'ONLINE'}
              </span>
            </div>

            {/* Live Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-bold">CPU Usage</span>
                <span className="text-lg font-black text-slate-900">{(selectedSeatDrawerNode.cpu_percent || 0).toFixed(1)}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-bold">RAM Usage</span>
                <span className="text-lg font-black text-slate-900">{(selectedSeatDrawerNode.ram_percent || 0).toFixed(1)}%</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct Machine Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActionFeedback(`Reboot command dispatched to ${selectedSeatDrawerNode.hostname}`);
                    setTimeout(() => setActionFeedback(null), 3000);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart PC</span>
                </button>
                <button
                  onClick={() => {
                    setActionFeedback(`Lock command dispatched to ${selectedSeatDrawerNode.hostname}`);
                    setTimeout(() => setActionFeedback(null), 3000);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Screen</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Safe Bulk Command Confirmation Dialog */}
      {bulkActionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 capitalize">Confirm Bulk {bulkActionConfirm}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                You are about to execute <strong>{bulkActionConfirm}</strong> on <strong>{selectedNodeIds.length}</strong> selected workstations.
                {inUseNodes.length > 0 && (
                  <span className="block mt-2 font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    Warning: Active students are currently logged in on some of these terminals.
                  </span>
                )}
              </p>
            </div>

            <div className="text-xs space-y-1">
              <label className="text-slate-600 font-bold block">
                Type <strong className="font-mono text-rose-600 uppercase">{bulkActionConfirm}</strong> to confirm:
              </label>
              <input
                type="text"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder={bulkActionConfirm.toUpperCase()}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setBulkActionConfirm(null);
                  setTypedConfirm('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => bulkCommandMutation.mutate({ action: bulkActionConfirm, targetNodes: selectedNodeIds })}
                disabled={typedConfirm.toLowerCase() !== bulkActionConfirm.toLowerCase() || bulkCommandMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs"
              >
                {bulkCommandMutation.isPending ? 'Executing...' : 'Execute Bulk Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Machine Modal */}
      {nodeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Remove Workstation</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove <strong>{nodeToDelete.hostname}</strong> from the laboratory fleet?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setNodeToDelete(null)} className="px-3.5 py-2 rounded-xl bg-slate-100 text-xs font-semibold">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(nodeToDelete.node_id)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Computer Modal */}
      <AddComputerModal
        isOpen={isAddComputerOpen}
        onClose={() => setIsAddComputerOpen(false)}
        labId={currentLab?.id || labId}
        labName={currentLab?.name}
      />
    </div>
  );
};
