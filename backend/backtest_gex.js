import fs from 'fs';

// Helper for Black-Scholes Gamma
function calculateBSGamma(S, K, T, sigma, r) {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const pdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return pdf / (S * sigma * Math.sqrt(T));
}

// Exact date-to-expiry map parsed from reports
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
  return new Date(year, month, day, 15, 30, 0); // 3:30 PM expiry
}

function parseTimeToMs(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length < 3) return 0;
  return (parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])) * 1000;
}

function runBacktest() {
  const fileContent = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json', 'utf8');
  const logs = JSON.parse(fileContent);

  // Group by date
  const sessions = {};
  logs.forEach(log => {
    const d = log.date;
    if (!sessions[d]) sessions[d] = [];
    sessions[d].push(log);
  });

  const results = {
    nifty: { long: { win: 0, loss: 0, sum: 0 }, short: { win: 0, loss: 0, sum: 0 } },
    banknifty: { long: { win: 0, loss: 0, sum: 0 }, short: { win: 0, loss: 0, sum: 0 } }
  };

  Object.entries(sessions).forEach(([date, ticks]) => {
    ticks.sort((a, b) => parseTimeToMs(a.time) - parseTimeToMs(b.time));
    const expDate = getExpiryDateForDate(date);

    for (let i = 0; i < ticks.length - 15; i++) {
      const current = ticks[i];
      
      // Parse current tick time
      const dateParts = date.split('/');
      const timeParts = current.time.split(':');
      const curDate = new Date(
        2000 + parseInt(dateParts[2].slice(-2)), 
        parseInt(dateParts[1]) - 1, 
        parseInt(dateParts[0]), 
        parseInt(timeParts[0]), 
        parseInt(timeParts[1]),
        parseInt(timeParts[2] || 0)
      );

      const diffMs = expDate.getTime() - curDate.getTime();
      const daysToExpiry = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24));
      const T = daysToExpiry / 365;

      // Nifty GEX
      const niftySpot = current.niftySpot;
      const niftyK = Math.round(niftySpot / 50) * 50;
      const niftyBSGamma = calculateBSGamma(niftySpot, niftyK, T, 0.15, 0.065);
      const niftyGammaRatio = current.niftyGamma || 1.0;
      const niftyVolumeSkew = (niftyGammaRatio - 1) / (niftyGammaRatio + 1);
      const niftyGEX = niftyBSGamma * niftyVolumeSkew * niftySpot * 25 * 0.0001; 

      // Bank Nifty GEX
      const bankSpot = current.bankniftySpot;
      const bankK = Math.round(bankSpot / 100) * 100;
      const bankBSGamma = calculateBSGamma(bankSpot, bankK, T, 0.15, 0.065);
      const bankGammaRatio = current.bankniftyGamma || 1.0;
      const bankVolumeSkew = (bankGammaRatio - 1) / (bankGammaRatio + 1);
      const bankGEX = bankBSGamma * bankVolumeSkew * bankSpot * 15 * 0.0001;

      // Look ahead 15 ticks (~15-30 minutes of live data)
      const futureNifty = ticks[i + 15].niftySpot;
      const futureBank = ticks[i + 15].bankniftySpot;

      const niftyDiff = futureNifty - niftySpot;
      const bankDiff = futureBank - bankSpot;

      // GEX Reversal threshold (GEX is a mean-reverting/stabilizer metric)
      const GEX_THRESHOLD = 0.015;

      // Backtest GEX as a FADE/REVERSAL setup (as proven by long-gamma hedging theory)
      if (niftyGEX > GEX_THRESHOLD) {
        // High positive GEX = Fade rallies (expect drop)
        if (niftyDiff < 0) results.nifty.long.win++; else results.nifty.long.loss++;
        results.nifty.long.sum += -niftyDiff;
      } else if (niftyGEX < -GEX_THRESHOLD) {
        // High negative GEX = Fade dips (expect rise)
        if (niftyDiff > 0) results.nifty.short.win++; else results.nifty.short.loss++;
        results.nifty.short.sum += niftyDiff;
      }

      if (bankGEX > GEX_THRESHOLD) {
        if (bankDiff < 0) results.banknifty.long.win++; else results.banknifty.long.loss++;
        results.banknifty.long.sum += -bankDiff;
      } else if (bankGEX < -GEX_THRESHOLD) {
        if (bankDiff > 0) results.banknifty.short.win++; else results.banknifty.short.loss++;
        results.banknifty.short.sum += bankDiff;
      }
    }
  });

  console.log('\n--- NIFTY GEX DATE-DERIVED REVERSAL BACKTEST ---');
  const nLongTotal = results.nifty.long.win + results.nifty.long.loss;
  const nShortTotal = results.nifty.short.win + results.nifty.short.loss;
  console.log(`Fade CE Rallies (GEX > +0.015): ${nLongTotal} | Reversal Win Rate: ${((results.nifty.long.win / nLongTotal) * 100).toFixed(1)}% | Avg Profit: ${(results.nifty.long.sum / nLongTotal).toFixed(1)} pts`);
  console.log(`Fade PE Dips (GEX < -0.015): ${nShortTotal} | Reversal Win Rate: ${((results.nifty.short.win / nShortTotal) * 100).toFixed(1)}% | Avg Profit: ${(results.nifty.short.sum / nShortTotal).toFixed(1)} pts`);

  console.log('\n--- BANKNIFTY GEX DATE-DERIVED REVERSAL BACKTEST ---');
  const bLongTotal = results.banknifty.long.win + results.banknifty.long.loss;
  const bShortTotal = results.banknifty.short.win + results.banknifty.short.loss;
  console.log(`Fade CE Rallies (GEX > +0.015): ${bLongTotal} | Reversal Win Rate: ${((results.banknifty.long.win / bLongTotal) * 100).toFixed(1)}% | Avg Profit: ${(results.banknifty.long.sum / bLongTotal).toFixed(1)} pts`);
  console.log(`Fade PE Dips (GEX < -0.015): ${bShortTotal} | Reversal Win Rate: ${((results.banknifty.short.win / bShortTotal) * 100).toFixed(1)}% | Avg Profit: ${(results.banknifty.short.sum / bShortTotal).toFixed(1)} pts`);
}

runBacktest();
