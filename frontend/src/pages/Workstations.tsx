import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Search, Filter, Cpu, HardDrive, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { fleetApi, labsApi } from '../services/api';
import { PlatformIcon } from '../components/common/PlatformIcon';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { UsbSeatBadge } from '../components/usb/UsbSeatBadge';
import { UnlockButton } from '../components/usb/UnlockButton';

export const Workstations: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [labFilter, setLabFilter] = useState('ALL');

  const { data: fleetData, isLoading, refetch } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs
  });

  const labs = labsData?.labs || [];
  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];

  const filteredNodes = rawNodes.filter((node: any) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      node.hostname?.toLowerCase().includes(q) ||
      node.ip?.toLowerCase().includes(q) ||
      node.currentUser?.toLowerCase().includes(q) ||
      node.node_id?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ONLINE' && node.status === 'ONLINE') ||
      (statusFilter === 'OFFLINE' && node.status !== 'ONLINE');

    const matchesLab =
      labFilter === 'ALL' ||
      node.labId === labFilter;

    return matchesSearch && matchesStatus && matchesLab;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <Breadcrumb items={[{ label: 'All Computers Fleet' }]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Workstation Fleet Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry, hardware health, and active users across all campus laboratories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hostname, IP address, user account..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Lab Filter */}
          <select
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Laboratories</option>
            {labs.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Status Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl font-semibold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition ${statusFilter === 'ALL' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
            >
              All ({rawNodes.length})
            </button>
            <button
              onClick={() => setStatusFilter('ONLINE')}
              className={`px-3 py-1 rounded-lg transition ${statusFilter === 'ONLINE' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-500'}`}
            >
              Online
            </button>
            <button
              onClick={() => setStatusFilter('OFFLINE')}
              className={`px-3 py-1 rounded-lg transition ${statusFilter === 'OFFLINE' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500'}`}
            >
              Offline
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Workstation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Lab / Room</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">CPU %</th>
                <th className="py-3 px-4">RAM %</th>
                <th className="py-3 px-4">OS Platform</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    Loading workstation fleet telemetry...
                  </td>
                </tr>
              ) : filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    No workstations matching the current search filters.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node: any) => {
                  const isOnline = node.status === 'ONLINE';
                  return (
                    <tr
                      key={node.node_id}
                      onClick={() => navigate(`/workstations/${encodeURIComponent(node.node_id)}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={node.system_type || node.os_name || node.os} size={16} />
                          <div>
                            <span className="font-bold text-slate-900 block">{node.hostname}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{node.ip}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <UsbSeatBadge locked={node.usbLocked} />
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            node.usbLocked
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${node.usbLocked ? 'bg-rose-600 animate-ping' : isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {node.usbLocked ? 'LOCKED' : isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {node.currentUser && node.currentUser !== 'No User' ? (
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[11px]">
                            {node.currentUser}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No User</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 font-medium">
                        {labs.find((l: any) => l.id === node.labId)?.name || 'CS Lab 1'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-bold">
                        {node.seat ? `#${node.seat}` : '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {(node.cpu_percent || 0).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {(node.ram_percent || 0).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-500 truncate max-w-[150px]">
                        {node.system_type || 'Ubuntu Linux'}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {node.usbLocked && (
                            <UnlockButton
                              nodeId={node.node_id}
                              onDone={() => refetch()}
                            />
                          )}
                          <span
                            onClick={() => navigate(`/workstations/${encodeURIComponent(node.node_id)}`)}
                            className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
