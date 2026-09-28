/**
 * 🎯 Setup Confluence Score Engine
 * A weighted ensemble ML model that combines:
 * - PCR Velocity drift signal (from global rule 2D — 100% reliable at >3%)
 * - GEX wall proximity (institutional gamma support/resistance)
 * - TPO Period context (which period is active, historical win rates)
 * - OB Pressure zone proximity
 * - VIX regime (low/high IV environment)
 * - Candle close filter (5-min close above/below key level)
 *
 * Output: 0-100 Confluence Score + color-coded recommendation
 * This is a rules-based ensemble weighted by backtested win rates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Weights from backtested win rates (normalized to sum to 100)
const FEATURE_WEIGHTS = {
  pcrVelocity: 28,        // 100% win rate at >3% drift (Rule 2D)
  tpoPeriod: 22,          // Period C 92% win, G 87.8% win, L 85% win (Rules 3A/1A/3D)
  gexProximity: 18,       // GEX Wall absorption: strong institutional signal
  obPressure: 16,         // Order Block sweep: 60-67% intraday win rate
  vixRegime: 9,           // Low VIX = theta decay risk; High VIX = IV expansion
  candleClose: 7,         // 5-min candle close confirmation filter (Rule 10A)
};

// TPO period win rate lookup (from global trading rules backtest)
const TPO_WIN_RATES = {
  'A': { bull: 62.6, bear: 62.6, label: 'Period A — Opening Anchor' },
  'B': { bull: 55.0, bear: 55.0, label: 'Period B — IB Completion' },
  'C': { bull: 86.1, bear: 92.0, label: 'Period C — Highest Probability Break' },
  'D': { bull: 80.0, bear: 80.0, label: 'Period D — Continuation Window' },
  'E': { bull: 86.4, bear: 78.0, label: 'Period E — Bullish Continuation' },
  'F': { bull: 78.0, bear: 85.7, label: 'Period F — Bearish Extension' },
  'G': { bull: 87.8, bear: 87.8, label: 'Period G — Lunchtime Breakout' },
  'H': { bull: 75.0, bear: 75.0, label: 'Period H — Post-Lunch Follow-through' },
  'I': { bull: 70.0, bear: 70.0, label: 'Period I — Midday Consolidation' },
  'J': { bull: 72.0, bear: 72.0, label: 'Period J — Pre-Afternoon' },
  'K': { bull: 78.0, bear: 78.0, label: 'Period K — Afternoon Drive Start' },
  'L': { bull: 83.8, bear: 83.8, label: 'Period L — Late-Day Breakout (Volume Required)' },
  'M': { bull: 65.0, bear: 65.0, label: 'Period M — Final 15 Minutes' },
};

// Get current IST time and map to TPO period
export function getCurrentTPOPeriod() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const totalMin = h * 60 + m;

  // Market: 9:15 AM to 3:30 PM IST (555 to 930 mins from midnight)
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;

  if (totalMin < marketOpen || totalMin > marketClose) {
    return { period: null, label: 'Market Closed', minutesInPeriod: 0, minutesLeft: 0, isGPeriod: false };
  }

  const elapsedMin = totalMin - marketOpen;
  const periodIndex = Math.floor(elapsedMin / 30); // Each period is 30 mins
  const periodLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const period = periodLetters[Math.min(periodIndex, periodLetters.length - 1)];
  const minutesInPeriod = elapsedMin % 30;
  const minutesLeft = 30 - minutesInPeriod;
  const isGPeriod = period === 'G';

  return { period, label: TPO_WIN_RATES[period]?.label || '', minutesInPeriod, minutesLeft, isGPeriod, totalMin };
}

// Get G-period countdown info
export function getGPeriodStatus() {
  const { period, minutesLeft, isGPeriod } = getCurrentTPOPeriod();
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const totalMin = h * 60 + m;

  // G period: 12:15 PM to 12:45 PM = 735 to 765 mins
  const gStart = 12 * 60 + 15;
  const gEnd = 12 * 60 + 45;

  if (totalMin >= gStart && totalMin < gEnd) {
    return { isActive: true, minutesLeft: gEnd - totalMin, period: 'G' };
  } else if (totalMin < gStart) {
    return { isActive: false, minutesUntil: gStart - totalMin, period };
  } else {
    return { isActive: false, passed: true, period };
  }
}

let _lastScore = null;
let _lastComputeTime = 0;

/**
 * Main confluence score computation
 * @param {Object} inputs
 * @param {number} inputs.pcrDrift - PCR drift % (e.g. 0.04 = +4%)
 * @param {string} inputs.pcrSignal - 'BULLISH' | 'BEARISH' | 'NEUTRAL'
 * @param {number} inputs.spotPrice - Current spot price
 * @param {number} inputs.gexCallWall - GEX call wall level
 * @param {number} inputs.gexPutWall - GEX put wall level
 * @param {number} inputs.gexFlipZone - GEX flip zone level
 * @param {number} inputs.vix - Current VIX
 * @param {boolean} inputs.hasObZone - Whether there's an active OB zone nearby
 * @param {string} inputs.obType - 'DEMAND' | 'SUPPLY'
 * @param {boolean} inputs.candleClosedConfirmed - Whether 5-min candle closed confirmation
 * @param {string} inputs.direction - 'LONG' | 'SHORT' — which direction we're scoring for
 * @returns {Object} score result
 */
