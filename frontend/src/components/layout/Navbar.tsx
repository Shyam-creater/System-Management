import React, { useState } from 'react';
import { Search, Bell, User, ChevronDown, Database, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, alertsApi } from '../../services/api';
import { useFleetStore } from '../../store/useFleetStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { searchFilter, setSearchFilter } = useFleetStore();
  const { user, logout } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { data: statusData } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: fleetApi.getStatus,
    refetchInterval: 10000
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAlerts(undefined, 10),
    refetchInterval: 5000
  });

  const activeAlertsCount = alertsData?.total || 0;

  return (
    <>
      <header className="h-16 px-6 sm:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        {/* Search Bar matching reference image */}
        <div className="relative flex-1 max-w-md">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search processes, devices, alerts..."
              className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none font-normal"
            />
            <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-semibold text-slate-400 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right Controls matching reference image */}
        <div className="flex items-center gap-3">
          {/* Database Status indicator */}
          <div
            title={`Database: ${statusData?.database?.connected ? 'MongoDB Atlas Connected' : 'Resilient Dual-Mode (In-Memory + Auto-Retry)'}`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] font-medium text-slate-600"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Atlas:</span>
            <span className={`inline-flex items-center gap-1 font-semibold ${statusData?.database?.connected ? 'text-emerald-600' : 'text-blue-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusData?.database?.connected ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
              {statusData?.database?.connected ? 'Online' : 'Active'}
            </span>
          </div>

          {/* Notification Bell matching reference image */}
          <button
            onClick={() => navigate('/alerts')}
            title="View Alerts"
            className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* User Profile dropdown matching reference image */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline-block capitalize">{user?.username || 'Admin'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-800 capitalize">{user?.username || 'Admin'}</p>
                  <p className="text-[11px] text-slate-400 font-medium">Role: {user?.role || 'System Admin'}</p>
                </div>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}
                  className="w-full text-left px-4 py-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  System Settings
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/labs'); }}
                  className="w-full text-left px-4 py-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  Computer Labs Hub
                </button>
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await logout();
                      navigate('/login');
                    }}
                    className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
