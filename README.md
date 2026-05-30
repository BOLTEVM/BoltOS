<p align="center">
  <img src="0logov3.png" alt="Bolt10 OS Logo" width="160" />
</p>

<h1 align="center">Bolt10 OS (BoltOS)</h1>

<p align="center">
  <strong>The Next-Generation Decentralized Desktop Downloader, Installer, Launcher, & Diagnostics Center for the BOLTEVM Multimedia Mine Suite.</strong>
</p>

<p align="center">
  <a href="https://github.com/BOLTEVM/BoltOS/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License MIT" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22.11.0-green.svg" alt="Node Support" /></a>
  <a href="https://riot.js.org/"><img src="https://img.shields.io/badge/riot-10.1.4-red.svg" alt="Riot.js 10" /></a>
  <a href="https://sqlite.org/"><img src="https://img.shields.io/badge/sqlite-better--sqlite3-orange.svg" alt="SQLite Backend" /></a>
</p>

---

## 🖥️ Project Overview

**Bolt10 OS (BoltOS)** is a premium, high-fidelity browser-based desktop environment meticulously engineered to manage, download, install, run, and diagnose all twelve decentralized applications (dApps) in the **BOLTEVM Multimedia Mine Suite**. 

Built utilizing **Riot.js 10** and **Vite** on the frontend, and backed by an ultra-fast **Node.js** Express server utilizing **better-sqlite3** and high-speed **WebSockets** on the backend, Bolt10 OS integrates directly with your physical Windows workspace directory (`C:/Users/wonfi/Documents`) to deliver seamless self-custody operations with zero overhead and premium industrial aesthetics.

Designed with a sleek, vintage-modern **Windows 10 styling paradigm (Bolt10)**, the interface presents a cohesive operating environment including acrylic glassmorphic windows, customized Start Menu Live Tiles, search filters, system trays, dynamic telemetry logs, and a self-updating patcher.

---

## 📸 Premium Visual spec & Fluent UX Features

*   **Acrylic Glassmorphism System**: Implemented using premium vanilla CSS filter chains (`backdrop-filter: blur(25px) saturate(180%)`) with HSL tailored neon-accented borders and subtle glass glares.
*   **Customizable Theme Accent Colors**: Change desktop accent configurations instantly. Choose between Neon Teal, Cyber Pink, Deep Amber, Bolt Orange, and Volt Green. Settings are persisted directly into the SQLite database.
*   **Start Menu with Live Telemetry Tiles**: 
    *   **Sparklines Telemetry**: Dynamic Real-Time CPU load simulator drawing responsive canvas charts.
    *   **Database Metrics**: Live telemetry counter rendering total SQLite records processed.
    *   **System Status**: Aggregated online/offline application counters.
    *   **Clock Tile**: Live updating digital local clocks.
*   **Start Button Micro-Animations**: Smooth transition from Windows-inspired `0.png` logo to the premium `0logov3.png` orange Bolt logo on cursor hover.
*   **Draggable & Resizable Window Manager**: Absolute coordinate tracking with viewport collision boundary protection. Supports cascading focus levels (active/inactive z-indexing), maximizing, minimizing to taskbar, and closing.
*   **Cortana-Inspired Search & Assistant**: Full search-filtering across all 12 tools instantly, with a responsive voice/text Cortana Orb.
*   **Functional System Tray & Action Center**:
    *   Dynamic Wifi Signal level.
    *   Master Speaker Volume slider.
    *   Local Battery Charge status indicators.
    *   System diagnostics slider popups.
    *   Instant restart/shutdown triggers.

---

## 🛠️ Key Architectural Components

