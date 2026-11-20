import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // If already authenticated, redirect to previous location or dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!username.trim() || !password) {
      return;
    }

    const success = await login(username.trim(), password);
    if (success) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    clearError();
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Ambient Glow Elements */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 via-sky-300/10 to-transparent rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-gradient-to-tl from-blue-600/15 via-indigo-400/10 to-transparent rounded-full blur-3xl" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1d68ff] text-white shadow-xl shadow-blue-500/30 mb-3 ring-4 ring-blue-500/10">
            <Shield className="w-7 h-7 fill-white/20 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ProcessShield</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Operating Systems Resource Guardian & Fleet Manager
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-[0_12px_40px_rgba(29,104,255,0.08)] p-7 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-900">Sign In to Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your administrator credentials to manage your workstation fleet.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Authentication Failed:</span> {error}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) clearError();
                  }}
                  required
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) clearError();
                  }}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Demo Fill */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-medium">Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Fill Demo</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Banner */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Default Admin Credentials</p>
                  <p className="text-xs font-mono font-bold text-slate-800">admin <span className="text-slate-400">/</span> admin123</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 text-center flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>ProcessShield v2.0 • Secured with JWT & HTTP-Only Authentication</span>
        </div>
      </div>
    </div>
  );
};
