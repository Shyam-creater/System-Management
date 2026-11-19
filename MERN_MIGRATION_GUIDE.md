# ProcessShield - MERN Stack Architecture & Run Guide

ProcessShield has been fully refactored into a high-performance, modular **MERN Stack** (MongoDB Atlas, Express.js, React 18, Node.js + TypeScript) architecture while preserving 100% of its native Operating System features, algorithms, agents, and UI capabilities.

---

## 1. Directory Structure

```
ProcessShield-main/
│
├── backend/                             # Express.js + TypeScript Backend Server
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts              # MongoDB Atlas connection (Mongoose) with resilient retry
│   │   │   └── environment.ts           # Type-safe environment variables
│   │   ├── models/                      # Mongoose Schema Definitions (replacing SQLite tables)
│   │   │   ├── Device.ts                # Monitored nodes / computers
│   │   │   ├── Telemetry.ts             # Historical node metrics & health
│   │   │   ├── ProcessSnapshot.ts       # Per-node OS process tables
│   │   │   ├── Alert.ts                 # CRITICAL, WARNING, INFO alerts
│   │   │   ├── DailyReport.ts           # Aggregated daily metrics
│   │   │   ├── SoftwareInventory.ts     # Installed software catalog (370+ packages)
│   │   │   ├── SSHNode.ts               # SSH managed nodes
│   │   │   └── AuditLog.ts              # Security & change audit trail
│   │   ├── repositories/                # Dual-mode data layer (Mongo + resilient fallback)
│   │   ├── services/                    # Core business & algorithmic logic
│   │   │   ├── algorithmService.ts      # Wait-For Graph (3-Color DFS) & Banker's Algorithm
│   │   │   ├── softwareService.ts       # Subprocess bridge to software_inventory.py (XLSX/CSV)
│   │   │   ├── telemetryService.ts      # Threshold evaluation, alert dispatch, Socket.IO
│   │   │   ├── deviceService.ts         # Node lifecycle, heartbeat, purge
│   │   │   └── reportService.ts         # Daily report aggregation
│   │   ├── controllers/                 # Express Request Handlers
│   │   ├── routes/                      # RESTful route definitions
│   │   ├── sockets/                     # Socket.IO Gateway for real-time telemetry
│   │   ├── integrations/                # UDP Discovery Server (port 8081)
│   │   ├── jobs/                        # Automated Cron Jobs (daily reports, data pruning)
│   │   └── server.ts                    # Main Application Bootstrap
│   ├── scripts/
│   │   └── migrateSQLiteToMongo.ts      # Automated SQLite -> MongoDB Atlas data migrator
│   ├── .env                             # Environment configuration (MONGODB_URI, PORT)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                            # Vite + React 18 + TypeScript + Tailwind CSS UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx               # Top navigation, status indicator, simulator toggle
│   │   │   └── Sidebar.tsx              # Sidebar navigation links
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx            # Real-time node cards, CPU/RAM/Disk gauges, Process modal
│   │   │   ├── Devices.tsx              # Hardware & simulated node management, purge
│   │   │   ├── Processes.tsx            # Fleet-wide process table with search & filtering
│   │   │   ├── Deadlock.tsx             # Interactive WFG 3-color cycle detection & path trace
│   │   │   ├── BankersAlgorithm.tsx     # Banker's algorithm matrix & dynamic allocation tester
│   │   │   ├── SoftwareInventory.tsx    # Searchable software inventory with Excel/CSV export
│   │   │   ├── Reports.tsx              # Daily aggregated summaries & report generation
│   │   │   └── Alerts.tsx               # Severity alert log (CRITICAL, WARNING, INFO)
│   │   ├── hooks/
│   │   │   └── useSocket.ts             # Live Socket.IO client hook
│   │   ├── services/
│   │   │   └── api.ts                   # Axios REST API client
│   │   ├── App.tsx                      # Main router & layout shell
│   │   └── main.tsx                     # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── native/                              # Native C++ core engine & headers
│   ├── processshield_native.cpp
│   └── Makefile
│
├── agents/                              # Original lightweight standalone agents
│   └── agent.py
│
├── data/                                # Original SQLite database (kept for backup/migration)
│   └── processshield.db
│
├── software_inventory.py                # Standalone Python audit tool & OpenXML generator
├── agent.py                             # Localhost host monitoring daemon
├── simulator.py                         # Multi-node simulated cluster daemon
├── package.json                         # Root project scripts for npm orchestration
└── MERN_MIGRATION_GUIDE.md              # This guide
```

