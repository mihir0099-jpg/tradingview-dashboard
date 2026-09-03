import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/ScannerContainer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('filter') || line.includes('proximity') || line.includes('0.25') || line.includes('0.5')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
