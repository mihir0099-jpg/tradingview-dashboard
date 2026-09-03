import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('websocket') || line.toLowerCase().includes('ws') || line.toLowerCase().includes('socket') || line.toLowerCase().includes('stream')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
