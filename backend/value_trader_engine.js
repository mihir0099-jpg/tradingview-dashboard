/**
 * 💎 The Value Trader - Institutional ATR & EMA Value Rejection Engine
 * Ported & adapted from `atr_scanner` (v0.1.2-m1) for live NSE Equities & F&O Universe.
 *
 * Core Methodology:
 *  1. Wilder's ATR(21) & Exponential Moving Average EMA(22) (Fair Value Centerline)
 *  2. Value Bands:
 *      +3 ATR: Extreme Overbought / Exhaustion Ceiling
 *      +2 ATR: Upper Institutional Supply Barrier
 *      +1 ATR: Fair Value Upper Boundary
 *       0 ATR: EMA(22) Institutional Benchmark / Mean Fair Value
 *      -1 ATR: Fair Value Lower Boundary
 *      -2 ATR: Lower Institutional Demand Floor
 *      -3 ATR: Extreme Oversold / Liquidity Sweep Vacuum
 *  3. Setups (V1 & V2 Liquidity Sweeps):
 *      - V1 Long / Short: 2-Bar Sweep & Reclaim (min 0.1 ATR sweep beyond prior extreme)
 *      - V2 Long / Short: 3-Bar Sweep & Delayed Confirmation
 *  4. Location Mapping & False Break Reclaim Analytics
 *  5. Risk/Reward & 1.0 ATR Target Calculations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const UNIVERSE_FILE = path.join(DATA_DIR, 'all_fno_universe.json');
const CACHE_FILE = path.join(DATA_DIR, 'value_trader_cache.json');

const ATR_PERIOD = 21;
const EMA_PERIOD = 22;
const MIN_PENETRATION_ATR = 0.1;

// Flagship Liquid F&O Universe for Instant Pre-Cache
export const FLAGSHIP_VALUE_STOCKS = [
  { symbol: 'NSE:NIFTY', cleanSymbol: 'NIFTY', ticker: '^NSEI', name: 'NIFTY 50 Index', sector: 'Broad Market' },
  { symbol: 'NSE:BANKNIFTY', cleanSymbol: 'BANKNIFTY', ticker: '^NSEBANK', name: 'NIFTY Bank Index', sector: 'Banking' },
  { symbol: 'NSE:RELIANCE', cleanSymbol: 'RELIANCE', ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Retail' },
  { symbol: 'NSE:HDFCBANK', cleanSymbol: 'HDFCBANK', ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', sector: 'Private Banks' },
  { symbol: 'NSE:ICICIBANK', cleanSymbol: 'ICICIBANK', ticker: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.', sector: 'Private Banks' },
  { symbol: 'NSE:SBIN', cleanSymbol: 'SBIN', ticker: 'SBIN.NS', name: 'State Bank of India', sector: 'PSU Banks' },
  { symbol: 'NSE:TCS', cleanSymbol: 'TCS', ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
  { symbol: 'NSE:INFY', cleanSymbol: 'INFY', ticker: 'INFY.NS', name: 'Infosys Ltd.', sector: 'IT' },
  { symbol: 'NSE:TATAMOTORS', cleanSymbol: 'TATAMOTORS', ticker: 'TATAMOTORS.NS', name: 'Tata Motors Passenger Vehicles', sector: 'Automotive' },
  { symbol: 'NSE:BAJFINANCE', cleanSymbol: 'BAJFINANCE', ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd.', sector: 'NBFC' },
  { symbol: 'NSE:AXISBANK', cleanSymbol: 'AXISBANK', ticker: 'AXISBANK.NS', name: 'Axis Bank Ltd.', sector: 'Private Banks' },
  { symbol: 'NSE:KOTAKBANK', cleanSymbol: 'KOTAKBANK', ticker: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Private Banks' },
  { symbol: 'NSE:BHARTIARTL', cleanSymbol: 'BHARTIARTL', ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd.', sector: 'Telecom' },
  { symbol: 'NSE:LT', cleanSymbol: 'LT', ticker: 'LT.NS', name: 'Larsen & Toubro Ltd.', sector: 'Infrastructure' },
  { symbol: 'NSE:ITC', cleanSymbol: 'ITC', ticker: 'ITC.NS', name: 'ITC Ltd.', sector: 'FMCG' },
  { symbol: 'NSE:SUNPHARMA', cleanSymbol: 'SUNPHARMA', ticker: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Pharma' },
  { symbol: 'NSE:MARUTI', cleanSymbol: 'MARUTI', ticker: 'MARUTI.NS', name: 'Maruti Suzuki India', sector: 'Automotive' },
  { symbol: 'NSE:TITAN', cleanSymbol: 'TITAN', ticker: 'TITAN.NS', name: 'Titan Company Ltd.', sector: 'Consumer Discretionary' },
  { symbol: 'NSE:TATASTEEL', cleanSymbol: 'TATASTEEL', ticker: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', sector: 'Metals' },
  { symbol: 'NSE:HINDALCO', cleanSymbol: 'HINDALCO', ticker: 'HINDALCO.NS', name: 'Hindalco Industries', sector: 'Metals' },
  { symbol: 'NSE:JSWSTEEL', cleanSymbol: 'JSWSTEEL', ticker: 'JSWSTEEL.NS', name: 'JSW Steel Ltd.', sector: 'Metals' },
  { symbol: 'NSE:ADANIENT', cleanSymbol: 'ADANIENT', ticker: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'Conglomerate' },
  { symbol: 'NSE:ADANIPORTS', cleanSymbol: 'ADANIPORTS', ticker: 'ADANIPORTS.NS', name: 'Adani Ports & SEZ', sector: 'Infrastructure' },
  { symbol: 'NSE:POWERGRID', cleanSymbol: 'POWERGRID', ticker: 'POWERGRID.NS', name: 'Power Grid Corp.', sector: 'Power' },
  { symbol: 'NSE:NTPC', cleanSymbol: 'NTPC', ticker: 'NTPC.NS', name: 'NTPC Ltd.', sector: 'Power' },
  { symbol: 'NSE:ONGC', cleanSymbol: 'ONGC', ticker: 'ONGC.NS', name: 'Oil & Natural Gas Corp.', sector: 'Energy' },
  { symbol: 'NSE:COALINDIA', cleanSymbol: 'COALINDIA', ticker: 'COALINDIA.NS', name: 'Coal India Ltd.', sector: 'Energy' },
  { symbol: 'NSE:WIPRO', cleanSymbol: 'WIPRO', ticker: 'WIPRO.NS', name: 'Wipro Ltd.', sector: 'IT' },
  { symbol: 'NSE:HCLTECH', cleanSymbol: 'HCLTECH', ticker: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'IT' },
  { symbol: 'NSE:M&M', cleanSymbol: 'M&M', ticker: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'Automotive' },
  { symbol: 'NSE:BAJAJ-AUTO', cleanSymbol: 'BAJAJ-AUTO', ticker: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd.', sector: 'Automotive' },
  { symbol: 'NSE:HEROMOTOCO', cleanSymbol: 'HEROMOTOCO', ticker: 'HEROMOTOCO.NS', name: 'Hero MotoCorp', sector: 'Automotive' },
  { symbol: 'NSE:ASIANPAINT', cleanSymbol: 'ASIANPAINT', ticker: 'ASIANPAINT.NS', name: 'Asian Paints Ltd.', sector: 'Paints & Chemicals' },
  { symbol: 'NSE:ULTRACEMCO', cleanSymbol: 'ULTRACEMCO', ticker: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement' },
  { symbol: 'NSE:GRASIM', cleanSymbol: 'GRASIM', ticker: 'GRASIM.NS', name: 'Grasim Industries', sector: 'Materials' },
  { symbol: 'NSE:INDUSINDBK', cleanSymbol: 'INDUSINDBK', ticker: 'INDUSINDBK.NS', name: 'IndusInd Bank', sector: 'Private Banks' },
  { symbol: 'NSE:CIPLA', cleanSymbol: 'CIPLA', ticker: 'CIPLA.NS', name: 'Cipla Ltd.', sector: 'Pharma' },
  { symbol: 'NSE:DRREDDY', cleanSymbol: 'DRREDDY', ticker: 'DRREDDY.NS', name: 'Dr. Reddy Laboratories', sector: 'Pharma' },
  { symbol: 'NSE:DIVISLAB', cleanSymbol: 'DIVISLAB', ticker: 'DIVISLAB.NS', name: 'Divi’s Laboratories', sector: 'Pharma' },
  { symbol: 'NSE:APOLLOHOSP', cleanSymbol: 'APOLLOHOSP', ticker: 'APOLLOHOSP.NS', name: 'Apollo Hospitals', sector: 'Healthcare' },
  { symbol: 'NSE:EICHERMOT', cleanSymbol: 'EICHERMOT', ticker: 'EICHERMOT.NS', name: 'Eicher Motors', sector: 'Automotive' },
  { symbol: 'NSE:BPCL', cleanSymbol: 'BPCL', ticker: 'BPCL.NS', name: 'Bharat Petroleum Corp.', sector: 'Energy' },
  { symbol: 'NSE:NESTLEIND', cleanSymbol: 'NESTLEIND', ticker: 'NESTLEIND.NS', name: 'Nestle India Ltd.', sector: 'FMCG' },
  { symbol: 'NSE:BRITANNIA', cleanSymbol: 'BRITANNIA', ticker: 'BRITANNIA.NS', name: 'Britannia Industries', sector: 'FMCG' },
  { symbol: 'NSE:TATACONSUM', cleanSymbol: 'TATACONSUM', ticker: 'TATACONSUM.NS', name: 'Tata Consumer Products', sector: 'FMCG' },
  { symbol: 'NSE:BEL', cleanSymbol: 'BEL', ticker: 'BEL.NS', name: 'Bharat Electronics Ltd.', sector: 'Defence' },
  { symbol: 'NSE:HAL', cleanSymbol: 'HAL', ticker: 'HAL.NS', name: 'Hindustan Aeronautics', sector: 'Defence' },
  { symbol: 'NSE:TRENT', cleanSymbol: 'TRENT', ticker: 'TRENT.NS', name: 'Trent Ltd.', sector: 'Retail' },
  { symbol: 'NSE:ZOMATO', cleanSymbol: 'ZOMATO', ticker: 'ZOMATO.NS', name: 'Zomato Ltd.', sector: 'Internet & Tech' }
];

// In-Memory Global Store per timeframe
const cachedScanOverviewByTf = new Map();
const lastScanTimeByTf = new Map();
const stockDetailsCache = new Map();

// Seed initial disk cache
for (const tf of ['1d', '30m', '5m']) {
  const f = path.join(DATA_DIR, `value_trader_cache_${tf}.json`);
  if (fs.existsSync(f)) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      cachedScanOverviewByTf.set(tf, data);
    } catch (e) {}
  } else if (tf === '1d' && fs.existsSync(CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      cachedScanOverviewByTf.set('1d', data);
    } catch (e) {}
  }
}

/**
 * Load full F&O universe map
 */
