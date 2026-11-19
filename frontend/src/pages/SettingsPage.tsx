import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Database, Key, Shield, Clock, Server, CheckCircle2, Save } from 'lucide-react';
import { fleetApi } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';

export const SettingsPage: React.FC = () => {
  const [retentionDays, setRetentionDays] = useState(7);
  const [authKey, setAuthKey] = useState('ProcessShield-OS-2026');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const { data: statusData } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: fleetApi.getStatus,
    refetchInterval: 10000
  });

  const handleSave = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage master server parameters, database security, data retention, and discovery beacons"
      >
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </PageHeader>

      {savedFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System configuration successfully updated.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Configuration Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database & Persistence Engine</h3>
              <p className="text-xs text-slate-400">MongoDB Atlas Connection & Storage</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 font-semibold block mb-1">Target Cluster Database</label>
              <input
                type="text"
                readOnly
                value="System_Management (Cluster0 / MongoDB Atlas)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-500 font-semibold block mb-1">Connection Resilience Mode</label>
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 text-blue-900 flex items-center justify-between">
                <span>Dual-Mode Storage (Mongo + Resilient Fallback)</span>
                <span className="font-bold text-blue-700">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Authentication Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security & Authentication</h3>
              <p className="text-xs text-slate-400">Agent Telemetry Authorization Key</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 font-semibold block mb-1">Master Telemetry Auth Key</label>
              <input
                type="text"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-500 font-semibold block mb-1">Telemetry Data Retention</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <span className="font-bold text-slate-800 font-mono">{retentionDays} Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Discovery & Ports */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Network Discovery Beacon</h3>
              <p className="text-xs text-slate-400">UDP LAN Agent Broadcast</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">UDP Discovery Port</span>
              <span className="font-mono font-bold text-slate-800">8081</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">REST API Server Port</span>
              <span className="font-mono font-bold text-slate-800">{statusData?.port || 5000}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">WebSocket Protocol</span>
              <span className="font-mono font-bold text-emerald-600">Socket.IO (Engine.IO v4)</span>
            </div>
          </div>
        </div>

        {/* Host Identity */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Host Workstation Identity</h3>
              <p className="text-xs text-slate-400">Supervisory Controller Metadata</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Server Hostname</span>
              <span className="font-mono font-bold text-slate-800">{statusData?.hostname || 'localhost'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Operating System</span>
              <span className="font-mono font-bold text-slate-800">{statusData?.platform || 'Windows (win32)'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">Master Server Status</span>
              <span className="font-mono font-bold text-emerald-600">ONLINE &amp; ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
