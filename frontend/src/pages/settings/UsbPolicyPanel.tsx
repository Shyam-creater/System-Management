import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  Save,
  HelpCircle
} from 'lucide-react';
import { usbApi } from '../../services/api';
import { UsbPolicyItem } from '../../types';

const MODES = [
  {
    value: 'off',
    label: 'Off (Disabled)',
    help: 'USB events are logged only. No alert raised, and the student screen is not touched.'
  },
  {
    value: 'alert',
    label: 'Alert Only',
    help: 'Send a real-time Critical Alert to the lab portal immediately. Screen is untouched.'
  },
  {
    value: 'alert_lock',
    label: 'Alert + Blank Screen (Recommended)',
    help: 'Raise a Critical Alert AND blank that computer screen with an impassable lock overlay until unlocked by staff.'
  }
];

export const UsbPolicyPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const [serial, setSerial] = useState('');
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [customMsg, setCustomMsg] = useState('');

  const { data: policy, isLoading } = useQuery<UsbPolicyItem>({
    queryKey: ['usb-policy'],
    queryFn: usbApi.getPolicy
  });

  useEffect(() => {
    if (policy) {
      setCustomMsg(policy.message || '');
    }
  }, [policy]);

  const updatePolicyMutation = useMutation({
    mutationFn: (data: { mode?: string; message?: string }) => usbApi.updatePolicy(data),
    onSuccess: () => {
      setFeedback('USB Guard policy settings saved successfully.');
      setTimeout(() => setFeedback(null), 3500);
      queryClient.invalidateQueries({ queryKey: ['usb-policy'] });
    }
  });

  const addAllowlistMutation = useMutation({
    mutationFn: (data: { serial: string; owner?: string; note?: string }) =>
      usbApi.addAllowlist(data),
    onSuccess: () => {
      setSerial('');
      setOwner('');
      setNote('');
      setFeedback('Allowed device added to whitelist.');
      setTimeout(() => setFeedback(null), 3500);
      queryClient.invalidateQueries({ queryKey: ['usb-policy'] });
    }
  });

  const removeAllowlistMutation = useMutation({
    mutationFn: (serial: string) => usbApi.removeAllowlist(serial),
    onSuccess: () => {
      setFeedback('Allowed device removed from whitelist.');
      setTimeout(() => setFeedback(null), 3500);
      queryClient.invalidateQueries({ queryKey: ['usb-policy'] });
    }
  });

  if (isLoading) {
    return <div className="animate-pulse h-48 rounded-2xl bg-slate-100" />;
  }

  const currentMode = policy?.mode || 'alert_lock';
  const allowlist = policy?.allowlist || [];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Mode Selector */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>When a USB storage device / pendrive is inserted:</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the enforcement behavior applied by the agent on lab workstations when unauthorized storage is detected.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MODES.map((m) => {
            const isSelected = currentMode === m.value;
            return (
              <label
                key={m.value}
                onClick={() => updatePolicyMutation.mutate({ mode: m.value })}
                className={`flex flex-col justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${isSelected ? 'text-rose-900' : 'text-slate-900'}`}>
                      {m.label}
                    </span>
                    <input
                      type="radio"
                      name="usb-mode"
                      checked={isSelected}
                      onChange={() => updatePolicyMutation.mutate({ mode: m.value })}
                      className="text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{m.help}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Blocked Screen Message */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="usb-msg" className="text-xs font-bold text-slate-900 block">
              Message shown on the blocked computer screen
            </label>
            <p className="text-[11px] text-slate-500">
              This message is displayed in high-contrast bold text on the student's blanked monitor.
            </p>
          </div>
          <button
            onClick={() => updatePolicyMutation.mutate({ message: customMsg })}
            disabled={updatePolicyMutation.isPending || customMsg === policy?.message}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Message</span>
          </button>
        </div>

        <textarea
          id="usb-msg"
          rows={3}
          maxLength={300}
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          placeholder="Enter overlay notification message..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
        />
      </div>

      {/* Allowed Devices Whitelist */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized Hardware Devices (Staff & Faculty Pendrives)</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Whitelisted USB devices whose serial numbers match will never trigger screen locks or critical alarms.
          </p>
        </div>

        {/* Add Device Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
            placeholder="Volume / Hardware Serial (e.g. 5A92B1C4)"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
            placeholder="Staff Owner (e.g. Prof. Ramesh)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
            placeholder="Note / Description (e.g. Lab 1 Teaching Kit)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={() => serial.trim() && addAllowlistMutation.mutate({ serial: serial.trim(), owner, note })}
            disabled={!serial.trim() || addAllowlistMutation.isPending}
            className="flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Device</span>
          </button>
        </div>

        {/* Allowed Devices Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Device Serial Number</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-3">Note</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allowlist.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">
                    No authorized devices registered yet. All unauthorized storage insertions will trigger protection.
                  </td>
                </tr>
              ) : (
                allowlist.map((d: any) => (
                  <tr key={d.serial} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{d.serial}</td>
                    <td className="py-2.5 px-3 text-slate-600">{d.owner || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{d.note || '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => removeAllowlistMutation.mutate(d.serial)}
                        className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-800">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Staff Tip:</strong> To easily register a new staff pendrive, insert the device into any lab computer once. Then navigate to <strong>Reports &gt; USB Activity</strong>, locate the inserted event, and copy its exact serial number into the whitelist above.
          </span>
        </div>
      </div>
    </div>
  );
};
