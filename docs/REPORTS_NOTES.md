# ProcessShield Reports: Data Prerequisites & Notes

Date: 2026-11-20
Author: Antigravity Assistant

## 1. Overview of Telemetry, Retention, and Resolution
ProcessShield provides dual-mode persistence (MongoDB Atlas primary with an automatic in-memory fallback store).
To support flexible, high-performance reporting over 60+ days without degrading server throughput:
- **Resolution Rule**:
  - Time ranges of **7 days or less** use raw telemetry (`Telemetry` collection / memory store).
  - Time ranges **greater than 7 days** automatically switch to **hourly rollups** (`HourlyRollup` collection / memory store), significantly decreasing data volume and response times to <3 seconds.
  - The UI and export reports explicitly state the resolution: `"Data resolution: raw"` or `"Data resolution: hourly"`.

## 2. Data Prerequisites Assessment

| Needed Data | Status | Implementation Details |
| :--- | :--- | :--- |
| **Telemetry History** (ts, cpu %, ram %, ramUsedMB, ramTotalMB, disk %, diskUsedGB, diskTotalGB, processCount) | Available & Enhanced | Existing `Telemetry` schema tracks raw samples. `HourlyRollup` model & repository created for 1-hour interval aggregations (avg & peak metrics). |
| **Session Records** (user, system, lab, login, logout, duration, closedBy) | Available & Enhanced | `Session` model in `labs.ts` records student/faculty logins, logouts, duration, and lab affiliations. |
| **Software Inventory** (name, version, publisher, sizeMB, installDate) | Enhanced | Added `sizeMB` to `SoftwareInventory` package schema and models; populated across seeded systems. |
| **Top Processes per System** (name, CPU %, memory MB) | Enhanced | Aggregated into `HourlyRollup.topProcesses` (top 5 by memory) and snapshot processes. |
| **System Hardware Fields** (OS, CPU model, RAM total, Disk total, IP, MAC, seat) | Enhanced | `Device` schema updated with `cpu_model`, alongside `mac`, `ip`, `system_type`, `seat`, `labId`. |
| **Faults & Maintenance** (system, lab, issue, status, reported on, resolved on, days open) | Added | Created `Fault` model (`faults` collection) and `faultRepository` for tracking hardware and OS tickets. |
| **Alerts & Violations** | Available | Managed via `Alert` and `Violation` models with lab and node indexing. |
| **Export Audit Logs** | Added | Created `ExportAudit` model (`export_audits` collection) to track all xlsx, pdf, and csv report exports. |
| **Report Presets** | Added | Created `ReportPreset` model (`report_presets` collection) for personal and admin-shared report filters. |

## 3. Utilization Metric Formulas
All reports adhere strictly to the standardized formulas:
- **Seat-hours used**: $\sum (\text{session duration in minutes}) / 60$
- **Capacity hours**: $\text{Lab capacity} \times \text{Operational hours per day} \times \text{Days in period}$ (default 8 operational hours/day)
- **Occupancy %**: $(\text{Seat-hours used} / \text{Capacity hours}) \times 100$
- **Peak concurrency %**: $(\text{Max simultaneously logged-in users in lab} / \text{Lab capacity}) \times 100$
- **Availability %**: $(\text{Actual online minutes} / \text{Expected online minutes}) \times 100$
