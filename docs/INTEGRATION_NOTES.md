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
