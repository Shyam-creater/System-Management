import React, { useState } from 'react';
import {
  Calendar,
  Building,
  Monitor,
  User,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  X,
  ChevronDown
} from 'lucide-react';

interface FilterBarProps {
  report: any;
  filters: any;
  onFilterChange: (newFilters: any) => void;
  labsList: any[];
  systemsList: any[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  report,
  filters,
  onFilterChange,
  labsList,
  systemsList
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const allowedFilters: string[] = report.filters || [];

  const handleUpdate = (key: string, val: any) => {
    onFilterChange({
      ...filters,
      [key]: val
    });
  };

  const handleReset = () => {
    onFilterChange({
      dateRange: { preset: 'last30days' }
    });
  };

  const handleRemoveChip = (key: string) => {
    const updated = { ...filters };
    delete updated[key];
    onFilterChange(updated);
  };

  const datePresets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7days', label: 'Last 7 Days' },
    { id: 'last30days', label: 'Last 30 Days' },
    { id: 'thismonth', label: 'This Month' },
    { id: 'lastmonth', label: 'Last Month' },
    { id: 'thissemester', label: 'This Semester (90d)' },
    { id: 'custom', label: 'Custom' }
  ];

  const currentPreset = filters.dateRange?.preset || 'last30days';

  // Build active filter chips
  const activeChips: Array<{ key: string; label: string }> = [];

