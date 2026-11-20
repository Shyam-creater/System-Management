import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  BarChart3,
  LogOut
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, alertsApi } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

const navItems: Array<{ name: string; path: string; icon: any }> = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Computer Labs', path: '/labs', icon: Building2 },
  { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  { name: 'Daily Reports', path: '/daily-reports', icon: BarChart3 }
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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

        {/* Navigation Items list matching reference image */}
        <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    isActive
                      ? 'bg-[#1d68ff] text-white shadow-md shadow-blue-600/25 font-bold'
                      : 'text-slate-600 hover:text-[#1d68ff] hover:bg-blue-50/70 font-semibold'
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100/70 group-hover:text-blue-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.name}</span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Card & Status */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate capitalize">{user?.username || 'Admin'}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">System Administrator</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="px-2 py-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fleet Online</span>
          </div>
          <span>{summary.online_nodes} Workstation{summary.online_nodes === 1 ? '' : 's'}</span>
        </div>
      </div>
    </aside>
  );
};
