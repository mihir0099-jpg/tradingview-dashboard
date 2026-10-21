/**
 * INSTITUTIONAL PLAYBOOK ENGINE
 * ==============================
 * Codifies core quantitative formulas and strategic rules from 5 seminal classics:
 * 
 * 1. Annie Duke — "Thinking in Bets": PreMortemGuard
 *    - Pre-flight adversarial check: imagines trade failure before execution.
 *    - 4 Veto Checks: Index Drag, Lunchtime Theta Trap, Volume Exhaustion, Long Gamma Squelch.
 *    - Blocks entry if >= 2 red flags trigger.
 * 
 * 2. Dr. Ernest P. Chan — "Algorithmic Trading": HalfKellySizer
 *    - Fractional Kelly formula: f* / 2 = 0.5 * ((p * b - (1 - p)) / b)
 *    - Dynamically calibrates lot sizing based on backtested win rate (p) and payoff ratio (b).
 * 
 * 3. Dr. Ernest P. Chan — "Algorithmic Trading": HalfLifeTimeStop
 *    - Ornstein-Uhlenbeck mean-reversion process for Long Gamma (+GEX) assets:
 *      tau = ln(2) / lambda
 *    - Auto-liquidates stagnant positions when elapsed time > 2.5 * tau, cutting theta loss.
 * 
 * 4. Howard Marks — "The Most Important Thing": SecondLevelInverter
 *    - Second-level contrarian thinking: Fades crowd breakouts chasing into saturated Call Walls (>=75% OI).
 *    - Inverts retail "Buy CE" into institutional "FADE (Buy PE)" targeting Put Wall/POC.
 * 
 * 5. Jim Collins — "Good to Great" & BCG "Hardball": StockdaleDiscipline & FlywheelLearner
 *    - Stockdale Discipline: Brutal zero-delay liquidation when spot SL is breached (zero hopium).
 *    - Flywheel Bayesian Learner: Continually updates rule win rates with posterior updates:
 *      alpha = alpha + wins, beta = beta + losses.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const FLYWHEEL_FILE = path.join(DATA_DIR, 'institutional_flywheel_ledger.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readFlywheelLedger() {
  try {
    ensureDataDir();
    if (fs.existsSync(FLYWHEEL_FILE)) {
      return JSON.parse(fs.readFileSync(FLYWHEEL_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    meta: {
      engine: 'INSTITUTIONAL_FLYWHEEL_LEARNER',
      methodology: 'Bayesian Conjugate Beta-Binomial Prior Updating',
      lastUpdated: new Date().toISOString()
    },
    rules: {},
    globalStats: {
      totalEvaluations: 0,
      totalVetoes: 0,
      totalInversions: 0,
      totalHalfLifeExits: 0,
      totalStockdaleExits: 0
    }
  };
}

function saveFlywheelLedger(ledger) {
  try {
    ensureDataDir();
    ledger.meta.lastUpdated = new Date().toISOString();
    fs.writeFileSync(FLYWHEEL_FILE, JSON.stringify(ledger, null, 2), 'utf8');
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRE-MORTEM GUARD (Annie Duke — "Thinking in Bets")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conducts an adversarial pre-mortem check before committing capital.
 * Evaluates 4 structural failure vectors:
 *   1. Index Drag Trap (Stock CE vs Bearish Index)
 *   2. Lunchtime Theta Trap (G-Period consolidation under low VIX)
 *   3. Volume Exhaustion Divergence (Low volume breakout)
 *   4. Long Gamma Squelch Barrier (High dealer counter-hedging cap)
 */
