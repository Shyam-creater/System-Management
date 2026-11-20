export type ReportCategory = 'lab' | 'system' | 'user' | 'college';

export type ColumnType =
  | 'text'
  | 'number'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'duration'
  | 'size';

export type TotalType = 'sum' | 'avg' | 'none';

export interface ReportColumn {
  key: string;
  label: string;
  type: ColumnType;
  unit?: string;
  sortable: boolean;
  defaultVisible: boolean;
  total?: TotalType;
  width?: number;
}

export type FilterField =
  | 'dateRange'
  | 'lab'
  | 'system'
  | 'user'
  | 'timeOfDay'
  | 'dayOfWeek'
  | 'cpuPct'
  | 'ramPct'
  | 'ramUsedMB'
  | 'diskPct'
  | 'diskUsedGB'
  | 'softwareSizeMB'
  | 'duration'
  | 'occupancyPct'
  | 'systemStatus'
  | 'os'
  | 'softwareName'
  | 'severity'
  | 'actionType'
  | 'processName'
  | 'faultStatus'
  | 'groupBy'
  | 'includeRetired';

export interface SortLevel {
  key: string;
  dir: 'asc' | 'desc';
}

export interface ReportFilterValues {
  dateRange?: {
    preset?: string;
    startDate?: string;
    endDate?: string;
  };
  labs?: string[];
  systems?: string[];
  user?: string;
  timeOfDay?: {
    from?: string; // "HH:MM"
    to?: string;   // "HH:MM"
  };
  daysOfWeek?: number[]; // 0 = Sun .. 6 = Sat
  cpuPctMin?: number;
  cpuPctMax?: number;
  ramPctMin?: number;
  ramPctMax?: number;
  ramUsedMBMin?: number;
  ramUsedMBMax?: number;
  diskPctMin?: number;
  diskPctMax?: number;
  diskUsedGBMin?: number;
  diskUsedGBMax?: number;
  softwareSizeMBMin?: number;
  softwareSizeMBMax?: number;
  durationMin?: number;
  durationMax?: number;
  occupancyPctMin?: number;
  occupancyPctMax?: number;
  systemStatus?: string;
  os?: string;
  softwareName?: string;
  severity?: string;
  actionType?: string;
  processName?: string;
  faultStatus?: string;
  groupBy?: 'day' | 'week' | 'month' | 'lab' | 'system' | 'user' | 'hour';
  includeRetired?: boolean;
}

export interface UserScope {
  userId: string;
  username: string;
  role: 'admin' | 'incharge' | 'viewer';
  assignedLabIds?: string[];
}

export interface KPIItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export interface ChartDefinition {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'area' | 'pie';
  data: any[];
  xAxisKey: string;
  series: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
}

export interface QueryResult {
  columns: ReportColumn[];
  rows: any[];
  total: number;
  totals: Record<string, number | string>;
  summary: KPIItem[];
  charts: ChartDefinition[];
  resolution: 'raw' | 'hourly';
}

export interface ReportConfig {
  id: string;
  title: string;
  category: ReportCategory;
  description: string;
  filters: FilterField[];
  columns: ReportColumn[];
  defaultSort: SortLevel[];
  groupByOptions?: string[];
  query: (
    filters: ReportFilterValues,
    sort: SortLevel[],
    page: number,
    pageSize: number,
    columnsToReturn: string[],
    scope: UserScope
  ) => Promise<QueryResult>;
}
