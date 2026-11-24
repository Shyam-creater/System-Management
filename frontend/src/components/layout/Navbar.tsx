import React, { useState } from 'react';
import { Search, Bell, User, ChevronDown, Database, LogOut, Building2, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fleetApi, alertsApi, labsApi } from '../../services/api';
import { useFleetStore } from '../../store/useFleetStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '../common/CommandPalette';
import { SideDrawer } from '../common/SideDrawer';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedLabId, setSelectedLabId } = useFleetStore();
  const { user, logout } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);

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

  const { data: labsData } = useQuery({
    queryKey: ['labs'],
    queryFn: labsApi.getLabs,
    refetchInterval: 15000
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.resolve(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  const labs = labsData?.labs || [];
  const alerts = alertsData?.alerts || [];
  const activeAlertsCount = alertsData?.total || 0;

  return (
    <>
      <header className="h-16 px-5 sm:px-7 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        {/* Global Search Bar Button (Opens Command Palette) */}
        <div className="relative flex-1 max-w-md">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-blue-400 hover:bg-white text-slate-400 hover:text-slate-600 transition-all shadow-xs text-xs group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              <span className="truncate">Search workstations, labs, users, reports...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Lab Context Switcher */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Campus Labs</option>
              {labs.map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Database Health Badge */}
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

          {/* Notification Bell (Opens Slide-over Drawer) */}
          <button
            onClick={() => setIsAlertsDrawerOpen(true)}
            title="Open Notifications"
            className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline-block capitalize">
                {user?.username || 'Admin'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-800 capitalize">{user?.username || 'Admin'}</p>
                  <p className="text-[11px] text-slate-400 font-medium capitalize">Role: {user?.role || 'Administrator'}</p>
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
                  Labs Seat Maps
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/activity'); }}
                  className="w-full text-left px-4 py-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  Activity Journal
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

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Notifications Side Drawer */}
      <SideDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        title="Active Incident Notifications"
        subtitle={`${activeAlertsCount} pending fleet alarms require attention`}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">Live Socket Updates</span>
            <button
              onClick={() => {
                setIsAlertsDrawerOpen(false);
                navigate('/alerts');
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All Alerts in Incident Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">All systems operating normally</p>
              <p className="text-[11px] mt-1">No threshold violations or active incidents detected.</p>
            </div>
          ) : (
            alerts.map((a: any, idx: number) => {
              const isCrit = a.level === 'CRITICAL';
              return (
                <div
                  key={a._id || idx}
                  className={`p-3.5 rounded-xl border transition ${
                    isCrit
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCrit ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {a.level || 'WARNING'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date((a.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => a._id && resolveMutation.mutate(a._id)}
                      title="Acknowledge Alert"
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs"
                    >
                      Acknowledge
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-2">{a.message}</p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono text-slate-600 font-semibold">{a.node_id}</span>
                    <button
                      onClick={() => {
                        setIsAlertsDrawerOpen(false);
                        navigate(`/workstations/${encodeURIComponent(a.node_id)}`);
                      }}
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <span>Diagnose</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SideDrawer>
    </>
  );
};
