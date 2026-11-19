import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, Flame, Info, CheckCircle2, Filter, ShieldCheck } from 'lucide-react';
import { alertsApi } from '../services/api';
import { AlertItem } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

export const Alerts: React.FC = () => {
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAlerts(undefined, 100),
    refetchInterval: 5000
  });

  const alerts: AlertItem[] = data?.alerts || [];

  const filteredAlerts = alerts.filter(a => {
    if (levelFilter === 'ALL') return true;
    return a.level === levelFilter;
  });

  const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.level === 'WARNING').length;
  const infoCount = alerts.filter(a => a.level === 'INFO').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle="Real-time threshold violation logs, process deadlock alerts, and security warnings"
      />

      {/* Filter Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setLevelFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            levelFilter === 'ALL'
              ? 'bg-blue-50/70 border-blue-500 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">All Alarms</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{alerts.length}</p>
        </button>

        <button
          onClick={() => setLevelFilter('CRITICAL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            levelFilter === 'CRITICAL'
              ? 'bg-rose-50 border-rose-400 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-rose-600">Critical</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{criticalCount}</p>
        </button>

        <button
          onClick={() => setLevelFilter('WARNING')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            levelFilter === 'WARNING'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-amber-600">Warnings</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{warningCount}</p>
        </button>

        <button
          onClick={() => setLevelFilter('INFO')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            levelFilter === 'INFO'
              ? 'bg-blue-50 border-blue-400 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-blue-600">Informational</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{infoCount}</p>
        </button>
      </div>

      {/* Alerts List Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Active System Notifications</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredAlerts.length} events
          </span>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">All Systems Normal</p>
              <p className="text-xs text-slate-400 mt-1">
                No unresolved warnings or alarms matching the selected category.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert, idx) => {
              const isCrit = alert.level === 'CRITICAL';
              const isWarn = alert.level === 'WARNING';

              return (
                <div
                  key={`${alert.timestamp}-${idx}`}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isCrit
                          ? 'bg-rose-500 ring-4 ring-rose-100'
                          : isWarn
                          ? 'bg-amber-500 ring-4 ring-amber-100'
                          : 'bg-blue-500 ring-4 ring-blue-100'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{alert.message}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        Node: {alert.node_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isCrit
                          ? 'bg-rose-100 text-rose-700'
                          : isWarn
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {alert.level}
                    </span>
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                      {alert.time_str || 'recently'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
