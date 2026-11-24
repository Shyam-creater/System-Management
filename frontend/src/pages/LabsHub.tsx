import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Monitor,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Edit3,
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { labsApi, fleetApi } from '../services/api';
import { Breadcrumb } from '../components/common/Breadcrumb';

export const LabsHub: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search
  const [search, setSearch] = useState('');

  // Add Lab State
  const [isAddLabOpen, setIsAddLabOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabRoomNumber, setNewLabRoomNumber] = useState('');
  const [newLabCapacity, setNewLabCapacity] = useState(25);
  const [newLabDesc, setNewLabDesc] = useState('');
  const [newLabPrefix, setNewLabPrefix] = useState('');

  // Edit Lab State
  const [editingLab, setEditingLab] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editCapacity, setEditCapacity] = useState(25);
  const [editDesc, setEditDesc] = useState('');
  const [editPrefix, setEditPrefix] = useState('');

  // Delete Lab State
  const [deletingLab, setDeletingLab] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: labsData, isLoading } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs
  });

  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  // Create Lab Mutation
  const createLabMutation = useMutation({
    mutationFn: (data: { name: string; capacity: number; description?: string; prefix?: string; roomNumber?: string }) =>
      labsApi.createLab(data),
    onSuccess: () => {
      setIsAddLabOpen(false);
      setNewLabName('');
      setNewLabRoomNumber('');
      setNewLabDesc('');
      setNewLabPrefix('');
      setFeedback('Laboratory successfully created.');
      setTimeout(() => setFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['labs'] });
    }
  });

  // Update Lab Mutation
  const updateLabMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => labsApi.updateLab(id, data),
    onSuccess: () => {
      setEditingLab(null);
      setFeedback('Laboratory details updated successfully.');
      setTimeout(() => setFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['labs'] });
    }
  });

  // Delete Lab Mutation
  const deleteLabMutation = useMutation({
    mutationFn: (id: string) => labsApi.deleteLab(id),
    onSuccess: () => {
      setDeletingLab(null);
      setFeedback('Laboratory deleted. Associated workstations unassigned.');
      setTimeout(() => setFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    }
  });

  const openEditModal = (lab: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLab(lab);
    setEditName(lab.name || '');
    setEditRoomNumber(lab.roomNumber || '');
    setEditCapacity(lab.capacity || 25);
    setEditDesc(lab.description || '');
    setEditPrefix(lab.prefix || '');
  };

  const openDeleteModal = (lab: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingLab(lab);
  };

  const labs = labsData?.labs || [];
  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];

  const filteredLabs = labs.filter((l: any) =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <Breadcrumb items={[{ label: 'Computer Laboratories Hub' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Computer Laboratories Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic computer laboratories, configure seat layouts, or broadcast fleet operations.
          </p>
        </div>
        <button
          onClick={() => setIsAddLabOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Laboratory</span>
        </button>
      </div>

      {/* Action Notification Toast */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter laboratories by name..."
          className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
        />
      </div>

      {/* Labs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredLabs.map((lab: any) => {
          const labId = lab.id || lab._id;
          const labNodes = rawNodes.filter((n: any) => n.labId === labId);
          const onlineCount = labNodes.filter((n: any) => n.status === 'ONLINE').length;
          const inUseCount = labNodes.filter((n: any) => n.currentUser && n.currentUser !== 'No User').length;
          const capacity = lab.capacity || 25;
          const freeCount = Math.max(0, capacity - inUseCount);
          const isHealthy = onlineCount > 0 && (onlineCount / Math.max(1, labNodes.length)) >= 0.8;

          return (
            <div
              key={labId}
              onClick={() => navigate(`/labs/${labId}`)}
              className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 shadow-2xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {lab.name}
                        </h3>
                        {lab.roomNumber && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-[10px] border border-blue-200/60 shadow-2xs">
                            Room {lab.roomNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {lab.description || 'Department of Computer Science'}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Status Pill + Edit + Delete */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isHealthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {isHealthy ? 'Optimal' : 'Attention'}
                    </span>

                    <button
                      onClick={(e) => openEditModal(lab, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Edit Laboratory Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => openDeleteModal(lab, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Laboratory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Fleet Online</span>
                    <span className="font-extrabold text-slate-800 text-sm">{onlineCount} / {capacity}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                    <span className="text-indigo-500 block text-[10px]">In Use (Active)</span>
                    <span className="font-extrabold text-indigo-700 text-sm">{inUseCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <span className="text-emerald-500 block text-[10px]">Free Terminals</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{freeCount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                <span>Open Room Seat Map</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ADD LAB MODAL */}
      {/* ========================================================================= */}
      {isAddLabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Computer Laboratory</h3>
              <button onClick={() => setIsAddLabOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Laboratory Name *</label>
                <input
                  type="text"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  placeholder="e.g. AI & Robotics Research Lab 3"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Room Number (Optional)</label>
                  <input
                    type="text"
                    value={newLabRoomNumber}
                    onChange={(e) => setNewLabRoomNumber(e.target.value)}
                    placeholder="e.g. SJT-418"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={newLabCapacity}
                    onChange={(e) => setNewLabCapacity(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  placeholder="e.g. Department of Artificial Intelligence"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Computer Prefix (Optional Auto-Bind)</label>
                <input
                  type="text"
                  value={newLabPrefix}
                  onChange={(e) => setNewLabPrefix(e.target.value)}
                  placeholder="e.g. sjt418"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsAddLabOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  newLabName &&
                  createLabMutation.mutate({
                    name: newLabName,
                    roomNumber: newLabRoomNumber,
                    capacity: newLabCapacity,
                    description: newLabDesc,
                    prefix: newLabPrefix
                  })
                }
                disabled={!newLabName || createLabMutation.isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                {createLabMutation.isPending ? 'Creating Lab...' : 'Create Laboratory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT LAB MODAL */}
      {/* ========================================================================= */}
      {editingLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Laboratory Details</h3>
              </div>
              <button onClick={() => setEditingLab(null)} className="text-slate-400 hover:text-slate-600">
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
                onClick={() => setEditingLab(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  editName &&
                  updateLabMutation.mutate({
                    id: editingLab.id || editingLab._id,
                    data: {
                      name: editName,
                      roomNumber: editRoomNumber,
                      capacity: editCapacity,
                      description: editDesc,
                      prefix: editPrefix
                    }
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

      {/* ========================================================================= */}
      {/* DELETE LAB CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Laboratory</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold">
                Are you sure you want to delete laboratory "{deletingLab.name}"?
              </p>
              <p className="text-rose-700">
                All computers currently in this room will be safely moved to the unassigned fleet.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingLab(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteLabMutation.mutate(deletingLab.id || deletingLab._id)}
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
