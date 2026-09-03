import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx', 'utf8');
const lines = content.split('\n');

console.log(lines.slice(350, 400).join('\n'));
