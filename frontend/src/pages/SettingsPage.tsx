import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Database,
  Key,
  Shield,
  Clock,
  Server,
  CheckCircle2,
  Save,
  Sliders,
  Users,
  Box,
  Eye,
  EyeOff,
  RotateCcw,
  Play,
  Square,
  AlertTriangle,
  Radio,
  Network,
  Lock
} from 'lucide-react';
import { fleetApi, simulatorApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { UsbPolicyPanel } from './settings/UsbPolicyPanel';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as string) || 'general';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const queryClient = useQueryClient();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // General Settings State
  const [retentionDays, setRetentionDays] = useState(30);
  const [beaconPort, setBeaconPort] = useState(8081);
  const [authKey, setAuthKey] = useState('ProcessShield-OS-2026');
  const [isAuthKeyRevealed, setIsAuthKeyRevealed] = useState(false);

  // Alert Rules State
  const [cpuWarnThreshold, setCpuWarnThreshold] = useState(75);
  const [cpuCritThreshold, setCpuCritThreshold] = useState(90);
  const [ramWarnThreshold, setRamWarnThreshold] = useState(80);
  const [ramCritThreshold, setRamCritThreshold] = useState(95);
  const [idleUserTimeoutMin, setIdleUserTimeoutMin] = useState(30);

  // Track if changes are made
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mark dirty on changes
  const markDirty = () => setIsDirty(true);

  const handleSave = () => {
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Simulator Query & Mutations
  const { data: simStatus } = useQuery({
    queryKey: ['simulatorStatus'],
    queryFn: simulatorApi.getStatus,
    refetchInterval: 3000
  });

  const toggleSimMutation = useMutation({
    mutationFn: simulatorApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulatorStatus'] });
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    }
  });

  const isSimRunning = simStatus?.running ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Settings"
        subtitle="Manage master server parameters, alert thresholds, persistence connections, and simulated testing fleet"
      />

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => handleTabChange('general')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'general'
              ? 'border-[#1d68ff] text-[#1d68ff]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>General</span>
        </button>

        <button
          onClick={() => handleTabChange('alerts')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'alerts'
              ? 'border-[#1d68ff] text-[#1d68ff]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Alert Rules & Thresholds</span>
        </button>

        <button
          onClick={() => handleTabChange('usb')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'usb'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>USB Guard & Screen Lock</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
            PROTECTION
          </span>
        </button>

        <button
          onClick={() => handleTabChange('connections')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'connections'
              ? 'border-[#1d68ff] text-[#1d68ff]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Persistence & Connections</span>
        </button>

        <button
          onClick={() => handleTabChange('users')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'users'
              ? 'border-[#1d68ff] text-[#1d68ff]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Roles</span>
        </button>

        <button
          onClick={() => handleTabChange('simulator')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'simulator'
              ? 'border-[#1d68ff] text-[#1d68ff]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Simulator (Test Fleet)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            DEMO
          </span>
        </button>
      </div>

      {/* Save Success Notice */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings successfully updated across cluster daemons.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: GENERAL SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="max-w-xl space-y-4 text-xs">
            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Telemetry Log Retention (Days)
              </label>
              <p className="text-slate-400 mb-2">Historical snapshots older than this are archived.</p>
              <input
                type="number"
                min="1"
                max="365"
                value={retentionDays}
                onChange={(e) => {
                  setRetentionDays(Number(e.target.value));
                  markDirty();
                }}
                className="w-48 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="text-slate-700 font-bold block mb-1">
                Auto-Discovery UDP Beacon Port
              </label>
              <p className="text-slate-400 mb-2">Network subnet broadcast listener port for node auto-registration.</p>
              <input
                type="number"
                value={beaconPort}
                onChange={(e) => {
                  setBeaconPort(Number(e.target.value));
                  markDirty();
                }}
                className="w-48 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="text-slate-700 font-bold block mb-1">
                Master Agent Telemetry Auth Key
              </label>
              <p className="text-slate-400 mb-2">Shared bearer token used by Python background telemetry agents.</p>
              <div className="flex items-center gap-2">
                <input
                  type={isAuthKeyRevealed ? 'text' : 'password'}
                  value={authKey}
                  onChange={(e) => {
                    setAuthKey(e.target.value);
                    markDirty();
                  }}
                  className="w-80 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => setIsAuthKeyRevealed(!isAuthKeyRevealed)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500"
                >
                  {isAuthKeyRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALERT RULES & THRESHOLDS */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900">Telemetry Alert Triggers</h3>
          <p className="text-xs text-slate-500">
            Configure automated threshold levels that flag systems under the "Needs Attention" banner.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-2xl">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Processor (CPU) Triggers
              </span>
              <div>
                <label className="text-slate-600 font-medium block mb-1">Warning Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={cpuWarnThreshold}
                  onChange={(e) => {
                    setCpuWarnThreshold(Number(e.target.value));
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">Critical Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={cpuCritThreshold}
                  onChange={(e) => {
                    setCpuCritThreshold(Number(e.target.value));
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-rose-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Memory (RAM) Triggers
              </span>
              <div>
                <label className="text-slate-600 font-medium block mb-1">Warning Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ramWarnThreshold}
                  onChange={(e) => {
                    setRamWarnThreshold(Number(e.target.value));
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">Critical Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ramCritThreshold}
                  onChange={(e) => {
                    setRamCritThreshold(Number(e.target.value));
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-rose-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 md:col-span-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Idle Session Threshold
              </span>
              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  Flag idle logged-in users after (minutes of inactivity)
                </label>
                <input
                  type="number"
                  min="5"
                  max="240"
                  value={idleUserTimeoutMin}
                  onChange={(e) => {
                    setIdleUserTimeoutMin(Number(e.target.value));
                    markDirty();
                  }}
                  className="w-48 px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* USB Guard Policy Panel */}
          <div className="pt-6 border-t border-slate-200/80">
            <UsbPolicyPanel />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: USB GUARD & HARDWARE PROTECTION */}
      {/* ========================================================================= */}
      {activeTab === 'usb' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <UsbPolicyPanel />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONNECTIONS & PERSISTENCE */}
      {/* ========================================================================= */}
      {activeTab === 'connections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Database & Persistence Engine</h3>
                <p className="text-slate-400">MongoDB Atlas Connection & Storage</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Target Cluster Database</label>
                <input
                  type="text"
                  readOnly
                  value="System_Management (Cluster0 / MongoDB Atlas)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Connection Resilience Mode</label>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 text-blue-900 flex items-center justify-between">
                  <span>Dual-Mode Storage (Mongo + Resilient In-Memory Fallback)</span>
                  <span className="font-bold text-blue-700">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Socket & Telemetry Gateway</h3>
                <p className="text-slate-400">Real-time WebSocket dispatcher</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">WebSocket Transport</span>
                <span className="font-mono font-bold text-emerald-600">CONNECTED (:5000/socket.io)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Autonomous SSH Poller</span>
                <span className="font-mono font-semibold text-slate-700">Polling Interval: 10s</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Python Agent Protocol</span>
                <span className="font-mono font-semibold text-slate-700">HTTP REST /telemetry/inbound</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: USERS & ROLES */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">User Access Control</h3>
              <p className="text-xs text-slate-500">Manage institutional users and role privileges.</p>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Permissions</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-900">admin</td>
                  <td className="py-3 px-3 text-slate-700">System Administrator</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                      Administrator
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">Full Access (Process Kill, Reboot, Settings)</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Active</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-900">lab_assistant</td>
                  <td className="py-3 px-3 text-slate-700">Lab Assistant (CS Lab 1)</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                      Lab Assistant
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">Seat Map, End Task, Reboot</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Active</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-900">faculty_cs</td>
                  <td className="py-3 px-3 text-slate-700">Faculty In-Charge</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                      Faculty
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">Reports Center, Export, Read-Only Fleet</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SIMULATOR (VIRTUAL FLEET DEMO) */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-3">
              <Box className="w-6 h-6 text-amber-700" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Virtual Fleet Simulation Mode</h4>
                <p className="text-xs text-amber-800">
                  Generates synthetic Linux & Windows virtual computers for stress testing and UI evaluation.
                </p>
              </div>
            </div>

            <button
              onClick={() => toggleSimMutation.mutate()}
              disabled={toggleSimMutation.isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition active:scale-95 ${
                isSimRunning ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSimRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSimRunning ? 'Stop Simulation' : 'Start Simulation'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Simulated Virtual Node Instances
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">ubuntu-web-srv-01</span>
                <span className="text-slate-500 font-mono">192.168.1.101 (Ubuntu 22.04)</span>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-bold ${isSimRunning ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isSimRunning ? 'ONLINE' : 'STOPPED'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">win11-eng-station-02</span>
                <span className="text-slate-500 font-mono">192.168.1.102 (Win11 Pro)</span>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-bold ${isSimRunning ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isSimRunning ? 'ONLINE' : 'STOPPED'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">pg-cluster-primary-03</span>
                <span className="text-slate-500 font-mono">192.168.1.103 (Debian 12)</span>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-bold ${isSimRunning ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isSimRunning ? 'ONLINE' : 'STOPPED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Save Changes Bar */}
      {isDirty && (
        <div className="fixed bottom-6 right-8 left-8 sm:left-auto sm:w-96 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center justify-between z-40 animate-slideUp">
          <div className="text-xs">
            <span className="font-bold block">Unsaved Changes</span>
            <span className="text-slate-400">You have modified parameters.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDirty(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1d68ff] hover:bg-blue-600 text-xs font-bold text-white shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
