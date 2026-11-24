import React from 'react';
import { Lock } from 'lucide-react';

export const UsbSeatBadge: React.FC<{ locked?: boolean; className?: string }> = ({ locked, className = '' }) => {
  if (!locked) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 shadow-2xs animate-pulse ${className}`}
      title="Screen blocked because a USB storage device was inserted"
    >
      <Lock className="w-2.5 h-2.5" aria-hidden />
      <span>USB Locked</span>
    </span>
  );
};
