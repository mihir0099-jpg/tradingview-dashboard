import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx', 'utf8');
const lines = content.split('\n');

let print = false;
lines.forEach((line, idx) => {
  if (line.includes('interface LiveSignal')) {
    print = true;
  }
  if (print) {
    console.log(`L${idx + 1}: ${line.trim()}`);
    if (line.includes('}')) {
      print = false;
    }
  }
});
