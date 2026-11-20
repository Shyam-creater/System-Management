import { create } from 'zustand';
import { authApi } from '../services/api';

export interface AuthUser {
  username: string;
  role: 'admin' | 'incharge' | 'viewer';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

const currentSessionToken = sessionStorage.getItem('processshield_session_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: currentSessionToken,
  // Start unauthenticated so newly opened sessions always land on /login first
  isAuthenticated: Boolean(currentSessionToken),
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(username.trim(), password);
      if (res.token) {
        set({
          token: res.token,
          user: res.user || { username: username.trim(), role: 'admin' },
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        return true;
      }
      set({ isLoading: false, error: 'Login failed: Authentication token not received' });
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Invalid username or password';
      set({ isLoading: false, error: msg, isAuthenticated: false, user: null, token: null });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    sessionStorage.clear();
    localStorage.removeItem('processshield_session_token');
    localStorage.removeItem('processshield_admin_token');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  checkAuth: async () => {
    const token = sessionStorage.getItem('processshield_session_token');
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null, isLoading: false });
      return false;
    }

    try {
      const res = await authApi.getMe();
      if (res.authenticated && res.user) {
        set({
          user: res.user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      } else {
        sessionStorage.clear();
        localStorage.removeItem('processshield_session_token');
        localStorage.removeItem('processshield_admin_token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return false;
      }
    } catch {
      sessionStorage.clear();
      localStorage.removeItem('processshield_session_token');
      localStorage.removeItem('processshield_admin_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null })
}));
