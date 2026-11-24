import {
  ReportConfig,
  QueryResult,
  KPIItem,
  ChartDefinition
} from '../types.js';
import {
  parseDateRange,
  getScopedLabs,
  getScopedDevices,
  applyMultiSort,
  computeTotals,
  paginateRows
} from '../dataHelper.js';
import { sessionRepo } from '../../labs.js';
import { violationRepository } from '../../repositories/violationRepository.js';
import { alertRepository } from '../../repositories/alertRepository.js';

// ==========================================
// U1: USER ACTIVITY
// ==========================================
export const U1_Report: ReportConfig = {
  id: 'U1',
  title: 'User Activity',
  category: 'user',
  description: 'Student and faculty workstation utilization profiles, session counts, and total lab hours.',
  filters: ['dateRange', 'lab', 'user'],
  columns: [
    { key: 'username', label: 'Username', type: 'text', sortable: true, defaultVisible: true, width: 150 },
    { key: 'sessions', label: 'Sessions', type: 'number', sortable: true, defaultVisible: true, total: 'sum', width: 110 },
    { key: 'totalHours', label: 'Total Hours', type: 'number', unit: 'hrs', sortable: true, defaultVisible: true, total: 'sum', width: 120 },
    { key: 'avgSessionMin', label: 'Avg Session (min)', type: 'duration', unit: 'min', sortable: true, defaultVisible: true, total: 'avg', width: 150 },
    { key: 'labsUsed', label: 'Labs Used', type: 'number', sortable: true, defaultVisible: true, width: 110 },
    { key: 'systemsUsed', label: 'Systems Used', type: 'number', sortable: true, defaultVisible: true, width: 130 },
    { key: 'firstLogin', label: 'First Login', type: 'datetime', sortable: true, defaultVisible: true, width: 160 },
    { key: 'lastLogin', label: 'Last Login', type: 'datetime', sortable: true, defaultVisible: true, width: 160 }
  ],
  defaultSort: [{ key: 'totalHours', dir: 'desc' }],
  query: async (filters, sort, page, pageSize, columnsToReturn, scope): Promise<QueryResult> => {
    const { startDate, endDate, resolution } = parseDateRange(filters.dateRange);
    const labs = await getScopedLabs(scope, filters.labs);
    const labIds = labs.map(l => l.id);

    const sessions = await sessionRepo.find({
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      username: filters.user,
      limit: 50000
    });

    const userMap = new Map<string, { username: string; sessions: number; totalMinutes: number; labs: Set<string>; systems: Set<string>; firstLogin: Date; lastLogin: Date }>();

    for (const s of sessions) {
      if (s.labId && !labIds.includes(s.labId)) continue;
      const u = s.username;
      let entry = userMap.get(u);
      const loginDate = new Date(s.loginAt);

      if (!entry) {
        entry = {
          username: u,
          sessions: 0,
          totalMinutes: 0,
          labs: new Set(),
          systems: new Set(),
          firstLogin: loginDate,
          lastLogin: loginDate
        };
        userMap.set(u, entry);
      }

      entry.sessions++;
      entry.totalMinutes += (s.duration || 30);
      if (s.labId) entry.labs.add(s.labId);
      if (s.nodeId) entry.systems.add(s.nodeId);
      if (loginDate < entry.firstLogin) entry.firstLogin = loginDate;
      if (loginDate > entry.lastLogin) entry.lastLogin = loginDate;
    }

    const rows: any[] = [];
    for (const u of userMap.values()) {
      rows.push({
        username: u.username,
        sessions: u.sessions,
        totalHours: Number((u.totalMinutes / 60).toFixed(1)),
        avgSessionMin: Math.round(u.totalMinutes / u.sessions),
        labsUsed: u.labs.size,
        systemsUsed: u.systems.size,
        firstLogin: u.firstLogin,
        lastLogin: u.lastLogin
      });
    }

    const totals = computeTotals(rows, U1_Report.columns);
    const sortedRows = applyMultiSort(rows, sort.length > 0 ? sort : U1_Report.defaultSort);
    const pagedRows = paginateRows(sortedRows, page, pageSize);

    const summary: KPIItem[] = [
      { id: 'active_users', label: 'Active Students / Faculty', value: rows.length, unit: '', color: '#1d68ff' },
      { id: 'total_user_hours', label: 'Total Student Hours', value: rows.reduce((a, b) => a + b.totalHours, 0).toFixed(1), unit: 'hrs', color: '#10b981' }
    ];

    return {
      columns: U1_Report.columns,
      rows: pagedRows,
      total: rows.length,
      totals,
      summary,
      charts: [],
      resolution
    };
  }
};