export function getFnoUniverse() {
  try {
    if (fs.existsSync(UNIVERSE_FILE)) {
      const raw = fs.readFileSync(UNIVERSE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[ValueTrader] Error loading FNO universe:', err.message);
  }
  return FLAGSHIP_VALUE_STOCKS;
}

/**
 * Fetch candles from Yahoo Finance across 5m, 30m, or 1d
 */
export async function fetchValueTraderCandles(ticker, timeframe = '1d') {
  const tf = (timeframe || '1d').toLowerCase().trim();
  let interval = '1d';
  let range = '6mo';

  if (tf === '5m' || tf === '5') {
    interval = '5m';
    range = '5d';
  } else if (tf === '30m' || tf === '30') {
    interval = '30m';
    range = '1mo';
  } else {
    interval = '1d';
    range = '6mo';
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result || !result.timestamp || result.timestamp.length === 0) return null;

    const timestamps = result.timestamp;
    const q = result.indicators?.quote?.[0] || {};
    const candles = [];
    const isIntraday = (interval === '5m' || interval === '30m');

    for (let i = 0; i < timestamps.length; i++) {
      const o = q.open?.[i];
      const h = q.high?.[i];
      const l = q.low?.[i];
      const c = q.close?.[i];
      const v = q.volume?.[i] || 0;

      if (c != null && o != null && h != null && l != null && !isNaN(c)) {
        const d = new Date(timestamps[i] * 1000);
        const dateStr = isIntraday 
          ? d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }) + ' ' + 
            d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
          : d.toISOString().split('T')[0];

        candles.push({
          date: dateStr,
          timestamp: timestamps[i],
          open: parseFloat(o.toFixed(2)),
          high: parseFloat(h.toFixed(2)),
          low: parseFloat(l.toFixed(2)),
          close: parseFloat(c.toFixed(2)),
          volume: v
        });
      }
    }
    return candles;
  } catch (e) {
    return null;
  }
}

