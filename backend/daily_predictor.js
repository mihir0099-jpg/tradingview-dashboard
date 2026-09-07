import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const predictionsFile = path.join(__dirname, 'data', 'daily_predictions.json');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export async function fetchDailyCandles(symbol = 'NIFTY', limit = 30) {
  try {
    const ticker = symbol === 'BANKNIFTY' ? '%5ENSEBANK' : '%5ENSEI';
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + ticker + '?interval=1d&range=3mo';
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) return null;

    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const candles = [];

    for (let i = 0; i < ts.length; i++) {
      if (q.open[i] && q.close[i] && q.high[i] && q.low[i]) {
        candles.push({
          date: new Date(ts[i] * 1000).toISOString().split('T')[0],
          open: parseFloat(q.open[i].toFixed(2)),
          high: parseFloat(q.high[i].toFixed(2)),
          low: parseFloat(q.low[i].toFixed(2)),
          close: parseFloat(q.close[i].toFixed(2)),
          volume: q.volume[i] || 0
        });
      }
    }
    return candles.slice(-limit);
  } catch (err) {
    console.warn('[Daily Predictor] Failed to fetch candles for ' + symbol + ':', err.message || err);
    return null;
  }
}

export function calculatePivotLevels(H, L, C) {
  const R = H - L;
  const r4 = parseFloat((C + R * 1.1 / 2).toFixed(1));
  const r3 = parseFloat((C + R * 1.1 / 4).toFixed(1));
  const r2 = parseFloat((C + R * 1.1 / 6).toFixed(1));
  const r1 = parseFloat((C + R * 1.1 / 12).toFixed(1));
  const s1 = parseFloat((C - R * 1.1 / 12).toFixed(1));
  const s2 = parseFloat((C - R * 1.1 / 6).toFixed(1));
  const s3 = parseFloat((C - R * 1.1 / 4).toFixed(1));
  const s4 = parseFloat((C - R * 1.1 / 2).toFixed(1));

  const P = parseFloat(((H + L + C) / 3).toFixed(1));
  const BCP = parseFloat(((H + L) / 2).toFixed(1));
  const TCP = parseFloat(((P - BCP) + P).toFixed(1));
  const cprWidth = Math.abs(TCP - BCP);
  const cprWidthPct = parseFloat(((cprWidth / P) * 100).toFixed(2));

  return {
    camarilla: { r4, r3, r2, r1, s1, s2, s3, s4 },
    cpr: {
      P,
      BCP: Math.min(BCP, TCP),
      TCP: Math.max(BCP, TCP),
      widthPct: cprWidthPct,
      type: cprWidthPct < 0.20 ? 'NARROW (High Volatility Squeeze)' : (cprWidthPct > 0.40 ? 'WIDE (Range Bound Consolidation)' : 'AVERAGE (Standard Auction)')
    }
  };
}

export async function generateForecastForSymbol(symbol = 'NIFTY') {
  const candles = await fetchDailyCandles(symbol, 20);
  if (!candles || candles.length < 5) {
    console.error('[Daily Predictor] Insufficient candle history for ' + symbol);
    return null;
  }

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  let sumTR = 0;
  for (let i = candles.length - 14; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
    sumTR += tr;
  }
  const atr14 = parseFloat((sumTR / 14).toFixed(1));

  const levels = calculatePivotLevels(lastCandle.high, lastCandle.low, lastCandle.close);
  const lastRange = lastCandle.high - lastCandle.low;
  const closeLocation = lastRange > 0 ? (lastCandle.close - lastCandle.low) / lastRange : 0.5;

  const lastDate = new Date(lastCandle.date);
  const nextDate = new Date(lastDate);
  if (lastDate.getDay() === 5) {
    nextDate.setDate(lastDate.getDate() + 3);
  } else if (lastDate.getDay() === 6) {
    nextDate.setDate(lastDate.getDate() + 2);
  } else {
    nextDate.setDate(lastDate.getDate() + 1);
  }
  const targetDateStr = nextDate.toISOString().split('T')[0];
  const targetDayName = nextDate.toLocaleDateString('en-US', { weekday: 'long' });

  // 1. Predicted Open (Gap model)
  const isBank = symbol === 'BANKNIFTY';
  const gapMult = isBank ? 0.35 : 0.12;
  const gapPts = parseFloat(((closeLocation - 0.5) * gapMult * atr14 + (lastCandle.close > prevCandle.close ? (isBank ? 35 : 15) : (isBank ? -35 : -15))).toFixed(1));
  const predOpen = parseFloat((lastCandle.close + gapPts).toFixed(1));

  // 2. Directional Bias
  const priorRet = (lastCandle.close - lastCandle.open) / lastCandle.open;
  const predBias = priorRet > 0 ? (closeLocation > 0.5 ? 'GREEN' : 'RED') : (closeLocation < 0.4 ? 'RED' : 'GREEN');

  // 3. Predicted Range & Multiplier
  const rangeMult = priorRet > 0 ? 0.95 : 1.08;
  const predRange = parseFloat((atr14 * rangeMult).toFixed(1));

  // 4. Explicit Single-Point High and Low (Zero Guesswork / Zero Proxy)
  const upsideSkew = predBias === 'GREEN' ? 0.62 : 0.42;
  const downsideSkew = 1.0 - upsideSkew;
  const predHigh = parseFloat((predOpen + (predRange * upsideSkew)).toFixed(1));
  const predLow = parseFloat((predOpen - (predRange * downsideSkew)).toFixed(1));

  // 5. Predicted Close
  const predClose = predBias === 'GREEN'
    ? parseFloat((predOpen + (predRange * 0.28)).toFixed(1))
    : parseFloat((predOpen - (predRange * 0.36)).toFixed(1));

  const forecast = {
    symbol,
    target_date: targetDateStr,
    target_day: targetDayName,
    computed_at: new Date().toISOString(),
    baseline_session: {
      date: lastCandle.date,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      atr14
    },
    prediction: {
      predicted_open: predOpen,
      predicted_high: predHigh,
      predicted_low: predLow,
      predicted_close: predClose,
      predicted_range: predRange,
      predicted_gap_pts: gapPts,
      directional_bias: predBias,
      expected_candle: predBias === 'GREEN' ? 'GREEN CANDLE (Close > Open)' : 'RED CANDLE (Open > Close)',
      cpr: levels.cpr,
      camarilla: levels.camarilla
    },
    actual_evaluation: null
  };

  return forecast;
}

