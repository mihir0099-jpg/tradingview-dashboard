import fs from 'fs';

const logs = JSON.parse(fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json', 'utf8'));

const dateStats = {};

logs.forEach(log => {
  const d = log.date;
  if (!dateStats[d]) {
    dateStats[d] = {
      maxGamma: 0,
      minGamma: 999,
      maxSkew: -999,
      minSkew: 999,
      ticks: 0
    };
  }
  const stats = dateStats[d];
  stats.ticks++;
  if (log.niftyGamma > stats.maxGamma) stats.maxGamma = log.niftyGamma;
  if (log.niftyGamma < stats.minGamma) stats.minGamma = log.niftyGamma;
  if (log.niftySkew > stats.maxSkew) stats.maxSkew = log.niftySkew;
  if (log.niftySkew < stats.minSkew) stats.minSkew = log.niftySkew;
});

console.log('Date Stats in live_market_learnings.json:');
Object.entries(dateStats).forEach(([date, stats]) => {
  console.log(`Date: ${date} | Ticks: ${stats.ticks} | Max Gamma: ${stats.maxGamma.toFixed(2)}x | Min Gamma: ${stats.minGamma.toFixed(2)}x | Max Skew: ${stats.maxSkew.toFixed(1)}% | Min Skew: ${stats.minSkew.toFixed(1)}%`);
});
