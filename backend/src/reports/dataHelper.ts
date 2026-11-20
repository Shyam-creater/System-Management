import {
  ReportColumn,
  ReportFilterValues,
  SortLevel,
  UserScope
} from './types.js';
import { labRepo, sessionRepo } from '../labs.js';
import { deviceRepository } from '../repositories/deviceRepository.js';
import { hourlyRollupRepository } from '../repositories/hourlyRollupRepository.js';
import { softwareRepository } from '../repositories/softwareRepository.js';
import { faultRepository } from '../repositories/faultRepository.js';
import { violationRepository } from '../repositories/violationRepository.js';
import { alertRepository } from '../repositories/alertRepository.js';
import { generateSeedData } from './seedData.js';

let memorySeeded = false;

export async function ensureMemorySeeded() {
  if (memorySeeded) return;
  // Purge any dummy generated nodes so only real systems are present
  await deviceRepository.purgeDummyNodes();
  memorySeeded = true;
}

export function parseDateRange(filter?: ReportFilterValues['dateRange']): {
  startDate: Date;
  endDate: Date;
  resolution: 'raw' | 'hourly';
  daysCount: number;
} {
  const now = new Date();
  let start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let end = new Date(now);

  const preset = filter?.preset?.toLowerCase();

  if (preset === 'today') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'yesterday') {
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'last7days') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    end = new Date(now);
  } else if (preset === 'last30days') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    end = new Date(now);
  } else if (preset === 'thismonth') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now);
  } else if (preset === 'lastmonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (preset === 'thissemester') {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    end = new Date(now);
  } else if (filter?.startDate && filter?.endDate) {
    start = new Date(filter.startDate);
    end = new Date(filter.endDate);
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    throw new Error('Start date must be earlier than end date.');
  }

  const daysCount = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  if (daysCount > 366) {
    throw new Error('Date range cannot exceed 366 days.');
  }

  const resolution: 'raw' | 'hourly' = daysCount <= 7 ? 'raw' : 'hourly';
  return { startDate: start, endDate: end, resolution, daysCount };
}

export async function getScopedLabs(scope: UserScope, requestedLabIds?: string[]): Promise<any[]> {
  await ensureMemorySeeded();
  const allLabs = await labRepo.getAll();

  let allowed = allLabs;
  if (scope.role === 'incharge') {
    const assigned = scope.assignedLabIds || [];
    allowed = allLabs.filter(l => assigned.includes(l.id || l._id?.toString()));
  }

  if (requestedLabIds && requestedLabIds.length > 0) {
    allowed = allowed.filter(l => requestedLabIds.includes(l.id || l._id?.toString()));
  }

  return allowed;
}

export async function getScopedDevices(allowedLabIds: string[], requestedSystemIds?: string[]): Promise<any[]> {
  const allDevices = await deviceRepository.findAll(true);
  let matched = allDevices.filter(d => allowedLabIds.includes(d.labId));
  if (requestedSystemIds && requestedSystemIds.length > 0) {
    matched = matched.filter(d => requestedSystemIds.includes(d.node_id));
  }
  return matched;
}

export function applyMultiSort(rows: any[], sortLevels: SortLevel[]): any[] {
  if (!sortLevels || sortLevels.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const level of sortLevels) {
      const valA = a[level.key];
      const valB = b[level.key];

      if (valA === valB) continue;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else {
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        const dateA = Date.parse(valA);
        const dateB = Date.parse(valB);
        if (!isNaN(dateA) && !isNaN(dateB) && isNaN(Number(valA))) {
          comparison = dateA - dateB;
        } else {
          comparison = strA.localeCompare(strB, undefined, { numeric: true });
        }
      }

      if (comparison !== 0) {
        return level.dir === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });
}

export function computeTotals(rows: any[], columns: ReportColumn[]): Record<string, number | string> {
  const totals: Record<string, number | string> = {};
  if (!rows || rows.length === 0) return totals;

  for (const col of columns) {
    if (!col.total || col.total === 'none') {
      totals[col.key] = '';
      continue;
    }

    let sum = 0;
    let count = 0;

    for (const r of rows) {
      const val = Number(r[col.key]);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    }

    if (count === 0) {
      totals[col.key] = 0;
    } else if (col.total === 'sum') {
      totals[col.key] = Number(sum.toFixed(1));
    } else if (col.total === 'avg') {
      totals[col.key] = Number((sum / count).toFixed(1));
    }
  }

  // First column label
  const firstCol = columns[0]?.key;
  if (firstCol) {
    totals[firstCol] = 'Total / Average';
  }

  return totals;
}

export function paginateRows(rows: any[], page = 1, pageSize = 25): any[] {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));
  const start = (safePage - 1) * safePageSize;
  return rows.slice(start, start + safePageSize);
}
