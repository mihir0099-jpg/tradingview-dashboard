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

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

let child = null;
let reconnectTimer = null;
let lastPublishedUrl = null;

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
        fs.writeFileSync(urlFile, url, 'utf8');
        fs.writeFileSync(activeFile, url, 'utf8');

        // Write live_backend.json locally for instant frontend auto-discovery
        const jsonPayload = JSON.stringify({ backendUrl: url, updatedAt: Date.now() }, null, 2);
        try {
          const docsDir = path.join(__dirname, '../docs');
          const pubDir = path.join(__dirname, '../frontend/public');
          const distDir = path.join(__dirname, '../frontend/dist');
          const hfDir = path.join(__dirname, '../hf_static_bundle');
          if (fs.existsSync(docsDir)) fs.writeFileSync(path.join(docsDir, 'live_backend.json'), jsonPayload, 'utf8');
          if (fs.existsSync(pubDir)) fs.writeFileSync(path.join(pubDir, 'live_backend.json'), jsonPayload, 'utf8');
          if (fs.existsSync(distDir)) fs.writeFileSync(path.join(distDir, 'live_backend.json'), jsonPayload, 'utf8');
          if (fs.existsSync(hfDir)) fs.writeFileSync(path.join(hfDir, 'live_backend.json'), jsonPayload, 'utf8');
        } catch (e) {}

        console.log('====================================================');
        console.log('[Cloudflare Tunnel] ACTIVE PUBLIC URL: ' + url);
        console.log('====================================================');

        // Automatically sync to Hugging Face space live_backend.json in background!
        const syncScript = path.join(__dirname, 'sync_hf_tunnel.py');
        exec(`python "${syncScript}" mihir0099/tradingview-dashboard "${url}"`, (err, stdout, stderr) => {
          if (err) console.error('[HF Auto-Sync Error]:', err.message);
          else console.log(stdout.trim());
        });

        // Notify Telegram Bot with the new tunnel URL
        try {
          import('./telegram_notifier.js').then(({ sendTelegramMessage }) => {
            sendTelegramMessage(`🌐 <b>CLOUDFLARE TUNNEL ACTIVE / RENEWED</b>\n━━━━━━━━━━━━━━━━━━━━━\n🔗 <b>Live URL:</b>\n<code>${url}</code>\n\n✅ <i>Auto-synced to Hugging Face space live_backend.json</i>`).catch(() => {});
          }).catch(() => {});
        } catch (te) {}
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

// Active Tunnel Health Watchdog: Detects sleep resume or dropped quick-tunnels
let healthFailCount = 0;
setInterval(async () => {
  if (!lastPublishedUrl) return;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${lastPublishedUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      healthFailCount = 0;
      return;
    }
  } catch (err) {
    // Network or DNS or socket error (e.g. laptop resumed from sleep)
  }

  healthFailCount++;
  console.log(`[Cloudflare Watchdog] Health check failed for ${lastPublishedUrl} (${healthFailCount}/2)`);

  if (healthFailCount >= 2) {
    console.log(`[Cloudflare Watchdog] Tunnel unreachable after 2 checks. Killing stale process and auto-reconnecting...`);
    healthFailCount = 0;
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
  }
}, 10000);

startTunnel();
