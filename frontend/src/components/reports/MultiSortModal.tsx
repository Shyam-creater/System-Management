import React, { useState } from 'react';
import { X, ArrowUpDown, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface MultiSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  sortableColumns: any[];
  currentSort: Array<{ key: string; dir: 'asc' | 'desc' }>;
  onApply: (sortLevels: Array<{ key: string; dir: 'asc' | 'desc' }>) => void;
}

export const MultiSortModal: React.FC<MultiSortModalProps> = ({
  isOpen,
  onClose,
  sortableColumns,
  currentSort,
  onApply
}) => {
  const [levels, setLevels] = useState<Array<{ key: string; dir: 'asc' | 'desc' }>>(
    currentSort && currentSort.length > 0
      ? currentSort
      : [{ key: sortableColumns[0]?.key || '', dir: 'desc' }]
  );

  if (!isOpen) return null;

  const handleAddLevel = () => {
    if (levels.length >= 3) return;
    const usedKeys = new Set(levels.map(l => l.key));
    const nextCol = sortableColumns.find(c => !usedKeys.has(c.key)) || sortableColumns[0];
    if (nextCol) {
      setLevels([...levels, { key: nextCol.key, dir: 'desc' }]);
    }
  };

  const handleRemoveLevel = (index: number) => {
    setLevels(levels.filter((_, idx) => idx !== index));
  };

  const handleUpdateLevel = (index: number, updates: Partial<{ key: string; dir: 'asc' | 'desc' }>) => {
    const next = [...levels];
    next[index] = { ...next[index], ...updates };
    setLevels(next);
  };

  const handleSave = () => {
    onApply(levels.filter(l => Boolean(l.key)));
    onClose();
  };

  const handleClear = () => {
    onApply([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1d68ff] flex items-center justify-center">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Multi-Level Sort</h3>
              <p className="text-[11px] text-slate-500">Configure up to 3 sorting priorities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {levels.map((lvl, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-2.5"
            >
              <span className="text-[11px] font-bold text-slate-400 w-12 shrink-0">
                {idx === 0 ? 'Sort by' : 'Then by'}
              </span>

              {/* Column Select */}
              <select
                value={lvl.key}
                onChange={e => handleUpdateLevel(idx, { key: e.target.value })}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1d68ff]"
              >
                {sortableColumns.map(c => (
                  <option key={c.key} value={c.key}>
                    {c.label} {c.unit ? `(${c.unit})` : ''}
                  </option>
                ))}
              </select>

              {/* Direction Toggle */}
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => handleUpdateLevel(idx, { dir: 'asc' })}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    lvl.dir === 'asc'
                      ? 'bg-[#1d68ff] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" />
                  Asc
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateLevel(idx, { dir: 'desc' })}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    lvl.dir === 'desc'
                      ? 'bg-[#1d68ff] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDown className="w-3 h-3" />
                  Desc
                </button>
              </div>

              {/* Delete Level */}
              {levels.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLevel(idx)}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {levels.length < 3 && (
            <button
              type="button"
              onClick={handleAddLevel}
              className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-[#1d68ff] hover:bg-blue-50/50 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Sort Level ({levels.length}/3)
            </button>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-slate-500 hover:text-red-500"
          >
            Clear Sorting
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold bg-[#1d68ff] text-white rounded-xl hover:bg-blue-600 shadow-sm shadow-blue-500/25 transition-all"
            >
              Apply Sort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