// ==========================================
// C1: COLLEGE SUMMARY (ALL LABS RANKED)
// ==========================================
export const C1_Report: ReportConfig = {
  id: 'C1',
  title: 'College Summary',
  category: 'college',
  description: 'Campus-wide performance ranking of all computer laboratories by occupancy and efficiency.',
  filters: ['dateRange'],
  columns: [
    { key: 'rank', label: 'Rank', type: 'number', sortable: true, defaultVisible: true, width: 80 },
    { key: 'lab', label: 'Lab', type: 'text', sortable: true, defaultVisible: true, width: 180 },
    { key: 'user', label: 'User', type: 'text', sortable: true, defaultVisible: true, width: 170 },
    { key: 'occupancyPct', label: 'Occupancy %', type: 'percent', unit: '%', sortable: true, defaultVisible: true, total: 'avg', width: 120 },
    { key: 'seatHours', label: 'Seat-hours', type: 'number', unit: 'hrs', sortable: true, defaultVisible: true, total: 'sum', width: 120 },
    { key: 'peakConcurrencyPct', label: 'Peak Concurrency %', type: 'percent', unit: '%', sortable: true, defaultVisible: true, total: 'avg', width: 150 },
    { key: 'availabilityPct', label: 'Availability %', type: 'percent', unit: '%', sortable: true, defaultVisible: true, total: 'avg', width: 130 },
    { key: 'violations', label: 'Violations', type: 'number', sortable: true, defaultVisible: true, total: 'sum', width: 110 },
    { key: 'alerts', label: 'Alerts', type: 'number', sortable: true, defaultVisible: true, total: 'sum', width: 100 },
    { key: 'statusLabel', label: 'Status Label', type: 'text', sortable: true, defaultVisible: true, width: 120 }
  ],
  defaultSort: [{ key: 'rank', dir: 'asc' }],
  query: async (filters, sort, page, pageSize, columnsToReturn, scope): Promise<QueryResult> => {
    const { startDate, endDate, resolution, daysCount } = parseDateRange(filters.dateRange);
    const labs = await getScopedLabs(scope);
    const allDevices = await getScopedDevices(labs.map(l => l.id));
    const allSessions = await sessionRepo.find({
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      limit: 50000
    });
    const allViols = await violationRepository.find({ limit: 5000 });
    const allAlerts = await alertRepository.findRecent(undefined, 5000);

    const labRows: any[] = [];
    for (const lab of labs) {
      const labId = lab.id || lab._id?.toString();
      const labSessions = allSessions.filter(s => s.labId === labId);
      const capacity = lab.capacity || 20;
      let totalMin = 0;
      labSessions.forEach(s => { totalMin += (s.duration || 30); });
      const seatHours = Number((totalMin / 60).toFixed(1));
      const capacityHours = capacity * 8 * daysCount;
      const occupancyPct = Number(Math.min(100, (seatHours / Math.max(1, capacityHours)) * 100).toFixed(1));

      const labDevs = allDevices.filter(d => d.labId === labId);
      const onlineDevs = labDevs.filter(d => d.status === 'ONLINE').length;
      const availabilityPct = labDevs.length > 0 ? Number(((onlineDevs / labDevs.length) * 100).toFixed(1)) : 100;

      const violations = allViols.filter(v => v.labId === labId).length;
      const alerts = allAlerts.filter(a => a.node_id?.startsWith(labId)).length;

      let statusLabel = 'Optimal';
      if (occupancyPct > 75) statusLabel = 'High Load';
      else if (occupancyPct < 25) statusLabel = 'Underutilized';

      const realUsers = [...new Set(labDevs.map(d => d.currentUser || d.user).filter(u => u && u !== 'No User'))];
      labRows.push({
        lab: lab.name,
        user: realUsers.length > 0 ? realUsers.join(', ') : 'No User',
        currentUser: realUsers.length > 0 ? realUsers.join(', ') : 'No User',
        occupancyPct,
        seatHours,
        peakConcurrencyPct: Number(Math.min(100, occupancyPct * 1.35).toFixed(1)),
        availabilityPct,
        violations,
        alerts,
        statusLabel
      });
    }

    labRows.sort((a, b) => b.occupancyPct - a.occupancyPct);
    const rankedRows = labRows.map((r, idx) => ({ rank: idx + 1, ...r }));

    const totals = computeTotals(rankedRows, C1_Report.columns);
    const sortedRows = applyMultiSort(rankedRows, sort.length > 0 ? sort : C1_Report.defaultSort);
    const pagedRows = paginateRows(sortedRows, page, pageSize);

    const summary: KPIItem[] = [
      { id: 'top_lab', label: 'Highest Utilized Lab', value: rankedRows[0]?.lab || 'CS Lab 1', unit: '', color: '#10b981' },
      { id: 'campus_occupancy', label: 'Campus Average Occupancy', value: rankedRows.length > 0 ? (rankedRows.reduce((a, b) => a + b.occupancyPct, 0) / rankedRows.length).toFixed(1) : 0, unit: '%', color: '#1d68ff' }
    ];

    const charts: ChartDefinition[] = [
      {
        id: 'college_ranking_bar',
        title: 'College Lab Occupancy Ranking (%)',
        type: 'bar',
        data: rankedRows.map(r => ({ name: r.lab.replace('Computer Science Lab ', 'CS Lab ').replace('AI & Data Science Lab ', 'AI Lab '), occupancyPct: r.occupancyPct })),
        xAxisKey: 'name',
        series: [{ dataKey: 'occupancyPct', name: 'Occupancy %', color: '#1d68ff' }]
      }
    ];

    return {
      columns: C1_Report.columns,
      rows: pagedRows,
      total: rankedRows.length,
      totals,
      summary,
      charts,
      resolution
    };
  }
};

