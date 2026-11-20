import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f0f4f9]">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/25 animate-pulse">
            <Shield className="w-8 h-8 fill-white/20 stroke-[2.2]" />
          </div>
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">Verifying Session Security</p>
          <p className="text-xs text-slate-400 mt-0.5">ProcessShield Enterprise Gateway</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