export function computeConfluenceScore(inputs = {}) {
  const {
    pcrDrift = 0,
    pcrSignal = 'NEUTRAL',
    spotPrice = 0,
    gexCallWall = 0,
    gexPutWall = 0,
    gexFlipZone = 0,
    vix = 14,
    hasObZone = false,
    obType = null,
    candleClosedConfirmed = false,
    direction = 'LONG'
  } = inputs;

  const tpoInfo = getCurrentTPOPeriod();
  const period = tpoInfo.period;
  const tpoWin = period ? (TPO_WIN_RATES[period] || { bull: 55, bear: 55 }) : { bull: 50, bear: 50 };

  const scores = {};
  const reasons = [];

  // 1. PCR Velocity Score (0-100 within this feature)
  const absDrift = Math.abs(pcrDrift);
  let pcrFeatureScore = 0;
  if (absDrift >= 0.05) {
    pcrFeatureScore = 100; // >5% = maximum conviction
    reasons.push(`PCR drift ${(pcrDrift * 100).toFixed(1)}% — EXTREME institutional conviction (100% reliable signal)`);
  } else if (absDrift >= 0.03) {
    pcrFeatureScore = 88;
    reasons.push(`PCR drift ${(pcrDrift * 100).toFixed(1)}% — Strong institutional signal (Rule 2D: 100% win rate >3%)`);
  } else if (absDrift >= 0.015) {
    pcrFeatureScore = 55;
    reasons.push(`PCR drift ${(pcrDrift * 100).toFixed(1)}% — Moderate conviction, approaching signal threshold`);
  } else {
    pcrFeatureScore = 20;
    reasons.push(`PCR drift ${(pcrDrift * 100).toFixed(1)}% — Neutral zone, no institutional conviction`);
  }
  // Penalize if direction conflicts with PCR signal
  if ((direction === 'LONG' && pcrSignal === 'BEARISH') || (direction === 'SHORT' && pcrSignal === 'BULLISH')) {
    pcrFeatureScore = Math.max(0, pcrFeatureScore - 40);
    reasons.push(`⚠️ Direction conflicts with PCR signal — Index Confluence Filter active`);
  }
  scores.pcrVelocity = pcrFeatureScore;

  // 2. TPO Period Score (0-100 within this feature)
  let tpoFeatureScore = 0;
  if (period) {
    const winRate = direction === 'LONG' ? tpoWin.bull : tpoWin.bear;
    tpoFeatureScore = winRate;
    reasons.push(`${tpoInfo.label} — Historical win rate: ${winRate}%`);
    // Bonus if Period C or G (premium periods)
    if (period === 'C') { tpoFeatureScore = Math.min(100, tpoFeatureScore + 10); reasons.push(`🔥 Period C: Highest probability breakout window`); }
    if (period === 'G') { tpoFeatureScore = Math.min(100, tpoFeatureScore + 8); reasons.push(`⚡ G-Period active — Lunchtime breakout window`); }
    if (period === 'L') { tpoFeatureScore = Math.min(100, tpoFeatureScore + 5); reasons.push(`🎯 Period L — Late-day drive (volume filter required)`); }
    // Penalize lunchtime theta decay (F and G in low VIX)
    if ((period === 'F' || period === 'G') && vix < 15) {
      tpoFeatureScore = Math.max(0, tpoFeatureScore - 15);
      reasons.push(`⚠️ G-period lunchtime theta decay risk (VIX ${vix} < 15)`);
    }
  } else {
    tpoFeatureScore = 30; // Market closed
  }
  scores.tpoPeriod = tpoFeatureScore;

  // 3. GEX Proximity Score (0-100)
  let gexFeatureScore = 40; // Neutral default
  if (spotPrice > 0) {
    const distToCallWall = gexCallWall > 0 ? Math.abs(gexCallWall - spotPrice) / spotPrice * 100 : 999;
    const distToPutWall = gexPutWall > 0 ? Math.abs(spotPrice - gexPutWall) / spotPrice * 100 : 999;

    if (direction === 'LONG') {
      // Long: want put wall below as support
      if (distToPutWall < 0.3) {
        gexFeatureScore = 90;
        reasons.push(`🛡️ Spot within 0.3% of GEX Put Wall — Strong gamma support floor`);
      } else if (distToPutWall < 0.8) {
        gexFeatureScore = 70;
        reasons.push(`GEX Put Wall nearby (${distToPutWall.toFixed(2)}% away) — Dealer hedging support`);
      } else if (distToCallWall < 0.3) {
        gexFeatureScore = 30; // At resistance
        reasons.push(`⚠️ Approaching GEX Call Wall — Gamma resistance, less ideal for longs`);
      }
    } else {
      // Short: want call wall above as resistance
      if (distToCallWall < 0.3) {
        gexFeatureScore = 90;
        reasons.push(`🏔️ Spot within 0.3% of GEX Call Wall — Strong gamma resistance ceiling`);
      } else if (distToCallWall < 0.8) {
        gexFeatureScore = 70;
        reasons.push(`GEX Call Wall nearby (${distToCallWall.toFixed(2)}% away) — Dealer selling pressure`);
      } else if (distToPutWall < 0.3) {
        gexFeatureScore = 30; // At support, bad for shorts
        reasons.push(`⚠️ Near GEX Put Wall support — Gamma floor, less ideal for shorts`);
      }
    }
    // Bonus if near flip zone (neutral dealer positioning → explosive moves)
    if (gexFlipZone > 0 && Math.abs(spotPrice - gexFlipZone) / spotPrice * 100 < 0.2) {
      gexFeatureScore = Math.min(100, gexFeatureScore + 15);
      reasons.push(`⚡ Near GEX Flip Zone — Neutral dealer positioning, explosive breakout likely`);
    }
  }
  scores.gexProximity = gexFeatureScore;

  // 4. OB Pressure Score (0-100)
  let obFeatureScore = 30; // No OB = neutral
  if (hasObZone) {
    if ((direction === 'LONG' && obType === 'DEMAND') || (direction === 'SHORT' && obType === 'SUPPLY')) {
      obFeatureScore = 85;
      reasons.push(`🛡️ Active ${obType} Order Block zone — Institutional footprint confirms direction`);
    } else if ((direction === 'LONG' && obType === 'SUPPLY') || (direction === 'SHORT' && obType === 'DEMAND')) {
      obFeatureScore = 15;
      reasons.push(`⚠️ Order Block zone conflicts with trade direction — Institutional resistance ahead`);
    }
  }
  scores.obPressure = obFeatureScore;

  // 5. VIX Regime Score (0-100)
  let vixFeatureScore = 50;
  if (vix < 14) {
    vixFeatureScore = direction === 'LONG' ? 75 : 60;
    reasons.push(`VIX ${vix} — Low volatility grind (sell OTM premium, buy ATM on retests)`);
  } else if (vix < 18) {
    vixFeatureScore = 65;
    reasons.push(`VIX ${vix} — Balanced vol regime (standard option buying strategy)`);
  } else {
    vixFeatureScore = direction === 'LONG' ? 40 : 80;
    reasons.push(`⚠️ VIX ${vix} — High volatility (IV expansion active, hold through G-period)`);
  }
  scores.vixRegime = vixFeatureScore;

  // 6. Candle Close Confirmation Score (0-100)
  let candleFeatureScore = candleClosedConfirmed ? 90 : 30;
  if (candleClosedConfirmed) {
    reasons.push(`✅ 5-min candle close confirmed — Wall exhaustion filter satisfied`);
  } else {
    reasons.push(`⏳ Awaiting 5-min candle close confirmation (required by Rule 10A)`);
  }
  scores.candleClose = candleFeatureScore;

  // Compute weighted total score
  const totalScore = Math.round(
    (scores.pcrVelocity * FEATURE_WEIGHTS.pcrVelocity +
     scores.tpoPeriod * FEATURE_WEIGHTS.tpoPeriod +
     scores.gexProximity * FEATURE_WEIGHTS.gexProximity +
     scores.obPressure * FEATURE_WEIGHTS.obPressure +
     scores.vixRegime * FEATURE_WEIGHTS.vixRegime +
     scores.candleClose * FEATURE_WEIGHTS.candleClose) / 100
  );

  // Recommendation based on score
  let recommendation, color, icon;
  if (totalScore >= 80) {
    recommendation = 'STRONG ENTRY — Maximum institutional confluence';
    color = '#10b981'; icon = '🔥';
  } else if (totalScore >= 65) {
    recommendation = 'HIGH QUALITY SETUP — Enter with full position size';
    color = '#34d399'; icon = '✅';
  } else if (totalScore >= 50) {
    recommendation = 'MODERATE SETUP — Enter with half size, tight SL';
    color = '#fde047'; icon = '⚡';
  } else if (totalScore >= 35) {
    recommendation = 'LOW CONVICTION — Wait for better setup or skip';
    color = '#f59e0b'; icon = '⚠️';
  } else {
    recommendation = 'AVOID — Multiple conflicting signals';
    color = '#ef4444'; icon = '🚫';
  }

  const result = {
    score: totalScore,
    recommendation,
    color,
    icon,
    direction,
    tpoPeriod: tpoInfo,
    featureBreakdown: {
      pcrVelocity: { score: scores.pcrVelocity, weight: FEATURE_WEIGHTS.pcrVelocity, weighted: Math.round(scores.pcrVelocity * FEATURE_WEIGHTS.pcrVelocity / 100) },
      tpoPeriod: { score: scores.tpoPeriod, weight: FEATURE_WEIGHTS.tpoPeriod, weighted: Math.round(scores.tpoPeriod * FEATURE_WEIGHTS.tpoPeriod / 100) },
      gexProximity: { score: scores.gexProximity, weight: FEATURE_WEIGHTS.gexProximity, weighted: Math.round(scores.gexProximity * FEATURE_WEIGHTS.gexProximity / 100) },
      obPressure: { score: scores.obPressure, weight: FEATURE_WEIGHTS.obPressure, weighted: Math.round(scores.obPressure * FEATURE_WEIGHTS.obPressure / 100) },
      vixRegime: { score: scores.vixRegime, weight: FEATURE_WEIGHTS.vixRegime, weighted: Math.round(scores.vixRegime * FEATURE_WEIGHTS.vixRegime / 100) },
      candleClose: { score: scores.candleFeatureScore, weight: FEATURE_WEIGHTS.candleClose, weighted: Math.round((scores.candleFeatureScore || candleFeatureScore) * FEATURE_WEIGHTS.candleClose / 100) }
    },
    reasons,
    computedAt: new Date().toISOString()
  };

  _lastScore = result;
  _lastComputeTime = Date.now();
  return result;
}

export function getConfluenceScoreInsights() {
  if (!_lastScore || Date.now() - _lastComputeTime > 60000) {
    // Auto-compute with defaults from current market state
    _lastScore = computeConfluenceScore({ direction: 'LONG' });
  }
  return _lastScore;
}
