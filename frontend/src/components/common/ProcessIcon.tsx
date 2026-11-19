import React from 'react';
import { Cog, Cpu, Terminal, Globe, Code, FileCode, Layers } from 'lucide-react';

interface ProcessIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const ProcessIcon: React.FC<ProcessIconProps> = ({
  name = '',
  className = 'w-4 h-4',
  size = 16
}) => {
  const lower = name.toLowerCase();

  // Visual Studio Code (exact cyan/blue folded ribbon from reference image)
  if (lower.includes('code') || lower.includes('vscode')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
        <path
          d="M17.5 2.5L7 11.5L3 8.5L1.5 9.5L5 12L1.5 14.5L3 15.5L7 12.5L17.5 21.5L22.5 19V5L17.5 2.5Z"
          fill="#007ACC"
        />
        <path
          d="M17.5 2.5L7 11.5L17.5 21.5V2.5Z"
          fill="#0066B8"
          fillOpacity="0.8"
        />
        <path
          d="M17.5 8L10 13.5L17.5 19V8Z"
          fill="#1F9CF0"
        />
      </svg>
    );
  }

  // Google Chrome (exact red/yellow/green wheel with blue center from reference image)
  if (lower.includes('chrome')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
        <circle cx="12" cy="12" r="10" fill="#EA4335" />
        <path d="M12 2A10 10 0 0 1 21.5 8.5L12 8.5A4.5 4.5 0 0 0 8 13.5L3.5 5.5A10 10 0 0 1 12 2Z" fill="#EA4335" />
        <path d="M21.5 8.5A10 10 0 0 1 16.5 21L12 13.5A4.5 4.5 0 0 0 16.5 12L21.5 8.5Z" fill="#FBBC05" />
        <path d="M16.5 21A10 10 0 0 1 3.5 5.5L8 13.5A4.5 4.5 0 0 0 12 16.5L16.5 21Z" fill="#34A853" />
        <circle cx="12" cy="12" r="4.2" fill="#ffffff" />
        <circle cx="12" cy="12" r="3.2" fill="#1A73E8" />
      </svg>
    );
  }

  // Node.js (exact emerald hexagon from reference image)
  if (lower.includes('node')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
        <path
          d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
          fill="#339933"
        />
        <path
          d="M12 4.5L18.5 8.25V15.75L12 19.5L5.5 15.75V8.25L12 4.5Z"
          fill="#539E43"
        />
        <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
      </svg>
    );
  }

  // Python (exact dual yellow & blue snake from reference image)
  if (lower.includes('python') || lower.includes('pytest')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
        <path
          d="M11.9 2C8.5 2 6.5 3.5 6.5 5.8V7.5H12V8.3H3.8C2 8.3 0.5 9.8 0.5 12.2C0.5 14.6 1.8 16.1 4 16.1H5.7V14C5.7 12.1 7.2 10.6 9.1 10.6H14.8C16.3 10.6 17.5 9.4 17.5 7.9V3.8C17.5 2.7 14.8 2 11.9 2ZM9.4 4.1C10 4.1 10.5 4.6 10.5 5.2C10.5 5.8 10 6.3 9.4 6.3C8.8 6.3 8.3 5.8 8.3 5.2C8.3 4.6 8.8 4.1 9.4 4.1Z"
          fill="#3776AB"
        />
        <path
          d="M12.1 22C15.5 22 17.5 20.5 17.5 18.2V16.5H12V15.7H20.2C22 15.7 23.5 14.2 23.5 11.8C23.5 9.4 22.2 7.9 20 7.9H18.3V10C18.3 11.9 16.8 13.4 14.9 13.4H9.2C7.7 13.4 6.5 14.6 6.5 16.1V20.2C6.5 21.3 9.2 22 12.1 22ZM14.6 19.9C14 19.9 13.5 19.4 13.5 18.8C13.5 18.2 14 17.7 14.6 17.7C15.2 17.7 15.7 18.2 15.7 18.8C15.7 19.4 15.2 19.9 14.6 19.9Z"
          fill="#FFD43E"
        />
      </svg>
    );
  }

  // Systemd / Kernel / Service / System processes (exact crisp gear from reference image)
  if (
    lower.includes('system') ||
    lower.includes('kernel') ||
    lower.includes('init') ||
    lower.includes('svchost') ||
    lower.includes('launchd')
  ) {
    return (
      <div className="w-5 h-5 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
        <Cog className="w-3.5 h-3.5" />
      </div>
    );
  }

  // Docker
  if (lower.includes('docker') || lower.includes('containerd')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#2496ED" className={`shrink-0 ${className}`}>
        <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185" />
        <path d="M23.79 12.183c-.426-.282-1.378-.387-2.1-.065-.213.095-.4.237-.557.416-.27-.08-.553-.133-.842-.16-.957-.088-1.92.204-2.585.807-.225-.03-.453-.048-.686-.048-2.617 0-4.99 1.488-6.095 3.754-.26-.035-.526-.054-.795-.054-2.91 0-5.467 1.636-6.685 4.09-.327.66-.46 1.4-.388 2.148.068.706.35 1.377.82 1.936C5.07 26.29 6.726 27 8.53 27c8.118 0 13.79-5.49 14.542-12.235.343-.07.72-.25 1.053-.538.324-.282.525-.662.56-1.077a.89.89 0 00-.895-.967z" />
      </svg>
    );
  }

  // Git / CLI / Terminal
  if (lower.includes('git') || lower.includes('bash') || lower.includes('zsh') || lower.includes('cmd') || lower.includes('powershell')) {
    return (
      <div className="w-5 h-5 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
        <Terminal className="w-3.5 h-3.5" />
      </div>
    );
  }

  // Database / MongoDB / MySQL / PostgreSQL / Redis
  if (lower.includes('mongo') || lower.includes('sql') || lower.includes('postgres') || lower.includes('redis') || lower.includes('db')) {
    return (
      <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <Layers className="w-3.5 h-3.5" />
      </div>
    );
  }

  // Default Process
  return (
    <div className="w-5 h-5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
      <Cpu className="w-3.5 h-3.5" />
    </div>
  );
};
