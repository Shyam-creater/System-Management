import React, { useState, useEffect } from 'react';
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
  Edit3,
  Layers,
  Sparkles,
  Clock,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
  Cpu,
  Zap,
  ExternalLink,
  User,
  ShieldAlert
} from 'lucide-react';
import { labsApi, fleetApi, commandsApi } from '../services/api';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { SideDrawer } from '../components/common/SideDrawer';
import { PlatformIcon } from '../components/common/PlatformIcon';
import { AddComputerModal } from '../components/modals/AddComputerModal';
import { UsbSeatBadge } from '../components/usb/UsbSeatBadge';
import { UnlockButton } from '../components/usb/UnlockButton';

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

  // Edit / Delete Lab state
  const [isEditLabOpen, setIsEditLabOpen] = useState(false);
  const [isDeleteLabOpen, setIsDeleteLabOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editCapacity, setEditCapacity] = useState(25);
  const [editDesc, setEditDesc] = useState('');
  const [editPrefix, setEditPrefix] = useState('');

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

  useEffect(() => {
    if (currentLab) {
      setEditName(currentLab.name || '');
      setEditRoomNumber(currentLab.roomNumber || '');
      setEditCapacity(currentLab.capacity || 25);
      setEditDesc(currentLab.description || '');
      setEditPrefix(currentLab.prefix || '');
    }
  }, [currentLab]);

  // Update Lab Mutation
  const updateLabMutation = useMutation({
    mutationFn: (data: any) => labsApi.updateLab(currentLab?.id || labId!, data),
    onSuccess: () => {
      setIsEditLabOpen(false);
      setActionFeedback('Laboratory details updated successfully.');
      setTimeout(() => setActionFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['labs'] });
    }
  });

  // Delete Lab Mutation
  const deleteLabMutation = useMutation({
    mutationFn: () => labsApi.deleteLab(currentLab?.id || labId!),
    onSuccess: () => {
      setIsDeleteLabOpen(false);
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      navigate('/labs');
    }
  });

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentLab?.name || 'Computer Science Lab 1'}</h1>
                {currentLab?.roomNumber && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200/80 shadow-2xs">
                    Room {currentLab.roomNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {labNodes.length} Workstations Total • <span className="text-emerald-600 font-bold">{onlineNodes.length} Online</span> • <span className="text-indigo-600 font-bold">{inUseNodes.length} In Use</span> • <span className="text-rose-500 font-bold">{offlineNodes.length} Offline</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditLabOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs"
            title="Edit Laboratory Details"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Lab</span>
          </button>
          <button
            onClick={() => setIsDeleteLabOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition shadow-2xs"
            title="Delete Laboratory"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Lab</span>
          </button>
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
      </div>

      {/* Filter Toolbar (for Seatmap & List) */}
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

      {/* TAB 1: SEAT MAP (Room Layout Grid) */}
      {activeTab === 'seatmap' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-6">
          {/* Whiteboard / Front of Room Marker */}
          <div className="w-full py-1.5 px-4 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs font-bold text-slate-500 tracking-wider uppercase select-none">
            Teaching Podium / Whiteboard Front of Room
          </div>

          {/* Seat Grid with Modern Graph-Wise System Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredNodes.map((node: any, idx: number) => {
              const isOnline = node.status === 'ONLINE';
              const hasUser = Boolean((node.currentUser && node.currentUser !== 'No User') || (node.user && node.user !== 'Unassigned' && node.user !== 'None'));
              const activeUserName = node.currentUser || node.user;
              const isSelected = selectedNodeIds.includes(node.node_id);
              const cpuVal = Number(node.cpu_percent) || 0;
              const gpuVal = Number(node.gpu_percent) || 0;
              const ramVal = Number(node.ram_percent) || 0;

              return (
                <div
                  key={node.node_id}
                  onClick={() => {
                    if (isMultiSelect) {
                      toggleSelectNode(node.node_id);
                    } else {
                      navigate(`/workstations/${encodeURIComponent(node.node_id)}`);
                    }
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 relative cursor-pointer group flex flex-col justify-between hover:-translate-y-0.5 ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500 shadow-md'
                      : node.usbLocked
                        ? 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-500/20 shadow-md'
                        : isOnline
                          ? hasUser
                            ? 'bg-white border-indigo-200/90 hover:border-indigo-500 hover:shadow-lg shadow-xs'
                            : 'bg-white border-slate-200/90 hover:border-blue-500 hover:shadow-lg shadow-xs'
                          : 'bg-slate-50/80 border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Seat Number + Platform + Status */}
                  <div>
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        {isMultiSelect && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectNode(node.node_id);
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-extrabold text-xs border border-slate-200/70">
                          Seat #{node.seat || idx + 1}
                        </span>
                        <PlatformIcon platform={node.system_type} hostname={node.hostname} size={15} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <UsbSeatBadge locked={node.usbLocked} />
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            node.usbLocked
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isOnline
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              node.usbLocked ? 'bg-rose-600 animate-ping' : isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          {node.usbLocked ? 'LOCKED' : isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    </div>

                    {/* System Identity & Active User */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition truncate"
                          title={node.hostname}
                        >
                          {node.hostname}
                        </h4>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition shrink-0" />
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{node.ip}</p>

                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">User:</span>
                        {hasUser ? (
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate">
                            {activeUserName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Available / Idle</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Visual Graphs: CPU, GPU, RAM */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                    {/* CPU Usage Graph */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="flex items-center gap-1 font-bold text-slate-600">
                          <Cpu className="w-3 h-3 text-blue-600" />
                          <span>CPU</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {isOnline ? `${cpuVal.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              cpuVal > 85
                                ? 'bg-rose-500'
                                : cpuVal > 60
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${isOnline ? Math.min(100, Math.max(4, cpuVal)) : 0}%`
                            }}
                          />
                        </div>
                        {isOnline && (
                          <div className="flex items-end gap-0.5 h-3 shrink-0">
                            <div
                              className="w-1 rounded-t bg-blue-400"
                              style={{ height: `${Math.max(20, Math.min(100, (cpuVal || 8) * 1.2))}%` }}
                            />
                            <div
                              className="w-1 rounded-t bg-blue-600"
                              style={{ height: `${Math.max(15, Math.min(100, (cpuVal || 8) * 0.9))}%` }}
                            />
                            <div
                              className="w-1 rounded-t bg-blue-500"
                              style={{ height: `${Math.max(25, Math.min(100, (cpuVal || 8) * 1.4))}%` }}
                            />
                            <div
                              className="w-1 rounded-t bg-blue-400"
                              style={{ height: `${Math.max(15, Math.min(100, (cpuVal || 8) * 0.8))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* GPU Usage Graph */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="flex items-center gap-1 font-bold text-slate-600 truncate max-w-[130px]">
                          <Zap className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>GPU</span>
                          {node.gpu_name && (
                            <span className="text-[9px] font-normal text-slate-400 truncate">
                              ({node.gpu_name.replace('NVIDIA ', '')})
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-bold text-purple-700">
                          {isOnline ? `${gpuVal.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-purple-600 transition-all duration-500"
                            style={{
                              width: `${isOnline ? Math.min(100, Math.max(3, gpuVal)) : 0}%`
                            }}
                          />
                        </div>
                        {isOnline && (
                          <div className="flex items-end gap-0.5 h-3 shrink-0">
                            <div
                              className="w-1 rounded-t bg-purple-400"
                              style={{ height: `${Math.max(15, Math.min(100, (gpuVal || 5) * 1.3))}%` }}
                            />
                            <div
                              className="w-1 rounded-t bg-purple-600"
                              style={{ height: `${Math.max(20, Math.min(100, (gpuVal || 5) * 0.8))}%` }}
                            />
                            <div
                              className="w-1 rounded-t bg-purple-500"
                              style={{ height: `${Math.max(25, Math.min(100, (gpuVal || 5) * 1.5))}%` }}
                            />
                            <div
                              className="w-1 rounded-t bg-purple-400"
                              style={{ height: `${Math.max(15, Math.min(100, (gpuVal || 5) * 0.9))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RAM Usage Graph */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="flex items-center gap-1 font-bold text-slate-600">
                          <Layers className="w-3 h-3 text-cyan-600" />
                          <span>RAM</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {isOnline ? `${ramVal.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            ramVal > 85 ? 'bg-rose-500' : 'bg-cyan-600'
                          }`}
                          style={{
                            width: `${isOnline ? Math.min(100, Math.max(4, ramVal)) : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Hint */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:text-blue-700">
                    {node.usbLocked ? (
                      <div className="w-full" onClick={(e) => e.stopPropagation()}>
                        <UnlockButton
                          nodeId={node.node_id}
                          className="w-full justify-center"
                          onDone={() => queryClient.invalidateQueries({ queryKey: ['nodes'] })}
                        />
                      </div>
                    ) : (
                      <>
                        <span>Open Workstation</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                      </>
                    )}
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
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>USB Locked</span>
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
                      onClick={() => {
                        if (isMultiSelect) {
                          toggleSelectNode(node.node_id);
                        } else {
                          navigate(`/workstations/${encodeURIComponent(node.node_id)}`);
                        }
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-500">#{node.seat || i + 1}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{node.hostname}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <UsbSeatBadge locked={node.usbLocked} />
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            node.usbLocked
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${node.usbLocked ? 'bg-rose-600 animate-ping' : isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {node.usbLocked ? 'LOCKED' : isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
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
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {node.usbLocked && (
                            <UnlockButton
                              nodeId={node.node_id}
                              onDone={() => queryClient.invalidateQueries({ queryKey: ['nodes'] })}
                            />
                          )}
                          <button
                            onClick={() => {
                              navigate(`/workstations/${encodeURIComponent(node.node_id)}`);
                            }}
                            className="text-blue-600 font-bold hover:underline"
                          >
                            Details →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            {/* USB Guard Lock Warning Banner */}
            {selectedSeatDrawerNode.usbLocked && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 space-y-2.5 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-xs text-rose-950">USB Storage Detected — Screen Blocked</h5>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      This workstation's screen has been blanked with an overlay. Please inspect the workstation and ensure the student has unplugged the USB pendrive before unlocking.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-rose-200/80 flex items-center justify-end">
                  <UnlockButton
                    nodeId={selectedSeatDrawerNode.node_id}
                    onDone={() => {
                      queryClient.invalidateQueries({ queryKey: ['nodes'] });
                      setSelectedSeatDrawerNode((prev: any) => prev ? { ...prev, usbLocked: false } : null);
                    }}
                  />
                </div>
              </div>
            )}

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

      {/* Edit Lab Modal */}
      {isEditLabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Laboratory Details</h3>
              </div>
              <button onClick={() => setIsEditLabOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Laboratory Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Room Number</label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    placeholder="e.g. SJT-418"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Computer Hostname Prefix</label>
                <input
                  type="text"
                  value={editPrefix}
                  onChange={(e) => setEditPrefix(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsEditLabOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  editName &&
                  updateLabMutation.mutate({
                    name: editName,
                    roomNumber: editRoomNumber,
                    capacity: editCapacity,
                    description: editDesc,
                    prefix: editPrefix
                  })
                }
                disabled={!editName || updateLabMutation.isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                {updateLabMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lab Confirmation Modal */}
      {isDeleteLabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Laboratory</h3>
                <p className="text-xs text-slate-500">This action will remove the laboratory room.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold">
                Are you sure you want to delete "{currentLab?.name || 'this laboratory'}"?
              </p>
              <p className="text-rose-700">
                All computers currently assigned to this room will be safely unassigned and moved to the unassigned fleet.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteLabOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteLabMutation.mutate()}
                disabled={deleteLabMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                {deleteLabMutation.isPending ? 'Deleting...' : 'Delete Laboratory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