  if (filters.dateRange?.preset && filters.dateRange.preset !== 'last30days') {
    const pObj = datePresets.find(p => p.id === filters.dateRange.preset);
    activeChips.push({ key: 'dateRange', label: `Date: ${pObj?.label || filters.dateRange.preset}` });
  } else if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
    activeChips.push({ key: 'dateRange', label: `${filters.dateRange.startDate} - ${filters.dateRange.endDate}` });
  }

  if (filters.labs && filters.labs.length > 0) {
    activeChips.push({ key: 'labs', label: `Labs (${filters.labs.length})` });
  }

  if (filters.systems && filters.systems.length > 0) {
    activeChips.push({ key: 'systems', label: `Systems (${filters.systems.length})` });
  }

  if (filters.user) {
    activeChips.push({ key: 'user', label: `User: "${filters.user}"` });
  }

  if (filters.timeOfDay?.from || filters.timeOfDay?.to) {
    activeChips.push({ key: 'timeOfDay', label: `Time: ${filters.timeOfDay.from || '00:00'} - ${filters.timeOfDay.to || '23:59'}` });
  }

  if (filters.daysOfWeek && filters.daysOfWeek.length > 0) {
    const dMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    activeChips.push({ key: 'daysOfWeek', label: `Days: ${filters.daysOfWeek.map((d: number) => dMap[d]).join(', ')}` });
  }

  if (filters.cpuPctMin !== undefined || filters.cpuPctMax !== undefined) {
    activeChips.push({ key: 'cpuPct', label: `CPU: ${filters.cpuPctMin ?? 0}% - ${filters.cpuPctMax ?? 100}%` });
  }

  if (filters.ramPctMin !== undefined || filters.ramPctMax !== undefined) {
    activeChips.push({ key: 'ramPct', label: `RAM: ${filters.ramPctMin ?? 0}% - ${filters.ramPctMax ?? 100}%` });
  }

  if (filters.diskPctMin !== undefined || filters.diskPctMax !== undefined) {
    activeChips.push({ key: 'diskPct', label: `Disk: ${filters.diskPctMin ?? 0}% - ${filters.diskPctMax ?? 100}%` });
  }

  if (filters.occupancyPctMin !== undefined || filters.occupancyPctMax !== undefined) {
    activeChips.push({ key: 'occupancyPct', label: `Occ: ${filters.occupancyPctMin ?? 0}% - ${filters.occupancyPctMax ?? 100}%` });
  }

  if (filters.softwareSizeMBMin !== undefined || filters.softwareSizeMBMax !== undefined) {
    activeChips.push({ key: 'softwareSizeMB', label: `Size: ${filters.softwareSizeMBMin ?? 0} - ${filters.softwareSizeMBMax ?? 10000} MB` });
  }

  if (filters.durationMin !== undefined || filters.durationMax !== undefined) {
    activeChips.push({ key: 'duration', label: `Duration: ${filters.durationMin ?? 0} - ${filters.durationMax ?? 300} min` });
  }

  if (filters.systemStatus) {
    activeChips.push({ key: 'systemStatus', label: `Status: ${filters.systemStatus}` });
  }

  if (filters.os) {
    activeChips.push({ key: 'os', label: `OS: ${filters.os}` });
  }

  if (filters.softwareName) {
    activeChips.push({ key: 'softwareName', label: `Software: "${filters.softwareName}"` });
  }

  if (filters.severity) {
    activeChips.push({ key: 'severity', label: `Severity: ${filters.severity}` });
  }

  if (filters.actionType) {
    activeChips.push({ key: 'actionType', label: `Action: ${filters.actionType}` });
  }

  if (filters.processName) {
    activeChips.push({ key: 'processName', label: `Process: "${filters.processName}"` });
  }

  if (filters.faultStatus) {
    activeChips.push({ key: 'faultStatus', label: `Fault: ${filters.faultStatus}` });
  }

  if (filters.groupBy) {
    activeChips.push({ key: 'groupBy', label: `Group by: ${filters.groupBy}` });
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
      {/* Primary Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Selector */}
        {allowedFilters.includes('dateRange') && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-[#1d68ff] shrink-0" />
            <select
              value={currentPreset}
              onChange={e => {
                const val = e.target.value;
                if (val === 'custom') {
                  const today = new Date().toISOString().split('T')[0];
                  handleUpdate('dateRange', { preset: 'custom', startDate: today, endDate: today });
                } else {
                  handleUpdate('dateRange', { preset: val });
                }
              }}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              {datePresets.map(dp => (
                <option key={dp.id} value={dp.id}>
                  {dp.label}
                </option>
              ))}
            </select>

            {currentPreset === 'custom' && (
              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-2">
                <input
                  type="date"
                  value={filters.dateRange?.startDate || ''}
                  onChange={e =>
                    handleUpdate('dateRange', {
                      ...filters.dateRange,
                      preset: 'custom',
                      startDate: e.target.value
                    })
                  }
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px]"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={filters.dateRange?.endDate || ''}
                  onChange={e =>
                    handleUpdate('dateRange', {
                      ...filters.dateRange,
                      preset: 'custom',
                      endDate: e.target.value
                    })
                  }
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px]"
                />
              </div>
            )}
          </div>
        )}

        {/* Lab Filter */}
        {allowedFilters.includes('lab') && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={filters.labs && filters.labs.length > 0 ? filters.labs[0] : 'ALL'}
              onChange={e => {
                const val = e.target.value;
                handleUpdate('labs', val === 'ALL' ? [] : [val]);
              }}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Laboratories</option>
              {labsList.map(lab => (
                <option key={lab.id || lab._id} value={lab.id || lab._id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* System Filter */}
        {allowedFilters.includes('system') && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs">
            <Monitor className="w-4 h-4 text-purple-600 shrink-0" />
            <select
              value={filters.systems && filters.systems.length > 0 ? filters.systems[0] : 'ALL'}
              onChange={e => {
                const val = e.target.value;
                handleUpdate('systems', val === 'ALL' ? [] : [val]);
              }}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Systems</option>
              {systemsList.map(sys => (
                <option key={sys.node_id} value={sys.node_id}>
                  {sys.hostname || sys.node_id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Search */}
        {allowedFilters.includes('user') && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs">
            <User className="w-4 h-4 text-amber-500 shrink-0" />
            <input
              type="text"
              placeholder="Filter user / student..."
              value={filters.user || ''}
              onChange={e => handleUpdate('user', e.target.value)}
              className="bg-transparent font-medium text-slate-700 placeholder-slate-400 focus:outline-none w-36"
            />
          </div>
        )}

        {/* Group By Filter */}
        {allowedFilters.includes('groupBy') && report.groupByOptions && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="font-semibold text-slate-500">Group:</span>
            <select
              value={filters.groupBy || 'day'}
              onChange={e => handleUpdate('groupBy', e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer capitalize"
            >
              {report.groupByOptions.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
            showAdvanced
              ? 'bg-blue-50 border-[#1d68ff] text-[#1d68ff]'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          More Filters
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {/* Reset Button */}
        {activeChips.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
        )}
      </div>

      {/* Advanced Filter Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-xl">
          {/* Time of Day */}
          {allowedFilters.includes('timeOfDay') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-[#1d68ff]" /> Time Window (HH:MM)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={filters.timeOfDay?.from || ''}
                  onChange={e =>
                    handleUpdate('timeOfDay', { ...filters.timeOfDay, from: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="time"
                  value={filters.timeOfDay?.to || ''}
                  onChange={e =>
                    handleUpdate('timeOfDay', { ...filters.timeOfDay, to: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}

          {/* Day of Week */}
          {allowedFilters.includes('dayOfWeek') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Active Days of Week
              </label>
              <div className="flex gap-1">
                {[
                  { d: 1, label: 'M' },
                  { d: 2, label: 'T' },
                  { d: 3, label: 'W' },
                  { d: 4, label: 'T' },
                  { d: 5, label: 'F' },
                  { d: 6, label: 'S' },
                  { d: 0, label: 'S' }
                ].map(item => {
                  const isChecked = filters.daysOfWeek?.includes(item.d);
                  return (
                    <button
                      key={item.d}
                      type="button"
                      onClick={() => {
                        const cur: number[] = filters.daysOfWeek || [];
                        const next = isChecked ? cur.filter(x => x !== item.d) : [...cur, item.d];
                        handleUpdate('daysOfWeek', next.length > 0 ? next : undefined);
                      }}
                      className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all ${
                        isChecked
                          ? 'bg-[#1d68ff] text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CPU % Min / Max */}
          {allowedFilters.includes('cpuPct') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                CPU % (Min - Max)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={filters.cpuPctMin ?? ''}
                  onChange={e =>
                    handleUpdate('cpuPctMin', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={filters.cpuPctMax ?? ''}
                  onChange={e =>
                    handleUpdate('cpuPctMax', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}

          {/* RAM % Min / Max */}
          {allowedFilters.includes('ramPct') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                RAM % (Min - Max)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={filters.ramPctMin ?? ''}
                  onChange={e =>
                    handleUpdate('ramPctMin', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={filters.ramPctMax ?? ''}
                  onChange={e =>
                    handleUpdate('ramPctMax', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}

          {/* Occupancy % Min / Max */}
          {allowedFilters.includes('occupancyPct') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Occupancy % (Min - Max)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={filters.occupancyPctMin ?? ''}
                  onChange={e =>
                    handleUpdate('occupancyPctMin', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={filters.occupancyPctMax ?? ''}
                  onChange={e =>
                    handleUpdate('occupancyPctMax', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}

          {/* Software Size MB Min / Max */}
          {allowedFilters.includes('softwareSizeMB') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Package Size (MB)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min MB"
                  value={filters.softwareSizeMBMin ?? ''}
                  onChange={e =>
                    handleUpdate('softwareSizeMBMin', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max MB"
                  value={filters.softwareSizeMBMax ?? ''}
                  onChange={e =>
                    handleUpdate('softwareSizeMBMax', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}

          {/* Session Duration Min / Max */}
          {allowedFilters.includes('duration') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Duration (Minutes)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min min"
                  value={filters.durationMin ?? ''}
                  onChange={e =>
                    handleUpdate('durationMin', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max min"
                  value={filters.durationMax ?? ''}
                  onChange={e =>
                    handleUpdate('durationMax', e.target.value !== '' ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}

          {/* Severity Dropdown */}
          {allowedFilters.includes('severity') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Severity Level
              </label>
              <select
                value={filters.severity || ''}
                onChange={e => handleUpdate('severity', e.target.value || undefined)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
              >
                <option value="">All Severities</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          )}

          {/* Fault Status Dropdown */}
          {allowedFilters.includes('faultStatus') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Fault Status
              </label>
              <select
                value={filters.faultStatus || ''}
                onChange={e => handleUpdate('faultStatus', e.target.value || undefined)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}

          {/* Software Name Search */}
          {allowedFilters.includes('softwareName') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Software Name
              </label>
              <input
                type="text"
                placeholder="Search package name..."
                value={filters.softwareName || ''}
                onChange={e => handleUpdate('softwareName', e.target.value || undefined)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
              />
            </div>
          )}

          {/* Process Name Search */}
          {allowedFilters.includes('processName') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                Process Name
              </label>
              <input
                type="text"
                placeholder="Search process..."
                value={filters.processName || ''}
                onChange={e => handleUpdate('processName', e.target.value || undefined)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Active Filters:</span>
          {activeChips.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[#1d68ff] text-[11px] font-medium"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => handleRemoveChip(chip.key)}
                className="hover:text-red-500 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