---

## 2. Command Prompt Execution Guide

Open **Command Prompt (`cmd.exe`)** or **PowerShell** in the project directory:
`cd C:\Users\Administrator\Downloads\ProcessShield-main-20261110T055040Z-1-001\ProcessShield-main`

### Option A: Run from Project Root (Recommended)

1. **Start the Backend Server (Port 5000):**
   ```cmd
   npm run dev:backend
   ```

2. **Start the Frontend UI (Port 5173):**
   *(In a new Command Prompt window)*
   ```cmd
   npm run dev:frontend
   ```

3. **Start the Monitoring Agent (Streams local computer hardware & processes):**
   *(In a new Command Prompt window)*
   ```cmd
   npm run agent
   ```

4. **(Optional) Start the Multi-Node Cluster Simulator:**
   *(In a new Command Prompt window)*
   ```cmd
   npm run simulator
   ```

5. **(Optional) Run Native Algorithm Verification Tests:**
   ```cmd
   npm run test:algorithms
   ```

---

### Option B: Run Inside Individual Folders

#### Backend:
```cmd
cd backend
npm install
npm run dev
```
*Backend runs at:* `http://localhost:5000`
- REST API: `http://localhost:5000/api/nodes`
- System Status: `http://localhost:5000/api/status`
- WebSocket Server: `ws://localhost:5000`
- UDP Discovery: Listening on `0.0.0.0:8081`

#### Frontend:
```cmd
cd frontend
npm install
npm run dev
```
*Frontend runs at:* `http://localhost:5173`

---

## 3. MongoDB Atlas Configuration & Migration

The backend is configured with your connection URI in `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://System_Management:DaXcdJIb8sy41iFf@cluster0.rfz95.mongodb.net/System_Management?retryWrites=true&w=majority
```

### Whitelisting Your IP in MongoDB Atlas:
MongoDB Atlas requires your current public IP address to be whitelisted before connections can be established:
1. Log in to your [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Navigate to **Security** -> **Network Access**.
3. Click **Add IP Address**.
4. Either add your current public IP (`182.66.218.97`) or allow access from anywhere (`0.0.0.0/0`) for development.
5. Click **Confirm**.

### Running the SQLite -> MongoDB Migration Script:
Once your IP is whitelisted on Atlas, migrate all your existing devices, telemetry, software inventory, alerts, and reports from SQLite into MongoDB with one command:
```cmd
cd backend
npm run migrate
```
Or from root:
```cmd
npm run migrate
```

---

## 4. Built-in Operating System Algorithms

1. **Wait-For Graph (WFG) Deadlock Detection:**
   - Evaluates process resource wait-for dependencies.
   - Executes $O(V+E)$ Three-Color Depth-First Search (`WHITE`, `GRAY`, `BLACK`) to detect circular wait conditions.
   - Extracts exact cycle paths (e.g., $P_1 \to P_2 \to P_0 \to P_1$) for visualization and automated mitigation.
   - Available via API `POST /api/algorithms/deadlock` and interactive UI at `/deadlock`.

2. **Dijkstra's Banker's Algorithm (Deadlock Avoidance):**
   - Implements multi-resource safety verification ($O(M \times N^2)$).
   - Generates safe process execution sequences (e.g., $\langle P_1, P_3, P_4, P_0, P_2 \rangle$).
   - Simulates hypothetical dynamic resource requests and tests for safety before granting, rolling back state if unsafe.
   - Available via API `POST /api/algorithms/bankers` and `/api/algorithms/bankers/request` and interactive UI at `/bankers`.

3. **Software Inventory & Audit:**
   - Scans 370+ native Windows applications and registry entries via `software_inventory.py`.
   - Generates direct Excel (`.xlsx`) spreadsheets via custom OpenXML generation and standard CSV exports.
   - Available via UI at `/software` and API `GET /api/export/excel?type=software&format=xlsx`.
