import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/doji_scanner.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('fs.write') || line.includes('fs.read') || line.includes('save') || line.includes('load')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
