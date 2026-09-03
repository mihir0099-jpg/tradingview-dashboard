import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/tradingview.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(0, 25).join('\n'));
