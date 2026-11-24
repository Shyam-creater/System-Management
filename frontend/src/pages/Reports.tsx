import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  ArrowDown
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ReportCatalog } from '../components/reports/ReportCatalog';
import { FilterBar } from '../components/reports/FilterBar';
import { ColumnChooserModal } from '../components/reports/ColumnChooserModal';
import { MultiSortModal } from '../components/reports/MultiSortModal';
import { SavePresetModal } from '../components/reports/SavePresetModal';
import { ReportChart } from '../components/reports/ReportChart';
import { reportsModuleApi, labsApi, fleetApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export const Reports: React.FC = () => {
  const { id: urlReportId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedReportId, setSelectedReportId] = useState<string>(urlReportId || 'S1');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [filters, setFilters] = useState<any>({ dateRange: { preset: 'last30days' } });
  const [sort, setSort] = useState<Array<{ key: string; dir: 'asc' | 'desc' }>>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Modals state
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Sync state with URL
  useEffect(() => {
    if (urlReportId && urlReportId !== selectedReportId) {
      setSelectedReportId(urlReportId.toUpperCase());
    }
  }, [urlReportId]);

  // Load Catalog
  const { data: catalog = [], isLoading: isCatalogLoading } = useQuery({
    queryKey: ['reports_catalog'],
    queryFn: reportsModuleApi.getCatalog
  });

  // Current Report Definition
  const currentReport = useMemo(() => {
    return catalog.find((r: any) => r.id === selectedReportId) || catalog[0];
  }, [catalog, selectedReportId]);

  useEffect(() => {
    if (catalog.length > 0 && !catalog.find((r: any) => r.id === selectedReportId)) {
      setSelectedReportId(catalog[0].id);
    }
  }, [catalog, selectedReportId]);

  // Set default visible columns when report changes
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

  // Auxiliary data: Labs and Systems for filter dropdowns
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

  // Presets Query
  const { data: presets = [] } = useQuery({
    queryKey: ['reports_presets', selectedReportId],
    queryFn: () => reportsModuleApi.getPresets(selectedReportId)
  });

  // Run Report Query
  const {
    data: reportResult,
    isLoading: isReportLoading,
    isError: isReportError,
    error: reportError,
    refetch
  } = useQuery({
    queryKey: ['report_run', selectedReportId, filters, sort, visibleColumns, page, pageSize],
    queryFn: () =>
      reportsModuleApi.runReport(selectedReportId, {
        filters,
        sort,
        columns: visibleColumns,
        page,
        pageSize
      }),
    enabled: Boolean(currentReport)
  });

  const handleSelectReport = (id: string) => {
    setSelectedReportId(id);
    navigate(`/reports/${id}`);
  };

  const handleHeaderSort = (key: string) => {
    const existing = sort.find(s => s.key === key);
    if (!existing) {
      setSort([{ key, dir: 'asc' }]);
    } else if (existing.dir === 'asc') {
      setSort([{ key, dir: 'desc' }]);
    } else {
      setSort([]);
    }
    setPage(1);
  };

  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    setIsExporting(format);
    setExportNotice(
      reportResult?.total && reportResult.total > 5000
        ? `Preparing ${format.toUpperCase()} export (${reportResult.total.toLocaleString()} rows). This may take a few moments...`
        : `Preparing ${format.toUpperCase()} export...`
    );

    try {
      await reportsModuleApi.exportReport(selectedReportId, format, {
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

  const handleSavePreset = async (name: string, isShared: boolean) => {
    await reportsModuleApi.savePreset({
      name,
      reportId: selectedReportId,
      isShared,
      filters,
      sort,
      columns: visibleColumns
    });
    queryClient.invalidateQueries({ queryKey: ['reports_presets', selectedReportId] });
  };

  const handleLoadPreset = (preset: any) => {
    if (preset.filters) setFilters(preset.filters);
    if (preset.sort) setSort(preset.sort);
    if (preset.columns && preset.columns.length > 0) setVisibleColumns(preset.columns);
    setPage(1);
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this saved preset?')) {
      await reportsModuleApi.deletePreset(presetId);
      queryClient.invalidateQueries({ queryKey: ['reports_presets', selectedReportId] });
    }
  };

  if (isCatalogLoading) {
    return (
      <div className="min-h-screen bg-slate-50/60 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1d68ff] animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Report Catalog & Schemas...</p>
        </div>
      </div>
    );
  }

  const activeColumnsList = currentReport?.columns?.filter((c: any) =>
    visibleColumns.includes(c.key)
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      {/* Top Header */}
      <div className="px-8 pt-6">
        <PageHeader
          title="Campus Intelligence Reports"
          subtitle="Generate, preview, and download institutional telemetry, occupancy, resource, and audit reports."
        />
      </div>

      {/* Main 2-Column Layout */}
      <div className="px-8 mt-4 flex items-start gap-6">
        {/* Left Column: Catalog Sidebar */}
        <ReportCatalog
          catalog={catalog}
          selectedReportId={selectedReportId}
          onSelectReport={handleSelectReport}
        />

        {/* Right Column: Active Report Workspace */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Report Meta Card & Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-[#1d68ff] font-bold text-xs tracking-wide">
                    {currentReport?.id}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {currentReport?.title}
                  </h2>
                  {reportResult?.resolution && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                      Data resolution: {reportResult.resolution}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  {currentReport?.description}
                </p>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Presets Menu */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all">
                    <Bookmark className="w-3.5 h-3.5 text-[#1d68ff]" />
                    Presets ({presets.length})
                  </button>
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-40 hidden group-hover:block divide-y divide-slate-100">
                    <button
                      onClick={() => setIsPresetModalOpen(true)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#1d68ff] hover:bg-blue-50 rounded-lg transition-colors mb-1 text-left"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      Save Current Filters
                    </button>
                    <div className="pt-1 space-y-0.5 max-h-48 overflow-y-auto">
                      {presets.length === 0 ? (
                        <p className="text-[11px] text-slate-400 p-2 text-center">
                          No saved presets for this report
                        </p>
                      ) : (
                        presets.map((p: any) => (
                          <div
                            key={p.id}
                            onClick={() => handleLoadPreset(p)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer group/item"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-xs font-medium text-slate-800 block truncate">
                                {p.name}
                              </span>
                              {p.isShared && (
                                <span className="text-[9px] font-bold text-blue-600 uppercase">
                                  Shared
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeletePreset(p.id, e)}
                              className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Column Chooser Button */}
                <button
                  onClick={() => setIsColumnModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
                >
                  <Columns className="w-3.5 h-3.5 text-slate-500" />
                  Columns ({visibleColumns.length})
                </button>

                {/* Multi-Sort Button */}
                <button
                  onClick={() => setIsSortModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-2xs transition-all ${
                    sort.length > 0
                      ? 'bg-blue-50 border-blue-200 text-[#1d68ff]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort {sort.length > 0 ? `(${sort.length})` : ''}
                </button>

                {/* Export Dropdown */}
                <div className="relative group">
                  <button
                    disabled={isExporting !== null}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#1d68ff] text-white rounded-xl text-xs font-bold hover:bg-blue-600 shadow-sm shadow-blue-500/25 transition-all disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Export
                  </button>
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 hidden group-hover:block space-y-1">
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Excel Workbook (.xlsx)
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      PDF Document (.pdf)
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1d68ff] rounded-lg transition-colors text-left"
                    >
                      <FileDown className="w-4 h-4 text-blue-500" />
                      CSV Spreadsheet (.csv)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Export preparation banner */}
            {exportNotice && (
              <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-800 animate-in fade-in">
                <Loader2 className="w-4 h-4 animate-spin text-[#1d68ff] shrink-0" />
                <span>{exportNotice}</span>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          {currentReport && (
            <FilterBar
              report={currentReport}
              filters={filters}
              onFilterChange={setFilters}
              labsList={labsList}
              systemsList={systemsList}
            />
          )}

          {/* Summary KPI Cards */}
          {reportResult?.summary && reportResult.summary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {reportResult.summary.map((kpi: any) => (
                <div
                  key={kpi.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden"
                >
                  <span className="text-[11px] font-semibold text-slate-500 block truncate">
                    {kpi.label}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span
                      className="text-2xl font-black tracking-tight"
                      style={{ color: kpi.color || '#1e293b' }}
                    >
                      {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                    </span>
                    {kpi.unit && (
                      <span className="text-xs font-bold text-slate-400">{kpi.unit}</span>
                    )}
                  </div>
                  <div
                    className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full opacity-10 pointer-events-none"
                    style={{ backgroundColor: kpi.color || '#1d68ff' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Report Chart (if defined) */}
          {reportResult?.charts && reportResult.charts.length > 0 && (
            <div className="space-y-4">
              {reportResult.charts.map((chart: any) => (
                <ReportChart key={chart.id} chart={chart} />
              ))}
            </div>
          )}

          {/* Main Data Table Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Loading / Error / Empty States */}
            {isReportLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#1d68ff] animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Querying institutional records...</p>
              </div>
            ) : isReportError ? (
              <div className="p-12 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">Report Query Failed</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                  {(reportError as any)?.response?.data?.error || (reportError as any)?.message || 'Internal server error'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Retry Request
                </button>
              </div>
            ) : !reportResult?.rows || reportResult.rows.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Data Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No records match the current filter parameters. Try widening your date range or clearing lab/user filters.
                </p>
              </div>
            ) : (
              <div>
                {/* Scrollable Table View */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#1d68ff] text-white">
                        {activeColumnsList.map((col: any) => {
                          const activeSort = sort.find(s => s.key === col.key);
                          const isRight =
                            col.type === 'number' ||
                            col.type === 'percent' ||
                            col.type === 'duration' ||
                            col.type === 'size';

                          return (
                            <th
                              key={col.key}
                              style={{ width: col.width ? `${col.width}px` : 'auto' }}
                              onClick={() => col.sortable && handleHeaderSort(col.key)}
                              className={`py-3 px-4 font-bold tracking-tight select-none border-b border-blue-600/50 ${
                                col.sortable ? 'cursor-pointer hover:bg-blue-600/80 transition-colors' : ''
                              } ${isRight ? 'text-right' : 'text-left'}`}
                            >
                              <div
                                className={`flex items-center gap-1.5 ${
                                  isRight ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <span>{col.label}</span>
                                {col.unit && (
                                  <span className="text-[10px] font-normal opacity-80">
                                    ({col.unit})
                                  </span>
                                )}
                                {col.sortable && (
                                  <span className="opacity-80">
                                    {activeSort?.dir === 'asc' ? (
                                      <ArrowUp className="w-3 h-3 text-white" />
                                    ) : activeSort?.dir === 'desc' ? (
                                      <ArrowDown className="w-3 h-3 text-white" />
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportResult.rows.map((row: any, rIdx: number) => (
                        <tr
                          key={rIdx}
                          className={`transition-colors hover:bg-blue-50/40 ${
                            rIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                          }`}
                        >
                          {activeColumnsList.map((col: any) => {
                            let val = row[col.key];
                            const isRight =
                              col.type === 'number' ||
                              col.type === 'percent' ||
                              col.type === 'duration' ||
                              col.type === 'size';

                            let display = val !== undefined && val !== null ? String(val) : '-';
                            let cellColorClass = 'text-slate-700';

                            if (col.type === 'percent' && typeof val === 'number') {
                              display = `${val.toFixed(1)}%`;
                              if (val > 75) cellColorClass = 'text-red-600 font-bold';
                              else if (val >= 25) cellColorClass = 'text-emerald-600 font-semibold';
                              else cellColorClass = 'text-amber-600 font-semibold';
                            } else if (col.type === 'datetime' && val) {
                              try {
                                const d = new Date(val);
                                display = !isNaN(d.getTime()) ? d.toLocaleString() : String(val);
                              } catch {}
                            } else if (col.type === 'number' && typeof val === 'number') {
                              display = val.toLocaleString();
                            } else if (col.key === 'severity') {
                              if (val === 'CRITICAL') cellColorClass = 'text-red-600 font-bold';
                              else if (val === 'WARNING') cellColorClass = 'text-amber-600 font-semibold';
                              else cellColorClass = 'text-blue-600';
                            } else if (col.key === 'statusLabel') {
                              if (val === 'High Load') cellColorClass = 'text-red-600 font-bold';
                              else if (val === 'Optimal') cellColorClass = 'text-emerald-600 font-bold';
                              else cellColorClass = 'text-amber-600 font-bold';
                            } else if (col.key === 'currentUser') {
                              if (val && val !== 'No User' && val !== 'None' && val !== '-') {
                                cellColorClass = 'text-indigo-700 font-bold';
                              } else {
                                cellColorClass = 'text-slate-400 italic';
                                display = 'No User';
                              }
                            }

                            return (
                              <td
                                key={col.key}
                                className={`py-2.5 px-4 text-xs ${isRight ? 'text-right' : 'text-left'} ${cellColorClass}`}
                              >
                                {display}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>

                    {/* Overall Totals Row for the whole filtered set */}
                    {reportResult.totals && Object.keys(reportResult.totals).length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                          {activeColumnsList.map((col: any, cIdx: number) => {
                            const isRight =
                              col.type === 'number' ||
                              col.type === 'percent' ||
                              col.type === 'duration' ||
                              col.type === 'size';
                            let totalVal = reportResult.totals[col.key];
                            if (col.type === 'percent' && typeof totalVal === 'number') {
                              totalVal = `${totalVal.toFixed(1)}%`;
                            } else if (typeof totalVal === 'number') {
                              totalVal = totalVal.toLocaleString();
                            }

                            return (
                              <td
                                key={col.key}
                                className={`py-3 px-4 text-xs text-slate-900 ${
                                  isRight ? 'text-right' : 'text-left'
                                }`}
                              >
                                {totalVal !== undefined && totalVal !== ''
                                  ? totalVal
                                  : cIdx === 0
                                  ? 'Total / Average'
                                  : ''}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Showing{' '}
                      <span className="font-bold text-slate-800">
                        {Math.min(reportResult.total, (page - 1) * pageSize + 1)}
                      </span>{' '}
                      to{' '}
                      <span className="font-bold text-slate-800">
                        {Math.min(reportResult.total, page * pageSize)}
                      </span>{' '}
                      of{' '}
                      <span className="font-bold text-slate-800">
                        {reportResult.total.toLocaleString()}
                      </span>{' '}
                      records
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 border-l border-slate-200 pl-3">
                      <span>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={e => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </button>

                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#1d68ff]">
                      Page {page} of {Math.max(1, Math.ceil(reportResult.total / pageSize))}
                    </span>

                    <button
                      onClick={() =>
                        setPage(p =>
                          p < Math.ceil(reportResult.total / pageSize) ? p + 1 : p
                        )
                      }
                      disabled={page >= Math.ceil(reportResult.total / pageSize)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Chooser Modal */}
      {currentReport && (
        <ColumnChooserModal
          isOpen={isColumnModalOpen}
          onClose={() => setIsColumnModalOpen(false)}
          allColumns={currentReport.columns || []}
          visibleColumns={visibleColumns}
          onApply={setVisibleColumns}
        />
      )}

      {/* Multi-Sort Modal */}
      {currentReport && (
        <MultiSortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sortableColumns={currentReport.columns?.filter((c: any) => c.sortable) || []}
          currentSort={sort}
          onApply={setSort}
        />
      )}

      {/* Save Preset Modal */}
      {currentReport && (
        <SavePresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          reportTitle={currentReport.title}
          isAdmin={user?.role === 'admin'}
          onSave={handleSavePreset}
        />
      )}
    </div>
  );
};
