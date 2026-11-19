import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Play, Square, RefreshCw, Server, Cpu, HardDrive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { simulatorApi, fleetApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';

export const SimulatorPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: simStatus, isLoading } = useQuery({
    queryKey: ['simulatorStatus'],
    queryFn: simulatorApi.getStatus,
    refetchInterval: 3000
  });

  const toggleMutation = useMutation({
    mutationFn: simulatorApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulatorStatus'] });
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    }
  });

  const isRunning = simStatus?.running ?? false;

  const virtualNodes = [
    {
      hostname: 'ubuntu-web-srv-01',
      ip: '192.168.1.101 (SIMULATED)',
      os: 'Ubuntu Linux 22.04 LTS (SIMULATED VM)',
      cpu: 32.5,
      ram: 42.0,
      status: isRunning ? 'ONLINE' : 'STOPPED'
    },
    {
      hostname: 'win11-eng-station-02',
      ip: '192.168.1.102 (SIMULATED)',
      os: 'Windows 11 Pro Build 22631 (SIMULATED VM)',
      cpu: 76.4,
      ram: 78.5,
      status: isRunning ? 'ONLINE' : 'STOPPED'
    },
    {
      hostname: 'pg-cluster-primary-03',
      ip: '192.168.1.103 (SIMULATED)',
      os: 'Debian 12 Bookworm (SIMULATED VM)',
      cpu: 45.2,
      ram: 82.0,
      status: isRunning ? 'ONLINE' : 'STOPPED'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulator"
        subtitle="Virtual cluster node generation, stress testing, and multi-computer telemetry simulation"
      >
        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition active:scale-95 ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{toggleMutation.isPending ? 'Stopping...' : 'Stop Virtual Fleet'}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{toggleMutation.isPending ? 'Starting...' : 'Launch Virtual Fleet'}</span>
            </>
          )}
        </button>
      </PageHeader>

      {/* Simulator Status Card */}
      <div
        className={`p-6 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
          isRunning
            ? 'bg-emerald-50/80 border-emerald-200'
            : 'bg-white border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Virtual Fleet Simulator State: {isRunning ? 'ACTIVE (3 Nodes Streaming)' : 'STANDBY'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRunning
                ? 'Simulated computers are continuously broadcasting real-time metrics to http://127.0.0.1:5000/api/report.'
                : 'Click Launch Virtual Fleet to inject simulated Linux and Windows workstations into the telemetry pipeline.'}
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isRunning
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isRunning ? '● RUNNING' : '○ IDLE'}
        </span>
      </div>

      {/* Virtual Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {virtualNodes.map((vm, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  SIMULATED VM
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {vm.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-2">{vm.hostname}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{vm.ip}</p>
              <p className="text-xs text-slate-500 mt-2">{vm.os}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">CPU BASE</span>
                <span className="font-bold text-slate-800">{isRunning ? vm.cpu : 0}%</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">RAM BASE</span>
                <span className="font-bold text-slate-800">{isRunning ? vm.ram : 0}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
