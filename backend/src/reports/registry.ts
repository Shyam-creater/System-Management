import { ReportConfig, UserScope, QueryResult, SortLevel, ReportFilterValues } from './types.js';
import {
  L2_Report,
  L4_Report,
  L7_Report
} from './definitions/labReports.js';
import {
  S1_Report,
  S2_Report,
  S3_Report,
  S5_Report,
  S6_Report,
  S7_Report,
  USB_Report
} from './definitions/systemReports.js';
import {
  C2_Report
} from './definitions/userCollegeReports.js';

class ReportRegistry {
  private reports = new Map<string, ReportConfig>();

  constructor() {
    // 10 Curated Reports Only:
    // 1. Processes
    this.register(S6_Report);

    // 2. Performance & Telemetry Reports
    this.register(S2_Report);

    // 3. Installed Software Inventory
    this.register(S5_Report);

    // 4. Lab Usage Trend
    this.register(L2_Report);

    // 5. Session Log
    this.register(L4_Report);

    // 6. Alerts
    this.register(L7_Report);

    // 7. System Utilization
    this.register(S1_Report);

    // 8. Memory Usage
    this.register(S3_Report);

    // 9. Hardware Inventory
    this.register(S7_Report);

    // 10. Lab Comparison
    this.register(C2_Report);

    // 11. USB Activity & Hardware Protection
    this.register(USB_Report);
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