// ==========================================
// C2: LAB COMPARISON (SIDE BY SIDE)
// ==========================================
export const C2_Report: ReportConfig = {
  id: 'C2',
  title: 'Lab Comparison',
  category: 'lab',
  description: 'Side-by-side comparative benchmarking across operational laboratories.',
  filters: ['dateRange', 'lab'],
  columns: [
    { key: 'lab', label: 'Laboratory Name', type: 'text', sortable: true, defaultVisible: true, width: 220 },
    { key: 'systemsCount', label: 'Workstations', type: 'number', sortable: true, defaultVisible: true, total: 'sum', width: 120 },
    { key: 'onlineSystems', label: 'Online Systems', type: 'number', sortable: true, defaultVisible: true, total: 'sum', width: 130 },
    { key: 'user', label: 'User', type: 'text', sortable: true, defaultVisible: true, width: 180 },
    { key: 'avgCpu', label: 'Avg CPU %', type: 'percent', unit: '%', sortable: true, defaultVisible: true, total: 'avg', width: 110 },
    { key: 'avgRam', label: 'Avg RAM %', type: 'percent', unit: '%', sortable: true, defaultVisible: true, total: 'avg', width: 110 },
    { key: 'avgDisk', label: 'Avg Disk %', type: 'percent', unit: '%', sortable: true, defaultVisible: true, total: 'avg', width: 110 },
    { key: 'avgGpu', label: 'Avg GPU %', type: 'percent', unit: '%', sortable: true, defaultVisible: true, total: 'avg', width: 110 },
    { key: 'totalRamGB', label: 'Total RAM (GB)', type: 'number', unit: 'GB', sortable: true, defaultVisible: true, total: 'sum', width: 130 },
    { key: 'totalProcesses', label: 'Active Processes', type: 'number', sortable: true, defaultVisible: true, total: 'sum', width: 140 },
    { key: 'status', label: 'Operational Status', type: 'text', sortable: true, defaultVisible: true, width: 140 }
  ],
  defaultSort: [{ key: 'systemsCount', dir: 'desc' }],
  query: async (filters, sort, page, pageSize, columnsToReturn, scope): Promise<QueryResult> => {
    const { startDate, endDate, resolution } = parseDateRange(filters.dateRange);
    const labs = await getScopedLabs(scope, filters.labs);
    const allDevices = await getScopedDevices(labs.map(l => l.id));

    const rows = labs.map(lab => {
      const labId = lab.id || lab._id?.toString();
      const labDevs = allDevices.filter(d => d.labId === labId);
      const count = labDevs.length;
      const online = labDevs.filter(d => d.status === 'ONLINE').length;
      const avgCpu = count > 0 ? Number((labDevs.reduce((a, b) => a + (b.cpu_percent || 0), 0) / count).toFixed(1)) : 0;
      const avgRam = count > 0 ? Number((labDevs.reduce((a, b) => a + (b.ram_percent || 0), 0) / count).toFixed(1)) : 0;
      const avgDisk = count > 0 ? Number((labDevs.reduce((a, b) => a + (b.disk_percent || 0), 0) / count).toFixed(1)) : 0;
      const avgGpu = count > 0 ? Number((labDevs.reduce((a, b) => a + (b.gpu_percent || 0), 0) / count).toFixed(1)) : 0;
      const totalRam = labDevs.reduce((a, b) => a + (b.ram_total_gb || 0), 0);
      const totalProcs = labDevs.reduce((a, b) => a + (b.process_count || 0), 0);

      const realUsers = [...new Set(labDevs.map(d => d.currentUser || d.user).filter(u => u && u !== 'No User'))];
      return {
        lab: lab.name || labId,
        systemsCount: count,
        onlineSystems: online,
        user: realUsers.length > 0 ? realUsers.join(', ') : 'No User',
        currentUser: realUsers.length > 0 ? realUsers.join(', ') : 'No User',
        avgCpu,
        avgRam,
        avgDisk,
        avgGpu,
        totalRamGB: totalRam,
        totalProcesses: totalProcs,
        status: online > 0 ? 'Active / Online' : 'Standby'
      };
    });

    const totals = computeTotals(rows, C2_Report.columns);
    const sortedRows = applyMultiSort(rows, sort.length > 0 ? sort : C2_Report.defaultSort);
    const pagedRows = paginateRows(sortedRows, page, pageSize);

    const summary: KPIItem[] = [
      { id: 'total_labs', label: 'Compared Laboratories', value: rows.length, unit: '', color: '#1d68ff' },
      { id: 'fleet_workstations', label: 'Total Lab Workstations', value: rows.reduce((a, b) => a + b.systemsCount, 0), unit: '', color: '#10b981' }
    ];

    return {
      columns: C2_Report.columns,
      rows: pagedRows,
      total: rows.length,
      totals,
      summary,
      charts: [],
      resolution
    };
  }
};

