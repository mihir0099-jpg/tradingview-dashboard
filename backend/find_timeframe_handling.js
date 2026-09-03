import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/ScannerContainer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('timeframe') || line.includes('Timeframe') || line.includes('activeTimeframe')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