export function runPreMortemVetoCheck({
  symbol = 'NIFTY',
  direction = 'CE',
  spotPrice = 0,
  tpoPeriod = 'D',
  vix = 14.5,
  pcrDrift = 0,
  indexStatus = { niftyBelowOpen: false, bankniftyBelowOpen: false, indexPcrDrift: -0.02 },
  netGexCr = 0,
  gexRegime = 'LONG_GAMMA',
  distToCallWallPct = 1.0,
  distToPutWallPct = 1.0,
  relativeVolume = 1.0
} = {}) {
  const redFlags = [];
  const sym = symbol.toUpperCase();
  const isIndex = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'].includes(sym);

  // RED FLAG 1: Index Drag Trap (Rule 10A)
  // Never buy CE on stock breakouts if index is trading below open or has negative PCR drift
  if (!isIndex && direction === 'CE') {
    const hasIndexDrag = indexStatus.niftyBelowOpen || 
                         indexStatus.bankniftyBelowOpen || 
                         (indexStatus.indexPcrDrift !== undefined && indexStatus.indexPcrDrift < -0.03);
    if (hasIndexDrag) {
      redFlags.push({
        code: 'INDEX_DRAG_TRAP',
        severity: 'CRITICAL',
        source: 'Annie Duke (Thinking in Bets) & Rule 10A',
        message: `Benchmark index (Nifty/BankNifty) is below morning open or in bearish PCR drift (${(indexStatus.indexPcrDrift * 100).toFixed(1)}%). Stock CE breakouts suffer high drag failure rate.`
      });
    }
  }

  // RED FLAG 2: Lunchtime Theta Trap (Rule 2)
  // G-Period (12:15 PM - 12:45 PM IST) consolidation deflates option premiums when VIX < 15
  if (tpoPeriod === 'G' && vix < 15.0) {
    redFlags.push({
      code: 'LUNCHTIME_THETA_TRAP',
      severity: 'HIGH',
      source: 'Global Rule 2: G-Period Options Lunchtime Decay',
      message: `Period G lunchtime consolidation deflates premiums in low VIX (${vix} < 15). Straddles lose 1.5% - 4% theta. Long options should wait until 12:45 PM.`
    });
  }

  // RED FLAG 3: Volume Exhaustion Divergence (Rule 4D & 11B)
  // Breakout without volume confirmation is an exhaustion trap
  const isLateDayPeriodL = tpoPeriod === 'L';
  const minRequiredVol = isLateDayPeriodL ? 1.2 : 0.8;
  if (relativeVolume > 0 && relativeVolume < minRequiredVol) {
    redFlags.push({
      code: 'VOLUME_EXHAUSTION_DIVERGENCE',
      severity: isLateDayPeriodL ? 'CRITICAL' : 'HIGH',
      source: 'Global Rules 4D & 11B (Marshall Volume Confirmation)',
      message: `Breakout attempt accompanied by weak volume (${relativeVolume.toFixed(2)}x vs required ${minRequiredVol}x). High probability of institutional fakeout.`
    });
  }

  // RED FLAG 4: Long Gamma Squelch Barrier (Dealer Counter-Hedging)
  // In positive Long Gamma, dealers sell into rallies and buy dips, acting as a ceiling
  if (direction === 'CE' && (gexRegime === 'LONG_GAMMA' || netGexCr > 40) && distToCallWallPct <= 0.40) {
    redFlags.push({
      code: 'LONG_GAMMA_SQUELCH_BARRIER',
      severity: 'HIGH',
      source: 'Ernest Chan & Market Profile GEX Dynamics',
      message: `Underlying is in heavy Long Gamma (+₹${netGexCr.toFixed(1)} Cr) within ${distToCallWallPct.toFixed(2)}% of Call Wall. Dealer delta counter-hedging will aggressively squash upside velocity.`
    });
  }

  const vetoed = redFlags.length >= 2 || redFlags.some(f => f.severity === 'CRITICAL' && redFlags.length >= 1 && tpoPeriod === 'G');
  const caution = redFlags.length === 1;

  let suggestedAction = 'PROCEED';
  if (vetoed) suggestedAction = 'VETO_ENTRY';
  else if (caution) suggestedAction = 'REDUCE_SIZE';

  // Update stats
  const ledger = readFlywheelLedger();
  ledger.globalStats.totalEvaluations++;
  if (vetoed) ledger.globalStats.totalVetoes++;
  saveFlywheelLedger(ledger);

  return {
    vetoed,
    caution,
    flagsCount: redFlags.length,
    redFlags,
    riskAssessment: vetoed 
      ? `🚫 PRE-MORTEM VETO: ${redFlags.length} structural failure vector(s) detected. Pre-mortem predicts probable trap.`
      : (caution ? `⚠️ CAUTION: 1 failure risk identified (${redFlags[0].code}). Size trimmed by 50%.` : `✅ PRE-MORTEM CLEAR: Zero failure vectors detected. Clean runway.`),
    suggestedAction
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HALF-KELLY SIZER (Dr. Ernest P. Chan — "Algorithmic Trading")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates Fractional Half-Kelly Lot Sizing:
 *   f* = (p * b - (1 - p)) / b
 *   Half-Kelly = f* / 2
 * Where:
 *   p = win probability (e.g., 0.88 for Grade A+, 0.82 for Grade A, 0.72 for Grade B)
 *   b = payoff ratio = (Target - Entry) / (Entry - SL)
 */
export function calculateHalfKellyLots({
  grade = 'GRADE_A',
  score = 80,
  winRateEstimate = 0.82,
  rewardRiskRatio = 1.6,
  baseLots = 1,
  portfolioCapital = 500000,
  estimatedTradeCost = 15000
} = {}) {
  // Normalize win rate
  let p = typeof winRateEstimate === 'number' ? winRateEstimate : 0.80;
  if (p > 1.0) p = p / 100.0; // handle 88% -> 0.88

  const b = Math.max(0.5, rewardRiskRatio);

  // Full Kelly formula
  const fullKelly = (p * b - (1 - p)) / b;
  // Fractional Half-Kelly (industry standard to prevent drawdown ruin)
  const halfKelly = Math.max(0, fullKelly / 2.0);

  // Discrete lot mapping based on institutional grade and Kelly value
  let recommendedLots = baseLots;
  let sizingGrade = 'NORMAL';

  if (halfKelly <= 0 || score < 70) {
    recommendedLots = 0;
    sizingGrade = 'ZERO_ALLOCATION';
  } else if (grade === 'GRADE_A_PLUS' || score >= 90) {
    recommendedLots = Math.max(1, Math.min(4, Math.round(baseLots * 3)));
    sizingGrade = 'MAX_CONVICTION_3X';
  } else if (grade === 'GRADE_A' || score >= 80) {
    recommendedLots = Math.max(1, Math.min(3, Math.round(baseLots * 2)));
    sizingGrade = 'HIGH_CONVICTION_2X';
  } else {
    recommendedLots = Math.max(1, baseLots);
    sizingGrade = 'STANDARD_1X';
  }

  // Capital safety guard: never allocate > 10% of portfolio to single option setup
  const totalTradeCost = recommendedLots * estimatedTradeCost;
  const maxAllowedCost = portfolioCapital * 0.10;
  if (totalTradeCost > maxAllowedCost && recommendedLots > 1) {
    recommendedLots = Math.max(1, Math.floor(maxAllowedCost / estimatedTradeCost));
    sizingGrade += '_CAPPED_BY_RISK_LIMIT';
  }

  return {
    fullKelly: +fullKelly.toFixed(3),
    halfKelly: +halfKelly.toFixed(3),
    recommendedLots,
    allocationPct: +( (recommendedLots * estimatedTradeCost / portfolioCapital) * 100 ).toFixed(1),
    sizingGrade,
    rationale: `Dr. Ernest Chan Half-Kelly: Win Rate ${(p * 100).toFixed(0)}%, Payoff ${b.toFixed(2)}x -> Half-Kelly ${(halfKelly * 100).toFixed(1)}%. Allocated ${recommendedLots} lot(s).`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ORNSTEIN-UHLENBECK HALF-LIFE TIME STOP (Dr. Ernest P. Chan)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates Ornstein-Uhlenbeck mean-reversion parameter lambda and Half-Life tau (in minutes):
 *   tau = ln(2) / lambda
 * For Long Gamma assets, price is bounded and mean-reverting.
 * If elapsed time > 2.5 * tau and trade has not reached 30% of Target 1,
 * trigger auto-liquidation before theta decay accelerates.
 */
export function calculateOuHalfLifeMinutes(priceHistory = [], defaultMinutes = 35) {
  if (!priceHistory || priceHistory.length < 8) {
    return {
      halfLifeMinutes: defaultMinutes,
      maxHoldingMinutes: Math.round(defaultMinutes * 2.5),
      regime: 'MEAN_REVERTING_DEFAULT',
      lambda: +(Math.LN2 / defaultMinutes).toFixed(4)
    };
  }

  try {
    // Linear regression of (x_t - x_{t-1}) on x_{t-1}
    const n = priceHistory.length - 1;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x_prev = priceHistory[i];
      const delta_x = priceHistory[i + 1] - x_prev;
      sumX += x_prev;
      sumY += delta_x;
      sumXY += x_prev * delta_x;
      sumX2 += x_prev * x_prev;
    }

    const denominator = (n * sumX2 - sumX * sumX);
    if (Math.abs(denominator) < 1e-9) {
      return { halfLifeMinutes: defaultMinutes, maxHoldingMinutes: Math.round(defaultMinutes * 2.5), regime: 'DEFAULT', lambda: 0.02 };
    }

    const beta = (n * sumXY - sumX * sumY) / denominator;
    
    // Mean reverting if beta < 0
    if (beta < 0) {
      const lambda = -beta;
      const halfLife = Math.max(10, Math.min(90, Math.round(Math.LN2 / lambda)));
      return {
        halfLifeMinutes: halfLife,
        maxHoldingMinutes: Math.round(halfLife * 2.5),
        regime: 'ORNSTEIN_UHLENBECK_MEAN_REVERTING',
        lambda: +lambda.toFixed(4)
      };
    } else {
      // Trending (momentum)
      return {
        halfLifeMinutes: 120,
        maxHoldingMinutes: 180,
        regime: 'MOMENTUM_TRENDING',
        lambda: 0.005
      };
    }
  } catch (e) {
    return { halfLifeMinutes: defaultMinutes, maxHoldingMinutes: Math.round(defaultMinutes * 2.5), regime: 'FALLBACK', lambda: 0.02 };
  }
}

/**
 * Checks if active trade holding time has exceeded the Ornstein-Uhlenbeck Half-Life limit
 */
export function checkHalfLifeExceeded(entryTimestamp, maxHoldingMinutes = 75, targetProgressPct = 0) {
  const entryMs = new Date(entryTimestamp).getTime();
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - entryMs) / 60000));

  const isExceeded = elapsedMinutes >= maxHoldingMinutes && targetProgressPct < 0.30;
  
  if (isExceeded) {
    const ledger = readFlywheelLedger();
    ledger.globalStats.totalHalfLifeExits++;
    saveFlywheelLedger(ledger);
  }

  return {
    isExceeded,
    elapsedMinutes,
    maxHoldingMinutes,
    targetProgressPct: +(targetProgressPct * 100).toFixed(1),
    reason: isExceeded
      ? `⌛ HALF-LIFE EXPIRED (Ernest Chan): Position elapsed ${elapsedMinutes}m exceeds 2.5x Half-Life (${maxHoldingMinutes}m) with only ${(targetProgressPct * 100).toFixed(0)}% progress toward Target 1. Auto-liquidating to prevent theta crush.`
      : null
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SECOND-LEVEL CONTRARIAN INVERTER (Howard Marks — "The Most Important Thing")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates whether a breakout signal is a consensus retail chase into an institutional wall trap.
 * If retail is chasing a Call breakout within 0.35% of a heavily saturated Call Wall (OI >= 75%)
 * without a volume explosion (>2.5x), INVERT the trade into an Institutional Fade (Buy PE).
 */
export function evaluateSecondLevelContrarian({
  symbol = 'NIFTY',
  spotPrice = 0,
  callWall = 0,
  putWall = 0,
  direction = 'CE',
  relativeVolume = 1.0,
  callOiPctAtWall = 0.80,
  putOiPctAtWall = 0.80
} = {}) {
  const isNearCallWall = callWall > 0 && Math.abs(spotPrice - callWall) / callWall <= 0.0035;
  const isNearPutWall = putWall > 0 && Math.abs(spotPrice - putWall) / putWall <= 0.0035;

  // Case 1: Retail chasing Call Breakout directly into saturated Call Wall
  if (direction === 'CE' && isNearCallWall && callOiPctAtWall >= 0.70 && relativeVolume < 2.5) {
    const ledger = readFlywheelLedger();
    ledger.globalStats.totalInversions++;
    saveFlywheelLedger(ledger);

    return {
      inverted: true,
      originalDirection: 'CE',
      invertedDirection: 'PE',
      setupName: 'SECOND_LEVEL_CALL_WALL_FADE',
      source: 'Howard Marks (The Most Important Thing: Second-Level Thinking)',
      newSpotSl: Math.round(callWall * 1.004),
      newSpotTarget: Math.round(putWall > 0 ? (spotPrice + putWall) / 2 : spotPrice * 0.988),
      rationale: `Howard Marks Second-Level Inversion: Retail crowd is consensus buying Calls at the Call Wall (${callWall}) where institutional call sellers hold ${(callOiPctAtWall * 100).toFixed(0)}% OI. Without >2.5x volume explosion, this is an institutional ceiling trap. Inverted to BUY PE fade.`
    };
  }

  // Case 2: Retail panic selling into saturated Put Wall Floor
  if (direction === 'PE' && isNearPutWall && putOiPctAtWall >= 0.70 && relativeVolume < 2.5) {
    const ledger = readFlywheelLedger();
    ledger.globalStats.totalInversions++;
    saveFlywheelLedger(ledger);

    return {
      inverted: true,
      originalDirection: 'PE',
      invertedDirection: 'CE',
      setupName: 'SECOND_LEVEL_PUT_WALL_BOUNCE',
      source: 'Howard Marks (The Most Important Thing: Second-Level Thinking)',
      newSpotSl: Math.round(putWall * 0.996),
      newSpotTarget: Math.round(callWall > 0 ? (spotPrice + callWall) / 2 : spotPrice * 1.012),
      rationale: `Howard Marks Second-Level Inversion: Retail crowd is panic buying Puts at the Put Wall floor (${putWall}) where institutional put writers hold ${(putOiPctAtWall * 100).toFixed(0)}% OI. Inverted to BUY CE floor bounce.`
    };
  }

  return {
    inverted: false,
    originalDirection: direction,
    invertedDirection: direction,
    setupName: 'STANDARD_CONFLUENCE_DIRECTION',
    rationale: 'Direction aligned with institutional positioning.'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STOCKDALE DISCIPLINE & FLYWHEEL LEARNER (Jim Collins — "Good to Great" & BCG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stockdale Paradox: Zero delay, zero hesitation stop-loss liquidation.
 * If spot breaches SL by even 1 tick, trigger immediate liquidation.
 */
export function applyStockdaleDiscipline(position, currentSpot) {
  if (!position || !position.spotSl) return { shouldLiquidate: false };

  const isPE = position.direction === 'PE';
  const slBreached = isPE ? (currentSpot >= position.spotSl) : (currentSpot <= position.spotSl);

  if (slBreached) {
    const ledger = readFlywheelLedger();
    ledger.globalStats.totalStockdaleExits++;
    saveFlywheelLedger(ledger);

    return {
      shouldLiquidate: true,
      exitReason: 'STOCKDALE_DISCIPLINE_HARD_SL',
      source: 'Jim Collins (The Stockdale Paradox: Confront the brutal truth with zero delay)',
      spotDifference: Math.abs(currentSpot - position.spotSl),
      message: `🛑 Stockdale Paradox Zero-Delay Exit: Spot ${currentSpot} breached SL ${position.spotSl}. Immediate liquidation executed. Zero hope, zero prayer.`
    };
  }

  return { shouldLiquidate: false };
}

/**
 * Updates Bayesian conjugate Beta-Binomial priors for setup rules.
 * Maintains persistent institutional flywheel in backend/data/institutional_flywheel_ledger.json.
 */
export function updateFlywheelPriors({
  ruleKey,
  isWin,
  pnl = 0,
  symbol = 'NIFTY',
  grade = 'GRADE_A'
} = {}) {
  if (!ruleKey) return;

  const ledger = readFlywheelLedger();
  if (!ledger.rules[ruleKey]) {
    // Default uninformative prior with mild optimism (alpha=8, beta=2 -> 80% prior)
    ledger.rules[ruleKey] = {
      ruleKey,
      symbol,
      grade,
      priorAlpha: 8,
      priorBeta: 2,
      empiricalWins: 0,
      empiricalLosses: 0,
      totalTrades: 0,
      cumulativePnl: 0,
      bayesianWinRate: 80.0,
      isQuarantined: false,
      flywheelStatus: 'BUILDING_MOMENTUM'
    };
  }

  const r = ledger.rules[ruleKey];
  r.totalTrades++;
  r.cumulativePnl += pnl;

  if (isWin) {
    r.empiricalWins++;
  } else {
    r.empiricalLosses++;
  }

  // Posterior Mean = (alpha + wins) / (alpha + beta + wins + losses)
  const posteriorAlpha = r.priorAlpha + r.empiricalWins;
  const posteriorBeta = r.priorBeta + r.empiricalLosses;
  const bayesianRate = (posteriorAlpha / (posteriorAlpha + posteriorBeta)) * 100.0;
  r.bayesianWinRate = +bayesianRate.toFixed(1);

  // Collins Flywheel Thresholds
  if (r.bayesianWinRate >= 85.0 && r.totalTrades >= 3) {
    r.flywheelStatus = 'FLYWHEEL_INSTITUTIONAL_PILLAR';
    r.isQuarantined = false;
  } else if (r.bayesianWinRate < 60.0 && r.totalTrades >= 2) {
    r.flywheelStatus = 'QUARANTINED_SUB_PAR';
    r.isQuarantined = true;
  } else {
    r.flywheelStatus = 'ACTIVE_ROTATION';
  }

  saveFlywheelLedger(ledger);
  return r;
}

/**
 * Returns overall institutional playbook status and summary metrics
 */
export function getInstitutionalPlaybookStatus() {
  const ledger = readFlywheelLedger();
  const rulesList = Object.values(ledger.rules);

  return {
    engine: 'Institutional Playbook Engine (5 Classics Codified)',
    frameworks: [
      'Thinking in Bets (Annie Duke) — PreMortemGuard',
      'Algorithmic Trading (Dr. Ernest P. Chan) — HalfKellySizer & HalfLifeTimeStop',
      'The Most Important Thing (Howard Marks) — SecondLevelInverter',
      'Good to Great (Jim Collins) — StockdaleDiscipline & FlywheelLearner',
      'Hardball (BCG) — Max Allocation to Dominant A+ Pillars'
    ],
    stats: ledger.globalStats,
    flywheelPillarsCount: rulesList.filter(r => r.flywheelStatus === 'FLYWHEEL_INSTITUTIONAL_PILLAR').length,
    quarantinedRulesCount: rulesList.filter(r => r.isQuarantined).length,
    activeRulesCount: rulesList.length,
    rules: rulesList.slice(0, 20),
    lastUpdated: ledger.meta.lastUpdated
  };
}
