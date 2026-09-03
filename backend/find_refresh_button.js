import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/ScannerContainer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('RefreshCw') || line.includes('handleManualRefresh') || line.includes('Refresh')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
