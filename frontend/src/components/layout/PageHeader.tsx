import React, { useState, useEffect } from 'react';
import { Calendar, RotateCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ', ' + now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-start">
        <div className="w-1.5 h-8 bg-[#1d68ff] rounded-full mr-3.5 shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight leading-none">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {children}

        {/* Live Date / Time Pill matching reference image */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-xs font-medium text-slate-700 shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{currentTime || 'Loading date...'}</span>
        </div>

        {/* Refresh Button matching reference image */}
        <button
          onClick={handleRefresh}
          title="Refresh real-time data"
          className="p-2 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition shadow-sm active:scale-95"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>
    </div>
  );
};
