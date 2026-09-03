import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/scanner.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('setInterval') || line.includes('startScanner') || line.includes('cron') || line.includes('schedule')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
