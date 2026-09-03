import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('socket') || line.includes('ws') || line.includes('onmessage') || line.includes('message') || line.includes('Message')) {
    if (idx > 400 && idx < 520) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  }
});
