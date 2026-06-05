import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { spawn, execSync } from 'child_process'
import { WebSocketServer } from 'ws'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Constants
const PORT = process.env.PORT || 8080
const WS_PORT = process.env.WS_PORT || 8081
const PARENT_DIR = path.resolve(__dirname, '..')
const DB_PATH = path.join(__dirname, 'bolt_launcher.db')

// Init DB
const db = new Database(DB_PATH)

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    default_port INTEGER,
    description TEXT NOT NULL,
    tech_stack TEXT NOT NULL,
    sla_metrics TEXT NOT NULL,
    install_command TEXT NOT NULL,
    launch_command TEXT NOT NULL,
    status TEXT NOT NULL,
    icon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS process_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    stream TEXT,
    message TEXT
  );
`)

// Seed Tools Data
const insertTool = db.prepare(`
  INSERT OR REPLACE INTO tools (id, name, folder_name, repo_url, default_port, description, tech_stack, sla_metrics, install_command, launch_command, status, icon)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const toolsSeed = [
  [
    1,
    'BOLT DAW',
    'DAWDevOps',
    'https://github.com/BOLTEVM/BOLTEVM-DAO-DAW.git',
    3000,
    'Professional, web-based and desktop-wrapped Digital Audio Workstation. Replaces legacy framework architectures with Lit Web Components, featuring hardware ASIO/WDM audio routing, ZK anonymous collaboration proofs, and optional ACE-Step 1.5 music generation.',
    'Tone.js 15, Lit Web Components, Next.js 16, Semaphore Protocol 4.x, Yjs & WebRTC, SpacetimeDB',
    'Audio Substrate: Sub-10ms buffer, 44.1kHz raw | Multi-user: P2P <15ms latency | DB WASM transitions: <5ms',
    'pnpm install',
    'pnpm frontend:dev',
    'NOT_INSTALLED',
    'daw'
  ],
  [
    2,
    'VST Web Synth',
    'VSTDevOps',
    'https://github.com/BOLTEVM/VSTDevOps.git',
    3001,
    'Advanced polyphonic virtual synthesizer running natively in the browser. Designed to mirror professional desktop synthesizers with a modular sound generation pipeline, voice matrix allocation, and WebMIDI CC learning.',
    'Web Audio API, Next.js 15, WebMIDI API, CSS Modules, TypeScript',
    'Voice Substrate: 32-voice allocation, LRU steal | MIDI Interface: Latency <2ms, zero-jitter translation',
    'pnpm install',
    'pnpm dev',
    'NOT_INSTALLED',
    'synth'
  ],
  [
    3,
    'Chainvas',
    'BOLTChainvas',
    'https://github.com/BOLTEVM/Chainvas.git',
    3002,
    'Decentralized multi-modal creative design nexus. Acts as an in-browser suite for digital asset creation, Visual Timeline editing, and instant smart-contract publication with professional creative keyboard hotkeys.',
    'Next.js 16, React 19 Compiler, Yjs & WebRTC, SpacetimeDB, Solidity 0.8.26, Hardhat',
    'Rasterization: 60 FPS under 10k paths | Vector Path Sync: <1.2KB per patch | Relay Overhead: Zero server relay',
    'npm install',
    'npm run dev',
    'NOT_INSTALLED',
    'canvas'
  ],
  [
    4,
    'BOLTDelta CLOB DEX',
    'bdelta',
    'https://github.com/boltevm/bdelta.git',
    3003,
    'Bloomberg Terminal-class decentralized exchange designed around a price-time priority Central Limit Order Book (CLOB) matching engine. Bypasses AMM pools for institutional-grade latency and zero slippage.',
    'Next.js 16, React 19, SpacetimeDB, Pyth Network Hermes, Privy.io, LayerZero v2, face-api.js',
    'Order Matching: SLA < 20ms execution | Biometric Verification: Edge inference <120ms, zero server leak',
    'pnpm install',
    'pnpm dev',
    'NOT_INSTALLED',
    'dex'
  ],
  [
    5,
    'BOLT XR Spatial Wallet',
    'Handtracking Wallet',
    'https://github.com/BOLTEVM/BoltXR.git',
    3004,
    'Professional-grade, multi-chain non-custodial wallet designed specifically for spatial computing (VR/AR/XR). Re-imagines asset management, shifting private keys from flat screens into a highly tactile 3D spatial terminal with physics.',
    'Next.js 16, Three.js, React Three Fiber, @react-three/xr v6, Pyth Hermes, Sui Fullnodes, bitcoinjs-lib',
    'Spatial Render: SLA 90Hz stable, WebXR compliant | Physics Solver: 60Hz updates, dynamic collision resolution',
    'pnpm install',
    'pnpm dev',
    'NOT_INSTALLED',
    'wallet-xr'
  ],
  [
    6,
    'BOLTWallet OWS Gateway',
    'boltows',
    'https://github.com/BOLTEVM/BOLTWallet.git',
    3005,
    'Premium non-custodial multi-chain wallet monorepo built upon the Open Wallet Standard (OWS). Provides local-first key isolation and policy-gated signing workflows, tailored for orchestration by humans and AI agents.',
    '@open-wallet-standard/core (Rust FFI), Expo / React Native, Vite, Tailwind CSS, Turbo, Framer Motion',
    'Key Storage: Zero web memory leak, sandboxed storage | DB Spec: Under 5ms lookup, transactional safety',
    'npm install',
    'npm run dev',
    'NOT_INSTALLED',
    'wallet-ows'
  ],
  [
    7,
    'B3JS Game Engine',
    'b3js',
    'https://github.com/BOLTEVM/B3JS.git',
    5173,
    'Industrial-grade browser-based 3D engine and sandbox editor. Employs a pure ECS framework, WebWorker-based physics, and Pyodide WASM python scripting context for full 60+ FPS web builds.',
    'Three.js, Cannon-es, SpacetimeDB, Pyodide (Python 3.11+), Vite, Bun, WebRTC',
    'ECS Engine: SLA Up to 10k entities, 60Hz tick | Physics: Thread-isolated execution <2ms step time',
    'bun install',
    'bun run dev',
    'NOT_INSTALLED',
    'game-engine'
  ],
  [
    8,
    'BOLTEVM World Generator',
    'BOLTEVMWorldGenerator',
    'https://github.com/BOLTEVM/BOLTEVMWorldGenerator.git',
    3006,
    'Professional open-source framework for building standalone, highly interactive 3D virtual worlds. Enables self-hosting WebXR-compatible spaces or connecting to a globally synchronized multiplayer network.',
    'Three.js, PhysX (WASM), Fastify (Server), React 19, SQLite, esbuild, Node.js 22+',
    'Physics: Rigid dynamics, joint systems, fast queries | Server: Delta-compressed sync, tick rate 60Hz',
    'npm install',
    'npm run dev',
    'NOT_INSTALLED',
    'world-gen'
  ],
  [
    9,
    'BTAI Talent Protocol',
    'bai',
    'https://github.com/BOLTEVM/BTAI.git',
    3007,
    'Trustless agentic framework mediating collaboration between clients and elite human and AI talent. Guarantees milestone-based creative delivery and payroll via secure, milestone-locked Vyper escrow contracts.',
    'Next.js 16, Privy.io (Auth), Vyper (Contracts), SQLite, Hardhat Testing Suite, Python Agentic Core',
    'Escrow Engine: Milestone lockup, trustless escrow | MILA Security: Progressive cryptographic clearance',
    'npm install',
    'npm run dev',
    'NOT_INSTALLED',
    'btai'
  ],
  [
    10,
    'Quai Network Miner',
    'bquai',
    'https://github.com/BOLTEVM/BOLTEVM-Quai-Miner.git',
    3008,
    'Ultimate open-source hybrid mining terminal for the Quai Network. Features a sleek glassmorphic dashboard, wraps the official Quai GPU miner, and auto-provisions local build environments with automated dependency installers.',
    'Next.js 14 App Router, CMake/Make compilation pipeline, Quai Cyprus-1 Zone RPC, Web Workers',
    'Mining Core: Highly optimized OpenCL/CUDA kernels | Toolchain Provisioner: 6-step automated dependency installer',
    'npm install',
    'npm run dev',
    'NOT_INSTALLED',
    'miner-quai'
  ],
  [
    11,
    'QRL Miner Core',
    'bqrl',
    'https://github.com/BOLTEVM/QRL-Miner.git',
    8000,
    'Quantum-resistant CPU mining terminal wrapping XMRig miner substrate in a real-time event-driven CRT-inspired CLI dashboard. Targets the RandomX memory-hard proof of work algorithm.',
    'FastAPI, Preact & Vite, WebSockets, XMRig Substrate Wrapper, Bun Package Manager',
    'Cryptographic Algorithm: SLA > 98% hashing efficiency | Telemetry: Live CPU thread-level tracking <100ms',
    'npm install',
    'npm run dev',
    'NOT_INSTALLED',
    'miner-qrl'
  ],
  [
    12,
    'bfractal Command Center',
    'bfractal',
    'https://github.com/BOLTEVM/BFractal.git',
    8001,
    'Enterprise-grade node operator and mining telemetry center. Designed to manage fractal mining nodes natively under both Windows and Linux using a WSL translator substrate.',
    'FastAPI, Preact & Vite, WebSockets, fractald / fractal-miner process coordinators, WSL, Bun',
    'Operating Substrate: Run Linux-compiled binaries on Windows | Telemetry: Uptime tracking, balance logging',
    'npm install',
    'npm run dev',
    'NOT_INSTALLED',
    'miner-fractal'
  ],
  [
    13,
    'BOBS Broadcaster',
    'bobs',
    'https://github.com/BOLTEVM/BUNOBS.git',
    3009,
    'Bun Open Broadcasting Software. High-fidelity, web-based broadcasting studio and real-time composition framework. Features dual-canvas Studio Mode, WYSIWYG scene editor, vertical LED decibel mixer, and native Bun FFmpeg streaming/recording pipeline.',
    'TypeScript, Bun, React 18, FFmpeg, WebSockets, HTML5 Canvas',
    'WS Stream: Latency <100ms slices | Compositor: 60fps canvas overlays | Audio Mixer: 60fps AnalyserNode peak level updates',
    'bun install && bun run build',
    'bun run start',
    'NOT_INSTALLED',
    'broadcaster'
  ],
  [
    14,
    'Bolt Governance Portal',
    'bdta',
    'https://github.com/BOLTEVM/bdta.git',
    3010,
    'Next-generation decentralized governance and voting portal for Bolt DAO. Features space profiles, Snapshot EIP-712 cryptographic signing, discussions dashboard, treasury overview, and voice-locked voting widgets.',
    'Vue 3, TypeScript, Vite, Privy Auth, Ethers.js, Snapshot SDK',
    'Cryptographic Signing: EIP-712 <50ms | Ledger Sync: Sub-second proposal updates | Voice Voting Resolver: <100ms proof validation',
    'bun install',
    'bun run dev',
    'NOT_INSTALLED',
    'gov'
  ]
]

