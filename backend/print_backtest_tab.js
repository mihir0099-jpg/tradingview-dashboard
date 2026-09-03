import fs from 'fs';

const appPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/App.tsx';
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

for (let idx = 400; idx < 420; idx++) {
  console.log(`L${idx + 1}: ${lines[idx]}`);
}
