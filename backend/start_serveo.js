import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, 'data/serveo.log');
const urlFile = path.join(__dirname, 'data/serveo_url.txt');

// Ensure directories exist
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

function killOldSsh() {
  try {
    console.log('[Serveo Manager] Killing old ssh processes...');
    execSync('taskkill /f /im ssh.exe', { stdio: 'ignore' });
  } catch (e) {}
}

let sshProcess = null;
let reconnectTimeout = null;

function startTunnel() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  killOldSsh();
  console.log('[Serveo Manager] Spawning new ssh tunnel connection...');

  sshProcess = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',      // Ping every 15 seconds to keep connection alive
    '-o', 'ServerAliveCountMax=3',        // Drop connection if 3 pings fail
    '-o', 'ConnectTimeout=10',            // Timeout connection attempt after 10s
    '-R', 'profundum-live:80:127.0.0.1:3002',  // Request permanent profundum-live subdomain
    'serveo.net'
  ]);

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  sshProcess.stdout.pipe(logStream);
  sshProcess.stderr.pipe(logStream);

  sshProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[Serveo Output] ${text.trim()}`);
    
    // Extract URL: e.g. Forwarding HTTP traffic from https://profundum.serveousercontent.com
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.serveo(?:usercontent)?\.com/);
    if (match) {
      const url = match[0];
      fs.writeFileSync(urlFile, url, 'utf8');
      console.log(`[Serveo Manager] Extracted Active Tunnel URL: ${url}`);
    }
  });

  sshProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`[Serveo Stderr] ${text.trim()}`);
    
    // If we detect remote port forwarding failure, it means the subdomain is still locked
    if (text.includes('remote port forwarding failed') || text.includes('forwarding failed')) {
      console.log('[Serveo Manager] Detected port forwarding failure. Killing process to allow the server to release the domain...');
      if (sshProcess) {
        sshProcess.kill();
      }
    }
  });

  sshProcess.on('close', (code) => {
    console.log(`[Serveo Manager] Tunnel process closed with code ${code}. Reconnecting in 15 seconds...`);
    sshProcess = null;
    reconnectTimeout = setTimeout(startTunnel, 15000); // 15-second delay to release subdomain safely
  });

  sshProcess.on('error', (err) => {
    console.error('[Serveo Manager] Spawn error:', err.message || err);
    if (sshProcess) {
      sshProcess.kill();
      sshProcess = null;
    }
    reconnectTimeout = setTimeout(startTunnel, 15000);
  });
}

// Initial start
startTunnel();

// Keep process running
setInterval(() => {}, 1000);