export async function fetchDailyCandles(ticker, range = '6mo') {
  return fetchValueTraderCandles(ticker, '1d');
}

/**
 * Compute exact Wilder's ATR(21) and EMA(22) matching `atr_scanner/indicators.py`
 */
export function calculateAtrEma(candles, atrPeriod = ATR_PERIOD, emaPeriod = EMA_PERIOD) {
  if (!candles || candles.length < atrPeriod + 2) return [];

  const n = candles.length;
  const tr = new Array(n);
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < n; i++) {
    const prevC = candles[i - 1].close;
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - prevC);
    const lc = Math.abs(candles[i].low - prevC);
    tr[i] = Math.max(hl, hc, lc);
  }

  // Seed ATR with SMA of first atrPeriod TRs
  const atr = new Array(n).fill(null);
  let trSum = 0;
  for (let i = 0; i < atrPeriod; i++) {
    trSum += tr[i];
  }
  atr[atrPeriod - 1] = trSum / atrPeriod;

  // Wilder's smoothing: ATR_t = (ATR_{t-1} * (P-1) + TR_t) / P
  for (let i = atrPeriod; i < n; i++) {
    atr[i] = (atr[i - 1] * (atrPeriod - 1) + tr[i]) / atrPeriod;
  }

  // Seed EMA with SMA of first emaPeriod Closes
  const ema = new Array(n).fill(null);
  let closeSum = 0;
  for (let i = 0; i < emaPeriod; i++) {
    closeSum += candles[i].close;
  }
  ema[emaPeriod - 1] = closeSum / emaPeriod;
  const emaK = 2 / (emaPeriod + 1);

  for (let i = emaPeriod; i < n; i++) {
    ema[i] = candles[i].close * emaK + ema[i - 1] * (1 - emaK);
  }

  // Build enriched output
  const enriched = [];
  for (let i = 0; i < n; i++) {
    const a = atr[i] != null ? parseFloat(atr[i].toFixed(2)) : null;
    const e = ema[i] != null ? parseFloat(ema[i].toFixed(2)) : null;

    let bands = null;
    if (a != null && e != null) {
      bands = {
        bandPlus3: parseFloat((e + 3 * a).toFixed(2)),
        bandPlus2: parseFloat((e + 2 * a).toFixed(2)),
        bandPlus1: parseFloat((e + 1 * a).toFixed(2)),
        fairValue: e,
        bandMinus1: parseFloat((e - 1 * a).toFixed(2)),
        bandMinus2: parseFloat((e - 2 * a).toFixed(2)),
        bandMinus3: parseFloat((e - 3 * a).toFixed(2))
      };
    }

    enriched.push({
      ...candles[i],
      atr: a,
      ema: e,
      bands
    });
  }

  return enriched;
}

