import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json';
const raw = fs.readFileSync(path, 'utf8').trim();
const cleaned = raw.endsWith(']') ? raw : (raw.lastIndexOf('}') !== -1 ? raw.slice(0, raw.lastIndexOf('}') + 1) + ']' : '[]');
const dataset = JSON.parse(cleaned);

const todayStr = '26/8/2026';
const todayEntries = dataset.filter(e => e.date === todayStr);

console.log(`Analyzing ${todayEntries.length} entries for today (${todayStr})...`);

const calculateBSGamma = (S, K, T, sigma, r) => {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const pdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return pdf / (S * sigma * Math.sqrt(T));
};

// Expiry parameter: today is August 26, weekly expiry is August 27 (1 day to expiry)
const T = 1 / 365;

const results = [];

todayEntries.forEach((entry) => {
  const S = entry.niftySpot;
  const atmK = Math.round(S / 50) * 50;
  const itmK = atmK - 50;
  const otmK = atmK + 50;
  
  // ATM ce/pe are entry.niftyLtpCe and entry.niftyLtpPe
  const ceAtm = entry.niftyLtpCe;
  const peAtm = entry.niftyLtpPe;
  const totalAtm = ceAtm + peAtm;
  
  // Reconstruct ITM & OTM premiums using spot distance and time value approximation
  const baseAtm = totalAtm / 2;
  const getStrikePrices = (K) => {
    const spotDiff = S - K;
    const ceIntrinsic = Math.max(0, spotDiff);
    const peIntrinsic = Math.max(0, -spotDiff);
    const timeValue = baseAtm * Math.exp(-Math.pow(S - K, 2) / (2 * Math.pow(200, 2)));
    const ceLtp = parseFloat((ceIntrinsic + timeValue).toFixed(2));
    const peLtp = parseFloat((peIntrinsic + timeValue).toFixed(2));
    const total = ceLtp + peLtp;
    const skew = total > 0 ? ((ceLtp - peLtp) / total) * 100 : 0;
    const gamma = calculateBSGamma(S, K, T, 0.15, 0.065) * 1000;
    return { ceLtp, peLtp, skew, gamma };
  };

  const itm = getStrikePrices(itmK);
  const otm = getStrikePrices(otmK);
  const atmSkew = entry.niftySkew;
  const atmGamma = calculateBSGamma(S, atmK, T, 0.15, 0.065) * 1000;

  results.push({
    time: entry.time,
    spot: S,
    itm: { strike: itmK, skew: itm.skew, gamma: itm.gamma, ce: itm.ceLtp, pe: itm.peLtp },
    atm: { strike: atmK, skew: atmSkew, gamma: atmGamma, ce: ceAtm, pe: peAtm },
    otm: { strike: otmK, skew: otm.skew, gamma: otm.gamma, ce: otm.ceLtp, pe: otm.peLtp }
  });
});

// Group by 15-minute intervals to find general trends
const intervals = [];
const slotMinutes = 15;

results.forEach(res => {
  const [h, m, s] = res.time.split(':').map(Number);
  const totalMins = h * 60 + m;
  const slotIdx = Math.floor(totalMins / slotMinutes);
  if (!intervals[slotIdx]) {
    intervals[slotIdx] = [];
  }
  intervals[slotIdx].push(res);
});

console.log('Hourly Aggregated Metrics Summary:');
intervals.forEach((group, idx) => {
  if (!group || group.length === 0) return;
  const first = group[0];
  const last = group[group.length - 1];
  
  const avgSpot = group.reduce((sum, r) => sum + r.spot, 0) / group.length;
  const avgItmSkew = group.reduce((sum, r) => sum + r.itm.skew, 0) / group.length;
  const avgAtmSkew = group.reduce((sum, r) => sum + r.atm.skew, 0) / group.length;
  const avgOtmSkew = group.reduce((sum, r) => sum + r.otm.skew, 0) / group.length;
  
  const avgItmGamma = group.reduce((sum, r) => sum + r.itm.gamma, 0) / group.length;
  const avgAtmGamma = group.reduce((sum, r) => sum + r.atm.gamma, 0) / group.length;
  const avgOtmGamma = group.reduce((sum, r) => sum + r.otm.gamma, 0) / group.length;

  const timeLabel = `${Math.floor((idx * slotMinutes) / 60).toString().padStart(2, '0')}:${((idx * slotMinutes) % 60).toString().padStart(2, '0')}`;
  console.log(`[Time: ${timeLabel}] Spot: ${avgSpot.toFixed(1)}`);
  console.log(`  ITM (${first.itm.strike}): Skew ${avgItmSkew.toFixed(1)}%, Gamma ${avgItmGamma.toFixed(2)}`);
  console.log(`  ATM (${first.atm.strike}): Skew ${avgAtmSkew.toFixed(1)}%, Gamma ${avgAtmGamma.toFixed(2)}`);
  console.log(`  OTM (${first.otm.strike}): Skew ${avgOtmSkew.toFixed(1)}%, Gamma ${avgOtmGamma.toFixed(2)}`);
});
