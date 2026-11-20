import React, { useState } from 'react';
import {
  X,
  Server,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Lock,
  Network,
  Building2,
  Cpu,
  Layers,
  HardDrive,
  Plus
} from 'lucide-react';
import { sshApi, labsApi } from '../../services/api';

interface AddComputerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  labId?: string;
  labName?: string;
}

export const AddComputerModal: React.FC<AddComputerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  labId,
  labName
}) => {
  // Mode selection: 'direct' (Manual / Agent Direct Workstation) vs 'ssh' (SSH Agentless)
  const [mode, setMode] = useState<'direct' | 'ssh'>('direct');

  // Direct Workstation Fields
  const [directHostname, setDirectHostname] = useState('');
  const [directIp, setDirectIp] = useState('');
  const [directMac, setDirectMac] = useState('');
  const [directSeat, setDirectSeat] = useState<string>('');
  const [directSystemType, setDirectSystemType] = useState('Windows 11 Pro');
  const [directCpuModel, setDirectCpuModel] = useState('Intel Core i7-10700 @ 2.90GHz');
  const [directRamGb, setDirectRamGb] = useState<number>(16);
  const [directDiskGb, setDirectDiskGb] = useState<number>(512);
  const [directStatus, setDirectStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);

  // SSH Workstation Fields
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(22);
  const [hostname, setHostname] = useState('');
  const [username, setUsername] = useState('ubuntu');
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  const [password, setPassword] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [keyText, setKeyText] = useState('');

  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'progress'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directHostname.trim() && !directIp.trim()) {
      setAlert({ type: 'error', message: 'Hostname or IP Address is required.' });
      return;
    }

    setSubmitting(true);
    setAlert({ type: 'progress', message: `Registering system ${directHostname.trim() || directIp.trim()}...` });

    try {
      await labsApi.addNode({
        hostname: directHostname.trim() || directIp.trim(),
        ip: directIp.trim() || '127.0.0.1',
        mac: directMac.trim() || undefined,
        labId: labId || 'lab-cs-1',
        seat: directSeat.trim() ? parseInt(directSeat.trim(), 10) : undefined,
        system_type: directSystemType,
        cpu_model: directCpuModel,
        ram_total_gb: Number(directRamGb) || 16,
        disk_total_gb: Number(directDiskGb) || 512,
        status: directStatus
      });

      setAlert({
        type: 'success',
        message: labName
          ? `Workstation added and assigned to ${labName} successfully!`
          : `System added to fleet successfully!`
      });

      setTimeout(() => {
        setSubmitting(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Error registering workstation';
      setAlert({ type: 'error', message: errMsg });
      setSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!ip.trim()) {
      setAlert({ type: 'error', message: 'Please enter a valid Computer IP address.' });
      return;
    }
    if (!username.trim()) {
      setAlert({ type: 'error', message: 'Please enter an SSH username.' });
      return;
    }
    if (authType === 'password' && !password) {
      setAlert({ type: 'error', message: 'Please enter an SSH password.' });
      return;
    }

    setTesting(true);
    setAlert({ type: 'progress', message: `Testing SSH connection to ${ip}:${port} as '${username}'...` });

    try {
      const data = await sshApi.test({
        ip: ip.trim(),
        port: Number(port) || 22,
        username: username.trim(),
        auth_type: authType,
        password: password,
        key_path: keyPath.trim(),
        key_data: keyText.trim()
      });

      if (data.success) {
        setAlert({
          type: 'success',
          message: `Connection Verified! Host: ${data.info?.hostname || ip} | OS: ${data.info?.os || 'Ubuntu'} (${data.info?.arch || 'x86_64'})`
        });
      } else {
        setAlert({ type: 'error', message: data.error || 'SSH Connection Failed' });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Network error testing SSH';
      setAlert({ type: 'error', message: errMsg });
    } finally {
      setTesting(false);
    }
  };

  const handleSshConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim() || !username.trim()) {
      setAlert({ type: 'error', message: 'IP address and SSH username are required.' });
      return;
    }

    setSubmitting(true);
    setAlert({ type: 'progress', message: `Registering and connecting to ${ip}...` });

    try {
      const res = await sshApi.connect({
        ip: ip.trim(),
        port: Number(port) || 22,
        hostname: hostname.trim(),
        username: username.trim(),
        auth_type: authType,
        password: password,
        key_path: keyPath.trim(),
        key_data: keyText.trim()
      });

      const effectiveNodeId = res?.node_id || `${hostname.trim() || ip.trim()} (${ip.trim()})`;

      if (labId) {
        try {
          await labsApi.assignNodes([effectiveNodeId], labId);
        } catch (assignErr) {
          console.warn('Could not auto-assign node to lab:', assignErr);
        }
      }

      setAlert({
        type: 'success',
        message: labName
          ? `Workstation registered and assigned to ${labName}!`
          : `Computer registered successfully! Adding to fleet...`
      });
      setTimeout(() => {
        setSubmitting(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Error connecting node';
      setAlert({ type: 'error', message: errMsg });
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {labName ? `Add Workstation to ${labName}` : 'Register Workstation'}
              </h3>
              <p className="text-xs text-slate-500">
                {labName ? `Assign real machine or agent to ${labName}` : 'Direct system or SSH remote node monitoring'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 pb-1">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('direct');
                setAlert(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                mode === 'direct'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Direct / Agent Workstation</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('ssh');
                setAlert(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                mode === 'ssh'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>SSH Agentless Remote</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {alert && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                alert.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : alert.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {alert.type === 'progress' && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />}
              {alert.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {alert.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{alert.message}</span>
            </div>
          )}

          {mode === 'direct' ? (
            /* DIRECT WORKSTATION REGISTRATION FORM */
            <form onSubmit={handleDirectSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Hostname / Computer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="LAB-CS1-PC01"
                    value={directHostname}
                    onChange={(e) => setDirectHostname(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">IP Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="10.30.158.79"
                    value={directIp}
                    onChange={(e) => setDirectIp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">MAC Address (Optional)</label>
                  <input
                    type="text"
                    placeholder="50:EB:71:A2:4B:90"
                    value={directMac}
                    onChange={(e) => setDirectMac(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Seat Number (Optional)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 15"
                    value={directSeat}
                    onChange={(e) => setDirectSeat(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Operating System</label>
                  <select
                    value={directSystemType}
                    onChange={(e) => setDirectSystemType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Windows 11 Pro">Windows 11 Pro</option>
                    <option value="Windows 10 Pro">Windows 10 Pro</option>
                    <option value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS</option>
                    <option value="Ubuntu 24.04 LTS">Ubuntu 24.04 LTS</option>
                    <option value="Debian Linux">Debian Linux</option>
                    <option value="macOS Sequoia">macOS Sequoia</option>
                    <option value="Red Hat Enterprise Linux">Red Hat Enterprise Linux</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Initial Status</label>
                  <select
                    value={directStatus}
                    onChange={(e) => setDirectStatus(e.target.value as 'ONLINE' | 'OFFLINE')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="ONLINE">ONLINE (Active & Available)</option>
                    <option value="OFFLINE">OFFLINE (Powered Off / Standby)</option>
                  </select>
                </div>
              </div>

              {/* Collapsible Hardware Specs */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSpecs(!showAdvancedSpecs)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>{showAdvancedSpecs ? '▾ Hide Hardware Specifications' : '▸ Custom Hardware Specifications (CPU, RAM, Disk)'}</span>
                </button>

                {showAdvancedSpecs && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-slate-500" />
                        <span>CPU Model</span>
                      </label>
                      <input
                        type="text"
                        value={directCpuModel}
                        onChange={(e) => setDirectCpuModel(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>Total RAM (GB)</span>
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={512}
                          value={directRamGb}
                          onChange={(e) => setDirectRamGb(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                          <span>Total Disk (GB)</span>
                        </label>
                        <input
                          type="number"
                          min={32}
                          max={8192}
                          value={directDiskGb}
                          onChange={(e) => setDirectDiskGb(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Workstation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* SSH AGENTLESS FORM */
            <form onSubmit={handleSshConnect} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">IP Address / Hostname *</label>
                  <input
                    type="text"
                    required
                    placeholder="10.30.158.79"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">SSH Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="ubuntu"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="Lab Workstation"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Auth Type Tabs */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Authentication Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthType('password')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      authType === 'password'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Password Authentication
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthType('key')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      authType === 'key'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Private Key
                  </button>
                </div>
              </div>

              {authType === 'password' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Key File Path or PEM</label>
                  <input
                    type="text"
                    placeholder="~/.ssh/id_rsa or paste key"
                    value={keyPath}
                    onChange={(e) => setKeyPath(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || submitting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  {testing ? 'Verifying...' : 'Test Connection'}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                >
                  {submitting ? 'Connecting...' : 'Register Node'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
