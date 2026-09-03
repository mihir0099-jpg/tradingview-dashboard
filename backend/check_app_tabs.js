import fs from 'fs';

const appPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/App.tsx';
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('BacktestResultsContainer') || line.includes('activeTab') || line.includes('return') || line.includes('tab')) {
    if (idx > 200 && idx < 500) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  }
});
