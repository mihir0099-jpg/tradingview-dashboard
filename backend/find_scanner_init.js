import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/server.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('scannerCache') && (line.includes('=') || line.includes('results') || line.includes('lastScanTime'))) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
