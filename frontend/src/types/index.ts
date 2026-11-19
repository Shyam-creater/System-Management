export interface ProcessItem {
  pid: number;
  ppid: number;
  name: string;
  user: string;
  is_user_app: boolean;
  category: string;
  state: 'RUNNING' | 'SLEEPING' | 'IDLE' | 'STOPPED' | 'ZOMBIE' | string;
  cpu_percent: number;
  gpu_percent?: number;
  memory_mb: number;
}

export interface NodeInfo {
  node_id: string;
  hostname: string;
  ip: string;
  mac?: string | null;
  interface?: string | null;
  system_type?: string;
  is_simulated: boolean;
  is_ssh_agentless?: boolean;
  first_seen?: number;
  last_seen: number;
  status: 'ONLINE' | 'OFFLINE';
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  health_reasons?: string[];
  cpu_percent?: number;
  ram_percent?: number;
  ram_used_gb?: number;
  ram_total_gb?: number;
  disk_percent?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  net_sent_kb?: number;
  net_recv_kb?: number;
  gpu_percent?: number;
  gpu_name?: string;
  process_count?: number;
  seconds_since_seen: number;
  processes?: ProcessItem[];
  labId?: string | null;
  seat?: number | null;
  currentUser?: string | null;
  platform?: string;
  cpu_model?: string;
  cpu_count?: number;
  uptime_seconds?: number;
  uptime_formatted?: string;
}

export interface FleetSummary {
  total_nodes: number;
  online_nodes: number;
  offline_nodes: number;
  real_nodes: number;
  sim_nodes: number;
  warning_nodes: number;
  critical_nodes: number;
}

export interface AlertItem {
  _id?: string;
  node_id: string;
  timestamp: number;
  time_str: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  details?: string;
  resolved?: boolean;
}

export interface SoftwareItem {
  name: string;
  version: string;
  publisher: string;
  category: string;
  install_path: string;
  install_date: string;
  path?: string;
  date?: string;
  source: string;
  summary: string;
  package_id?: string;
  architecture?: string;
}

export interface DailyReportItem {
  _id?: string;
  node_id: string;
  report_date: string;
  hostname: string;
  is_simulated: boolean;
  avg_cpu: number;
  max_cpu: number;
  avg_ram: number;
  max_ram: number;
  avg_disk: number;
  max_disk: number;
  avg_gpu?: number;
  max_gpu?: number;
  uptime_percent: number;
  samples_count: number;
  alerts_count: number;
  generated_at: number;
  summary?: any;
}

export interface DeadlockSimulationResponse {
  scenario: string;
  description: string;
  isDeadlocked: boolean;
  cyclePath: string[];
  involvedProcesses: string[];
  wfgCycleDescription: string;
}

export interface BankersAlgorithmResponse {
  scenario: string;
  allocation: number[][];
  max: number[][];
  available: number[];
  isSafe: boolean;
  safeSequence: number[];
  unsatisfiedProcesses: number[];
  needMatrix: number[][];
  safeSequenceFormatted: string;
}

export interface LabItem {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  capacity?: number;
  prefix?: string;
  total?: number;
  online?: number;
  inUse?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionItem {
  id: string;
  _id?: string;
  nodeId: string;
  labId?: string | null;
  username: string;
  loginAt: string;
  logoutAt?: string | null;
  duration?: number;
  closedBy?: 'user' | 'agent-offline' | 'admin' | 'timeout';
  active: boolean;
}

export interface LabOverviewMachine {
  node_id: string;
  hostname: string;
  ip: string;
  mac?: string | null;
  interface?: string | null;
  isOnline: boolean;
  status?: 'ONLINE' | 'OFFLINE';
  health?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  health_reasons?: string[];
  is_ssh_agentless?: boolean;
  cpu_percent: number;
  gpu_percent?: number;
  gpu_name?: string;
  ram_percent: number;
  ram_used_gb?: number;
  ram_total_gb?: number;
  disk_percent?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  process_count?: number;
  processes?: ProcessItem[];
  seat?: number | null;
  currentUser?: string | null;
  system_type?: string;
  is_simulated?: boolean;
  secondsSinceSeen?: number;
}

export interface LabOverviewResponse {
  lab: LabItem;
  machines: LabOverviewMachine[];
  total: number;
  online: number;
  inUse: number;
}

export type CommandType = 'shutdown' | 'restart' | 'lock' | 'logoff' | 'message' | 'cancel_shutdown';
export type CommandStatus = 'pending' | 'sent' | 'done' | 'failed' | 'skipped';

export interface CommandItem {
  id: string;
  _id?: string;
  nodeId: string;
  labId?: string | null;
  type: CommandType;
  payload?: { delaySec?: number; text?: string };
  status: CommandStatus;
  createdBy: string;
  createdAt: string;
  sentAt?: string | null;
  ackAt?: string | null;
  result?: string | null;
}

export interface PolicyItem {
  id: string;
  _id?: string;
  labId?: string | null;
  name: string;
  mode: 'blocklist' | 'allowlist';
  processNames: string[];
  action: 'kill' | 'alert_only';
  activeFrom?: string;
  activeTo?: string;
  days?: string[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ViolationItem {
  id: string;
  _id?: string;
  nodeId: string;
  labId?: string | null;
  username: string;
  processName: string;
  action: 'killed' | 'alerted';
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  _id?: string;
  labId: string;
  name: string;
  type: 'shutdown' | 'message' | 'lock';
  days: string[];
  time: string; // "HH:MM"
  payload?: { delaySec?: number; text?: string };
  enabled: boolean;
  lastRunAt?: string | null;
  createdAt?: string;
}

export interface AuthUser {
  username: string;
  role: 'admin' | 'incharge' | 'viewer';
}