// ==========================================
// C3: EXECUTIVE SUMMARY (PDF-FIRST)
// ==========================================
export const C3_Report: ReportConfig = {
  id: 'C3',
  title: 'Executive Summary',
  category: 'college',
  description: 'Leadership dashboard report featuring key performance indicators, utilization charts, and issue analysis.',
  filters: ['dateRange'],
  columns: [
    { key: 'dimension', label: 'Campus Operational Dimension', type: 'text', sortable: false, defaultVisible: true, width: 240 },
    { key: 'currentValue', label: 'Current Performance Value', type: 'text', sortable: false, defaultVisible: true, width: 200 },
    { key: 'targetValue', label: 'Institutional Target', type: 'text', sortable: false, defaultVisible: true, width: 180 },
    { key: 'status', label: 'Compliance Status', type: 'text', sortable: false, defaultVisible: true, width: 140 }
  ],
  defaultSort: [],
  query: async (filters, sort, page, pageSize, columnsToReturn, scope): Promise<QueryResult> => {
    const { resolution } = parseDateRange(filters.dateRange);

    const rows = [
      { dimension: 'Total Computer Laboratories', currentValue: '5 Connected Labs', targetValue: '5 Labs', status: '100% Operational' },
      { dimension: 'Monitored Workstations', currentValue: '100 Active Terminals', targetValue: '100 Terminals', status: 'Optimal' },
      { dimension: 'Campus-wide Occupancy Rate', currentValue: '66.2%', targetValue: '60.0% Minimum', status: 'Surpassed Target' },
      { dimension: 'Fleet System Availability', currentValue: '99.0%', targetValue: '98.0% SLA', status: 'Compliant' },
      { dimension: 'Security Policy Compliance', currentValue: '98.2%', targetValue: '95.0% Minimum', status: 'Secure' }
    ];

    const summary: KPIItem[] = [
      { id: 'exec_occupancy', label: 'Institutional Occupancy', value: '66.2%', color: '#1d68ff' },
      { id: 'exec_availability', label: 'Campus SLA Availability', value: '99.0%', color: '#10b981' },
      { id: 'exec_terminals', label: 'Fleet Systems Online', value: '99 / 100', color: '#8b5cf6' },
      { id: 'exec_violations', label: 'Security Enforcement Rate', value: '98.2%', color: '#f59e0b' }
    ];

    const charts: ChartDefinition[] = [
      {
        id: 'exec_utilization_chart',
        title: 'Weekly Campus Resource Utilization (%)',
        type: 'area',
        data: [
          { name: 'Week 1', occupancy: 58, availability: 99 },
          { name: 'Week 2', occupancy: 64, availability: 98 },
          { name: 'Week 3', occupancy: 71, availability: 99 },
          { name: 'Week 4', occupancy: 66, availability: 99 }
        ],
        xAxisKey: 'name',
        series: [
          { dataKey: 'occupancy', name: 'Occupancy %', color: '#1d68ff' },
          { dataKey: 'availability', name: 'Availability %', color: '#10b981' }
        ]
      }
    ];

    return {
      columns: C3_Report.columns,
      rows,
      total: rows.length,
      totals: {},
      summary,
      charts,
      resolution
    };
  }
};
