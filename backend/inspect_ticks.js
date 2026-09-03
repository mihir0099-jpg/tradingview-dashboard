import fs from 'fs';

const logs = JSON.parse(fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json', 'utf8'));

// Find logs on 17/8/2026 starting around 12:50:43
const targetDate = "17/8/2026";
const filtered = logs.filter(log => log.date === targetDate);

// Sort by time
filtered.sort((a, b) => a.time.localeCompare(b.time));

const startIdx = filtered.findIndex(log => log.time >= "12:50:40");
if (startIdx !== -1) {
  console.log('Ticks starting from 12:50:43:');
  for (let i = 0; i < 20; i++) {
    const log = filtered[startIdx + i];
    if (log) {
      console.log(`[+${i}] Time: ${log.time} | Nifty Spot: ${log.niftySpot} | Gamma: ${log.niftyGamma} | Skew: ${log.niftySkew}`);
    }
  }
} else {
  console.log('No matching ticks found!');
}
