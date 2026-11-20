import React, { useState, useMemo } from 'react';
import {
  Search,
  Building,
  Monitor,
  Users,
  Award,
  ChevronRight,
  Layers
} from 'lucide-react';

interface ReportCatalogProps {
  catalog: any[];
  selectedReportId: string;
  onSelectReport: (id: string) => void;
}

export const ReportCatalog: React.FC<ReportCatalogProps> = ({
  catalog,
  selectedReportId,
  onSelectReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = useMemo(() => [
    { id: 'all', label: `All (${catalog.length})`, icon: Layers },
    { id: 'lab', label: `Labs (${catalog.filter(r => r.category === 'lab').length})`, icon: Building },
    { id: 'system', label: `Systems (${catalog.filter(r => r.category === 'system').length})`, icon: Monitor }
  ], [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter(report => {
      const matchSearch =
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = activeCategory === 'all' || report.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [catalog, searchTerm, activeCategory]);

  return (
    <div className="w-80 shrink-0 bg-white border border-slate-200/80 rounded-2xl flex flex-col shadow-sm overflow-hidden h-[calc(100vh-140px)] sticky top-24">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1d68ff] flex items-center justify-center font-bold text-xs">
              PS
            </div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Report Catalog</h3>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-full">
            {catalog.length} Reports
          </span>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d68ff]/30 focus:border-[#1d68ff] transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1d68ff] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
        {filteredCatalog.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No reports found matching your criteria.
          </div>
        ) : (
          filteredCatalog.map(report => {
            const isSelected = selectedReportId === report.id;
            return (
              <button
                key={report.id}
                onClick={() => onSelectReport(report.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group pt-3 ${
                  isSelected
                    ? 'bg-blue-50/80 border border-blue-200/80 shadow-sm'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#1d68ff] text-white shadow-sm shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-[#1d68ff]'
                  }`}
                >
                  {report.id}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold truncate block ${
                        isSelected ? 'text-[#1d68ff]' : 'text-slate-800'
                      }`}
                    >
                      {report.title}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-[#1d68ff] translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {report.description}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
