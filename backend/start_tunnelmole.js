import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting tunnelmole daemon on port 3002...');

const logFile = path.join(__dirname, 'data/tunnelmole.log');
const urlFile = path.join(__dirname, 'data/tunnelmole_url.txt');

// Ensure directories exist
fs.mkdirSync(path.dirname(logFile), { recursive: true });

// Kill any previous ssh or serveo or tunnelmole processes
import { execSync } from 'child_process';
try {
  console.log('Killing old tunnelmole/ssh processes...');
  execSync('taskkill /f /im node.exe /fi "WINDOWTITLE eq Tunnelmole"', { stdio: 'ignore' });
} catch (e) {}

// Spawn tunnelmole
const tmole = spawn('tunnelmole', ['3002'], { shell: true });

const logStream = fs.createWriteStream(logFile, { flags: 'a' });
tmole.stdout.pipe(logStream);
tmole.stderr.pipe(logStream);

tmole.stdout.on('data', (data) => {
  const text = data.toString();
  console.log(`Tunnelmole: ${text.trim()}`);
  
  // Extract HTTPS URL
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.tunnelmole\.net/);
  if (match) {
    const url = match[0];
    fs.writeFileSync(urlFile, url, 'utf8');
    console.log(`Extracted Tunnelmole URL: ${url}`);
  }
});

tmole.on('close', (code) => {
  console.log(`Tunnelmole exited with code ${code}`);
});

// Keep process running
setInterval(() => {}, 1000);
