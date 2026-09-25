import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exePath = path.join(__dirname, 'cloudflared.exe');
const logFile = path.join(__dirname, 'data/cloudflare.log');
const urlFile = path.join(__dirname, 'data/cloudflare_url.txt');
const activeFile = path.join(__dirname, 'data/active_tunnel_url.txt');

const pidFile = path.join(__dirname, 'data/cloudflare_tunnel.pid');
const syncScript = path.join(__dirname, 'sync_hf_tunnel.py');

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// ── 0. Strict Singleton Lock ──────────────────────────────────────────────────
try {
  if (fs.existsSync(pidFile)) {
    const existingPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    if (existingPid && existingPid !== process.pid) {
      try {
        process.kill(existingPid, 0); // Check if process actually exists
        console.log(`[Cloudflare Tunnel] Another instance is already running (PID: ${existingPid}). Exiting.`);
        process.exit(0);
      } catch (err) {
        // Stale PID from past reboot, safe to continue
      }
    }
  }
  fs.writeFileSync(pidFile, String(process.pid), 'utf8');
} catch (e) {}

process.on('exit', () => {
  try { if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile); } catch (e) {}
});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// ── 1. Clean up orphan cloudflared instances for this project ─────────────────
try {
  if (process.platform === 'win32') {
    exec(`wmic process where "name='cloudflared.exe' and ExecutablePath like '%tradingview-dashboard%'" call terminate`, () => {});
  }
} catch (e) {}

let child = null;
let reconnectTimer = null;
let lastPublishedUrl = null;

function syncUrlToAllTargets(url) {
  // 1. Save locally for instantaneous zero-latency discovery
  fs.writeFileSync(urlFile, url, 'utf8');
  fs.writeFileSync(activeFile, url, 'utf8');

  const jsonPayload = JSON.stringify({ backendUrl: url, updatedAt: Date.now() }, null, 2);
  const targetDirs = [
    path.join(__dirname, '..'),
    path.join(__dirname, '../docs'),
    path.join(__dirname, '../frontend/public'),
    path.join(__dirname, '../frontend/dist'),
    path.join(__dirname, '../hf_static_bundle')
  ];

  targetDirs.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        fs.writeFileSync(path.join(dir, 'live_backend.json'), jsonPayload, 'utf8');
      }
    } catch (e) {}
  });

  // 2. Publish to Hugging Face Space (mihir0099/tradingview-dashboard)
  exec(`python "${syncScript}" mihir0099/tradingview-dashboard "${url}"`, (err, stdout) => {
    if (err) console.error('[HF Auto-Sync Error (tradingview-dashboard)]:', err.message);
    else if (stdout) console.log(stdout.trim());
  });
}

function startTunnel() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  console.log('[Cloudflare Tunnel] Starting Cloudflare Quick Tunnel on port 3002...');

  child = spawn(exePath, ['tunnel', '--url', 'http://localhost:3002'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  function handleData(data) {
    const text = data.toString();
    logStream.write(text);
    
    // Look for https://*.trycloudflare.com, ignoring internal api.trycloudflare.com
    const match = text.match(/https:\/\/(?!api\.)[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !match[0].includes('api.trycloudflare.com')) {
      const url = match[0];
      if (lastPublishedUrl !== url) {
        lastPublishedUrl = url;
        urlPublishedAt = Date.now();

        console.log('====================================================');
        console.log('[Cloudflare Tunnel] ACTIVE PUBLIC URL: ' + url);
        console.log('====================================================');

        syncUrlToAllTargets(url);
      }
    }
  }

  child.stdout.on('data', handleData);
  child.stderr.on('data', handleData);

  child.on('close', (code) => {
    console.log('[Cloudflare Tunnel] Process closed with code ' + code + '. Reconnecting in 5s...');
    reconnectTimer = setTimeout(startTunnel, 5000);
  });
}

// ── 2. Active Tunnel Health & Hugging Face Auto-Sync Watchdog ─────────────────
let healthFailCount = 0;
let urlPublishedAt = 0;

setInterval(async () => {
  if (!lastPublishedUrl) return;

  // Grace period: allow 45s for initial Cloudflare DNS propagation
  if (Date.now() - urlPublishedAt < 45000) {
    return;
  }

  // Check if local backend is alive first
  let localAlive = false;
  try {
    const localCtrl = new AbortController();
    const localTimer = setTimeout(() => localCtrl.abort(), 2500);
    const localRes = await fetch('http://127.0.0.1:3002/health', { signal: localCtrl.signal });
    clearTimeout(localTimer);
    if (localRes.ok) localAlive = true;
  } catch (e) {}

  if (!localAlive) {
    return; // Don't kill tunnel if local node server is just restarting
  }

  // 1. Verify Public Tunnel Health
  let tunnelHealthy = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${lastPublishedUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      tunnelHealthy = true;
      healthFailCount = 0;
    }
  } catch (err) {}

  if (!tunnelHealthy) {
    healthFailCount++;
    console.log(`[Cloudflare Watchdog] Health check failed for ${lastPublishedUrl} (${healthFailCount}/4)`);

    if (healthFailCount >= 4) {
      console.log(`[Cloudflare Watchdog] Tunnel unreachable after 4 checks. Re-spawning tunnel...`);
      healthFailCount = 0;
      urlPublishedAt = Date.now();
      if (child && child.pid) {
        try {
          if (process.platform === 'win32') {
            exec(`taskkill /F /T /PID ${child.pid}`, () => startTunnel());
          } else {
            child.kill('SIGKILL');
            startTunnel();
          }
        } catch (e) {
          startTunnel();
        }
      } else {
        startTunnel();
      }
      return;
    }
  }

  // 2. Continuous Hugging Face Live Sync Verification
  // Verifies that Hugging Face Space has the exact live tunnel URL and hasn't drifted
  try {
    const hfCtrl = new AbortController();
    const hfTimer = setTimeout(() => hfCtrl.abort(), 4000);
    const hfRes = await fetch('https://mihir0099-tradingview-dashboard.static.hf.space/live_backend.json', { signal: hfCtrl.signal });
    clearTimeout(hfTimer);
    if (hfRes.ok) {
      const hfData = await hfRes.json();
      if (hfData.backendUrl !== lastPublishedUrl) {
        console.log(`[Cloudflare Watchdog] HF Space out of sync! HF has: ${hfData.backendUrl}, Live is: ${lastPublishedUrl}. Auto-resyncing...`);
        syncUrlToAllTargets(lastPublishedUrl);
      }
    }
  } catch (e) {}
}, 20000);

startTunnel();