```
                          +------------------------------------------+
                          |        Bolt10 OS UI (Riot.js + Vite)     |
                          |  - Grid Shortcuts   - Drag Windows       |
                          |  - Live Tiles Clock - Taskbar Tray       |
                          +--------------------+---------------------+
                                               ^
                                               | WebSocket Log Streams & Ping Metrics
                                               v
                          +--------------------+---------------------+
                          |      Express & WebSocket Server (Node)   |
                          |  - Process Spawner  - SQLite Telemetry   |
                          |  - Port Injector    - Git Fetcher/Puller |
                          +--------------------+---------------------+
                                               ^
                                               | Spawns & Injects env.PORT
                                               v
                          +--------------------+---------------------+
                          |     12 Multimedia Suite dApps (Local)    |
                          |  - DAWDevOps        - bqrl (QRL)         |
                          |  - b3js             - bquai (Quai), etc. |
                          +------------------------------------------+
```

### 1. Robust Child-Process Launcher Engine
*   **One-Click Auto-Installers**: Detects local folders automatically. If a repository is missing, it clones the respective repository via `git clone` and automatically initiates dependency setups (`npm install`, `pnpm install`, or `bun install`) inside background child threads.
*   **Stdout/Stderr WebSocket Streamer**: Spawns application instances asynchronously using native Windows cmd process trees. Streams raw terminal data over high-speed WebSockets directly to the browser client's integrated retro-style CRT command terminal.
*   **Graceful Shutdown**: Utilizes Windows command-line process tree killers (`taskkill /t /f /pid`) to ensure all background Node, Vite, or Python child loops are safely terminated on window close, preventing stray background port hogs.
*   **Dynamic Environment Port Injection**: Fully customize the default local ports of your applications before launching. The server automatically overrides and binds the specified port via `process.env.PORT` injection, compatible out-of-the-box with Express, Vite, Fastify, Next.js, and FastAPI.
*   **Active Port Latency Telemetry**: Continuously pings the active local port of booted applications to calculate delay telemetries (e.g. `12ms (Online)`) in real-time.

### 2. better-sqlite3 Database & Diagnostics
*   Uses a fast, single-process, local SQLite database (`bolt_launcher.db`) to persist configuration values, accents settings, workspace folders, and log records.
*   Provides robust server diagnostics telemetry:
    *   **Resident Set Size (RSS)** Memory tracking
    *   **V8 Heap Allocations** (Allocated vs. Used)
    *   **Server Uptime** tracking
    *   **WebSocket Telemetry** (Active clients, message throughput)

### 3. Self-Updating Git Patcher & Installer
*   Dedicated **Bolt10 Update Center** nested inside settings panel.
*   Runs `git fetch origin`, compares local commit hashes (`git rev-parse HEAD`) with remote origin tracking branch hashes (`git rev-parse origin/main`), and calculates how many commits behind the local repository is, displaying an active list of changelogs.
*   On update request, triggers a background git pull (`git pull`), reinstalls node modules (`bun install`), compiles client production assets (`bun run build`), and sends a WebSocket state reload broadcast to automatically refresh all active user browsers.

---

## 📁 Repository Directory Structure

```
boltOS/
├── dist/                          # Vite compiled frontend assets (Express serves here)
├── src/
│   ├── components/
│   │   ├── bolt10-desktop.riot    # Desktop canvas, taskbar clock, start menu tiles, tray icons
│   │   ├── bolt10-window.riot     # Draggable & resizable window wrapper tracking cursor
│   │   ├── tool-view.riot         # Technical details, health pings, custom ports input, CRT console
│   │   └── settings-view.riot     # Colors selectors, system diagnostics, Git Patcher Center
│   ├── css/
│   │   └── bolt10.css             # Acrylic blur system, grid borders, neon green logs, slides
│   └── main.js                    # Riot app bootstrap, registration, and global websocket emitters
├── 0.png                          # Win10 3D blue square start button logo
├── 0logov3.png                    # Custom Bolt Start button hover logo
├── BOLT.JPG                       # High-res square 3D studio background
├── bolt_launcher.db               # SQLite database (better-sqlite3)
├── package.json                   # Dependencies, ES Modules, and launch scripts
├── server.js                      # Express API, WS log stream, process spawners, git patchers
└── vite.config.js                 # Vite compilation plugins (rollup-plugin-riot)
```

---

## 🚀 Local Installation & Boot Spec

