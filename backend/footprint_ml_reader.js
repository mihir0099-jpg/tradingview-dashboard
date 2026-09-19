/**
 * ============================================================
 *  FOOTPRINT ML READER  (Real-Time 5-Min Candle Analyser)
 * ============================================================
 *  Reads EVERY completed 5-minute footprint candle from the
 *  OrderFlow engine and produces live ML signals:
 *    1. Absorption Detection (Iceberg Buyers / Sellers)
 *    2. Delta Divergence  (Price vs Delta mismatch)
 *    3. VCB / VCS signals (Volume Climax Buy/Sell)
 *    4. Stacked Imbalance (3+ consecutive imbalance levels)
 *    5. POC Migration (POC moving with price = trend strength)
 *    6. VWAP Rejection (close near VWAP with upper/lower wick)
 *  All signals are stored + broadcast via WebSocket.
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SIGNALS_FILE = path.join(__dirname, 'data', 'footprint_ml_live_signals.json');

// ─────────────────────────────────────────────
//  In-memory store of last 200 signals
// ─────────────────────────────────────────────
let liveSignals = [];          // [{...signal}, ...]
let icebergFloors = {};        // { price: { totalAbsorbedBid, totalAbsorbedAsk, hits, lastSeen } }
let rollingCandles = [];       // last 30 completed candles for context
let sessionVwap = null;        // running VWAP
let sessionVwapVol = 0;
let sessionVwapSum = 0;
let prevPoc = null;
let prevClose = null;
let prevDelta = null;

// Callbacks registered from outside
const onSignalCallbacks = [];

export function onFootprintSignal(cb) {
  onSignalCallbacks.push(cb);
}

function broadcast(signal) {
  onSignalCallbacks.forEach(cb => { try { cb(signal); } catch(e){} });
}

// ─────────────────────────────────────────────
//  MAIN: called by OrderFlowStreamEngine each
//  time a 5-min candle CLOSES
// ─────────────────────────────────────────────
export function analyseCompletedCandle(candle, symbolMeta) {
  const symbol = symbolMeta?.symbol || 'NIFTY';
  const step   = symbolMeta?.groupSize || 1.0;

  // Normalise priceLevels to sorted array (high → low)
  const levels = Array.isArray(candle.priceLevels)
    ? candle.priceLevels
    : Object.values(candle.priceLevels || {}).sort((a, b) => b.price - a.price);

  if (!levels || levels.length === 0) return;

  // Running VWAP
  const typical = (candle.high + candle.low + candle.close) / 3;
  sessionVwapSum += typical * candle.volume;
  sessionVwapVol += candle.volume;
  sessionVwap = sessionVwapVol > 0 ? sessionVwapSum / sessionVwapVol : candle.close;

  // Keep rolling window
  rollingCandles.push(candle);
  if (rollingCandles.length > 30) rollingCandles.shift();

  const signals = [];

  // ── 1. ABSORPTION DETECTION ──────────────────────────────
  // Absorption = big sell volume hits bid BUT price did NOT go down
  //              OR big buy volume lifts ask BUT price did NOT go up
  const totalBid = levels.reduce((s, l) => s + (l.bidVol || 0), 0);
  const totalAsk = levels.reduce((s, l) => s + (l.askVol || 0), 0);
  const totalVol = levels.reduce((s, l) => s + (l.totalVol || 0), 0);
  const netDelta = (candle.delta !== undefined) ? candle.delta : (totalAsk - totalBid);
  const bullCandle = candle.close >= candle.open;

  // Selling Absorbed: heavy selling (bid >> ask) but candle closed green
  if (bullCandle && totalBid > totalAsk * 1.4 && totalBid > 500) {
    const sig = buildSignal('SELLING_ABSORBED', symbol, candle, {
      totalBid, totalAsk, netDelta,
      absorptionStrength: (totalBid / Math.max(1, totalAsk)).toFixed(2) + 'x',
      message: `🟢 SELLING ABSORBED at ${candle.close}. ${totalBid} sell contracts hit but price closed GREEN. Smart money buying.`,
      action: 'BUY_CALL',
      confidence: totalBid > totalAsk * 2 ? 92 : 78
    });
    signals.push(sig);
    updateIcebergFloor(candle.low, totalBid, 'BUY', candle.timeStr);
  }

  // Buying Absorbed: heavy buying (ask >> bid) but candle closed red
  if (!bullCandle && totalAsk > totalBid * 1.4 && totalAsk > 500) {
    const sig = buildSignal('BUYING_ABSORBED', symbol, candle, {
      totalBid, totalAsk, netDelta,
      absorptionStrength: (totalAsk / Math.max(1, totalBid)).toFixed(2) + 'x',
      message: `🔴 BUYING ABSORBED at ${candle.close}. ${totalAsk} buy contracts lifted but price closed RED. Smart money selling.`,
      action: 'BUY_PUT',
      confidence: totalAsk > totalBid * 2 ? 91 : 76
    });
    signals.push(sig);
    updateIcebergFloor(candle.high, totalAsk, 'SELL', candle.timeStr);
  }

  // ── 2. DELTA DIVERGENCE ──────────────────────────────────
  // Price went up but delta was negative = bearish divergence (hidden sellers)
  // Price went down but delta was positive = bullish divergence (hidden buyers)
  if (prevClose !== null && prevDelta !== null) {
    const priceUp   = candle.close > prevClose;
    const priceDown = candle.close < prevClose;
    const deltaNeg  = netDelta < -200;
    const deltaPos  = netDelta > 200;

    if (priceUp && deltaNeg) {
      signals.push(buildSignal('BEARISH_DELTA_DIVERGENCE', symbol, candle, {
        priceMove: +(candle.close - prevClose).toFixed(2),
        netDelta,
        message: `⚠️ BEARISH DELTA DIV: Price ↑ ${+(candle.close-prevClose).toFixed(2)} pts but Delta=${netDelta}. Sellers absorbing rally. Expect reversal.`,
        action: 'BUY_PUT',
        confidence: 84
      }));
    }
    if (priceDown && deltaPos) {
      signals.push(buildSignal('BULLISH_DELTA_DIVERGENCE', symbol, candle, {
        priceMove: +(candle.close - prevClose).toFixed(2),
        netDelta,
        message: `⚡ BULLISH DELTA DIV: Price ↓ ${+(prevClose-candle.close).toFixed(2)} pts but Delta=+${netDelta}. Buyers absorbing selloff. Expect bounce.`,
        action: 'BUY_CALL',
        confidence: 83
      }));
    }
  }

  // ── 3. VCB / VCS — Volume Climax ────────────────────────
  // Volume climax = total volume 3x+ the rolling 10-candle average
  if (rollingCandles.length >= 5) {
    const last10 = rollingCandles.slice(-10);
    const avgVol = last10.reduce((s, c) => s + c.volume, 0) / last10.length;
    const volRatio = totalVol / Math.max(1, avgVol);

    if (volRatio >= 3.0 && totalVol > 1000) {
      const isVCS = !bullCandle; // Volume Climax Sell = heavy vol on a red candle
      const isVCB = bullCandle;  // Volume Climax Buy = heavy vol on a green candle

      if (isVCS) {
        signals.push(buildSignal('VCS_VOLUME_CLIMAX_SELL', symbol, candle, {
          totalVol, avgVol: Math.round(avgVol), volRatio: volRatio.toFixed(1),
          message: `🔴 VCS CLIMAX: ${totalVol} contracts traded (${volRatio.toFixed(1)}x avg) on a BEARISH candle. Exhaustion sell. Expect bounce.`,
          action: 'BUY_CALL_REVERSAL',
          confidence: 86
        }));
      } else if (isVCB) {
        signals.push(buildSignal('VCB_VOLUME_CLIMAX_BUY', symbol, candle, {
          totalVol, avgVol: Math.round(avgVol), volRatio: volRatio.toFixed(1),
          message: `🟢 VCB CLIMAX: ${totalVol} contracts traded (${volRatio.toFixed(1)}x avg) on a BULLISH candle. Exhaustion buy. Expect fade.`,
          action: 'BUY_PUT_REVERSAL',
          confidence: 85
        }));
      }
    }
  }

  // ── 4. STACKED IMBALANCES ────────────────────────────────
  // 3+ consecutive BUY_IMBALANCE = very aggressive buying = trend continuation
  let stackBuy = 0, stackSell = 0, maxStackBuy = 0, maxStackSell = 0;
  for (let i = 0; i < levels.length - 1; i++) {
    const upper = levels[i];
    const lower = levels[i + 1];
    // BUY imbalance: upper.ask >= 3x lower.bid
    if (lower.bidVol > 0 && upper.askVol >= lower.bidVol * 3 && upper.askVol >= 100) {
      stackBuy++;
      stackSell = 0;
      maxStackBuy = Math.max(maxStackBuy, stackBuy);
    }
    // SELL imbalance: lower.bid >= 3x upper.ask
    else if (upper.askVol > 0 && lower.bidVol >= upper.askVol * 3 && lower.bidVol >= 100) {
      stackSell++;
      stackBuy = 0;
      maxStackSell = Math.max(maxStackSell, stackSell);
    } else {
      stackBuy = 0; stackSell = 0;
    }
  }
  if (maxStackBuy >= 3) {
    signals.push(buildSignal('STACKED_BUY_IMBALANCE', symbol, candle, {
      stackCount: maxStackBuy,
      message: `🟢 STACKED BUY IMBALANCE: ${maxStackBuy} consecutive bid-overwhelm levels. Aggressive institutional buying. Trend continuation LONG.`,
      action: 'BUY_CALL',
      confidence: Math.min(95, 70 + maxStackBuy * 5)
    }));
  }
  if (maxStackSell >= 3) {
    signals.push(buildSignal('STACKED_SELL_IMBALANCE', symbol, candle, {
      stackCount: maxStackSell,
      message: `🔴 STACKED SELL IMBALANCE: ${maxStackSell} consecutive ask-overwhelm levels. Aggressive institutional selling. Trend continuation SHORT.`,
      action: 'BUY_PUT',
      confidence: Math.min(95, 70 + maxStackSell * 5)
    }));
  }

  // ── 5. POC MIGRATION ─────────────────────────────────────
  if (prevPoc !== null && candle.pocPrice !== undefined) {
    const pocMoved = candle.pocPrice - prevPoc;
    if (Math.abs(pocMoved) >= step * 3) {
      const pocTrend = pocMoved > 0 ? 'BULLISH' : 'BEARISH';
      signals.push(buildSignal('POC_MIGRATION', symbol, candle, {
        prevPoc, newPoc: candle.pocPrice, pocMoved: +pocMoved.toFixed(2),
        message: `📍 POC MIGRATED ${pocMoved > 0 ? '↑' : '↓'} ${Math.abs(pocMoved).toFixed(0)} pts (${prevPoc} → ${candle.pocPrice}). ${pocTrend} value migration.`,
        action: pocTrend === 'BULLISH' ? 'BUY_CALL' : 'BUY_PUT',
        confidence: 72
      }));
    }
  }

  // ── 6. VWAP REJECTION ────────────────────────────────────
  if (sessionVwap) {
    const distPct = Math.abs(candle.close - sessionVwap) / sessionVwap;
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const body      = Math.abs(candle.close - candle.open);

    // Shooting star near VWAP = rejection of VWAP from above → short
    if (distPct <= 0.0008 && upperWick >= body * 1.5 && !bullCandle) {
      signals.push(buildSignal('VWAP_REJECTION_SHORT', symbol, candle, {
        vwap: +sessionVwap.toFixed(2),
        upperWick: +upperWick.toFixed(2), body: +body.toFixed(2),
        message: `🔴 VWAP REJECTION (SHORT): Price spiked above VWAP ${+sessionVwap.toFixed(2)} but printed ${+upperWick.toFixed(2)} pt upper wick. Sellers defending VWAP.`,
        action: 'BUY_PUT',
        confidence: 89
      }));
    }
    // Hammer near VWAP = rejection of VWAP from below → long
    if (distPct <= 0.0008 && lowerWick >= body * 1.5 && bullCandle) {
      signals.push(buildSignal('VWAP_REJECTION_LONG', symbol, candle, {
        vwap: +sessionVwap.toFixed(2),
        lowerWick: +lowerWick.toFixed(2), body: +body.toFixed(2),
        message: `🟢 VWAP REJECTION (LONG): Price dipped below VWAP ${+sessionVwap.toFixed(2)} but printed ${+lowerWick.toFixed(2)} pt lower wick. Buyers defending VWAP.`,
        action: 'BUY_CALL',
        confidence: 87
      }));
    }
  }

  // ── Save & broadcast ─────────────────────────────────────
  prevClose = candle.close;
  prevDelta = netDelta;
  prevPoc   = candle.pocPrice;

  signals.forEach(sig => {
    liveSignals.unshift(sig);
    broadcast(sig);
    console.log(`[FootprintML] ${sig.type} | ${sig.symbol} | ${sig.timeStr} | ${sig.data.message}`);
  });

  if (liveSignals.length > 200) liveSignals.length = 200;

  // Persist every 5 candles
  if (rollingCandles.length % 5 === 0) persistSignals();

  return signals;
}

// ─────────────────────────────────────────────
//  Iceberg Floor Tracker
// ─────────────────────────────────────────────
function updateIcebergFloor(price, volume, side, timeStr) {
  const key = Math.round(price);
  if (!icebergFloors[key]) {
    icebergFloors[key] = { price: key, totalAbsorbed: 0, hits: 0, side, lastSeen: timeStr, firstSeen: timeStr };
  }
  icebergFloors[key].totalAbsorbed += volume;
  icebergFloors[key].hits++;
  icebergFloors[key].lastSeen = timeStr;
}

export function getIcebergFloors() {
  return Object.values(icebergFloors)
    .filter(f => f.hits >= 2)
    .sort((a, b) => b.totalAbsorbed - a.totalAbsorbed)
    .slice(0, 20);
}

// ─────────────────────────────────────────────
//  Signal builder
// ─────────────────────────────────────────────
function buildSignal(type, symbol, candle, data) {
  return {
    id: Date.now() + '-' + Math.random().toString(36).slice(2,6),
    type,
    symbol,
    timeStr: candle.timeStr || '',
    period: candle.period || '',
    candleClose: candle.close,
    candleOpen: candle.open,
    candleHigh: candle.high,
    candleLow: candle.low,
    candleVolume: candle.volume,
    candleDelta: candle.delta,
    candlePoc: candle.pocPrice,
    timestamp: Date.now(),
    data
  };
}

// ─────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────
export function getLiveFootprintSignals(limit = 50) {
  return liveSignals.slice(0, limit);
}

export function getFootprintSummary() {
  const byType = {};
  liveSignals.forEach(s => {
    byType[s.type] = (byType[s.type] || 0) + 1;
  });
  return {
    totalSignals: liveSignals.length,
    byType,
    icebergFloors: getIcebergFloors(),
    sessionVwap: sessionVwap ? +sessionVwap.toFixed(2) : null,
    lastSignalTime: liveSignals[0]?.timeStr || null
  };
}

export function resetSession() {
  liveSignals = [];
  icebergFloors = {};
  rollingCandles = [];
  sessionVwap = null;
  sessionVwapVol = 0;
  sessionVwapSum = 0;
  prevPoc = null;
  prevClose = null;
  prevDelta = null;
  console.log('[FootprintML] Session reset for new day.');
}

function persistSignals() {
  try {
    const payload = {
      updatedAt: new Date().toISOString(),
      summary: getFootprintSummary(),
      recentSignals: liveSignals.slice(0, 50)
    };
    fs.writeFileSync(SIGNALS_FILE, JSON.stringify(payload, null, 2));
  } catch(e) {
    console.warn('[FootprintML] Could not persist signals:', e.message);
  }
}
