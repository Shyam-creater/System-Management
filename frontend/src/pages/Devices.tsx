import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Monitor,
  Server,
  Plus,
  RefreshCw,
  Trash2,
  Network,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  HardDrive,
  Cpu
} from 'lucide-react';
import { fleetApi, sshApi } from '../services/api';
import { NodeInfo } from '../types';
import { AddComputerModal } from '../components/modals/AddComputerModal';
import { PageHeader } from '../components/layout/PageHeader';

export const Devices: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pollingNodeId, setPollingNodeId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const pollMutation = useMutation({
    mutationFn: (nodeId: string) => sshApi.poll(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      setPollingNodeId(null);
    },
    onError: () => setPollingNodeId(null)
  });

  const purgeMutation = useMutation({
    mutationFn: fleetApi.purgeOffline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    }
  });

  const rawNodes = data?.nodes ? Object.values(data.nodes) : [];
  const nodes = rawNodes.length > 0 ? rawNodes : [];
  const onlineCount = nodes.filter(n => n.status === 'ONLINE').length;
  const sshCount = nodes.filter(n => n.is_ssh_agentless).length;

  const handlePoll = (nodeId: string) => {
    setPollingNodeId(nodeId);
    pollMutation.mutate(nodeId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        subtitle="Manage fleet workstations, SSH nodes, and monitored hardware endpoints"
      >
        <button
          onClick={() => purgeMutation.mutate()}
          disabled={purgeMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-300 text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Purge Offline</span>
        </button>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d68ff] hover:bg-[#1557e0] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Computer (SSH)</span>
        </button>
      </PageHeader>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Workstations</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{nodes.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Server className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Active Online</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{onlineCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">SSH Managed Nodes</span>
            <p className="text-2xl font-black text-blue-600 mt-1">{sshCount}</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
            <Network className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Devices Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Connected Fleet Endpoints</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Auto-refreshing every 5 seconds
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="p-4">Hostname</th>
                <th className="p-4">Architecture & Type</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Hardware Telemetry</th>
                <th className="p-4">Status</th>
                <th className="p-4">Health</th>
                <th className="p-4">Last Seen</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading computers...
                  </td>
                </tr>
              ) : nodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <Monitor className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No computers currently connected.</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Click "Add Computer (SSH)" or run <code>python agent.py</code> to register nodes.
                    </p>
                  </td>
                </tr>
              ) : (
                nodes.map((node: NodeInfo) => {
                  const isSSH = !!node.is_ssh_agentless;
                  const isOnline = node.status === 'ONLINE';

                  return (
                    <tr key={node.node_id} className="hover:bg-slate-50/60 transition">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5">
                        {isSSH ? (
                          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                            SSH
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            🖥
                          </div>
                        )}
                        <div>
                          <span>{node.hostname}</span>
                          <span className="block text-[10px] font-normal text-slate-400">{node.interface || 'Ethernet'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSSH
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isSSH ? 'SSH AGENTLESS' : 'LOCAL AGENT'}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[180px]">
                          {node.system_type || 'Unknown OS'}
                        </p>
                      </td>

                      <td className="p-4 font-mono font-semibold text-slate-800">{node.ip}</td>

                      <td className="p-4 font-mono text-[11px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-slate-400" />
                            <span>CPU: {node.cpu_percent ? node.cpu_percent.toFixed(1) : '0.0'}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                            <span>RAM: {node.ram_percent ? node.ram_percent.toFixed(1) : '0.0'}%</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOnline
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {node.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            node.health === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-700'
                              : node.health === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {node.health || 'HEALTHY'}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {node.seconds_since_seen != null ? `${node.seconds_since_seen}s ago` : 'now'}
                      </td>

                      <td className="p-4 text-right">
                        {isSSH && (
                          <button
                            onClick={() => handlePoll(node.node_id)}
                            disabled={pollingNodeId === node.node_id}
                            title="Poll Node Now"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${pollingNodeId === node.node_id ? 'animate-spin text-blue-600' : ''}`} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Computer Modal */}
      <AddComputerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['nodes'] });
        }}
      />
    </div>
  );
};