### Prerequisites
*   **Node.js**: `v22.11.0` or higher
*   **Bun**: `v1.0.0` or higher (recommended for fast package installation)
*   **Git**: Configured on Windows environment path

### Installation & Setup

1. **Clone this repository** into your Windows Documents directory:
   ```bash
   cd C:\Users\wonfi\Documents
   git clone https://github.com/BOLTEVM/BoltOS.git boltos
   cd boltos
   ```

2. **Install all development and runtime dependencies**:
   ```bash
   bun install
   # Or: npm install
   ```

3. **Compile the Riot.js frontend bundle assets**:
   ```bash
   bun run build
   ```

4. **Launch the local Express database server**:
   ```bash
   node server.js
   ```

5. **Open your browser** and explore your new decentralized workspace:
   👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🎛️ The Twelve Suite Applications Spec

Each application is expected to reside in `C:\Users\wonfi\Documents\<Workspace Folder>` and will be executed by Bolt10 OS using the configured command and port.

| ID | Name | Workspace Folder | Default Port | Launch Command | Tech Stack Substrate |
|---|---|---|---|---|---|
| **1** | **BOLT DAW** | `DAWDevOps` | `3000` | `pnpm dev` (in frontend) | Tone.js 15, Next.js 16, Lit Components, SpacetimeDB |
| **2** | **VST Web Synth** | `VSTDevOps` | `3001` | `pnpm dev` | Web Audio API, Next.js 15, WebMIDI API |
| **3** | **Chainvas** | `BOLTChainvas` | `3002` | `npm run dev` | Canvas 2D, WebGL 2.0, SpacetimeDB, Hardhat |
| **4** | **BOLTDelta CLOB DEX** | `bdelta` | `3003` | `pnpm dev` | Next.js 16, SpacetimeDB, Pyth Hermes, face-api.js |
| **5** | **BOLT XR Spatial Wallet** | `Handtracking Wallet` | `3004` | `pnpm dev` | Three.js, React Three Fiber, WebXR, Cannon-es |
| **6** | **BOLTWallet OWS Gateway** | `boltows` | `3005` | `npm run dev` | Rust FFI, Expo, React Native, Vite |
| **7** | **B3JS Game Engine** | `b3js` | `5173` | `bun run dev` (in web) | Three.js, Cannon-es, SpacetimeDB, Pyodide WASM |
| **8** | **BOLTEVM World Generator** | `BOLTEVMWorldGenerator` | `3006` | `npm run dev` | Three.js, PhysX WASM, Fastify, Node.js 22+ |
| **9** | **BTAI Talent Escrow** | `bai` | `3007` | `npm run dev` | Next.js 16, Privy.io, Vyper, Hardhat, Python |
| **10** | **Quai Network Miner** | `bquai` | `3008` | `npm run dev` | Next.js 14, Cyprus-1 RPC, CMake Wrapper |
| **11** | **QRL Miner Core** | `bqrl` | `8000` | `npm run dev` | RandomX, XMRig substrate, FastAPI, WebSockets |
| **12** | **bfractal Command Center** | `bfractal` | `8001` | `npm run dev` | WSL, FastAPI, Preact & Vite, Bun |

---

## 🐙 Git Deployment Instructions

To push the complete, fully operational Bolt10 OS repository directly to the BOLTEVM organization:

1. **Initialize Git Repository**:
   ```bash
   git init
   ```

2. **Stage All Resources**:
   ```bash
   git add .
   ```

3. **Commit Release**:
   ```bash
   git commit -m "feat: initial release of Bolt10 OS Launcher & Self-Patcher"
   ```

4. **Link Remote and Rename Main Branch**:
   ```bash
   git remote add origin https://github.com/BOLTEVM/BoltOS.git
   git branch -M main
   ```

5. **Push to Remote Main**:
   ```bash
   git push -u origin main
   ```

---

## ⚖️ License

Licensed under the **MIT License**. Copyright © 2026 BOLTEVM Labs. Confidential - Internal Development Group.
