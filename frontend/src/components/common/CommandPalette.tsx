import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Monitor, Building2, FileSpreadsheet, User, Zap, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, labsApi, reportsModuleApi } from '../../services/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    enabled: isOpen
  });

  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs,
    enabled: isOpen
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['reports_catalog'],
    queryFn: reportsModuleApi.getCatalog,
    enabled: isOpen
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rawNodes = fleetData?.nodes ? Object.values(fleetData.nodes) : [];
  const labs = labsData?.labs || [];

  const q = query.trim().toLowerCase();

  const matchingNodes = rawNodes.filter(n =>
    !q || n.hostname?.toLowerCase().includes(q) || n.ip?.toLowerCase().includes(q) || n.currentUser?.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchingLabs = labs.filter((l: any) =>
    !q || l.name?.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchingReports = (catalog as any[]).filter(r =>
    !q || r.title?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q)
  ).slice(0, 4);

  const quickActions = [
    { label: 'View Computer Labs Seat Map', path: '/labs', icon: Building2 },
    { label: 'View All Workstations Fleet', path: '/workstations', icon: Monitor },
    { label: 'Open Reports Center', path: '/reports', icon: FileSpreadsheet },
    { label: 'View Incident Alerts', path: '/alerts', icon: ShieldAlert },
    { label: 'Open Algorithm Lab (Banker & Deadlock)', path: '/algorithms', icon: Zap }
  ].filter(a => !q || a.label.toLowerCase().includes(q));

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 animate-fadeIn">
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" />

      <div className="relative mx-auto max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
        {/* Search Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workstations, labs, users, reports, actions... (Esc to exit)"
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          {/* Workstations Group */}
          {matchingNodes.length > 0 && (
            <div>
              <p className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                Workstations ({matchingNodes.length})
              </p>
              <div className="mt-1 space-y-1">
                {matchingNodes.map(node => (
                  <button
                    key={node.node_id}
                    onClick={() => handleSelect(`/workstations/${encodeURIComponent(node.node_id)}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-left transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center font-bold">
                        <Monitor className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 group-hover:text-blue-600">{node.hostname}</span>
                        <span className="text-[11px] text-slate-400 ml-2">{node.ip}</span>
                        {node.currentUser && node.currentUser !== 'No User' && (
                          <span className="ml-2 font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                            {node.currentUser}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Labs Group */}
          {matchingLabs.length > 0 && (
            <div>
              <p className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                Computer Labs
              </p>
              <div className="mt-1 space-y-1">
                {matchingLabs.map((lab: any) => (
                  <button
                    key={lab.id}
                    onClick={() => handleSelect(`/labs/${lab.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-left transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 group-hover:text-blue-600">{lab.name}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reports Group */}
          {matchingReports.length > 0 && (
            <div>
              <p className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                Reports Center
              </p>
              <div className="mt-1 space-y-1">
                {matchingReports.map((rep: any) => (
                  <button
                    key={rep.id}
                    onClick={() => handleSelect(`/reports/${rep.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-left transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 group-hover:text-blue-600">{rep.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2 uppercase">({rep.id})</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div>
              <p className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                Quick Navigation
              </p>
              <div className="mt-1 space-y-1">
                {quickActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(action.path)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-700"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{action.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Jump</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {matchingNodes.length === 0 && matchingLabs.length === 0 && matchingReports.length === 0 && quickActions.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              No matching workstations, labs, or reports found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with mouse or Tab</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
