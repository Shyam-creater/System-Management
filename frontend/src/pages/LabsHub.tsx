import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Monitor, Users, CheckCircle2, AlertTriangle, ArrowRight, Clock, PlusCircle } from 'lucide-react';
import { labsApi, fleetApi } from '../services/api';
import { Breadcrumb } from '../components/common/Breadcrumb';

export const LabsHub: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddLabOpen, setIsAddLabOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabCapacity, setNewLabCapacity] = useState(25);
  const [search, setSearch] = useState('');

  const { data: labsData, isLoading } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs
  });

  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const createLabMutation = useMutation({
    mutationFn: (data: { name: string; capacity: number }) => labsApi.createLab(data),
    onSuccess: () => {
      setIsAddLabOpen(false);
      setNewLabName('');
      queryClient.invalidateQueries({ queryKey: ['labs'] });
    }
  });

  const labs = labsData?.labs || [];
  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];

  const filteredLabs = labs.filter((l: any) =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <Breadcrumb items={[{ label: 'Computer Laboratories Hub' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Computer Laboratories Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a laboratory to inspect live seat maps, manage classroom workstations, or broadcast bulk power commands.
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
              className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {lab.name}
                      </h3>
                      <span className="text-[11px] text-slate-400">Department of Computer Science</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isHealthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {isHealthy ? 'Optimal' : 'Attention'}
                  </span>
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

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Schedule: General Operating Hours (08:00 - 18:00)</span>
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

      {/* Add Lab Modal */}
      {isAddLabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Computer Laboratory</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Laboratory Name</label>
                <input
                  type="text"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  placeholder="e.g. AI & Robotics Research Lab 3"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Seat Capacity</label>
                <input
                  type="number"
                  value={newLabCapacity}
                  onChange={(e) => setNewLabCapacity(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddLabOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => newLabName && createLabMutation.mutate({ name: newLabName, capacity: newLabCapacity })}
                disabled={!newLabName || createLabMutation.isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                {createLabMutation.isPending ? 'Creating Lab...' : 'Create Laboratory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
