import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/scanner.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(-60).join('\n'));
