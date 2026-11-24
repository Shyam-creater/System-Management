import axios from 'axios';
import {
  FleetSummary,
  NodeInfo,
  AlertItem,
  SoftwareItem,
  DailyReportItem,
  DeadlockSimulationResponse,
  BankersAlgorithmResponse
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token =
    sessionStorage.getItem('processshield_session_token') ||
    localStorage.getItem('processshield_session_token') ||
    localStorage.getItem('processshield_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fleetApi = {
  getStatus: () => api.get('/status').then(res => res.data),
  getNodes: (): Promise<{ nodes: Record<string, NodeInfo>; summary: FleetSummary }> =>
    api.get('/nodes').then(res => res.data),
  purgeOffline: () => api.post('/nodes/purge_offline').then(res => res.data),
  deleteNode: (nodeId: string) =>
    api.delete(`/nodes/${encodeURIComponent(nodeId)}`).then(res => res.data),
  addNode: (data: any) =>
    api.post('/nodes/add', data).then(res => res.data),
  getHistory: (nodeId: string, hours = 24) =>
    api.get(`/history?node_id=${encodeURIComponent(nodeId)}&hours=${hours}`).then(res => res.data)
};

export const simulatorApi = {
  toggle: () => api.post('/simulator/toggle').then(res => res.data),
  getStatus: () => api.get('/simulator/status').then(res => res.data)
};

export const alertsApi = {
  getAlerts: (nodeId?: string, limit = 100): Promise<{ alerts: AlertItem[]; total: number }> => {
    const qs = new URLSearchParams();
    if (nodeId) qs.append('node_id', nodeId);
    if (limit) qs.append('limit', limit.toString());
    const str = qs.toString();
    return api.get(`/alerts${str ? `?${str}` : ''}`).then(res => res.data);
  },
  resolve: (alertId: string) => api.post(`/alerts/${alertId}/resolve`).then(res => res.data)
};

export const controllerApi = {
  killProcess: (nodeId: string, pid: number, signal?: string) =>
    api.post('/controller/kill', { node_id: nodeId, pid, signal }).then(res => res.data),
  rebootNode: (nodeId: string) =>
    api.post('/controller/reboot', { node_id: nodeId }).then(res => res.data),
  lockNode: (nodeId: string) =>
    api.post('/controller/lock', { node_id: nodeId }).then(res => res.data)
};

export const reportsApi = {
  getReports: (): Promise<{ reports: DailyReportItem[] }> => api.get('/reports').then(res => res.data),
  generate: () => api.post('/reports/generate').then(res => res.data)
};

export const softwareApi = {
  getSoftware: (nodeId?: string, refresh = false): Promise<{ packages: SoftwareItem[]; total: number }> => {
    const params = new URLSearchParams();
    if (nodeId) params.append('node_id', nodeId);
    if (refresh) params.append('refresh', '1');
    const qs = params.toString();
    return api.get(`/software${qs ? `?${qs}` : ''}`).then(res => res.data);
  },
  rescan: (nodeId?: string) => api.post('/software/rescan', { node_id: nodeId }).then(res => res.data)
};

export const algorithmApi = {
  runDeadlock: (scenario = 'classic_2p'): Promise<DeadlockSimulationResponse> =>
    api.post('/algorithms/deadlock', { scenario }).then(res => res.data),
  runBankers: (scenario = 'safe'): Promise<BankersAlgorithmResponse> =>
    api.post('/algorithms/bankers', { scenario }).then(res => res.data),
  requestResources: (payload: {
    processId: number;
    request: number[];
    allocation: number[][];
    max: number[][];
    available: number[];
  }) => api.post('/algorithms/bankers/request', payload).then(res => res.data)
};

export const sshApi = {
  test: (params: any) => api.post('/ssh/test', params).then(res => res.data),
  connect: (params: any) => api.post('/ssh/connect', params).then(res => res.data),
  getNodes: () => api.get('/ssh/nodes').then(res => res.data),
  remove: (nodeId: string) => api.post('/ssh/remove', { node_id: nodeId }).then(res => res.data),
  poll: (nodeId: string) => api.post('/ssh/poll', { node_id: nodeId }).then(res => res.data)
};

export const labsApi = {
  getLabs: (): Promise<{ labs: any[]; unassigned: number }> =>
    api.get('/labs').then(res => res.data),
  getLab: (id: string): Promise<{ lab: any }> =>
    api.get(`/labs/${id}`).then(res => res.data),
  createLab: (data: { name: string; description?: string; capacity?: number; prefix?: string; roomNumber?: string }) =>
    api.post('/labs', data).then(res => res.data),
  updateLab: (id: string, data: any) =>
    api.put(`/labs/${id}`, data).then(res => res.data),
  deleteLab: (id: string) =>
    api.delete(`/labs/${id}`).then(res => res.data),
  getLabOverview: (id: string) =>
    api.get(`/labs/${id}/overview`).then(res => res.data),
  getLabUsage: (id: string, days = 7) =>
    api.get(`/labs/${id}/usage?days=${days}`).then(res => res.data),
  assignByPrefix: (id: string, prefix: string) =>
    api.post(`/labs/${id}/assign-by-prefix`, { prefix }).then(res => res.data),
  claimAll: (id: string) =>
    api.post(`/labs/${id}/claim-all`).then(res => res.data),
  getUnassignedNodes: () =>
    api.get('/labs/unassigned/nodes').then(res => res.data),
  assignNodes: (nodeIds: string[], labId: string | null) =>
    api.put('/nodes/assign', { nodeIds, labId }).then(res => res.data),
  setSeat: (nodeId: string, seat: number | null) =>
    api.put(`/nodes/${encodeURIComponent(nodeId)}/seat`, { seat }).then(res => res.data),
  deleteNode: (nodeId: string) =>
    api.delete(`/nodes/${encodeURIComponent(nodeId)}`).then(res => res.data),
  addNode: (data: any) =>
    api.post('/nodes/add', data).then(res => res.data)
};

export const sessionsApi = {
  getSessions: (params: {
    labId?: string;
    nodeId?: string;
    username?: string;
    from?: string;
    to?: string;
    active?: boolean;
    limit?: number;
  }): Promise<{ sessions: any[]; total: number }> => {
    const qs = new URLSearchParams();
    if (params.labId) qs.append('labId', params.labId);
    if (params.nodeId) qs.append('nodeId', params.nodeId);
    if (params.username) qs.append('username', params.username);
    if (params.from) qs.append('from', params.from);
    if (params.to) qs.append('to', params.to);
    if (params.active !== undefined) qs.append('active', String(params.active));
    if (params.limit) qs.append('limit', String(params.limit));
    const str = qs.toString();
    return api.get(`/sessions${str ? `?${str}` : ''}`).then(res => res.data);
  },
  getExportUrl: (params: {
    labId?: string;
    nodeId?: string;
    username?: string;
    from?: string;
    to?: string;
    active?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params.labId) qs.append('labId', params.labId);
    if (params.nodeId) qs.append('nodeId', params.nodeId);
    if (params.username) qs.append('username', params.username);
    if (params.from) qs.append('from', params.from);
    if (params.to) qs.append('to', params.to);
    if (params.active !== undefined) qs.append('active', String(params.active));
    const str = qs.toString();
    return `/api/sessions/export${str ? `?${str}` : ''}`;
  }
};

export const authApi = {
  login: async (username: string, password: string): Promise<{ status: string; token: string; user: any }> => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.token) {
      sessionStorage.setItem('processshield_session_token', res.data.token);
      localStorage.setItem('processshield_session_token', res.data.token);
      localStorage.setItem('processshield_admin_token', res.data.token);
    }
    return res.data;
  },
  getMe: (): Promise<{ authenticated: boolean; user: any }> =>
    api.get('/auth/me').then(res => res.data),
  logout: async () => {
    sessionStorage.removeItem('processshield_session_token');
    localStorage.removeItem('processshield_session_token');
    localStorage.removeItem('processshield_admin_token');
    return api.post('/auth/logout').then(res => res.data);
  }
};

