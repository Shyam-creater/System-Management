import React, { useState } from 'react';
import { X, BookmarkPlus, Users } from 'lucide-react';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  isAdmin: boolean;
  onSave: (name: string, isShared: boolean) => Promise<void>;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  isAdmin,
  onSave
}) => {
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave(name.trim(), isShared);
      setName('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl border border-slate-200/80 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1d68ff] flex items-center justify-center">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Save View Preset</h3>
              <p className="text-[11px] text-slate-500">{reportTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Preset Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CS Lab 1 Morning Peak"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d68ff]/30 focus:border-[#1d68ff]"
            />
          </div>

          {isAdmin && (
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isShared}
                onChange={e => setIsShared(e.target.checked)}
                className="rounded text-[#1d68ff] focus:ring-blue-500 w-4 h-4"
              />
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Share this preset with all institutional users
              </div>
            </label>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-1.5 text-xs font-semibold bg-[#1d68ff] text-white rounded-xl hover:bg-blue-600 shadow-sm shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preset'}
          </button>
        </div>
      </form>
    </div>
  );
};
