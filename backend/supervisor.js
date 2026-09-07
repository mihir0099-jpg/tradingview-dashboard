import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverScript = path.join(__dirname, 'server.js');
const logsDir = path.join(__dirname, 'data');
const crashLogPath = path.join(logsDir, 'supervisor_crashes.log');

if (!fs.existsSync(logsDir)) {
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) {}
}

let restartCount = 0;
let lastRestartTime = Date.now();
let activeChild = null;

function logSupervisorEvent(msg) {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const entry = '[' + time + '] [SUPERVISOR] ' + msg + '\n';
  console.log(entry.trim());
  try {
    fs.appendFileSync(crashLogPath, entry, 'utf8');
  } catch (e) {}
}

function startServer() {
  logSupervisorEvent('Starting Node backend server (Instance #' + (restartCount + 1) + ')...');
  
  activeChild = spawn(process.execPath, [serverScript], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { SUPERVISED_BY: 'AUTONOMOUS_WATCHDOG_V1' })
  });

  activeChild.on('exit', (code, signal) => {
    restartCount++;
    const reason = signal ? ('Killed with signal ' + signal) : ('Exited with code ' + code);
    logSupervisorEvent('Server process stopped. Reason: ' + reason + '. Restart count: ' + restartCount);

    if (code === 0 && (signal === 'SIGINT' || signal === 'SIGTERM')) {
      logSupervisorEvent('Clean user/system shutdown requested. Exiting supervisor.');
      process.exit(0);
      return;
    }

    const timeSinceLast = Date.now() - lastRestartTime;
    lastRestartTime = Date.now();
    const restartDelayMs = timeSinceLast < 1500 ? 3000 : 800;

    logSupervisorEvent('Autonomous Auto-Recovery: Re-spawning server in ' + restartDelayMs + 'ms...');
    setTimeout(startServer, restartDelayMs);
  });

  activeChild.on('error', (err) => {
    logSupervisorEvent('Failed to spawn child process: ' + err.message + '. Retrying in 2s...');
    setTimeout(startServer, 2000);
  });
}

['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((sig) => {
  process.on(sig, () => {
    logSupervisorEvent('Supervisor received ' + sig + '. Forwarding to server child...');
    if (activeChild && !activeChild.killed) {
      activeChild.kill(sig);
    }
  });
});

console.log('====================================================');
console.log('  AUTONOMOUS 24/7 HEALING SUPERVISOR INITIALIZED');
console.log('====================================================');
startServer();