export const commandsApi = {
  createLabCommand: (
    labId: string,
    data: { type: string; payload?: { delaySec?: number; text?: string }; nodeIds?: string[] }
  ): Promise<{ status: string; queuedCount: number; skippedCount: number; commands: any[]; message?: string }> =>
    api.post(`/labs/${labId}/commands`, data).then(res => res.data),
  getLabCommands: (labId: string, limit = 50): Promise<{ commands: any[]; total: number }> =>
    api.get(`/labs/${labId}/commands?limit=${limit}`).then(res => res.data)
};

export const policiesApi = {
  getPolicies: (labId?: string): Promise<{ policies: any[] }> =>
    api.get(`/policies${labId ? `?labId=${labId}` : ''}`).then(res => res.data),
  createPolicy: (data: any): Promise<{ status: string; policy: any }> =>
    api.post('/policies', data).then(res => res.data),
  updatePolicy: (id: string, data: any): Promise<{ status: string; policy: any }> =>
    api.put(`/policies/${id}`, data).then(res => res.data),
  deletePolicy: (id: string): Promise<{ status: string }> =>
    api.delete(`/policies/${id}`).then(res => res.data),
  getViolations: (params?: { labId?: string; username?: string; limit?: number }): Promise<{ violations: any[]; total: number }> =>
    api.get('/violations', { params }).then(res => res.data)
};

export const schedulesApi = {
  getSchedules: (labId?: string): Promise<{ schedules: any[] }> =>
    api.get(`/schedules${labId ? `?labId=${labId}` : ''}`).then(res => res.data),
  createSchedule: (data: any): Promise<{ status: string; schedule: any }> =>
    api.post('/schedules', data).then(res => res.data),
  updateSchedule: (id: string, data: any): Promise<{ status: string; schedule: any }> =>
    api.put(`/schedules/${id}`, data).then(res => res.data),
  deleteSchedule: (id: string): Promise<{ status: string }> =>
    api.delete(`/schedules/${id}`).then(res => res.data)
};

export const reportsModuleApi = {
  getCatalog: (): Promise<any[]> => api.get('/reports/catalog').then(res => res.data.catalog),
  runReport: (id: string, params: any): Promise<any> => api.post(`/reports/${id}/run`, params).then(res => res.data),
  exportReport: async (id: string, format: 'xlsx' | 'pdf' | 'csv', params: any, defaultFilename?: string) => {
    const res = await api.post(`/reports/${id}/export?format=${format}`, params, { responseType: 'blob' });
    const blob = new Blob([res.data], {
      type: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : format === 'pdf'
        ? 'application/pdf'
        : 'text/csv;charset=utf-8;'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const disposition = res.headers['content-disposition'];
    let filename = defaultFilename || `ProcessShield_Report_${id}_${new Date().toISOString().split('T')[0]}.${format}`;
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  getPresets: (reportId?: string): Promise<any[]> =>
    api.get(`/reports/presets${reportId ? `?reportId=${reportId}` : ''}`).then(res => res.data.presets),
  savePreset: (data: any): Promise<any> =>
    api.post('/reports/presets', data).then(res => res.data.preset),
  deletePreset: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/reports/presets/${id}`).then(res => res.data)
};

export default api;
