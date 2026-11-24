import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Bell,
  Building2,
  Monitor,
  FileSpreadsheet,
  Package,
  Zap,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, alertsApi } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface NavSection {
  title: string;
  items: Array<{
    name: string;
    path: string;
    icon: any;
    badge?: number | string;
    badgeColor?: string;
  }>;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

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
    total_nodes: 5,
    online_nodes: 5,
    sim_nodes: 0
  };

  const alertCount = alertsData?.total || 0;

  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        {
          name: 'Alerts',
          path: '/alerts',
          icon: Bell,
          badge: alertCount > 0 ? alertCount : undefined,
          badgeColor: 'bg-rose-500 text-white'
        }
      ]
    },
    {
      title: 'LABS & COMPUTERS',
      items: [
        { name: 'Labs Hub', path: '/labs', icon: Building2 },
        { name: 'All Computers', path: '/workstations', icon: Monitor }
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { name: 'Reports Center', path: '/reports', icon: FileSpreadsheet },
        { name: 'Software Inventory', path: '/software', icon: Package }
      ]
    },
    {
      title: 'TOOLS & CONFIG',
      items: [
        { name: 'Algorithm Lab', path: '/algorithms', icon: Zap },
        { name: 'Activity Log', path: '/activity', icon: Clock },
        { name: 'Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-18' : 'w-64'
      } bg-white border-r border-slate-200/80 h-screen sticky top-0 flex flex-col justify-between shrink-0 z-30 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)] transition-all duration-200`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#1d68ff] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <Shield className="w-5 h-5 fill-white/20 stroke-[2.2]" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="text-[16px] font-black text-slate-900 tracking-tight leading-tight block">
                  ProcessShield
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight block truncate">
                  Lab Fleet Guardian v3.0
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition hidden sm:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin">
          {sections.map((sec, secIdx) => (
            <div key={secIdx}>
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {sec.title}
                </p>
              )}
              <div className="space-y-1">
                {sec.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#1d68ff] text-white shadow-sm font-bold'
                            : 'text-slate-600 hover:text-[#1d68ff] hover:bg-blue-50/70'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100/70 group-hover:text-blue-600'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            {!collapsed && <span className="truncate">{item.name}</span>}
                          </div>
                          {!collapsed && item.badge && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                item.badgeColor || 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer User & Fleet Indicator */}
      <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
        <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate capitalize">
                  {user?.username || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate capitalize">
                  {user?.role || 'Administrator'}
                </p>
              </div>
            )}
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

        {!collapsed && (
          <div className="px-2 py-0.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fleet Online</span>
            </div>
            <span className="font-semibold text-slate-700">
              {summary.online_nodes} / {summary.total_nodes}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
