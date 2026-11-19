import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  ArrowLeft,
  Download,
  Zap,
  Monitor,
  Cpu,
  HardDrive,
  CheckCircle2,
  Calendar,
  Building,
  Users,
  Clock,
  Flame,
  FileSpreadsheet
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { reportsApi, fleetApi, labsApi, sessionsApi } from '../services/api';
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

  const isLabSelected = labFilter !== 'ALL' && labFilter !== 'UNASSIGNED';
  const selectedLabObj = labs.find(l => l.id === labFilter);

  const { data: labUsageData } = useQuery({
    queryKey: ['labUsageReport', labFilter],
    queryFn: () => labsApi.getLabUsage(labFilter, 7),
    enabled: isLabSelected
  });

  const { data: labSessionsData } = useQuery({
    queryKey: ['labSessionsReport', labFilter],
    queryFn: () => sessionsApi.getSessions({ labId: labFilter, limit: 300 }),
    enabled: isLabSelected
  });

  // Calculate Lab Analytics
  const usageDays = labUsageData?.days || [];
  const totalSessions7d = usageDays.reduce((acc: number, d: any) => acc + (d.sessions || 0), 0);
  const totalHours7d = usageDays.reduce((acc: number, d: any) => acc + (d.hours || 0), 0);
  const labSessions = labSessionsData?.sessions || [];
  const uniqueStudentsSet = new Set(labSessions.map(s => s.username));

  // Machine utilization ranking
  const nodeSessionCounts: Record<string, number> = {};
  for (const s of labSessions) {
    nodeSessionCounts[s.nodeId] = (nodeSessionCounts[s.nodeId] || 0) + 1;
  }
  const labMachines = nodes.filter(n => n.labId === labFilter);
  const sortedLabMachines = [...labMachines].sort((a, b) => (nodeSessionCounts[b.node_id] || 0) - (nodeSessionCounts[a.node_id] || 0));
  const mostUsedMachines = sortedLabMachines.slice(0, 3);
  const leastUsedMachines = [...sortedLabMachines].reverse().slice(0, 3);

  // Peak-Hours Heatmap: 5 weekdays x 4 time blocks
  const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const heatmapSlots = [
    { label: '08:00 - 11:00', start: 8, end: 11 },
    { label: '11:00 - 14:00', start: 11, end: 14 },
    { label: '14:00 - 17:00', start: 14, end: 17 },
    { label: '17:00 - 20:00', start: 17, end: 20 }
  ];
  const heatmapMatrix: number[][] = heatmapDays.map(() => [0, 0, 0, 0]);

  for (const s of labSessions) {
    const d = new Date(s.loginAt);
    const dayIdx = (d.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
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

      {/* Lab Specific Utilization & Peak-Hours Report */}
      {isLabSelected && !selectedNodeId && selectedLabObj && (
        <div className="space-y-5 animate-fadeIn">
          {/* Lab Header & Export Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>{selectedLabObj.name} Utilization & Peak-Hours Audit</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Weekly aggregated student occupancy, hours, unique users, and peak usage patterns
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={sessionsApi.getExportUrl({ labId: labFilter })}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs border border-blue-200/80 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Sessions CSV</span>
              </a>
              <a
                href="/api/export/excel"
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-200/80 transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel Report</span>
              </a>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 block">7-Day Sessions</span>
              <span className="text-2xl font-extrabold text-blue-600 mt-1 block">{totalSessions7d}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Student Logins</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 block">Total Lab Hours</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{totalHours7d.toFixed(1)} hrs</span>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">Occupancy Time</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 block">Unique Students</span>
              <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">{uniqueStudentsSet.size}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Distinct Usernames</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 block">Avg Daily Hours</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{(totalHours7d / 7).toFixed(1)} hrs</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Per Calendar Day</span>
            </div>
          </div>

          {/* Charts & Heatmap Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 7-Day Usage Trend Chart */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                7-Day Lab Usage (Sessions & Occupancy Hours)
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageDays}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#1d68ff" fill="#dbeafe" />
                    <Area type="monotone" dataKey="hours" name="Hours" stroke="#38bdf8" fill="#e0f2fe" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak-Hours Heatmap */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Peak-Hours Heatmap (Weekday Login Volume)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-slate-400 text-[10px]">Day</th>
                      {heatmapSlots.map(s => (
                        <th key={s.label} className="p-2 text-slate-500 text-[10px] font-medium">{s.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {heatmapDays.map((d, di) => (
                      <tr key={d}>
                        <td className="p-2 text-left font-sans font-bold text-slate-700 text-xs">{d}</td>
                        {heatmapSlots.map((_, si) => {
                          const val = heatmapMatrix[di][si];
                          const ratio = val / maxHeatVal;
                          const bgStyle =
                            val === 0
                              ? 'bg-slate-50 text-slate-400'
                              : ratio > 0.66
                              ? 'bg-blue-600 text-white font-bold'
                              : ratio > 0.33
                              ? 'bg-blue-300 text-slate-900 font-semibold'
                              : 'bg-blue-100 text-blue-800';

                          return (
                            <td key={si} className="p-1.5">
                              <div className={`p-2 rounded-lg text-xs transition ${bgStyle}`}>
                                {val}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Machine Utilization Ranking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-emerald-600" />
                <span>Most Utilized Desktops</span>
              </span>
              <div className="space-y-1.5">
                {mostUsedMachines.map(m => (
                  <div key={m.node_id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800">{m.hostname}</span>
                    <span className="font-mono text-blue-600 font-bold">{nodeSessionCounts[m.node_id] || 0} sessions</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Least Utilized Desktops</span>
              </span>
              <div className="space-y-1.5">
                {leastUsedMachines.map(m => (
                  <div key={m.node_id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-700">{m.hostname}</span>
                    <span className="font-mono text-slate-500 font-bold">{nodeSessionCounts[m.node_id] || 0} sessions</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">CURRENT CPU</span>
                    <span className="font-bold text-slate-800">{node.cpu_percent?.toFixed(1) || '0.0'}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CURRENT GPU</span>
                    <span className="font-bold text-sky-600">{node.gpu_percent?.toFixed(1) || '0.0'}%</span>
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
                    <th className="p-4">Average GPU</th>
                    <th className="p-4">Peak GPU</th>
                    <th className="p-4">Average RAM</th>
                    <th className="p-4">Peak RAM</th>
                    <th className="p-4">Uptime %</th>
                    <th className="p-4 text-right">Samples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 font-sans">
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
                        <td className="p-4 font-semibold text-sky-600">{(r.avg_gpu ?? 0).toFixed(1)}%</td>
                        <td className="p-4 font-semibold text-purple-600">{(r.max_gpu ?? 0).toFixed(1)}%</td>
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
