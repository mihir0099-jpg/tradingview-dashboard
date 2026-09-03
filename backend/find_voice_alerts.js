import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('speak') || line.includes('Speech') || line.includes('Voice')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
