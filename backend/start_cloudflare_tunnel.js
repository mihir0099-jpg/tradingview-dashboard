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
    
    // Look for https://*.trycloudflare.com
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      if (lastPublishedUrl !== url) {
        lastPublishedUrl = url;
        fs.writeFileSync(urlFile, url, 'utf8');
        fs.writeFileSync(activeFile, url, 'utf8');
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

startTunnel();
