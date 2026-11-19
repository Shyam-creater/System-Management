import React from 'react';
import { Monitor, Server, Box } from 'lucide-react';

interface PlatformIconProps {
  platform?: string;
  hostname?: string;
  isSimulated?: boolean;
  className?: string;
  size?: number;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform = '',
  hostname = '',
  isSimulated = false,
  className = 'w-4 h-4',
  size = 16
}) => {
  const target = `${platform} ${hostname}`.toLowerCase();

  if (isSimulated || target.includes('sim')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-blue-500 shrink-0 ${className}`}
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    );
  }

  // Apple / macOS
  if (target.includes('darwin') || target.includes('mac') || target.includes('apple') || target.includes('osx')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 170 170"
        fill="currentColor"
        className={`text-slate-900 shrink-0 ${className}`}
      >
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.97-12.04-14.67-6.02-9.28-10.74-19.98-14.16-32.08-3.42-12.1-5.13-23.75-5.13-34.95 0-14.51 3.58-26.75 10.73-36.72 7.15-9.97 16.48-15.08 27.99-15.33 4.8.13 10.08 1.34 15.84 3.63 5.76 2.29 9.8 3.48 12.12 3.56 1.8.08 5.92-.99 12.37-3.22 6.45-2.22 12.08-3.23 16.89-3.01 12.87.69 23.3 5.38 31.3 14.07-11.23 6.83-16.7 16.29-16.42 28.38.28 9.53 4.02 17.58 11.22 24.15 7.2 6.57 15.7 10.22 25.5 10.95-2.02 6.13-4.51 12.35-7.46 18.66zm-31.5-104.9c0-6.73 2.45-13.06 7.35-18.99 4.9-5.93 11.02-9.9 18.36-11.91.22 1.34.33 2.58.33 3.73 0 6.64-2.58 13.06-7.74 19.26-5.16 6.2-11.39 10.02-18.69 11.46-.22-1.12-.33-2.31-.33-3.55z" />
      </svg>
    );
  }

  // Ubuntu / Linux
  if (target.includes('ubuntu')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
      >
        <circle cx="12" cy="12" r="10" fill="#E95420" />
        <circle cx="6.5" cy="12" r="1.5" fill="#ffffff" />
        <circle cx="15.5" cy="7" r="1.5" fill="#ffffff" />
        <circle cx="15.5" cy="17" r="1.5" fill="#ffffff" />
        <path
          d="M12 4.5a7.5 7.5 0 0 0-4.8 1.8M12 19.5a7.5 7.5 0 0 1-4.8-1.8M18 12a7.5 7.5 0 0 0-.6-3M18 12a7.5 7.5 0 0 1-.6 3"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Windows
  if (target.includes('win') || target.includes('windows')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 88 88"
        fill="#0078D4"
        className={`shrink-0 ${className}`}
      >
        <path d="M0 12.402l35.689-4.86v32.61H0V12.402zm0 35.834h35.689v32.61L0 75.986V48.236zm40.169-41.05L88 0v40.152H40.169V7.186zm47.831 41.05V88L40.169 80.814V48.236H88z" />
      </svg>
    );
  }

  // Linux / Debian / Generic Unix
  if (target.includes('linux') || target.includes('debian') || target.includes('centos') || target.includes('arch')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`text-slate-800 shrink-0 ${className}`}
      >
        <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.2.4 2.3 1.1 3.1-.7 1.2-1.1 2.6-1.1 4.1 0 1.9.7 3.6 1.8 4.9-.7.4-1.3 1-1.3 1.9 0 1.4 1.8 2.5 4 2.5s4-1.1 4-2.5c0-.9-.6-1.5-1.3-1.9 1.1-1.3 1.8-3 1.8-4.9 0-1.5-.4-2.9-1.1-4.1.7-.8 1.1-1.9 1.1-3.1C16.5 4 14.5 2 12 2z" />
      </svg>
    );
  }

  return <Monitor className={`text-slate-600 shrink-0 ${className}`} style={{ width: size, height: size }} />;
};