for (const tool of toolsSeed) {
  insertTool.run(tool)
}

// Seed Settings
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
insertSetting.run('accentColor', '#0078d7')
insertSetting.run('darkMode', 'true')
insertSetting.run('workspaceDir', PARENT_DIR)
insertSetting.run('glassmorphism', 'true')

// Active processes map
const activeProcesses = new Map()

// Express App setup
const app = express()
app.use(cors({
  origin: 'http://localhost:5173'
}))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// Helper: Scan folders to update DB statuses on boot/request
const scanWorkspaceFolders = () => {
  const tools = db.prepare('SELECT * FROM tools').all()
  for (const tool of tools) {
    const toolFolderPath = path.join(PARENT_DIR, tool.folder_name)
    const exists = fs.existsSync(toolFolderPath)
    let currentStatus = tool.status

    if (!exists) {
      currentStatus = 'NOT_INSTALLED'
    } else {
      // If folder exists, it is either INSTALLED, RUNNING, or STOPPED
      const isRunning = activeProcesses.has(tool.id)
      if (isRunning) {
        currentStatus = 'RUNNING'
      } else if (currentStatus === 'NOT_INSTALLED' || currentStatus === 'INSTALLING') {
        currentStatus = 'INSTALLED'
      }
    }

    if (currentStatus !== tool.status) {
      db.prepare('UPDATE tools SET status = ? WHERE id = ?').run(currentStatus, tool.id)
    }
  }
}

