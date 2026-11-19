import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Monitor,
  ExternalLink
} from 'lucide-react';
import { softwareApi, fleetApi } from '../services/api';
import { SoftwareItem, NodeInfo } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

export const SoftwareInventory: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fleet nodes query
  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const nodes = rawNodes.length > 0 ? rawNodes : [];
  const selectedNode = selectedNodeId ? nodes.find(n => n.node_id === selectedNodeId) : null;

  // Software query for selected node
  const { data: softwareData, isLoading: isSoftwareLoading } = useQuery({
    queryKey: ['software', selectedNodeId],
    queryFn: () => softwareApi.getSoftware(selectedNodeId || undefined, false),
    enabled: !!selectedNodeId,
    refetchOnWindowFocus: false
  });

  const rescanMutation = useMutation({
    mutationFn: () => softwareApi.rescan(selectedNodeId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software', selectedNodeId] });
    }
  });

  const rawPackages: SoftwareItem[] = softwareData?.packages || [];

  // Filter packages
  const filtered = rawPackages.filter((pkg) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (pkg.name && pkg.name.toLowerCase().includes(q)) ||
      (pkg.publisher && pkg.publisher.toLowerCase().includes(q)) ||
      (pkg.version && pkg.version.toLowerCase().includes(q)) ||
      (pkg.install_path && pkg.install_path.toLowerCase().includes(q)) ||
      (pkg.category && pkg.category.toLowerCase().includes(q));

    let matchesCategory = true;
    if (categoryFilter === 'desktop') {
      matchesCategory = pkg.category?.toLowerCase().includes('desktop') || pkg.category?.toLowerCase().includes('application');
    } else if (categoryFilter === 'snap') {
      matchesCategory = pkg.source?.toLowerCase().includes('snap') || pkg.category?.toLowerCase().includes('snap');
    } else if (categoryFilter === 'devel') {
      matchesCategory = pkg.category?.toLowerCase().includes('development') || pkg.name?.toLowerCase().includes('code') || pkg.name?.toLowerCase().includes('git');
    } else if (categoryFilter === 'system') {
      matchesCategory = pkg.source?.toLowerCase().includes('dpkg') || pkg.source?.toLowerCase().includes('registry') || pkg.category?.toLowerCase().includes('system');
    }

    return matchesSearch && matchesCategory;
  });

  // Sort packages
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    if (sortBy === 'ver_desc') return (b.version || '').localeCompare(a.version || '');
    if (sortBy === 'publisher') return (a.publisher || '').localeCompare(b.publisher || '');
    if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
    if (sortBy === 'path_asc') return (a.install_path || '').localeCompare(b.install_path || '');
    if (sortBy === 'date_desc') return (b.install_date || '').localeCompare(a.install_date || '');
    return 0;
  });

  const totalPages = pageSize === -1 ? 1 : Math.ceil(sorted.length / pageSize);
  const displayed = pageSize === -1 ? sorted : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Software Inventory"
        subtitle="Complete catalog of installed applications, runtime libraries, and system packages"
      >
        {selectedNodeId ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedNodeId(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Workstations</span>
            </button>

            <button
              onClick={() => rescanMutation.mutate()}
              disabled={rescanMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rescanMutation.isPending ? 'animate-spin text-blue-600' : ''}`} />
              <span>Rescan System</span>
            </button>

            <a
              href={`/api/export/excel?type=software&format=xlsx&node_id=${encodeURIComponent(selectedNodeId)}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95"
              download
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </a>

            <a
              href={`/api/export/excel?type=software&format=csv&node_id=${encodeURIComponent(selectedNodeId)}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition active:scale-95"
              download
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        ) : null}
      </PageHeader>

      {!selectedNodeId ? (
        /* Workstation Selection Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {nodes.map((node: NodeInfo) => {
            const isSSH = !!node.is_ssh_agentless;
            return (
              <div
                key={node.node_id}
                onClick={() => setSelectedNodeId(node.node_id)}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] cursor-pointer flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSSH ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isSSH ? 'SSH NODE' : 'LOCAL HOST'}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold">Inspect Software →</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2">{node.hostname}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{node.ip}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate max-w-[200px]">{node.system_type || 'Windows/Linux'}</span>
                  <span className="font-semibold text-blue-600">Open Catalog</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Software Table */
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search packages by name, publisher, version..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
              >
                <option value="all">All Packages ({rawPackages.length})</option>
                <option value="desktop">Desktop Applications</option>
                <option value="devel">Development Tools</option>
                <option value="system">System / DPKG / Registry</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
              >
                <option value="name_asc">Sort: Name (A-Z)</option>
                <option value="name_desc">Sort: Name (Z-A)</option>
                <option value="publisher">Sort: Publisher</option>
                <option value="category">Sort: Category</option>
              </select>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                  <tr>
                    <th className="p-4">Application / Package</th>
                    <th className="p-4">Version</th>
                    <th className="p-4">Publisher / Vendor</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Install Path / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isSoftwareLoading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        Scanning software catalog for {selectedNode?.hostname}...
                      </td>
                    </tr>
                  ) : displayed.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        No software packages matched the current search query.
                      </td>
                    </tr>
                  ) : (
                    displayed.map((pkg, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate max-w-[220px]">{pkg.name}</span>
                        </td>
                        <td className="p-4 font-mono text-slate-600 font-semibold">{pkg.version || 'Latest'}</td>
                        <td className="p-4 text-slate-600 truncate max-w-[150px]">{pkg.publisher || 'System'}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {pkg.category || 'General'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                            {pkg.source || 'Registry'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[11px] truncate max-w-[250px]">
                          {pkg.install_path || 'Standard system path'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} packages
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="font-semibold text-slate-800">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
