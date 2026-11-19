# ProcessShield Lab Management Extension — Integration Notes (Phase 0)

This document records the architectural inspection of ProcessShield prior to implementing the Lab Management Extension.

---

### 1. Database Layer & In-Memory Fallback
- **Database Architecture**: Resilient Dual-Mode (Mongoose + In-Memory Fallback).
- **Mongoose Configuration**: `mongoose.set('bufferCommands', false)` with 2000ms server selection timeout, preventing server blocking when MongoDB Atlas is unreachable.
- **In-Memory Fallback**: Each repository in `backend/src/repositories/` maintains in-memory Maps (`memoryDevices = new Map<string, any>()`).
- **Data Flow**: When `isDatabaseConnected()` returns true, operations attempt MongoDB queries. If MongoDB fails or is offline, all reads, writes, and queries fall back to in-memory state.
- **Adaptation Strategy**: All new models (`Lab`, `Session`, `Command`, `Policy`, `Schedule`, `Violation`) must implement this dual-mode pattern so the system operates continuously whether Atlas is connected or offline.

---

### 2. Node / Device Collection & Schema
- **Collection Name**: `devices` (Model: `Device` in `backend/src/models/Device.ts`).
- **Primary Identifier**: `node_id` (string, unique, index: true).
- **Last-Seen Timestamp**: `last_seen` (number, Unix epoch timestamp in seconds, e.g. `Date.now() / 1000`).
- **First-Seen Timestamp**: `first_seen` (number, Unix epoch seconds).
- **Node Fields to Extend**:
  - `labId`: string (optional, default `null`)
  - `seat`: number (optional, default `null`)

---

### 3. Node ID Generation in Agent & Simulator
- **`agent.py`**:
  ```python
  payload["node_id"] = f"{hostname} ({ip})"
  ```
- **`simulator.py`**:
  ```python
  "node_id": f"{config['hostname']} ({config['ip']})"
  ```
- **Rule for `session_tracker.py` and Extensions**: Must use the exact same `node_id` format: `f"{hostname} ({ip})"`.

---

### 4. Frontend API Client
- **File**: `frontend/src/services/api.ts`
- **Base URL**: `baseURL: '/api'` (proxied by Vite to port 5000 in dev, or served directly by Express in production).

---

### 5. Authentication Status
- **Current State**: Open endpoints. No admin authentication, no JWT, and no session cookies. `agent.py` includes a legacy `auth_key: "ProcessShield-OS-2026"` in report payload.
- **Phase 2 Flag**: Must implement:
  - Admin login (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) with JWT.
  - `X-Agent-Token` header for `/api/report`, `/api/sessions/*`, and `/api/agent/*`.

---

### 6. Socket.IO Gateway
- **Backend**: `initSocket(server)` in `backend/src/sockets/socketHandler.ts` exports `io`. Emits `telemetry:update` on incoming node reports.
- **Frontend**: `useSocket()` in `frontend/src/hooks/useSocket.ts` listens for `telemetry:update` and triggers React Query invalidation for `['nodes']` and `['alerts']`.
- **Extension Strategy**:
  - Backend emits `session:update` on login/logout events.
  - Backend emits `command:update` on command status changes.
  - Backend emits `lab:update` on lab changes.

---

## 7. Implementation & Verification Status

### Phase 1: Labs and Login/Logout Tracking — COMPLETED
- [x] Lab CRUD endpoints (`GET /api/labs`, `POST /api/labs`, `GET/PUT/DELETE /api/labs/:id`).
- [x] Machine allocation (`assign-by-prefix`, `unassigned/nodes`, batch `PUT /api/nodes/assign`, `PUT /api/nodes/:nodeId/seat`).
- [x] Device schema extended with `labId`, `seat`, `currentUser`.
- [x] `session_tracker.py` created with `psutil.users()` and integrated into `agent.py`.
- [x] `simulator.py` updated with simulated student login/logout cycles.
- [x] Live Seat Map in `frontend/src/pages/Labs.tsx` with color-coded states (Green = Idle, Blue = Active Student, Grey = Offline).
- [x] Stale session sweeper running every 30s (`closedBy = 'agent-offline'`).
- [x] Session history filtering and CSV export streaming (`/api/sessions/export`).
- [x] Lab badges on Monitored Devices in Fleet Overview and Student Sessions tab in Node Inspection Modal.

### Phase 2: Lab-Wide Remote Commands — COMPLETED
- [x] Security: Admin JWT login (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`) with httpOnly cookie and Bearer token fallback.
- [x] `X-Agent-Token` authentication for agent endpoints (`/api/report`, `/api/sessions/*`, `/api/agent/*`).
- [x] Command model with dual-mode store (`CommandSchema` with indexes on `nodeId, status` and `labId, createdAt`).
- [x] Endpoints: `POST /api/labs/:id/commands`, `GET /api/labs/:id/commands`, `GET /api/agent/commands/:nodeId`, `POST /api/agent/commands/:id/ack`.
- [x] Whitelisted actions only (`shutdown`, `restart`, `lock`, `logoff`, `message`, `cancel_shutdown`). Free-form shell injection blocked.
- [x] Input sanitization (message max 200 chars stripped of control characters).
- [x] `command_executor.py` created with OS detection (`win32`, `linux`, `darwin`), using `subprocess.run(args, shell=False)`.
- [x] `simulator.py` handles commands with `status = "done"`, `result = "simulated"`.
- [x] UI Lab Actions Menu with typed lab name confirmation for shutdown/restart, and live "Recent Commands" audit panel.

### Phase 3: Per-Lab Process & Software Policies — COMPLETED
- [x] Policy model & dual-mode store (`PolicySchema`: `name`, `mode`: `blocklist|allowlist`, `processNames`, `action`: `kill|alert_only`, active hours window, active days, `enabled`).
- [x] Core OS process protection: `explorer.exe`, `python.exe`, `systemd`, `init`, etc. cannot be terminated and are rejected upon policy creation.
- [x] Endpoints: `GET/POST /api/policies`, `PUT/DELETE /api/policies/:id`, `GET /api/agent/policy/:nodeId`, `POST/GET /api/violations`.
- [x] `policy_enforcer.py` created with 5s process iteration, PID deduplication, and active time-window checking.
- [x] Violations automatically create `WARNING` alerts in the central Alerts feed and log in the Violations audit table.
- [x] UI "Policies" tab in `Labs.tsx` with policy cards, enable/disable toggle, and live Violations feed.

### Phase 4: Schedules & Per-Lab Reports — COMPLETED
- [x] Schedule model & dual-mode store (`ScheduleSchema`: `labId`, `name`, `type`, `time`, `days`, `payload`, `enabled`, `lastRunAt`).
- [x] 30s background ticker in backend triggering due schedules with single-run per minute guarantee (`lastRunAt`).
- [x] Endpoints: `GET/POST /api/schedules`, `PUT/DELETE /api/schedules/:id`.
- [x] UI "Schedules" tab in `Labs.tsx` with creation modal and enable toggle.
- [x] Lab Utilization Reports on Daily Reports page (`/reports`): 7-day occupancy trend chart, 5x4 weekday peak-hours heatmap, most/least utilized workstations, CSV & Excel export.

### Cross-Cutting & Build Verification — PASSED
- [x] Full build check: `npx tsc -b && vite build` in `frontend/` passes with **0 errors**.
- [x] Full build check: `npm run build` in `backend/` passes with **0 errors**.
- [x] Data retention pruning job scheduled daily for telemetry, sessions, commands, and violations older than `PROCESSSHIELD_RETENTION_DAYS` (default 180 days).
- [x] Complete system documentation updated in `README.md`.
