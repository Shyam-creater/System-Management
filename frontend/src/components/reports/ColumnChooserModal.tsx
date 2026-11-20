import React, { useState } from 'react';
import { X, CheckSquare, Square, RotateCcw } from 'lucide-react';

interface ColumnChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  allColumns: any[];
  visibleColumns: string[];
  onApply: (selectedCols: string[]) => void;
}

export const ColumnChooserModal: React.FC<ColumnChooserModalProps> = ({
  isOpen,
  onClose,
  allColumns,
  visibleColumns,
  onApply
}) => {
  const [selected, setSelected] = useState<string[]>(visibleColumns);

  if (!isOpen) return null;

  const handleToggle = (key: string) => {
    if (selected.includes(key)) {
      if (selected.length === 1) return; // Prevent deselecting all
      setSelected(selected.filter(k => k !== key));
    } else {
      setSelected([...selected, key]);
    }
  };

  const handleSelectAll = () => {
    setSelected(allColumns.map(c => c.key));
  };

  const handleReset = () => {
    setSelected(allColumns.filter(c => c.defaultVisible).map(c => c.key));
  };

  const handleSave = () => {
    onApply(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Choose Columns</h3>
            <p className="text-[11px] text-slate-500">Selected columns will be shown in table and exported</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
          {allColumns.map(col => {
            const isChecked = selected.includes(col.key);
            return (
              <label
                key={col.key}
                onClick={() => handleToggle(col.key)}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  isChecked
                    ? 'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-[#1d68ff]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300" />
                  )}
                  <span className="text-xs">{col.label}</span>
                </div>
                {col.unit && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                    {col.unit}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Default
            </button>
          </div>

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
              Apply ({selected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
