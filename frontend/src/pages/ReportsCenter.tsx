import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Columns,
  ArrowUpDown,
  Bookmark,
  BookmarkPlus,
  Loader2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  Search,
  Calendar,
  Building,
  Filter,
  Check,
  X,
  ChevronDown,
  BarChart3,
  Users,
  Cpu,
  HardDrive,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  ExternalLink,
  Clock,
  Printer
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { ReportChart } from '../components/reports/ReportChart';
import { reportsModuleApi, reportsApi, labsApi, fleetApi } from '../services/api';
import { useFleetStore } from '../store/useFleetStore';
import { DailyReports } from './DailyReports';

export const ReportsCenter: React.FC = () => {
  const { id: urlReportId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { selectedLabId, setSelectedLabId } = useFleetStore();

  const isDailyRoute = urlReportId?.toLowerCase() === 'daily';
  const isGalleryView = !urlReportId;
  const activeReportId = urlReportId && !isDailyRoute ? urlReportId.toUpperCase() : null;

  // Search state for Gallery
  const [gallerySearch, setGallerySearch] = useState('');

  // Report Detail State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [filters, setFilters] = useState<any>({
    dateRange: { preset: 'last30days' },
    labId: selectedLabId !== 'ALL' ? selectedLabId : undefined
  });
  const [sort, setSort] = useState<Array<{ key: string; dir: 'asc' | 'desc' }>>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showChart, setShowChart] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isColumnPopoverOpen, setIsColumnPopoverOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Sync global lab selection with report filter
  useEffect(() => {
    if (selectedLabId && selectedLabId !== 'ALL') {
      setFilters((prev: any) => ({ ...prev, labId: selectedLabId }));
    }
  }, [selectedLabId]);

  // Load Catalog
  const { data: catalog = [], isLoading: isCatalogLoading } = useQuery({
    queryKey: ['reports_catalog'],
    queryFn: reportsModuleApi.getCatalog
  });

  // Current active report definition
  const currentReport = useMemo(() => {
    if (!activeReportId) return null;
    return catalog.find((r: any) => r.id === activeReportId) || null;
  }, [catalog, activeReportId]);

  // Reset columns & sort when report changes
  useEffect(() => {
    if (currentReport) {
      const defaultCols = currentReport.columns
        .filter((c: any) => c.defaultVisible)
        .map((c: any) => c.key);
      setVisibleColumns(defaultCols);
      setSort(currentReport.defaultSort || []);
      setPage(1);
    }
  }, [currentReport?.id]);

  // Fetch Labs & Nodes
  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs
  });
  const labsList = labsData?.labs || [];

  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes
  });
  const systemsList = useMemo(() => {
    if (!fleetData?.nodes) return [];
    return Object.values(fleetData.nodes);
  }, [fleetData]);

  // Run Report Query
  const {
    data: reportResult,
    isLoading: isReportLoading,
    isError: isReportError,
    error: reportError,
    refetch
  } = useQuery({
    queryKey: ['report_run', activeReportId, filters, sort, visibleColumns, page, pageSize],
    queryFn: () =>
      activeReportId
        ? reportsModuleApi.runReport(activeReportId, {
            filters,
            sort,
            columns: visibleColumns,
            page,
            pageSize
          })
        : null,
    enabled: Boolean(activeReportId && currentReport)
  });

  const handleHeaderSort = (key: string, e: React.MouseEvent) => {
    const isShift = e.shiftKey;
    const existingIndex = sort.findIndex((s) => s.key === key);

    if (!isShift) {
      if (existingIndex >= 0) {
        const currentDir = sort[existingIndex].dir;
        if (currentDir === 'asc') {
          setSort([{ key, dir: 'desc' }]);
        } else {
          setSort([]);
        }
      } else {
        setSort([{ key, dir: 'asc' }]);
      }
    } else {
      // Multi-sort with Shift+Click
      if (existingIndex >= 0) {
        const next = [...sort];
        if (next[existingIndex].dir === 'asc') {
          next[existingIndex] = { key, dir: 'desc' };
        } else {
          next.splice(existingIndex, 1);
        }
        setSort(next);
      } else {
        setSort([...sort, { key, dir: 'asc' }]);
      }
    }
    setPage(1);
  };

  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    if (!activeReportId) return;
    setIsExportDropdownOpen(false);
    setIsExporting(format);
    setExportNotice(
      reportResult?.total && reportResult.total > 5000
        ? `Preparing ${format.toUpperCase()} export (${reportResult.total.toLocaleString()} rows). This runs in background...`
        : `Preparing ${format.toUpperCase()} export...`
    );

    try {
      await reportsModuleApi.exportReport(activeReportId, format, {
        filters,
        sort,
        columns: visibleColumns
      });
      setExportNotice(null);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
      setExportNotice(null);
    } finally {
      setIsExporting(null);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const resetFilters = () => {
    setFilters({
      dateRange: { preset: 'last30days' },
      labId: selectedLabId !== 'ALL' ? selectedLabId : undefined
    });
    setPage(1);
  };

  const removeFilter = (key: string) => {
    setFilters((prev: any) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // If user navigated to /reports/daily, render Daily Audit snapshots view
  if (isDailyRoute) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Reports', path: '/reports' },
            { label: 'Daily Audit Snapshots' }
          ]}
        />
        <DailyReports />
      </div>
    );
  }

  // Question Groups for Gallery
  const questionGroups = [
    {
      title: 'Who used the labs?',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      description: 'Audit user logins, session durations, peak hours, and idle seats.',
      reports: [
        { id: 'L4', name: 'Session Log', desc: 'Login & logout timestamps, user identities, seat durations.' },
        { id: 'L2', name: 'Lab Usage Trend', desc: 'Hourly and daily workstation occupancy trends across rooms.' }
      ]
    },
    {
      title: 'How are computers performing?',
      icon: Cpu,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      description: 'Fleet-wide processor, memory, GPU telemetry, and high-impact processes.',
      reports: [
        { id: 'S6', name: 'Fleet Processes', desc: 'Real-time process states, top CPU/GPU consumers, and active users.' },
        { id: 'S2', name: 'Performance & Telemetry', desc: 'Multi-core thread loads, thermal profiles, and device health.' },
        { id: 'S1', name: 'System Utilization', desc: 'Comprehensive fleet CPU %, RAM %, Disk %, and GPU load breakdown.' },
        { id: 'S3', name: 'Memory Usage', desc: 'Physical RAM allocation, page commit charges, and memory leak tracking.' }
      ]
    },
    {
      title: 'What is installed?',
      icon: Layers,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      description: 'Complete catalog of installed software packages and physical hardware components.',
      reports: [
        { id: 'S5', name: 'Installed Software Inventory', desc: 'Applications, versions, and publishers detected on workstations.' },
        { id: 'S7', name: 'Hardware Inventory', desc: 'CPU models, DDR RAM size, storage serials, and GPU hardware.' }
      ]
    },
    {
      title: 'Is anything broken?',
      icon: ShieldAlert,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'System faults, threshold alerts, security warnings, and incident logs.',
      reports: [
        { id: 'L7', name: 'Alerts & Incidents', desc: 'Log of critical thresholds, offline incidents, and resolutions.' }
      ]
    },
    {
      title: 'Daily snapshots',
      icon: BarChart3,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
      description: 'Automated 24-hour compliance audits, per-workstation summary rows, and historical snapshots.',
      customAction: () => navigate('/reports/daily'),
      reports: [
        { id: 'daily', name: 'Daily Compliance Audit', desc: 'Institutional daily snapshot with one-click Excel & PDF export.' }
      ]
    },
    {
      title: 'College overview',
      icon: Building,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
      description: 'Cross-laboratory benchmarks, capacity comparisons, and institutional aggregates.',
      reports: [
        { id: 'C2', name: 'Lab Comparison', desc: 'Comparative metrics between CS Lab 1, AI Lab, IoT Lab, and server rooms.' }
      ]
    }
  ];

  // ==========================================
  // RENDER: REPORT GALLERY (/reports)
  // ==========================================
  if (isGalleryView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports Center"
          subtitle="Query, analyze, and export campus intelligence, seat occupancy, and hardware telemetry."
        />

        {/* Search Bar & Favorites Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder='Search reports... e.g. "who used lab 1", "software", "processes", "daily audit"'
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Quick Access:
            </span>
            <button
              onClick={() => navigate('/reports/daily')}
              className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200/60 transition"
            >
              📊 Daily Audit
            </button>
            <button
              onClick={() => navigate('/reports/S6')}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200/60 transition"
            >
              Processes (S6)
            </button>
            <button
              onClick={() => navigate('/reports/L4')}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/60 transition"
            >
              Session Log (L4)
            </button>
            <button
              onClick={() => navigate('/reports/S2')}
              className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold border border-sky-200/60 transition"
            >
              Performance & Telemetry (S2)
            </button>
            <button
              onClick={() => navigate('/reports/S5')}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200/60 transition"
            >
              Installed Software (S5)
            </button>
            <button
              onClick={() => navigate('/reports/C2')}
              className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold border border-cyan-200/60 transition"
            >
              Lab Comparison (C2)
            </button>
          </div>
        </div>

        {/* Question Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionGroups.map((group, idx) => {
            const Icon = group.icon;
            const filteredReports = group.reports.filter(
              (r) =>
                r.name.toLowerCase().includes(gallerySearch.toLowerCase()) ||
                r.desc.toLowerCase().includes(gallerySearch.toLowerCase()) ||
                group.title.toLowerCase().includes(gallerySearch.toLowerCase())
            );

            if (gallerySearch && filteredReports.length === 0) return null;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2.5 rounded-xl border ${group.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{group.title}</h3>
                      <p className="text-xs text-slate-500 leading-snug">{group.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    {filteredReports.map((rep) => (
                      <div
                        key={rep.id}
                        onClick={() =>
                          rep.id === 'daily'
                            ? navigate('/reports/daily')
                            : navigate(`/reports/${rep.id}`)
                        }
                        className="group p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                              {rep.name}
                            </span>
                            {rep.id !== 'daily' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/70 text-slate-600">
                                {rep.id}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{rep.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 group-hover:translate-x-0.5 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: REPORT DETAIL VIEW (/reports/:id)
  // ==========================================
  const activeColumnsList =
    currentReport?.columns?.filter((c: any) => visibleColumns.includes(c.key)) || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Reports', path: '/reports' },
          { label: `${currentReport?.title || activeReportId} (${activeReportId})` }
        ]}
      />

      {/* Main Report Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-[#1d68ff] font-bold text-xs tracking-wide">
              {activeReportId}
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {currentReport?.title || 'Report View'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{currentReport?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-xl border text-xs font-medium transition ${
                isFavorite
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              title="Bookmark Report"
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Single Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                disabled={Boolean(isExporting)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1d68ff] hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export Current View</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-30 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Export Filtered ({reportResult?.total || 0} rows)
                  </div>
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Microsoft Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2.5"
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Printable PDF (.pdf)</span>
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2.5"
                  >
                    <FileDown className="w-4 h-4 text-blue-600" />
                    <span>Raw CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Notification Toast */}
        {exportNotice && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* 3 Primary Filters + Expandable More Filters */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Filter 1: Date Range */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filters.dateRange?.preset || 'last30days'}
                onChange={(e) => {
                  setFilters((prev: any) => ({
                    ...prev,
                    dateRange: { preset: e.target.value }
                  }));
                  setPage(1);
                }}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
              </select>
            </div>

            {/* Primary Filter 2: Lab */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filters.labId || 'ALL'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters((prev: any) => ({
                    ...prev,
                    labId: val === 'ALL' ? undefined : val
                  }));
                  setSelectedLabId(val);
                  setPage(1);
                }}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Laboratories</option>
                {labsList.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Filter 3: Search / User Filter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Filter by user or name..."
                value={filters.search || filters.user || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters((prev: any) => ({
                    ...prev,
                    search: val || undefined,
                    user: val || undefined
                  }));
                  setPage(1);
                }}
                className="bg-transparent font-medium text-slate-800 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>

            {/* Toggle More Filters */}
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                showMoreFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>More Filters</span>
            </button>
          </div>

          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showMoreFilters && (
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in fade-in">
            <div>
              <label className="text-slate-500 font-semibold block mb-1">Workstation / Node</label>
              <select
                value={filters.nodeId || 'ALL'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters((prev: any) => ({
                    ...prev,
                    nodeId: val === 'ALL' ? undefined : val
                  }));
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Workstations</option>
                {systemsList.map((s: any) => (
                  <option key={s.node_id} value={s.node_id}>
                    {s.hostname} ({s.ip})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-500 font-semibold block mb-1">Minimum CPU %</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 50"
                value={filters.minCpu || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setFilters((prev: any) => ({ ...prev, minCpu: val }));
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-500 font-semibold block mb-1">Status / Compliance</label>
              <select
                value={filters.status || 'ALL'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters((prev: any) => ({
                    ...prev,
                    status: val === 'ALL' ? undefined : val
                  }));
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All States</option>
                <option value="ONLINE">Online Only</option>
                <option value="OFFLINE">Offline Only</option>
                <option value="HIGH_LOAD">High Load</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-400">Active filters:</span>
          {filters.dateRange?.preset && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
              Date: {filters.dateRange.preset}
            </span>
          )}
          {filters.labId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              Lab: {labsList.find((l: any) => l.id === filters.labId)?.name || filters.labId}
              <button onClick={() => removeFilter('labId')}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}
          {(filters.search || filters.user) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
              Search: {filters.search || filters.user}
              <button
                onClick={() => {
                  removeFilter('search');
                  removeFilter('user');
                }}
              >
                <X className="w-3 h-3 hover:text-indigo-900" />
              </button>
            </span>
          )}
          {filters.nodeId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
              Node: {filters.nodeId}
              <button onClick={() => removeFilter('nodeId')}>
                <X className="w-3 h-3 hover:text-emerald-900" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-3 shadow-sm flex flex-wrap items-center justify-between text-xs font-medium text-slate-600 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Records: {reportResult?.total?.toLocaleString() || 0}</span>
          </div>
          {reportResult?.resolution && (
            <div className="text-slate-500">
              Resolution: <span className="text-slate-800 font-semibold">{reportResult.resolution}</span>
            </div>
          )}
          {reportResult?.summary && (
            <div className="text-slate-500">
              Avg CPU:{' '}
              <span className="text-slate-800 font-semibold">
                {reportResult.summary.avgCpu != null ? `${reportResult.summary.avgCpu}%` : 'N/A'}
              </span>
            </div>
          )}
        </div>

        {reportResult?.chart && (
          <button
            onClick={() => setShowChart(!showChart)}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            {showChart ? 'Hide Trend Chart ▲' : 'Show Trend Chart ▼'}
          </button>
        )}
      </div>

      {/* Optional Collapsible Chart */}
      {showChart && reportResult?.chart && (
        <ReportChart chart={reportResult.chart} />
      )}

      {/* Table & Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Click header to sort. Hold <kbd className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px]">Shift</kbd> for multi-column sort.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Column Chooser Popover */}
            <div className="relative">
              <button
                onClick={() => setIsColumnPopoverOpen(!isColumnPopoverOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                <Columns className="w-3.5 h-3.5 text-slate-500" />
                <span>Columns ({visibleColumns.length})</span>
              </button>

              {isColumnPopoverOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 z-30 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Customize Columns</span>
                    <button
                      onClick={() => setIsColumnPopoverOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {currentReport?.columns?.map((col: any) => {
                      const isChecked = visibleColumns.includes(col.key);
                      return (
                        <label
                          key={col.key}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <span className="text-slate-700 font-medium">{col.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {isReportLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#1d68ff] animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Loading filtered report telemetry...</p>
            </div>
          ) : isReportError ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Failed to run report</p>
              <p className="text-xs text-slate-500 mt-1">{(reportError as any)?.message || 'Query error'}</p>
            </div>
          ) : !reportResult?.rows || reportResult.rows.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <p className="text-sm font-semibold">No records found matching current filters</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting filters or picking another date window</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  {activeColumnsList.map((col: any) => {
                    const sortIndex = sort.findIndex((s) => s.key === col.key);
                    const isSorted = sortIndex >= 0;
                    const sortDir = isSorted ? sort[sortIndex].dir : null;

                    return (
                      <th
                        key={col.key}
                        onClick={(e) => handleHeaderSort(col.key, e)}
                        className="py-3 px-4 select-none cursor-pointer hover:bg-slate-100/60 transition whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.label}</span>
                          {isSorted && (
                            <span className="inline-flex items-center text-[#1d68ff] font-bold">
                              {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                              {sort.length > 1 && (
                                <span className="text-[10px] ml-0.5">{sortIndex + 1}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportResult.rows.map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-blue-50/30 transition">
                    {activeColumnsList.map((col: any) => {
                      const val = row[col.key];

                      // Special styling for User column
                      if (col.key === 'user') {
                        return (
                          <td key={col.key} className="py-3 px-4 whitespace-nowrap">
                            {val && val !== 'Unassigned' && val !== 'None' ? (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {val}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                        );
                      }

                      // Status or Compliance styling
                      if (col.key === 'status') {
                        const isOnline = String(val).toUpperCase() === 'ONLINE';
                        return (
                          <td key={col.key} className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOnline
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {val}
                            </span>
                          </td>
                        );
                      }

                      // Percentage / Metric Formatting
                      if (typeof val === 'number' && (col.key.includes('percent') || col.key.includes('Cpu') || col.key.includes('Ram'))) {
                        return (
                          <td key={col.key} className="py-3 px-4 whitespace-nowrap font-mono">
                            {val.toFixed(1)}%
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="py-3 px-4 whitespace-nowrap">
                          {val != null ? String(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {reportResult && reportResult.total > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs bg-slate-50/50">
            <span className="text-slate-500 font-medium">
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, reportResult.total)} of {reportResult.total.toLocaleString()} rows
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition"
              >
                ‹ Prev
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Page {page} of {Math.ceil(reportResult.total / pageSize)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= reportResult.total}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
