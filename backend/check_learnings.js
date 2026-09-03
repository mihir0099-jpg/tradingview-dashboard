import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json', 'utf8'));
console.log('Total entries:', data.length);
if (data.length > 0) {
  console.log('Sample entry:', JSON.stringify(data[0], null, 2));
  console.log('Sample entry (recent):', JSON.stringify(data[data.length - 1], null, 2));
}