// Run initial scan & log database pruning
scanWorkspaceFolders()
try {
  db.prepare('DELETE FROM process_logs WHERE id NOT IN (SELECT id FROM process_logs ORDER BY id DESC LIMIT 1000)').run()
} catch (e) {
  console.warn('Failed to prune database logs on startup:', e.message)
}

// API: Get settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all()
    const config = {}
    settings.forEach(s => {
      config[s.key] = s.value
    })
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API: Save settings
app.post('/api/settings', (req, res) => {
  try {
    const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    Object.entries(req.body).forEach(([key, val]) => {
      updateSetting.run(key, String(val))
    })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Helper to run synchronous command safely and return output
const execGit = (cmd, cwd = __dirname) => {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8' }).trim()
  } catch (e) {
    console.warn(`Git command failed: ${cmd}`, e.message)
    return null
  }
}

// API: Check for updates
app.get('/api/updates/check', (req, res) => {
  try {
    // 1. Run git fetch safely
    execGit('git fetch origin', __dirname)

    const localCommit = execGit('git rev-parse --short HEAD', __dirname) || 'dev-local'
    const branchName = execGit('git rev-parse --abbrev-ref HEAD', __dirname) || 'main'
    
    // Check if remote tracking exists
    const remoteCommit = execGit(`git rev-parse --short origin/${branchName}`, __dirname)
    
    let commitsBehind = 0
    let changelog = []
    let upToDate = true

    if (remoteCommit && localCommit !== 'dev-local') {
      const behindStr = execGit(`git rev-list --count HEAD..origin/${branchName}`, __dirname)
      commitsBehind = behindStr ? parseInt(behindStr) : 0
      upToDate = commitsBehind === 0

      // Get log of commits behind
      const logStr = execGit(`git log -n 5 HEAD..origin/${branchName} --oneline`, __dirname)
      changelog = logStr ? logStr.split('\n').filter(Boolean) : []
    }

    res.json({
      localCommit,
      remoteCommit: remoteCommit || 'none',
      branchName,
      commitsBehind,
      changelog,
      upToDate,
      lastChecked: new Date().toISOString()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API: Run self-update/patch installer
app.post('/api/updates/install', (req, res) => {
  const updaterId = 999 // Dedicated ID for self-patcher logs

  logMessage(updaterId, 'stdout', 'Starting Bolt10 Self-Update Patcher & Installer...')
  
  res.json({ success: true, message: 'Update process launched in background' })

  setTimeout(async () => {
    try {
      const branchName = execGit('git rev-parse --abbrev-ref HEAD', __dirname) || 'main'
      
      logMessage(updaterId, 'stdout', `Pulling latest changes from origin/${branchName}...`)
      await runCommand(__dirname, 'git', ['pull', 'origin', branchName], updaterId)

      logMessage(updaterId, 'stdout', 'Installing any new package dependencies...')
      await runCommand(__dirname, 'bun', ['install'], updaterId)

      logMessage(updaterId, 'stdout', 'Recompiling frontend production bundles...')
      await runCommand(__dirname, 'bun', ['run', 'build'], updaterId)

      logMessage(updaterId, 'stdout', 'BoltOS successfully patched to the latest version!')
      
      // Send WS signal to trigger client reload notification
      const payload = JSON.stringify({ type: 'status', toolId: updaterId, status: 'PATCHED' })
      wsClients.forEach(client => {
        if (client.readyState === 1) client.send(payload)
      })

    } catch (err) {
      logMessage(updaterId, 'stderr', `Patching failed: ${err.message}`)
      
      const payload = JSON.stringify({ type: 'status', toolId: updaterId, status: 'PATCH_FAILED' })
      wsClients.forEach(client => {
        if (client.readyState === 1) client.send(payload)
      })
    }
  }, 100)
})

// API: List tools
app.get('/api/tools', (req, res) => {
  try {
    scanWorkspaceFolders()
    const tools = db.prepare('SELECT * FROM tools').all()
    res.json(tools)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API: Get logs for a specific tool
app.get('/api/tools/:id/logs', (req, res) => {
  try {
    const toolId = parseInt(req.params.id)
    const logs = db.prepare('SELECT * FROM process_logs WHERE tool_id = ? ORDER BY id DESC LIMIT 500').all(toolId)
    res.json(logs.reverse())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API: Update tool default port
app.post('/api/tools/:id/port', (req, res) => {
  try {
    const toolId = parseInt(req.params.id)
    const { port } = req.body
    
    if (!port || isNaN(port)) {
      return res.status(400).json({ error: 'Invalid port number' })
    }

    db.prepare('UPDATE tools SET default_port = ? WHERE id = ?').run(parseInt(port), toolId)
    res.json({ success: true, message: `Port updated to ${port}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// WebSocket connection list
let wsClients = []

// Helper: log to database & stream to websockets
let logCounter = 0
const logMessage = (toolId, stream, message) => {
  try {
    db.prepare('INSERT INTO process_logs (tool_id, stream, message) VALUES (?, ?, ?)').run(toolId, stream, message)
    
    // Prune logs periodically (every 50 messages) to keep database size capped
    logCounter++
    if (logCounter >= 50) {
      logCounter = 0
      db.prepare('DELETE FROM process_logs WHERE id NOT IN (SELECT id FROM process_logs ORDER BY id DESC LIMIT 1000)').run()
    }

    const payload = JSON.stringify({ type: 'log', toolId, stream, message, timestamp: new Date().toISOString() })
    wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(payload)
      }
    })
  } catch (err) {
    console.error('Failed to log message:', err.message)
  }
}

// Helper: stream status changes
const streamStatus = (toolId, status) => {
  const payload = JSON.stringify({ type: 'status', toolId, status })
  wsClients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload)
    }
  })
}

// API: Download/Install tool
app.post('/api/tools/:id/install', async (req, res) => {
  const toolId = parseInt(req.params.id)
  const tool = db.prepare('SELECT * FROM tools WHERE id = ?').get(toolId)

  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' })
  }

  const toolFolderPath = path.join(PARENT_DIR, tool.folder_name)
  const folderExists = fs.existsSync(toolFolderPath)

  db.prepare('UPDATE tools SET status = ? WHERE id = ?').run('INSTALLING', toolId)
  streamStatus(toolId, 'INSTALLING')

  res.json({ success: true, message: 'Installation process started' })

  // Background installation task
  setTimeout(async () => {
    try {
      if (!folderExists) {
        logMessage(toolId, 'stdout', `Directory does not exist. Cloning repository from ${tool.repo_url}...`)
        
        await runCommand(PARENT_DIR, 'git', ['clone', tool.repo_url, tool.folder_name], toolId)
        logMessage(toolId, 'stdout', `Repository cloned successfully to ${tool.folder_name}!`)
      }

      logMessage(toolId, 'stdout', `Running installation command: ${tool.install_command}...`)
      // Split command and arguments
      const parts = tool.install_command.split(' ')
      const cmd = parts[0]
      const args = parts.slice(1)

      await runCommand(toolFolderPath, cmd, args, toolId)
      logMessage(toolId, 'stdout', 'Installation completed successfully!')

      db.prepare('UPDATE tools SET status = ? WHERE id = ?').run('INSTALLED', toolId)
      streamStatus(toolId, 'INSTALLED')
    } catch (err) {
      logMessage(toolId, 'stderr', `Installation failed: ${err.message}`)
      db.prepare('UPDATE tools SET status = ? WHERE id = ?').run('NOT_INSTALLED', toolId)
      streamStatus(toolId, 'NOT_INSTALLED')
    }
  }, 100)
})

// API: Launch tool
app.post('/api/tools/:id/launch', (req, res) => {
  const toolId = parseInt(req.params.id)
  const tool = db.prepare('SELECT * FROM tools WHERE id = ?').get(toolId)

  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' })
  }

  if (activeProcesses.has(toolId)) {
    return res.status(400).json({ error: 'Tool is already running' })
  }

  const toolFolderPath = path.join(PARENT_DIR, tool.folder_name)
  if (!fs.existsSync(toolFolderPath)) {
    return res.status(400).json({ error: 'Tool is not installed' })
  }

  logMessage(toolId, 'stdout', `Launching tool: ${tool.name}...`)
  logMessage(toolId, 'stdout', `Directory: ${toolFolderPath}`)
  logMessage(toolId, 'stdout', `Launch Command: ${tool.launch_command}`)

  try {
    let cmd = 'cmd.exe'
    let args = ['/c', tool.launch_command]

    // Use bun directly if Windows permits, or wrap in shell
    if (process.platform !== 'win32') {
      const parts = tool.launch_command.split(' ')
      cmd = parts[0]
      args = parts.slice(1)
    }

    const child = spawn(cmd, args, {
      cwd: toolFolderPath,
      env: { ...process.env, PORT: String(tool.default_port), FORCE_COLOR: 'true' },
      shell: true
    })

    activeProcesses.set(toolId, child)
    db.prepare('UPDATE tools SET status = ? WHERE id = ?').run('RUNNING', toolId)
    streamStatus(toolId, 'RUNNING')

    res.json({ success: true, message: 'Tool launched' })

    child.stdout.on('data', (data) => {
      logMessage(toolId, 'stdout', data.toString())
    })

    child.stderr.on('data', (data) => {
      logMessage(toolId, 'stderr', data.toString())
    })

    child.on('close', (code) => {
      logMessage(toolId, 'stdout', `Process exited with code ${code}`)
      activeProcesses.delete(toolId)
      db.prepare('UPDATE tools SET status = ? WHERE id = ?').run('STOPPED', toolId)
      streamStatus(toolId, 'STOPPED')
    })

    child.on('error', (err) => {
      logMessage(toolId, 'stderr', `Process error: ${err.message}`)
      activeProcesses.delete(toolId)
      db.prepare('UPDATE tools SET status = ? WHERE id = ?').run('STOPPED', toolId)
      streamStatus(toolId, 'STOPPED')
    })

  } catch (err) {
    logMessage(toolId, 'stderr', `Failed to start process: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// API: Stop tool
app.post('/api/tools/:id/stop', (req, res) => {
  const toolId = parseInt(req.params.id)
  const child = activeProcesses.get(toolId)

  if (!child) {
    return res.status(400).json({ error: 'Tool is not running' })
  }

  logMessage(toolId, 'stdout', 'Stopping tool process via launcher command...')
  
  try {
    if (process.platform === 'win32') {
      // Windows specific process tree kill to ensure dev server and child processes die
      spawn('taskkill', ['/pid', child.pid, '/f', '/t'])
    } else {
      child.kill('SIGINT')
    }
    
    res.json({ success: true, message: 'Stop signal sent' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API: Get CPU/Memory System Metrics (Mock for premium dashboard look)
app.get('/api/system', (req, res) => {
  const mem = process.memoryUsage()
  const dbSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0
  
  res.json({
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memoryUsage: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024)
    },
    uptime: Math.round(process.uptime()),
    databaseSizeKB: Math.round(dbSize / 1024)
  })
})

// API: Execute arbitrary console command (Mocked terminal for safety/sandboxed simulation, or live for developer mode)
app.post('/api/terminal', (req, res) => {
  const { command } = req.body
  if (!command) return res.status(400).json({ error: 'Command missing' })

  // Support lightweight directory listings and echo
  if (command.startsWith('ls') || command.startsWith('dir')) {
    try {
      const files = fs.readdirSync(PARENT_DIR)
      res.json({ output: files.join('\n') })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  } else if (command.startsWith('echo')) {
    res.json({ output: command.slice(5) })
  } else if (command.startsWith('sqlite')) {
    res.json({ output: 'Error: Arbitrary SQLite query execution is disabled for security reasons.' })
  } else {
    res.json({ output: `Command '${command}' executed in sandboxed space. For safety, full arbitrary bash is disabled. Use explicit Tool controls.` })
  }
})

// API: Clear all telemetry logs safely
app.post('/api/logs/clear', (req, res) => {
  try {
    db.prepare('DELETE FROM process_logs').run()
    res.json({ success: true, message: 'SQLite process logs cleared successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API: Shutdown Express backend environment safely
app.post('/api/system/shutdown', (req, res) => {
  res.json({ success: true, message: 'Shutting down backend, terminating running tool processes...' })
  setTimeout(() => {
    shutdown()
  }, 500)
})

// Server fallback route for Spa client
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// Helper: Run command as promise
const runCommand = (cwd, cmd, args, toolId) => {
  return new Promise((resolve, reject) => {
    let commandStr = `${cmd} ${args.join(' ')}`
    logMessage(toolId, 'stdout', `Executing command: ${commandStr} in ${cwd}`)
    
    let resolvedCmd = cmd
    let resolvedArgs = args
    if (process.platform === 'win32') {
      resolvedCmd = 'cmd.exe'
      resolvedArgs = ['/c', `${cmd} ${args.join(' ')}`]
    }

    const child = spawn(resolvedCmd, resolvedArgs, { cwd, shell: true })

    child.stdout.on('data', (data) => {
      logMessage(toolId, 'stdout', data.toString())
    })

    child.stderr.on('data', (data) => {
      logMessage(toolId, 'stderr', data.toString())
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Process exited with error code ${code}`))
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}

// Start Server
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Express API Server listening on port ${PORT} (bound to localhost)`)
})

// Start WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT })
console.log(`WebSocket Server listening on port ${WS_PORT}`)

wss.on('connection', (ws) => {
  wsClients.push(ws)
  
  ws.on('close', () => {
    wsClients = wsClients.filter(c => c !== ws)
  })

  // Send initial message to acknowledge
  ws.send(JSON.stringify({ type: 'connected', time: new Date().toISOString() }))
})

// Cleanup active processes on server shutdown
function shutdown() {
  console.log('Shutting down backend, terminating running tool processes...')
  activeProcesses.forEach((child, toolId) => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid, '/f', '/t'])
      } else {
        child.kill('SIGKILL')
      }
      console.log(`Killed tool process ID ${toolId}`)
    } catch (e) {
      console.error(`Failed to kill process ID ${toolId}:`, e.message)
    }
  })
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