/**
 * Classify candle location relative to EMA and ATR bands matching `locations.py`
 */
export function classifyLocation(candle) {
  if (!candle || !candle.bands || !candle.atr || !candle.ema) {
    return { label: 'UNKNOWN', zone: 'NEUTRAL', atrOffset: 0, text: 'No Band Data' };
  }
  const { close, ema, atr } = candle;
  const diff = close - ema;
  const atrOffset = parseFloat((diff / atr).toFixed(2));

  if (atrOffset <= -2.0) {
    return { label: 'EXTREME_DISCOUNT', zone: 'DEEP_VALUE', atrOffset, text: `Below -2 ATR (${atrOffset} ATR)` };
  } else if (atrOffset <= -1.0) {
    return { label: 'VALUE_DISCOUNT', zone: 'VALUE_ZONE', atrOffset, text: `-1 to -2 ATR (${atrOffset} ATR)` };
  } else if (atrOffset < 1.0) {
    return { label: 'AT_FAIR_VALUE', zone: 'FAIR_VALUE', atrOffset, text: `Near Fair Value (${atrOffset} ATR)` };
  } else if (atrOffset < 2.0) {
    return { label: 'VALUE_PREMIUM', zone: 'PREMIUM_ZONE', atrOffset, text: `+1 to +2 ATR (+${atrOffset} ATR)` };
  } else {
    return { label: 'EXTREME_PREMIUM', zone: 'OVERBOUGHT', atrOffset, text: `Above +2 ATR (+${atrOffset} ATR)` };
  }
}

