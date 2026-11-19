import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { AppRouter } from './router';
import { useSocket } from '../hooks/useSocket';

export const App: React.FC = () => {
  // Connect real-time socket
  useSocket();

  return (
    <div className="flex min-h-screen bg-[#f0f4f9] text-slate-800 antialiased selection:bg-[#1d68ff] selection:text-white">
      {/* Sidebar with the 3 menus from web/index.html */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative overflow-x-hidden">
        {/* Subtle ethereal fluid blue ambient wave in top-right corner */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-[550px] h-[350px] bg-gradient-to-bl from-blue-500/15 via-sky-300/10 to-transparent rounded-full blur-3xl z-0" />
        
        {/* Top Navbar Header */}
        <Navbar />

        {/* Page Content Viewport */}
        <main className="flex-1 p-5 sm:p-7 w-full max-w-[1600px] mx-auto relative z-10 animate-fadeIn">
          <AppRouter />
        </main>
      </div>
    </div>
  );
};

export default App;
