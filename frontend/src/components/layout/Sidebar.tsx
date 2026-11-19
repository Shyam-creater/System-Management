import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  Monitor,
  Building
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, alertsApi } from '../../services/api';

const navItems: Array<{ name: string; path: string; icon: any; emoji: string; badge?: boolean }> = [
  { name: 'Fleet Overview', path: '/', icon: Monitor, emoji: '🖥️' },
  { name: 'Computer Labs', path: '/labs', icon: Building, emoji: '🏛️' },
];

export const Sidebar: React.FC = () => {
  const { data: fleetData } = useQuery({
    queryKey: ['nodes'],
    queryFn: fleetApi.getNodes,
    refetchInterval: 5000
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAlerts(undefined, 100),
    refetchInterval: 5000
  });

  const summary = fleetData?.summary || {
    total_nodes: 2,
    online_nodes: 2,
    sim_nodes: 0
  };

  const alertCount = alertsData?.total || 0;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/70 h-screen sticky top-0 flex flex-col justify-between shrink-0 z-30 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
      {/* Brand Header matching reference image */}
      <div>
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1d68ff] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
            <Shield className="w-5 h-5 fill-white/20 stroke-[2.2]" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[17px] font-black text-slate-900 tracking-tight leading-tight block">
              ProcessShield
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight block truncate">
              Intelligent Process Resource Guardian
            </span>
          </div>
        </div>

        {/* Navigation Items list: The 3 before menus matching web/index.html */}
        <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                    isActive
                      ? 'bg-[#1d68ff] text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-600 hover:text-[#1d68ff] hover:bg-blue-50/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none">{item.emoji}</span>
                    <span className="truncate">{item.name}</span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Card matching reference image */}
      <div className="p-3 border-t border-slate-100">
        <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-slate-800">System Online</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 pl-4.5 font-medium">
            {summary.online_nodes} Devices • {summary.sim_nodes} Simulator
          </p>
        </div>
      </div>
    </aside>
  );
};