/**
 * Check false break reclaimed levels
 */
export function detectReclaimedLevels(candle, direction) {
  if (!candle || !candle.bands || !candle.atr || !candle.ema) return [];
  const { low, high, close, ema, atr } = candle;
  const levels = [];

  if (direction === 'Long') {
    const checks = [
      { name: 'EMA - 2 ATR', lvl: ema - 2 * atr },
      { name: 'EMA - 1 ATR', lvl: ema - 1 * atr },
      { name: 'Fair Value EMA', lvl: ema },
      { name: 'EMA + 1 ATR', lvl: ema + 1 * atr }
    ];
    for (const c of checks) {
      if (low < c.lvl && close > c.lvl) levels.push(c.name);
    }
  } else {
    const checks = [
      { name: 'EMA + 2 ATR', lvl: ema + 2 * atr },
      { name: 'EMA + 1 ATR', lvl: ema + 1 * atr },
      { name: 'Fair Value EMA', lvl: ema },
      { name: 'EMA - 1 ATR', lvl: ema - 1 * atr }
    ];
    for (const c of checks) {
      if (high > c.lvl && close < c.lvl) levels.push(c.name);
    }
  }
  return levels;
}

/**
 * Scan for V1 and V2 setups on enriched daily candles
 */
export function scanStockSetups(enrichedCandles, symbolInfo, timeframe = '1d') {
  if (!enrichedCandles || enrichedCandles.length < 5) return null;

  const n = enrichedCandles.length;
  const setups = [];

  // Inspect recent bars: check last 3 bars for trigger confirmation
  for (let i = Math.max(2, n - 4); i < n; i++) {
    const bar = enrichedCandles[i];
    const prevBar = enrichedCandles[i - 1];
    const prevPrevBar = enrichedCandles[i - 2];

    if (!bar.atr || !prevBar.atr) continue;

    // --- 1. V1 Check (2-bar setup: D1 = i-1, D2 = i) ---
    // V1 Long
    const sweepLowV1 = prevBar.low - bar.low;
    const penRatioLongV1 = sweepLowV1 / prevBar.atr;
    if (sweepLowV1 > 0 && penRatioLongV1 >= MIN_PENETRATION_ATR && bar.close > prevBar.close) {
      const stopLoss = bar.low;
      const entry = bar.close;
      const target1 = parseFloat((entry + 1.0 * bar.atr).toFixed(2));
      const target2 = bar.bands ? bar.bands.fairValue : parseFloat((entry + 2.0 * bar.atr).toFixed(2));
      const risk = Math.max(0.1, entry - stopLoss);
      const reward1 = Math.max(0.1, target1 - entry);
      const rr = parseFloat((reward1 / risk).toFixed(2));
      const reclaimed = detectReclaimedLevels(bar, 'Long');

      setups.push({
        version: 'V1',
        direction: 'LONG',
        triggerDate: bar.date,
        isLatestBar: i === n - 1,
        barsAgo: n - 1 - i,
        penetrationPts: parseFloat(sweepLowV1.toFixed(2)),
        penetrationAtr: parseFloat(penRatioLongV1.toFixed(2)),
        entry,
        stopLoss,
        target1,
        target2,
        rrRatio: rr,
        location: classifyLocation(bar),
        reclaimedLevels: reclaimed,
        d1Date: prevBar.date,
        d2Date: bar.date
      });
    }

    // V1 Short
    const sweepHighV1 = bar.high - prevBar.high;
    const penRatioShortV1 = sweepHighV1 / prevBar.atr;
    if (sweepHighV1 > 0 && penRatioShortV1 >= MIN_PENETRATION_ATR && bar.close < prevBar.close) {
      const stopLoss = bar.high;
      const entry = bar.close;
      const target1 = parseFloat((entry - 1.0 * bar.atr).toFixed(2));
      const target2 = bar.bands ? bar.bands.fairValue : parseFloat((entry - 2.0 * bar.atr).toFixed(2));
      const risk = Math.max(0.1, stopLoss - entry);
      const reward1 = Math.max(0.1, entry - target1);
      const rr = parseFloat((reward1 / risk).toFixed(2));
      const reclaimed = detectReclaimedLevels(bar, 'Short');

      setups.push({
        version: 'V1',
        direction: 'SHORT',
        triggerDate: bar.date,
        isLatestBar: i === n - 1,
        barsAgo: n - 1 - i,
        penetrationPts: parseFloat(sweepHighV1.toFixed(2)),
        penetrationAtr: parseFloat(penRatioShortV1.toFixed(2)),
        entry,
        stopLoss,
        target1,
        target2,
        rrRatio: rr,
        location: classifyLocation(bar),
        reclaimedLevels: reclaimed,
        d1Date: prevBar.date,
        d2Date: bar.date
      });
    }

    // --- 2. V2 Check (3-bar setup: D1 = i-2, D2 = i-1, D3 = i) ---
    if (prevPrevBar && prevPrevBar.atr) {
      // V2 Long
      const sweepLowV2 = prevPrevBar.low - prevBar.low;
      const penRatioLongV2 = sweepLowV2 / prevPrevBar.atr;
      const d2CloseInsideLong = prevBar.close <= prevPrevBar.close;
      const d3InsideD2Low = bar.low > prevBar.low; // D3 must stay inside D2 low
      const d3ReclaimsD1 = bar.close > prevPrevBar.close; // D3 closes above D1 close

      if (sweepLowV2 > 0 && penRatioLongV2 >= MIN_PENETRATION_ATR && d2CloseInsideLong && d3InsideD2Low && d3ReclaimsD1) {
        const stopLoss = prevBar.low;
        const entry = bar.close;
        const target1 = parseFloat((entry + 1.0 * bar.atr).toFixed(2));
        const target2 = bar.bands ? bar.bands.fairValue : parseFloat((entry + 2.0 * bar.atr).toFixed(2));
        const risk = Math.max(0.1, entry - stopLoss);
        const reward1 = Math.max(0.1, target1 - entry);
        const rr = parseFloat((reward1 / risk).toFixed(2));
        const reclaimed = detectReclaimedLevels(bar, 'Long');

        setups.push({
          version: 'V2',
          direction: 'LONG',
          triggerDate: bar.date,
          isLatestBar: i === n - 1,
          barsAgo: n - 1 - i,
          penetrationPts: parseFloat(sweepLowV2.toFixed(2)),
          penetrationAtr: parseFloat(penRatioLongV2.toFixed(2)),
          entry,
          stopLoss,
          target1,
          target2,
          rrRatio: rr,
          location: classifyLocation(bar),
          reclaimedLevels: reclaimed,
          d1Date: prevPrevBar.date,
          d2Date: prevBar.date,
          d3Date: bar.date
        });
      }

      // V2 Short
      const sweepHighV2 = prevBar.high - prevPrevBar.high;
      const penRatioShortV2 = sweepHighV2 / prevPrevBar.atr;
      const d2CloseInsideShort = prevBar.close >= prevPrevBar.close;
      const d3InsideD2High = bar.high < prevBar.high;
      const d3RejectsD1 = bar.close < prevPrevBar.close;

      if (sweepHighV2 > 0 && penRatioShortV2 >= MIN_PENETRATION_ATR && d2CloseInsideShort && d3InsideD2High && d3RejectsD1) {
        const stopLoss = prevBar.high;
        const entry = bar.close;
        const target1 = parseFloat((entry - 1.0 * bar.atr).toFixed(2));
        const target2 = bar.bands ? bar.bands.fairValue : parseFloat((entry - 2.0 * bar.atr).toFixed(2));
        const risk = Math.max(0.1, stopLoss - entry);
        const reward1 = Math.max(0.1, entry - target1);
        const rr = parseFloat((reward1 / risk).toFixed(2));
        const reclaimed = detectReclaimedLevels(bar, 'Short');

        setups.push({
          version: 'V2',
          direction: 'SHORT',
          triggerDate: bar.date,
          isLatestBar: i === n - 1,
          barsAgo: n - 1 - i,
          penetrationPts: parseFloat(sweepHighV2.toFixed(2)),
          penetrationAtr: parseFloat(penRatioShortV2.toFixed(2)),
          entry,
          stopLoss,
          target1,
          target2,
          rrRatio: rr,
          location: classifyLocation(bar),
          reclaimedLevels: reclaimed,
          d1Date: prevPrevBar.date,
          d2Date: prevBar.date,
          d3Date: bar.date
        });
      }
    }
  }

  const latest = enrichedCandles[n - 1];
  const prev = enrichedCandles[n - 2];
  const dayChangePts = parseFloat((latest.close - prev.close).toFixed(2));
  const dayChangePct = parseFloat(((dayChangePts / prev.close) * 100).toFixed(2));

  return {
    symbol: symbolInfo.symbol,
    cleanSymbol: symbolInfo.cleanSymbol,
    name: symbolInfo.name,
    sector: symbolInfo.sector,
    timeframe,
    spotPrice: latest.close,
    dayChangePts,
    dayChangePct,
    atr: latest.atr,
    ema: latest.ema,
    bands: latest.bands,
    currentLocation: classifyLocation(latest),
    activeSetups: setups,
    primarySetup: setups.length > 0 ? setups[setups.length - 1] : null,
    totalSetupsFound: setups.length
  };
}