export async function generateNextDayForecast() {
  const symbols = ['NIFTY', 'BANKNIFTY'];
  const newForecasts = [];

  for (const sym of symbols) {
    const fc = await generateForecastForSymbol(sym);
    if (fc) newForecasts.push(fc);
  }

  let db = [];
  if (fs.existsSync(predictionsFile)) {
    try { db = JSON.parse(fs.readFileSync(predictionsFile, 'utf8')); } catch (e) { db = []; }
  }

  for (const fc of newForecasts) {
    db = db.filter(item => !(item.target_date === fc.target_date && (item.symbol || 'NIFTY') === fc.symbol));
    db.push(fc);
  }
  db.sort((a, b) => b.target_date.localeCompare(a.target_date));

  fs.writeFileSync(predictionsFile, JSON.stringify(db, null, 2), 'utf8');
  console.log('[Daily Predictor] Successfully generated next-day forecasts for NIFTY & BANKNIFTY.');
  return newForecasts;
}

export async function evaluatePastPredictions() {
  if (!fs.existsSync(predictionsFile)) return;
  let db = [];
  try { db = JSON.parse(fs.readFileSync(predictionsFile, 'utf8')); } catch (e) { return; }

  const niftyCandles = await fetchDailyCandles('NIFTY', 20);
  const bankCandles = await fetchDailyCandles('BANKNIFTY', 20);

  const niftyMap = niftyCandles ? new Map(niftyCandles.map(c => [c.date, c])) : new Map();
  const bankMap = bankCandles ? new Map(bankCandles.map(c => [c.date, c])) : new Map();

  let updated = false;
  for (const item of db) {
    const sym = item.symbol || 'NIFTY';
    const map = sym === 'BANKNIFTY' ? bankMap : niftyMap;

    if (!item.actual_evaluation && map.has(item.target_date)) {
      const actual = map.get(item.target_date);
      const actualRange = parseFloat((actual.high - actual.low).toFixed(2));
      const predRange = item.prediction.predicted_range;
      
      const openErr = parseFloat((actual.open - item.prediction.predicted_open).toFixed(2));
      const highErr = item.prediction.predicted_high ? parseFloat((actual.high - item.prediction.predicted_high).toFixed(2)) : null;
      const lowErr = item.prediction.predicted_low ? parseFloat((actual.low - item.prediction.predicted_low).toFixed(2)) : null;
      const closeErr = parseFloat((actual.close - item.prediction.predicted_close).toFixed(2));
      const rangeErr = parseFloat((actualRange - predRange).toFixed(2));

      const actualColor = actual.close >= actual.open ? 'GREEN' : 'RED';
      const isBiasMatch = (item.prediction.directional_bias === actualColor);

      item.actual_evaluation = {
        actual_open: actual.open,
        actual_high: actual.high,
        actual_low: actual.low,
        actual_close: actual.close,
        actual_range: actualRange,
        open_error_pts: openErr,
        high_error_pts: highErr,
        low_error_pts: lowErr,
        close_error_pts: closeErr,
        range_error_pts: rangeErr,
        actual_candle: actualColor,
        directional_bias_match: isBiasMatch,
        evaluated_at: new Date().toISOString()
      };
      updated = true;
      console.log([Daily Predictor] Evaluated  for : Range Err= pts, High Err=, Low Err=);
    }
  }

  if (updated) {
    fs.writeFileSync(predictionsFile, JSON.stringify(db, null, 2), 'utf8');
  }
  return db;
}

if (process.argv[1] && process.argv[1].endsWith('daily_predictor.js')) {
  generateNextDayForecast()
    .then(() => evaluatePastPredictions())
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
