import fs from 'fs';

const logs = JSON.parse(fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json', 'utf8'));
const filtered = logs.filter(log => log.date === "17/8/2026");
filtered.sort((a, b) => a.time.localeCompare(b.time));

const startIdx = filtered.findIndex(log => log.time >= "12:50:40");
console.log(`Total ticks on August 17: ${filtered.length}`);
console.log(`Ticks after index ${startIdx}:`);
for (let i = 0; i < 50; i++) {
  const log = filtered[startIdx + i];
  if (log) {
    console.log(`Time: ${log.time} | Nifty Spot: ${log.niftySpot}`);
  }
}