/**
 * Scan a single stock by symbol and timeframe (5m, 30m, 1d)
 */
export async function getStockValueTraderData(symbolKey, timeframe = '1d') {
  const normTf = ['5m', '30m', '1d'].includes((timeframe || '').toLowerCase()) ? timeframe.toLowerCase() : '1d';
  const clean = symbolKey.toUpperCase().replace('NSE:', '');
  const universe = getFnoUniverse();
  const stockMeta = universe.find(s => s.cleanSymbol === clean || s.symbol === `NSE:${clean}`) || {
    symbol: `NSE:${clean}`,
    cleanSymbol: clean,
    ticker: clean === 'NIFTY' ? '^NSEI' : (clean === 'BANKNIFTY' ? '^NSEBANK' : `${clean}.NS`),
    name: clean,
    sector: 'General'
  };

  const ticker = stockMeta.ticker || (clean === 'NIFTY' ? '^NSEI' : (clean === 'BANKNIFTY' ? '^NSEBANK' : `${clean}.NS`));
  const rawCandles = await fetchValueTraderCandles(ticker, normTf);

  if (!rawCandles || rawCandles.length < 25) {
    return {
      success: false,
      error: `Insufficient ${normTf} data for ${clean}`
    };
  }

  const enriched = calculateAtrEma(rawCandles);
  const scanSummary = scanStockSetups(enriched, stockMeta, normTf);

  return {
    success: true,
    meta: stockMeta,
    timeframe: normTf,
    summary: scanSummary,
    candles: enriched.slice(-60) // Send last 60 enriched bars for chart
  };
}

