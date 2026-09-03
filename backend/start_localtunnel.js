import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, 'data/localtunnel.log');
const urlFile = path.join(__dirname, 'data/localtunnel_url.txt');

// Ensure directories exist
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

let ltProcess = null;
let reconnectTimeout = null;

function startTunnel() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  console.log('[Localtunnel Manager] Spawning localtunnel connection...');

  // Spawn localtunnel pointing to port 3002 with subdomain profundum
  ltProcess = spawn('cmd', [
    '/c', 'npx', 'localtunnel',
    '--port', '3002',
    '--subdomain', 'profundum'
  ]);

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  ltProcess.stdout.pipe(logStream);
  ltProcess.stderr.pipe(logStream);

  ltProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[Localtunnel Output] ${text.trim()}`);
    
    // Extract URL: e.g. your url is: https://profundum.loca.lt
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);
    if (match) {
      const url = match[0];
      fs.writeFileSync(urlFile, url, 'utf8');
      console.log(`[Localtunnel Manager] Extracted Active Tunnel URL: ${url}`);
    }
  });

  ltProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`[Localtunnel Stderr] ${text.trim()}`);
  });

  ltProcess.on('close', (code) => {
    console.log(`[Localtunnel Manager] Tunnel process closed with code ${code}. Reconnecting in 10 seconds...`);
    ltProcess = null;
    reconnectTimeout = setTimeout(startTunnel, 10000);
  });

  ltProcess.on('error', (err) => {
    console.error('[Localtunnel Manager] Spawn error:', err.message || err);
    if (ltProcess) {
      ltProcess.kill();
      ltProcess = null;
    }
    reconnectTimeout = setTimeout(startTunnel, 10000);
  });
}

// Initial start
startTunnel();

// Keep process running
setInterval(() => {}, 1000);
