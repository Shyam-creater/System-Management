import React, { useState } from 'react';
import {
  X,
  Server,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Lock,
  Network
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
                Connect and monitor remote Linux or Windows computers via SSH
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

          {/* SSH REGISTRATION FORM */}
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
        </div>
      </div>
    </div>
  );
};
