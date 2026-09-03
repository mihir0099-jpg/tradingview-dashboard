import fs from 'fs';

// Helper for Black-Scholes Gamma
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

function analyzeCorrelation() {
  const fileContent = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json', 'utf8');
  const logs = JSON.parse(fileContent);

  const sessions = {};
  logs.forEach(log => {
    const d = log.date;
    if (!sessions[d]) sessions[d] = [];
    sessions[d].push(log);
  });

  let totalDivergences = 0;
  let successfulDivergences = 0;
  let sumSpotChangeOnDivergence = 0;
  
  let totalSqueezes = 0;
  let successfulSqueezes = 0;

  // Let's run correlation calculations
  Object.entries(sessions).forEach(([date, ticks]) => {
    ticks.sort((a, b) => parseTimeToMs(a.time) - parseTimeToMs(b.time));
    const expDate = getExpiryDateForDate(date);

    for (let i = 5; i < ticks.length - 15; i++) {
      const current = ticks[i];
      const prev = ticks[i - 2]; // 2-tick difference (~2 minutes)

      // Time to expiry
      const dateParts = date.split('/');
      const timeParts = current.time.split(':');
      const curDate = new Date(2000 + parseInt(dateParts[2].slice(-2)), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(timeParts[0]), parseInt(timeParts[1]));
      const diffMs = expDate.getTime() - curDate.getTime();
      const T = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24)) / 365;

      // Nifty GEX & Skew
      const spot = current.niftySpot;
      const K = Math.round(spot / 50) * 50;
      const bsGamma = calculateBSGamma(spot, K, T, 0.15, 0.065);
      const volumeSkew = (current.niftyGamma - 1) / (current.niftyGamma + 1);
      const gex = bsGamma * volumeSkew * spot * 25 * 0.0001;

      // Prev GEX
      const prevSpot = prev.niftySpot;
      const prevK = Math.round(prevSpot / 50) * 50;
      const prevBSGamma = calculateBSGamma(prevSpot, prevK, T, 0.15, 0.065);
      const prevVolumeSkew = (prev.niftyGamma - 1) / (prev.niftyGamma + 1);
      const prevGex = prevBSGamma * prevVolumeSkew * prevSpot * 25 * 0.0001;

      // 1. Skew-Spot Divergence (Early Trend Indicator)
      // Spot is flat (no movement), but Skew expands by > 5% in 2 minutes
      const spotChangePct = Math.abs(spot - prevSpot) / prevSpot * 100;
      const skewChange = current.niftySkew - prev.niftySkew;

      if (spotChangePct < 0.05 && Math.abs(skewChange) > 5.0) {
        totalDivergences++;
        
        // Check future price change over next 15 ticks (~15 minutes)
        const futureSpot = ticks[i + 15].niftySpot;
        const futureChange = futureSpot - spot;
        
        // If skew expanded positively, we expect a rise. If negative, we expect a fall.
        const isCorrectDirection = (skewChange > 0 && futureChange > 20) || (skewChange < 0 && futureChange < -20);
        if (isCorrectDirection) {
          successfulDivergences++;
          sumSpotChangeOnDivergence += Math.abs(futureChange);
        }
      }

      // 2. Co-relation: High GEX + Crossover Squeeze
      // If Gamma Crossover (gammaRatio) spikes > 1.8 AND GEX becomes highly positive
      const gammaRatio = current.niftyGamma || 1.0;
      if (gammaRatio > 1.8 && gex > 0.012) {
        totalSqueezes++;
        const futureSpot = ticks[i + 10].niftySpot;
        const futureChange = futureSpot - spot;
        if (futureChange > 15) {
          successfulSqueezes++;
        }
      }
    }
  });

  console.log('\n--- SKEW & SPOT DIVERGENCE CORRELATION ---');
  console.log(`Total Divergence Signals (Spot flat, Skew expanding): ${totalDivergences}`);
  console.log(`Successful Breakout Directions: ${successfulDivergences} (${((successfulDivergences / totalDivergences) * 100).toFixed(1)}% Accuracy)`);
  console.log(`Average Breakout Move: ${(sumSpotChangeOnDivergence / successfulDivergences).toFixed(1)} Nifty points`);

  console.log('\n--- GAMMA & GEX CO-RELATION SQUEEZE ---');
  console.log(`Total Squeeze Triggers (Gamma > 1.8 & GEX > +0.012): ${totalSqueezes}`);
  console.log(`Successful Bullish Moves (>15 pts): ${successfulSqueezes} (${((successfulSqueezes / totalSqueezes) * 100).toFixed(1)}% Accuracy)`);
}

analyzeCorrelation();
