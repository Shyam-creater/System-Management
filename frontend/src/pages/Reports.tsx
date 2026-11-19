import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ArrowLeft, Download, Zap, Monitor, Cpu, HardDrive, CheckCircle2, Calendar, Building } from 'lucide-react';
import { reportsApi, fleetApi, labsApi } from '../services/api';
import { DailyReportItem, NodeInfo } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

export const Reports: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [labFilter, setLabFilter] = useState<string>('ALL');

  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs,
    refetchInterval: 10000
  });
  const labs = labsData?.labs || [];

  const { data: reportsData, isLoading: isReportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getReports
  });

  const generateMutation = useMutation({
    mutationFn: reportsApi.generate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const nodes = rawNodes.length > 0 ? rawNodes : [];
  const reports: DailyReportItem[] = reportsData?.reports || [];

  const filteredNodes = nodes.filter(n => {
    if (labFilter === 'ALL') return true;
    if (labFilter === 'UNASSIGNED') return !n.labId;
    return n.labId === labFilter;
  });

  const selectedNode = selectedNodeId ? nodes.find(n => n.node_id === selectedNodeId) : null;
  const filteredReports = selectedNodeId
    ? reports.filter(r => r.node_id === selectedNodeId)
    : reports;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Automated daily summaries, hardware peak telemetry, and uptime audits"
      >
        {selectedNodeId && (
          <button
            onClick={() => setSelectedNodeId(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Workstations</span>
          </button>
        )}

        {!selectedNodeId && (
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="ALL">All Computer Labs</option>
              {labs.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
              <option value="UNASSIGNED">Unassigned Only</option>
            </select>
          </div>
        )}

        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-95"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>{generateMutation.isPending ? 'Generating...' : 'Generate Daily Report'}</span>
        </button>
      </PageHeader>

      {!selectedNodeId ? (
        /* Workstation Selection Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNodes.map((node: NodeInfo) => {
            const isSSH = !!node.is_ssh_agentless;
            const nodeReports = reports.filter(r => r.node_id === node.node_id);
            const labObj = labs.find(l => l.id === node.labId);

            return (
              <div
                key={node.node_id}
                onClick={() => setSelectedNodeId(node.node_id)}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] cursor-pointer flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSSH ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isSSH ? 'SSH NODE' : 'LOCAL HOST'}
                      </span>
                      {labObj && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 truncate max-w-[130px]">
                          {labObj.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-blue-600 font-semibold">
                      {nodeReports.length} Reports →
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2">{node.hostname}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{node.ip}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">CURRENT CPU</span>
                    <span className="font-bold text-slate-800">{node.cpu_percent?.toFixed(1) || '0.0'}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CURRENT RAM</span>
                    <span className="font-bold text-slate-800">{node.ram_percent?.toFixed(1) || '0.0'}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Reports Inspector */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daily Performance History for {selectedNode?.hostname || selectedNodeId}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Archived daily telemetry snapshots
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                  <tr>
                    <th className="p-4">Report Date</th>
                    <th className="p-4">Average CPU</th>
                    <th className="p-4">Peak CPU</th>
                    <th className="p-4">Average RAM</th>
                    <th className="p-4">Peak RAM</th>
                    <th className="p-4">Uptime %</th>
                    <th className="p-4 text-right">Samples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-sans">
                        No historical daily reports generated for this workstation yet.
                        Click "Generate Daily Report" above.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{r.report_date}</span>
                        </td>
                        <td className="p-4 font-semibold text-slate-800">{r.avg_cpu?.toFixed(1)}%</td>
                        <td className="p-4 font-semibold text-rose-600">{r.max_cpu?.toFixed(1)}%</td>
                        <td className="p-4 font-semibold text-slate-800">{r.avg_ram?.toFixed(1)}%</td>
                        <td className="p-4 font-semibold text-amber-600">{r.max_ram?.toFixed(1)}%</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            {r.uptime_percent?.toFixed(1) || '100.0'}%
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-500">{r.samples_count || 120}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