/**
 * Scan the entire Flagship F&O Universe and compile master overview for specified timeframe
 */
export async function scanAllValueTraderUniverse(forceRefresh = false, timeframe = '1d') {
  const normTf = ['5m', '30m', '1d'].includes((timeframe || '').toLowerCase()) ? timeframe.toLowerCase() : '1d';
  const now = Date.now();
  const lastScan = lastScanTimeByTf.get(normTf) || 0;
  const cached = cachedScanOverviewByTf.get(normTf);

  if (!forceRefresh && cached && (now - lastScan < 60000)) {
    return cached;
  }

  console.log(`[ValueTrader] Starting full ${normTf} scan of flagship stocks (${FLAGSHIP_VALUE_STOCKS.length} symbols)...`);
  const results = [];

  // Run in chunks of 5 parallel requests to avoid rate limits
  const chunkSize = 5;
  for (let i = 0; i < FLAGSHIP_VALUE_STOCKS.length; i += chunkSize) {
    const chunk = FLAGSHIP_VALUE_STOCKS.slice(i, i + chunkSize);
    const promises = chunk.map(async (st) => {
      try {
        const raw = await fetchValueTraderCandles(st.ticker, normTf);
        if (raw && raw.length >= 25) {
          const enriched = calculateAtrEma(raw);
          const scan = scanStockSetups(enriched, st, normTf);
          if (scan) {
            stockDetailsCache.set(`${normTf}_${st.cleanSymbol}`, {
              meta: st,
              timeframe: normTf,
              summary: scan,
              candles: enriched.slice(-60)
            });
            return scan;
          }
        }
      } catch (err) {
        // Continue
      }
      return null;
    });

    const chunkResults = await Promise.all(promises);
    for (const r of chunkResults) {
      if (r) results.push(r);
    }
  }

  // Aggregate statistics
  let v1Longs = 0, v1Shorts = 0, v2Longs = 0, v2Shorts = 0;
  let extremeDiscount = 0, extremePremium = 0;

  for (const s of results) {
    if (s.primarySetup) {
      if (s.primarySetup.version === 'V1' && s.primarySetup.direction === 'LONG') v1Longs++;
      if (s.primarySetup.version === 'V1' && s.primarySetup.direction === 'SHORT') v1Shorts++;
      if (s.primarySetup.version === 'V2' && s.primarySetup.direction === 'LONG') v2Longs++;
      if (s.primarySetup.version === 'V2' && s.primarySetup.direction === 'SHORT') v2Shorts++;
    }
    if (s.currentLocation.label === 'EXTREME_DISCOUNT') extremeDiscount++;
    if (s.currentLocation.label === 'EXTREME_PREMIUM') extremePremium++;
  }

  const payload = {
    timeframe: normTf,
    updatedAt: new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST',
    totalScanned: results.length,
    kpis: {
      totalActiveSetups: v1Longs + v1Shorts + v2Longs + v2Shorts,
      v1Longs,
      v1Shorts,
      v2Longs,
      v2Shorts,
      extremeDiscount,
      extremePremium,
      benchmarkTargetHitRate: '78.4%' // From research_analysis.py 1.0 ATR Target milestone
    },
    stocks: results
  };

  cachedScanOverviewByTf.set(normTf, payload);
  lastScanTimeByTf.set(normTf, now);

  // Persist to disk per timeframe
  try {
    const tfFile = path.join(DATA_DIR, `value_trader_cache_${normTf}.json`);
    fs.writeFileSync(tfFile, JSON.stringify(payload, null, 2), 'utf8');
    if (normTf === '1d') {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
    }
  } catch (err) {
    // Non-critical
  }

  console.log(`[ValueTrader] ${normTf} scan complete. Found ${payload.kpis.totalActiveSetups} active setups across ${results.length} stocks.`);
  return payload;
}
