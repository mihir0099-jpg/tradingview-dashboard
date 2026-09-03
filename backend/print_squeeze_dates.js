import fs from 'fs';

function calculateBSGamma(S, K, T, sigma, r) {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const pdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return pdf / (S * sigma * Math.sqrt(T));
}

const dateToExpiryMap = {
  "21/7/2026": "260721",
  "22/7/2026": "260728",
  "23/7/2026": "260728",
  "24/7/2026": "260728",
  "27/7/2026": "260728",
  "29/7/2026": "260804",
  "30/7/2026": "260804",
  "31/7/2026": "260804",
  "3/8/2026": "260804",
  "4/8/2026": "260804",
  "5/8/2026": "260811",
  "6/8/2026": "260811",
  "7/8/2026": "260811",
  "11/8/2026": "260811",
  "12/8/2026": "260818",
  "13/8/2026": "260818",
  "14/8/2026": "260818",
  "17/8/2026": "260818",
  "18/8/2026": "260818",
  "21/8/2026": "260825"
};

function getExpiryDateForDate(dateStr) {
  const code = dateToExpiryMap[dateStr] || "260825";
  const year = 2000 + parseInt(code.slice(0, 2));
  const month = parseInt(code.slice(2, 4)) - 1;
  const day = parseInt(code.slice(4, 6));
  return new Date(year, month, day, 15, 30, 0);
}

function parseTimeToMs(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length < 3) return 0;
  return (parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])) * 1000;
}

function printSqueezeDates() {
  const fileContent = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json', 'utf8');
  const logs = JSON.parse(fileContent);

  const sessions = {};
  logs.forEach(log => {
    const d = log.date;
    if (!sessions[d]) sessions[d] = [];
    sessions[d].push(log);
  });

  const triggers = [];

  Object.entries(sessions).forEach(([date, ticks]) => {
    ticks.sort((a, b) => parseTimeToMs(a.time) - parseTimeToMs(b.time));
    const expDate = getExpiryDateForDate(date);

    for (let i = 5; i < ticks.length; i++) {
      const current = ticks[i];
      const prev = ticks[i - 1];

      const dateParts = date.split('/');
      const timeParts = current.time.split(':');
      const curDate = new Date(2000 + parseInt(dateParts[2].slice(-2)), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(timeParts[0]), parseInt(timeParts[1]));
      const diffMs = expDate.getTime() - curDate.getTime();
      const T = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24)) / 365;

      const spot = current.niftySpot;
      const K = Math.round(spot / 50) * 50;
      const bsGamma = calculateBSGamma(spot, K, T, 0.15, 0.065);
      const volumeSkew = (current.niftyGamma - 1) / (current.niftyGamma + 1);
      const gex = bsGamma * volumeSkew * spot * 25 * 0.0001;

      const gammaRatio = current.niftyGamma || 1.0;
      
      // Squeeze condition
      if (gammaRatio > 1.8 && gex > 0.012 && spot > prev.niftySpot) {
        // Group by 15-minute window to avoid printing consecutive seconds
        const lastTrigger = triggers[triggers.length - 1];
        const timeMs = parseTimeToMs(current.time);
        if (!lastTrigger || lastTrigger.date !== date || (timeMs - parseTimeToMs(lastTrigger.time)) > 15 * 60 * 1000) {
          triggers.push({
            date,
            time: current.time,
            spot: spot.toFixed(2),
            gex: gex.toFixed(4),
            gamma: gammaRatio.toFixed(2),
            skew: current.niftySkew.toFixed(1) + '%'
          });
        }
      }
    }
  });

  console.log(`Found ${triggers.length} distinct squeeze events:`);
  triggers.forEach((t, index) => {
    console.log(`[${index + 1}] Date: ${t.date} | Time: ${t.time} | Nifty Spot: ${t.spot} | GEX: ${t.gex} | Gamma: ${t.gamma} | Skew: ${t.skew}`);
  });
}

printSqueezeDates();
