import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { usbApi } from '../../services/api';

export const UnlockButton: React.FC<{
  nodeId: string;
  onDone?: () => void;
  className?: string;
  variant?: 'button' | 'badge-inline';
}> = ({ nodeId, onDone, className = '', variant = 'button' }) => {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function unlock() {
    setBusy(true);
    try {
      await usbApi.unlockWorkstation(nodeId);
      onDone?.();
    } catch (err) {
      console.error('Failed to unlock workstation:', err);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  if (!confirm) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirm(true);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition active:scale-95 ${className}`}
        title="Unlock this workstation and restore student screen"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Unlock Screen</span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2 p-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs animate-fadeIn ${className}`}
    >
      <span className="text-[11px] font-bold text-rose-800">
        Unlock {nodeId}? (Check device is removed)
      </span>
      <button
        className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition"
        onClick={() => setConfirm(false)}
        disabled={busy}
      >
        Cancel
      </button>
      <button
        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs transition active:scale-95"
        onClick={unlock}
        disabled={busy}
      >
        {busy ? 'Unlocking...' : 'Confirm Unlock'}
      </button>
    </div>
  );
};
