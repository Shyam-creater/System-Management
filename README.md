# ProcessShield — Intelligent Process Resource Guardian & Distributed Fleet Monitor

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite%20%7C%20TailwindCSS-blue.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20Socket.IO-68a063.svg)]()
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas%20%7C%20Resilient%20Dual--Mode-47a248.svg)]()
[![Telemetry Agent](https://img.shields.io/badge/Agent-Python%203%20%7C%20UDP%20Discovery-3776ab.svg)]()
[![OS Principles](https://img.shields.io/badge/Core%20Algorithms-DFS%20WFG%20Cycle%20Detection%20%7C%20Banker's%20Safety-purple.svg)]()

ProcessShield is an enterprise-grade, distributed Operating Systems resource monitoring, process supervision, and deadlock analysis platform. It pairs classical Operating Systems theoretical principles (Resource Allocation Graphs, Wait-For Graph cycle detection, Dijkstra's Banker's Algorithm, POSIX process signals) with a modern, real-time distributed architecture featuring a premium white-and-blue web dashboard.

---

## 🌟 Executive Summary & Completed Work

### 1. Modern White-and-Blue UI Redesign
The entire frontend has been redesigned to deliver a light-mode aesthetic matching the ProcessShield reference design:
* **Color System**: Crisp slate-white surfaces (`#ffffff`), soft cool-grey canvas (`#f0f4f9`), electric blue brand accents (`#1d68ff`), and emerald/amber/rose semantic status indicators.
* **Ambient Lighting**: Subtle fluid blue radial blur gradient in the top-right corner.
* **Component Elevation**: Custom border treatments (`border-slate-200/80`), rounded cards (`rounded-2xl`, `rounded-3xl`), and soft ambient drop shadows (`shadow-[0_2px_12px_rgba(0,0,0,0.03)]`).
* **Sidebar Navigation**: Dedicated fixed left sidebar featuring the ProcessShield brand emblem, the 3 core application views, and the live "System Online" device counter pill.
* **Top Header**: Global search bar with `⌘K` keyboard shortcut, `+ Add Node` quick modal trigger, live `Atlas: Active` database status pill, alert notification bell with red dot, and administrator profile dropdown.

### 2. Primary Navigation Views (Sidebar & Lab Hub)
Reflecting the streamlined layout and the College Lab Management Extension:
1. **`Dashboard` (`/`)**: Comprehensive real-time dashboard powered 100% by live backend telemetry without mock data — displaying live host CPU load, real RAM allocation, live process count, active alert feeds, dynamic historical AreaCharts, Donut resource distribution, top monitored processes with vector brand icons, connected workstations with lab badges & active student tags, and true host system hardware specifications.
2. **`Computer Labs` (`/labs`)**: Department lab allocation hub containing dedicated sub-sections for each individual computer lab room:
   * **`Live Seat Map`**: Real-time visual workstation grid with rich **graph-style cards** matching the reference implementation:
     * **Dynamic Progress Bar Graphs**: Real-time progress bars with percentage badges for **CPU Utilization**, **GPU Utilization** (with hardware model identification, e.g. NVIDIA RTX A4000), **RAM Usage** (used / total GB and percentage), and **Storage** (used / total GB and percentage).
     * **Workstation Status & Badges**: Prominent health status pills (`HEALTHY`, `WARNING`, `CRITICAL`, `OFFLINE`), system classification tags (`★ REAL SYSTEM`, `★ SSH AGENTLESS`, `SIMULATED VM`), IP and hardware MAC details, and editable seat numbers.
     * **Instant Workstation Shortcuts**: One-click action buttons on every card to launch **Processes**, **Reports**, **Software**, and direct **Excel** telemetry export (`.csv` / `.xlsx`).
   * **`Processes`**: Fleet-wide process supervision and thread tracking integrated directly into each lab room:
     * Target workstation dropdown filter (inspect "All Workstations" across the lab or drill into an individual node).
     * Instant real-time search input for process name, PID, or user.
     * Category filter pills (`All`, `User Applications`, `System Daemons`).
     * Comprehensive telemetry table showing PID, workstation name, seat number, process name with vector icon, user, category badge, CPU % with mini progress bar, memory RSS allocation, and execution state.
   * **`Daily Reports`**: Daily performance and hardware audit reports scoped specifically to the workstations in that lab:
     * Full hardware telemetry tracking with **`Avg GPU`** and **`Peak GPU`** columns alongside `Avg CPU`, `Peak CPU`, `Avg Memory`, `Peak Memory`, and `Uptime`.
     * Instant on-demand report generation (`Generate Daily Report`) with automatic fallback to live hardware metrics.
     * Dedicated Excel (`.xlsx`) and CSV streaming download buttons.
   * **`Software Inventory`**: Deep application inventory scoped per lab workstation, with search filtering, category pills (`All`, `Desktop Apps`, `Development`, `System`, `Snap`), "Rescan Workstation" trigger, and Excel (`.xlsx`) / CSV exports.
   * **`Schedules`**: Time-based lab schedules for automated end-of-day shutdowns, screen locks, or class reminder announcements.

---

### 🏛️ 3. College Computer Lab Management Extension
ProcessShield provides an end-to-end management suite for university and college computer laboratories:
* **Lab Grouping & Allocation**:
  * Organize workstations into physical department labs (e.g. "Computer Science Lab 1", "AI & Data Science Lab 2").
  * Fast machine binding by hostname prefix (e.g. bind all `Ubuntu-*` nodes to CS Lab).
  * Interactive seat renumbering per desktop (`Seat #1`, `Seat #2`, ...).
* **Student Session Tracking (`session_tracker.py`)**:
  * Real-time student login/logout detection via `psutil.users()` running in background daemon threads.
  * Live Socket.IO seat map updates: desktop tiles turn active blue with the student username within 5 seconds of login, and return to green on logout.
  * Stale session sweeper closes unannounced disconnections (`closedBy = 'agent-offline'`) within 60 seconds.
  * Complete student login history with duration calculation, student search, active-only filters, and streaming CSV download.
* **Remote Lab-Wide Commands (`command_executor.py`)**:
  * Secure lab actions executed with strict argument lists without shell injection (`shell=False`):
    * 🔴 **Shut Down Lab**: Delayed graceful shutdown (default 60s) with required typed lab-name safety confirmation.
    * 🔄 **Restart Lab**: Delayed graceful restart with typed confirmation.
    * 🔒 **Lock Screens**: Instantly locks workstation displays (`rundll32` on Windows, `loginctl` on Linux).
    * 🚪 **Log Off Users**: Cleanly terminates active student sessions.
    * 💬 **Broadcast Announcement**: Sends native desktop popups (Windows `msg *`, Linux `wall`, macOS `osascript`).
    * 🛑 **Cancel Shutdown**: Aborts timed shutdowns (`shutdown /a` on Windows, `shutdown -c` on Linux).
  * Live "Recent Commands" audit panel with per-machine execution tracking (`pending`, `sent`, `done`, `failed`, `skipped`).
  * Simulated machines acknowledge commands with `result = "simulated"` without touching the host OS.
* **Process & Application Policies (`policy_enforcer.py`)**:
  * Enforce Blocklists (e.g. terminate `utorrent.exe`, `steam.exe`) or Allowlists per lab.
  * Enforce active class time windows (e.g. `09:00` - `17:00`) and active weekdays.
  * Safety-guarded: protected OS processes (`explorer.exe`, `python.exe`, `systemd`, `init`, PID < 100) are never killed and cannot be added to policies.
  * Violations automatically generate `WARNING` alerts in the central Alerts feed and are logged in the Violations audit table.
* **Automated Lab Schedules**:
  * Background scheduler running a 30s ticker to trigger automated lab shutdowns, screen locks, or warning messages at specific times on designated days.
  * Guaranteed single-execution per minute (`lastRunAt` tracking prevents duplicate triggers across server restarts).
* **Lab Utilization Reports & Heatmaps (`/reports`)**:
  * 7-day occupancy trajectories (hours and student sessions).
  * Peak-hours heatmap: 5 weekdays x 4 time blocks with dynamic heat intensity.
  * Most-utilized and least-utilized workstations ranking.
  * Direct CSV and Excel export triggers.

---

## 🏗️ System Architecture

ProcessShield operates as a coordinated multi-tier distributed monitoring system:

```
    ┌───────────────────────────────────────────────────────────────┐
    │                ProcessShield React Web UI                    │
    │        (React 19, TypeScript, Vite, Tailwind CSS)             │
    │         http://localhost:5000  /  http://localhost:5174       │
    └───────────────▲───────────────────────────────▲───────────────┘
                    │ REST API                      │ Socket.IO
                    ▼                               ▼
    ┌───────────────────────────────────────────────────────────────┐
    │             ProcessShield Master Server (Backend)             │
    │       (Node.js / Express, Socket.IO, UDP Beacon :8081)       │
    │                    http://localhost:5000                      │
    └───────┬───────────────────────────────┬───────────────────────┘
            │                               │
            ▼                               ▼
 ┌──────────────────────┐        ┌──────────────────────────────────┐
 │    Storage Layer     │        │    Hardware Monitoring Agents    │
 │  MongoDB Atlas Cloud │        │  - Python Agent (agent.py)       │
 │  + In-Memory Backup  │        │  - C++ Native Agent              │
 └──────────────────────┘        │  - Simulator Fleet (simulator.py)│
                                 └──────────────────────────────────┘
```

---

## 🚀 Key Modules & Completed Features

### 🖥️ 1. Fleet Overview Dashboard (`/`)
* **Top 4 Metric Cards**:
  * **CPU Usage**: Live percentage gauge, hour-over-hour trend indicator, processor icon, and animated blue SVG sparkline.
  * **Memory Usage**: Real-time Used RAM vs Total RAM (e.g. `5.40 GB / 62.50 GB`), utilization percentage, and blue SVG sparkline.
  * **Active Processes**: Real-time process count, trend delta, stack icon, and sparkline.
  * **Active Alerts**: Real-time active alert count, severity delta, alert icon, and rose sparkline.
* **Middle Analytics Row**:
  * **System Overview**: Interactive multi-horizon AreaChart with dual smooth gradient curves for CPU and RAM load trajectories, and time-range filters (`Live`, `1H`, `6H`, `24H`, `7D`).
  * **Resource Distribution**: Donut chart with memory used percentage centered inside the donut ring, alongside a side-by-side Used, Free, and Total memory legend.
  * **Recent Alerts**: Feed of recent events with color-coded severity pills (`CRITICAL`, `WARNING`, `INFO`) and timestamps.
* **Bottom Data Row**:
  * **Top Processes (CPU)**: Real-time table displaying PID, process name with application icons (VS Code, Chrome, Node.js, Python, Systemd), CPU %, RSS memory formatting (MB/GB), and state pills (`RUNNING`, `SLEEPING`).
  * **Monitored Devices**: Workstations roster with OS icons ( macOS, 🐧 Linux, 田 Windows, 📦 Simulated), IP addresses, live utilization stats, and `Online` badges.
  * **System Information**: Host specs card displaying Platform (`macOS` / `Windows NT` / `Linux`), CPU model & cores, Memory pool, Storage utilization, Uptime, and Network LAN IP.
* **Interactive Node Inspection Modal**: Clicking any monitored device opens a detailed inspection modal featuring live CPU/RAM gauges and 7-day historical telemetry charts.

---

### 📋 2. Daily Performance Reports (`/reports`)
* **Computer Selector Grid**: Cards for each monitored workstation showing hostname, IP address, OS type, and current status.
* **Historical Metrics**: Detailed daily summaries including:
  * Average CPU & Peak CPU utilization
  * Average RAM & Peak RAM utilization
  * Storage usage and disk load
  * System Uptime percentage
  * Logged warning and critical incident counts
* **On-Demand Generation**: Instant **⚡ Generate Daily Report Now** trigger to audit performance on demand.

---

### 📦 3. Installed Software & Version Inventory (`/software`)
* **Cross-Platform Software Discovery Engine**:
  * **Windows**: Traverses Windows Registry Uninstall hives (`HKLM`, `HKCU`, and 32-bit `Wow6432Node`) to discover installed software, versions, publishers, and install dates.
  * **Linux**: Discovers XDG `.desktop` specifications, AppImage binaries, Canonical Snap packages (`/var/lib/snapd/sequence`), Flatpak packages, and Debian/Ubuntu `dpkg` packages.
  * **macOS**: Queries `system_profiler SPApplicationsDataType` and application bundles in `/Applications` and `~/Applications`.
* **Real-Time Catalog**: Search by application name, category filter, column sorting, and pagination.
* **Instant Export**:
  * **Excel (`.xlsx`)**: Native ISO/IEC 29500 OpenXML generation using Python's standard `zipfile` module (zero third-party dependencies). Formatted navy blue header (`#1F4E78`), zebra striping, and inline string versioning.
  * **CSV**: Clean standard CSV format for scripting and data pipelines.
* **On-Demand Audit**: **🔄 Rescan System** button triggers an immediate hardware audit.

---

### 🛡️ 4. Operating Systems Theoretical Principles & Algorithms
All core Operating Systems modules and algorithms remain fully integrated and functional:
* **Wait-For Graph (WFG) & Deadlock Simulator (`/deadlock`)**:
  * 3-Color Depth-First Search (DFS) Cycle Detection Algorithm ($O(V + E)$).
  * Classifies nodes into `WHITE` (unvisited), `GRAY` (currently visiting / on recursive stack), and `BLACK` (fully explored).
  * Automatically detects circular wait dependencies and reconstructs cycle paths.
* **Banker's Algorithm Deadlock Avoidance (`/bankers`)**:
  * Dijkstra's Banker's Algorithm with Allocation, Max, and Need matrices ($Need = Max - Allocation$).
  * Computes safe execution sequences to prevent deadlocks.
  * Dynamic resource request testing with automatic state rollback if unsafe.
* **Process Controller (`/controller`)**:
  * POSIX signal delivery (`SIGSTOP` to pause, `SIGCONT` to resume, `SIGTERM` for graceful exit, `SIGKILL` for immediate termination).
  * Safety prompts preventing accidental termination of system-critical processes.
* **CPU & Memory Analyzers (`/cpu-analyzer`, `/memory-analyzer`)**:
  * Dynamic threshold detection and core-by-core gauge utilization.
  * RSS physical resident memory tracking vs virtual memory address space.

---

## 🔌 REST API & Communication Endpoints

### Core Fleet & Telemetry
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/status` | `GET` | Master server status, MongoDB Atlas connectivity, and host info. |
| `/api/nodes` | `GET` | Fleet summary, connected nodes, online/offline counts, labId, and live stats. |
| `/api/nodes/:nodeId` | `GET` | Telemetry details, seat number, and processes for a specific monitored node. |
| `/api/nodes/:nodeId/history` | `GET` | Historical telemetry records (configurable hours, e.g. 168h for 7 days). |
| `/api/report` | `POST` | Hardware agent ingestion endpoint for streaming CPU, RAM, disk, and processes. |
| `/api/alerts` | `GET` | Centralized alert feed (`CRITICAL`, `WARNING`, `INFO`). |
| `/api/reports` | `GET` | Daily reports by computer. |
| `/api/reports/generate` | `POST` | On-demand generation of daily performance reports. |
| `/api/software` | `GET` | Installed software catalog with version, publisher, and category. |
| `/api/software/rescan` | `POST` | Triggers a fresh hardware inventory scan. |
| `/api/export/excel` | `GET` | Downloads `.xlsx` or `.csv` software inventory exports. |
| `/api/process/action` | `POST` | Sends process control signals (`SIGSTOP`, `SIGCONT`, `SIGTERM`, `SIGKILL`). |
| `/api/nodes/purge-offline` | `POST` | Purges decommissioned or offline nodes from the active roster. |

### Computer Labs & Session Tracking
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/labs` | `GET` | Labs list with total, online, and inUse workstation counts + unassigned count. |
| `/api/labs` | `POST` | Create a computer lab (`name`, `description`, `capacity`, `prefix`). |
| `/api/labs/:id` | `GET/PUT/DELETE` | Lab detail, update, or safe deletion (unassigns workstations). |
| `/api/labs/:id/overview` | `GET` | Workstations in the lab with online state, CPU, RAM, seat, and active student user. |
| `/api/labs/:id/usage?days=7` | `GET` | Per-day occupancy sessions, hours, and unique student users. |
| `/api/labs/:id/assign-by-prefix` | `POST` | Binds workstations to the lab matching a hostname prefix. |
| `/api/labs/unassigned/nodes` | `GET` | Lists all unassigned workstations awaiting lab allocation. |
| `/api/nodes/assign` | `PUT` | Batch assign workstations to a lab: `{ nodeIds[], labId }`. |
| `/api/nodes/:nodeId/seat` | `PUT` | Updates physical seat number for a workstation. |
| `/api/sessions/event` | `POST` | Agent reports login/logout event: `{ nodeId, event, username, ts }`. |
| `/api/sessions/sync` | `POST` | Agent startup sync of active logged-in users. |
| `/api/sessions` | `GET` | Query login/logout history with filters (`labId`, `nodeId`, `username`, `active`). |
| `/api/sessions/export` | `GET` | Streaming CSV download of session history matching query filters. |

### Remote Commands & Security
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/auth/login` | `POST` | Admin authentication (`admin` / `admin123`). Returns JWT and sets httpOnly cookie. |
| `/api/auth/me` | `GET` | Verifies current admin session authentication state. |
| `/api/auth/logout` | `POST` | Clears admin session authentication cookie. |
| `/api/labs/:id/commands` | `POST` | Admin: Dispatches command (`shutdown`, `restart`, `lock`, `logoff`, `message`, `cancel_shutdown`). |
| `/api/labs/:id/commands` | `GET` | Command execution history with per-machine status for the lab. |
| `/api/agent/commands/:nodeId`| `GET` | Agent polling: fetches pending commands and marks them `sent`. |
| `/api/agent/commands/:id/ack` | `POST` | Agent reports execution outcome: `{ status: done\|failed, result }`. |

### Process Policies & Schedules
| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/policies` | `GET/POST` | List or create process blocklists/allowlists with active hours & days. |
| `/api/policies/:id` | `PUT/DELETE` | Update policy or toggle enable/disable. |
| `/api/agent/policy/:nodeId` | `GET` | Effective policy rules (global + lab specific) fetched by agent enforcer. |
| `/api/violations` | `POST` | Agent reports restricted process termination or alert: `{ nodeId, username, processName, action }`. |
| `/api/violations` | `GET` | Audit log of all policy violations across labs. |
| `/api/schedules` | `GET/POST` | Automated power and announcement schedules (`shutdown`, `message`, `lock`). |
| `/api/schedules/:id` | `PUT/DELETE` | Update schedule or toggle enable/disable. |

---

## 🏃 Quickstart & Running the Project

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: 3.9+ with `psutil` (e.g. Anaconda or standard Python 3)
* **npm**: v9.0.0 or higher

---

### Step 1: Start the Backend Master Server
From the root directory:
```bash
cd ProcessShield-main/backend
npm install
npm run dev
```
* **Server Port**: `http://localhost:5000`
* **Features**: Serves the REST API, Socket.IO real-time stream, UDP Auto-Discovery beacon (`0.0.0.0:8081`), and production frontend bundle from `frontend/dist`.
* **Database**: Automatically connects to MongoDB Atlas with auto-retry and in-memory dual-mode fallback.

---

### Step 2: Start the Frontend Application (Vite Dev Server)
In a separate terminal:
```bash
cd ProcessShield-main/frontend
npm install
npm run dev
```
* **Vite Dev Server**: `http://localhost:5174` (or `http://localhost:5000` for production build)
* **Build Check**:
  ```bash
  npm run build
  ```
  *(Compiles TypeScript and bundles production assets into `frontend/dist` with 0 errors)*.

---

### Step 3: Run the Hardware Telemetry Agent
To monitor your host computer and stream live CPU, RAM, disk, and process telemetry:
```bash
# In the ProcessShield-main directory
python agent.py --server http://127.0.0.1:5000
```
* The agent automatically samples host resources every 5 seconds and pushes telemetry to `/api/report`.
* The dashboard immediately updates live with your computer's real metrics!

---

### Step 4 (Optional): Run the Simulation Fleet
To test distributed fleet monitoring without additional physical hardware:
```bash
python simulator.py --server http://127.0.0.1:5000
```
* Spawns virtual test nodes (`Ubuntu-Node-01`, `Windows-Dev-01`, `Simulator-Node-01`) with simulated workloads.

---

## 📂 Project Structure

```
ProcessShield-main/
├── README.md                   # Comprehensive project documentation
├── agent.py                    # Python hardware telemetry agent with auto-discovery
├── simulator.py                # Multi-node simulation cluster runner
├── master_server.py            # Legacy Python master server
├── software_inventory.py       # Cross-platform software discovery & Excel exporter
│
├── backend/                    # Node.js Express REST API & Socket.IO server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts           # Express server, UDP beacon, MongoDB & Socket.IO
│       └── ...
│
├── frontend/                   # Modern React 19 + TypeScript + Vite + Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── app/
│       │   ├── App.tsx         # Main layout with Left Sidebar & Top Navbar
│       │   └── router.tsx      # Application routing
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx  # Header with Search, Add Node, Atlas, Profile
│       │   │   ├── Sidebar.tsx # Left Sidebar with 3 core menus & System Online card
│       │   │   └── PageHeader.tsx # Header title with blue accent & live timestamp
│       │   └── modals/
│       │       └── AddComputerModal.tsx # SSH node connection modal
│       ├── pages/
│       │   ├── Dashboard.tsx   # Fleet Overview dashboard (cards, charts, tables)
│       │   ├── Reports.tsx     # Daily Performance Reports
│       │   ├── SoftwareInventory.tsx # Installed Software Catalog & Excel export
│       │   ├── Deadlock.tsx    # DFS Wait-For Graph cycle detector
│       │   ├── BankersAlgorithm.tsx # Banker's safety & resource requests
│       │   ├── ProcessController.tsx # POSIX process supervisor
│       │   ├── CPUAnalyzer.tsx # CPU utilization & thread load
│       │   ├── MemoryAnalyzer.tsx # RSS RAM & commit ratios
│       │   ├── Alerts.tsx      # Notification & alert audit log
│       │   └── SettingsPage.tsx# System settings & Atlas connectivity
│       └── services/
│           └── api.ts          # Axios API client
│
├── web/
│   └── index.html              # Reference HTML layout with 3 navigation views
│
└── src/                        # Native C++ core algorithms & tests
    ├── main.cpp
    ├── WaitForGraph.cpp
    ├── BankersAlgorithm.cpp
    └── ...
```

---

## 🧪 Verification & Health Check

* **TypeScript & Vite Compilation**: `tsc -b && vite build` passes cleanly with **zero warnings and zero errors**.
* **Live Services**:
  * Backend API & Web Server: `http://localhost:5000` (Online)
  * Vite Frontend Server: `http://localhost:5174` (Online)
  * Hardware Agent: Active & streaming real host metrics
  * MongoDB Atlas: Connected with auto-retry resilience
* **Browser Test**: Navigating to `http://localhost:5000/` displays the redesigned white-and-blue ProcessShield dashboard, the 3 sidebar views, and live telemetry.
