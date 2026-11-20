import { ReportConfig, UserScope, QueryResult, SortLevel, ReportFilterValues } from './types.js';
import {
  L1_Report,
  L2_Report,
  L3_Report,
  L4_Report,
  L5_Report,
  L6_Report,
  L7_Report,
  L8_Report,
  L9_Report,
  L10_Report,
  L11_Report,
  L12_Report
} from './definitions/labReports.js';
import {
  S1_Report,
  S2_Report,
  S3_Report,
  S4_Report,
  S5_Report,
  S6_Report,
  S7_Report,
  S8_Report,
  S9_Report
} from './definitions/systemReports.js';
import {
  U1_Report,
  C1_Report,
  C2_Report,
  C3_Report
} from './definitions/userCollegeReports.js';

class ReportRegistry {
  private reports = new Map<string, ReportConfig>();

  constructor() {
    this.register(L1_Report);
    this.register(L2_Report);
    this.register(L3_Report);
    this.register(L4_Report);
    this.register(L5_Report);
    this.register(L6_Report);
    this.register(L7_Report);
    this.register(L8_Report);
    this.register(L9_Report);
    this.register(L10_Report);
    this.register(L11_Report);
    this.register(L12_Report);

    this.register(S1_Report);
    this.register(S2_Report);
    this.register(S3_Report);
    this.register(S4_Report);
    this.register(S5_Report);
    this.register(S6_Report);
    this.register(S7_Report);
    this.register(S8_Report);
    this.register(S9_Report);

    this.register(U1_Report);
    this.register(C1_Report);
    this.register(C2_Report);
    this.register(C3_Report);
  }

  public register(report: ReportConfig) {
    this.reports.set(report.id.toUpperCase(), report);
  }

  public getReport(id: string): ReportConfig | undefined {
    return this.reports.get(id.toUpperCase());
  }

  public getCatalog(scope: UserScope): Array<Omit<ReportConfig, 'query'>> {
    const list: Array<Omit<ReportConfig, 'query'>> = [];

    for (const report of this.reports.values()) {
      // Role scoping rule: viewers cannot view command or security audit reports
      if (scope.role === 'viewer' && report.id === 'L9') {
        continue;
      }

      list.push({
        id: report.id,
        title: report.title,
        category: report.category,
        description: report.description,
        filters: report.filters,
        columns: report.columns,
        defaultSort: report.defaultSort,
        groupByOptions: report.groupByOptions
      });
    }

    return list;
  }

  public async runReport(
    id: string,
    params: {
      filters?: ReportFilterValues;
      sort?: SortLevel[];
      columns?: string[];
      page?: number;
      pageSize?: number;
    },
    scope: UserScope
  ): Promise<QueryResult> {
    const report = this.getReport(id);
    if (!report) {
      throw new Error(`Report "${id}" not found in catalog.`);
    }

    // Role check
    if (scope.role === 'viewer' && report.id === 'L9') {
      throw new Error(`Unauthorized: Viewers cannot access command history.`);
    }

    const safeFilters: ReportFilterValues = params.filters || {};
    const safeSort: SortLevel[] = [];

    // Validate sort against whitelisted sortable columns
    const sortableCols = new Set(report.columns.filter(c => c.sortable).map(c => c.key));
    if (params.sort && Array.isArray(params.sort)) {
      for (const s of params.sort.slice(0, 3)) { // max 3 levels
        if (sortableCols.has(s.key) && (s.dir === 'asc' || s.dir === 'desc')) {
          safeSort.push({ key: s.key, dir: s.dir });
        }
      }
    }

    const activeColumns = params.columns && params.columns.length > 0
      ? params.columns
      : report.columns.filter(c => c.defaultVisible).map(c => c.key);

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(10, params.pageSize || 25));

    return await report.query(
      safeFilters,
      safeSort,
      page,
      pageSize,
      activeColumns,
      scope
    );
  }
}

export const reportRegistry = new ReportRegistry();
