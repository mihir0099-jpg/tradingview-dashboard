import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/reports/report_2026_08_17.json', 'utf8'));
console.log('Root keys:', Object.keys(data));
if (data.niftyDetails) {
  console.log('niftyDetails keys:', Object.keys(data.niftyDetails));
}
if (data.niftyBias) {
  console.log('niftyBias keys:', Object.keys(data.niftyBias));
}
