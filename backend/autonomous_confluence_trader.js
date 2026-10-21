/**
 * AUTONOMOUS CONFLUENCE TRADER & SELF-HEALING QUARANTINE LEDGER
 * ==============================================================
 * 1. Automatically enters virtual paper trades on Grade A & A+ Confluence Setups.
 * 2. Institutional Execution: Books 70% at Target 1, trails remainder to Target 2.
 * 3. Self-Healing Rule Quarantine: Pauses any setup rule that hits 2 consecutive losses.
 * 4. Real-time PnL Curve, Win Rate, and Drawdown statistics.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateHalfKellyLots,
  applyStockdaleDiscipline,
  checkHalfLifeExceeded,
  updateFlywheelPriors
} from './institutional_playbook_engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'confluence_paper_ledger.json');

const INITIAL_CAPITAL = 500000; // ₹5,00,000

function readLedger() {
  try {
    if (fs.existsSync(LEDGER_FILE)) return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
  } catch (e) {}
  return {
    initialCapital: INITIAL_CAPITAL,
    currentCapital: INITIAL_CAPITAL,
    totalPnl: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    activePositions: [],
    closedTrades: [],
    quarantinedRules: {}, // ruleKey -> { pausedAt, lossesCount, reason }
    lastUpdated: new Date().toISOString()
  };
}

function saveLedger(ledger) {
  try {
    ledger.lastUpdated = new Date().toISOString();
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2), 'utf8');
  } catch (e) {}
}

/**
 * Check if a rule is currently quarantined
 */
export function isRuleQuarantined(ruleKey) {
  const ledger = readLedger();
  const q = ledger.quarantinedRules[ruleKey];
  if (!q) return false;
  // Quarantine lasts for 2 hours or until manual reset
  const ageMs = Date.now() - new Date(q.pausedAt).getTime();
  if (ageMs > 2 * 60 * 60 * 1000) {
    delete ledger.quarantinedRules[ruleKey];
    saveLedger(ledger);
    return false;
  }
  return true;
}

/**
 * Evaluate Grade A/A+ Confluence setup for automated paper trade entry
 */
export function processConfluenceSignal(confluenceResult) {
  if (!confluenceResult || confluenceResult.score < 80) return null;

  const ledger = readLedger();
  const sym = confluenceResult.symbol;

  // Max 4 open concurrent positions
  if (ledger.activePositions.length >= 4) return null;

  // Check if position already open for this symbol
  const existing = ledger.activePositions.find(p => p.symbol === sym);
  if (existing) return null;

  const ruleKey = `${sym}_${confluenceResult.signal}_${confluenceResult.tpoPeriod}`;
  if (isRuleQuarantined(ruleKey)) {
    console.log(`[Confluence Trader] ⏸️ Setup ${ruleKey} is quarantined due to consecutive losses. Skipping.`);
    return null;
  }

  // ── 1. PRE-MORTEM VETO GUARD (Annie Duke — "Thinking in Bets") ─────────────
  if (confluenceResult.preMortemGuard?.vetoed) {
    const reasons = (confluenceResult.preMortemGuard.redFlags || []).map(f => f.code).join(', ');
    console.warn(`[Confluence Trader] 🚫 PRE-MORTEM VETO: Skipping entry on ${sym} due to failure risk vectors: [${reasons}]`);
    return null;
  }

  const opt = confluenceResult.optionPlan;
  if (!opt) return null;

  // ── 2. HALF-KELLY LOT SIZING (Dr. Ernest P. Chan — "Algorithmic Trading") ─
  const baseLotUnit = opt.lotSize || 1;
  const rewardRisk = Math.abs(opt.spotTarget1 - confluenceResult.spotPrice) / Math.max(1, Math.abs(confluenceResult.spotPrice - opt.spotSl));
  const kelly = calculateHalfKellyLots({
    grade: confluenceResult.grade,
    score: confluenceResult.score,
    winRateEstimate: confluenceResult.winRateEstimate,
    rewardRiskRatio: rewardRisk,
    baseLots: 1,
    portfolioCapital: ledger.currentCapital,
    estimatedTradeCost: opt.pricing.estimatedEntry * baseLotUnit
  });

  if (kelly.recommendedLots <= 0) {
    console.log(`[Confluence Trader] ⏸️ Half-Kelly lot sizing returned 0 allocation for ${sym}. Skipping.`);
    return null;
  }

  const effectiveLots = kelly.recommendedLots;
  const effectiveTotalUnits = baseLotUnit * effectiveLots;

  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(11, 16) + ' IST';

  const trade = {
    id: `CONFL_${sym}_${Date.now()}`,
    symbol: sym,
    contract: opt.contract,
    direction: opt.direction,
    strike: opt.strike,
    lotSize: effectiveTotalUnits,
    kellyLots: effectiveLots,
    kellyRationale: kelly.rationale,
    entryTime: istNow,
    timestamp: now.toISOString(),
    entrySpot: confluenceResult.spotPrice,
    entryPremium: opt.pricing.estimatedEntry,
    spotSl: opt.spotSl,
    optionSl: opt.pricing.optionSl,
    spotTarget1: opt.spotTarget1,
    optionTarget1: opt.pricing.optionTarget1,
    spotTarget2: opt.spotTarget2,
    optionTarget2: opt.pricing.optionTarget2,
    score: confluenceResult.score,
    grade: confluenceResult.grade,
    ruleKey,
    status: 'OPEN',
    target1Booked: false,
    realizedPnl: 0,
    currentPnl: 0,
    halfLifeMinutes: 35,
    maxHoldingMinutes: 88,
  };

  ledger.activePositions.push(trade);
  saveLedger(ledger);

  console.log(`[Confluence Trader] 🚀 ENTERED VIRTUAL POSITION (${kelly.sizingGrade}): ${sym} ${opt.contract} [${effectiveLots} lot(s) = ${effectiveTotalUnits} units] @ ₹${opt.pricing.estimatedEntry} | SL: ₹${opt.pricing.optionSl} | Target 1: ₹${opt.pricing.optionTarget1}`);
  return trade;
}

/**
 * Update active positions with live tick prices
 */
export function updateActivePositions(spotPriceMap = {}) {
  const ledger = readLedger();
  if (!ledger.activePositions.length) return ledger;

  let modified = false;
  const remainingPositions = [];

  for (const pos of ledger.activePositions) {
    const currentSpot = spotPriceMap[pos.symbol] || pos.entrySpot;
    const isPE = pos.direction === 'PE';

    // Calculate current synthetic option premium using Delta 0.5
    const spotDelta = isPE ? (pos.entrySpot - currentSpot) : (currentSpot - pos.entrySpot);
    const estPremium = Math.max(1.0, parseFloat((pos.entryPremium + (spotDelta * 0.5)).toFixed(1)));
    const openPnl = Math.round((estPremium - pos.entryPremium) * pos.lotSize);
    pos.currentPnl = openPnl;

    // ── 3. ORNSTEIN-UHLENBECK HALF-LIFE TIME STOP (Dr. Ernest P. Chan) ────────
    const targetProgress = isPE
      ? (pos.entrySpot - currentSpot) / Math.max(1, pos.entrySpot - pos.spotTarget1)
      : (currentSpot - pos.entrySpot) / Math.max(1, pos.spotTarget1 - pos.entrySpot);

    const halfLifeCheck = checkHalfLifeExceeded(pos.timestamp, pos.maxHoldingMinutes || 88, targetProgress);
    if (halfLifeCheck.isExceeded) {
      pos.realizedPnl += openPnl;
      pos.status = 'HALF_LIFE_EXPIRED';
      pos.exitSpot = currentSpot;
      pos.exitTime = new Date().toISOString();
      pos.exitReason = halfLifeCheck.reason;

      ledger.closedTrades.unshift(pos);
      ledger.totalTrades++;
      if (pos.realizedPnl >= 0) ledger.winningTrades++; else ledger.losingTrades++;
      ledger.totalPnl += pos.realizedPnl;
      ledger.currentCapital += pos.realizedPnl;

      updateFlywheelPriors({
        ruleKey: pos.ruleKey,
        isWin: pos.realizedPnl >= 0,
        pnl: pos.realizedPnl,
        symbol: pos.symbol,
        grade: pos.grade
      });

      console.warn(`[Confluence Trader] ⌛ ${halfLifeCheck.reason}`);
      modified = true;
      continue;
    }

    // 1. Target 1 Reached (Book 70%, move SL to Breakeven)
    const target1Hit = isPE ? (currentSpot <= pos.spotTarget1) : (currentSpot >= pos.spotTarget1);
    if (target1Hit && !pos.target1Booked) {
      pos.target1Booked = true;
      pos.optionSl = pos.entryPremium; // Breakeven SL
      const bookedPnl = Math.round((pos.optionTarget1 - pos.entryPremium) * pos.lotSize * 0.7);
      pos.realizedPnl += bookedPnl;
      console.log(`[Confluence Trader] 🎯 TARGET 1 HIT on ${pos.symbol} ${pos.contract}: Booked 70% (+₹${bookedPnl}). Trailing remaining 30% to Target 2!`);
      modified = true;
    }

    // 2. Target 2 Reached (Full Profit Exit)
    const target2Hit = isPE ? (currentSpot <= pos.spotTarget2) : (currentSpot >= pos.spotTarget2);
    if (target2Hit) {
      const finalLots = pos.target1Booked ? pos.lotSize * 0.3 : pos.lotSize;
      const finalPnl = Math.round((pos.optionTarget2 - pos.entryPremium) * finalLots);
      pos.realizedPnl += finalPnl;
      pos.status = 'TARGET_2_CLOSED';
      pos.exitSpot = currentSpot;
      pos.exitTime = new Date().toISOString();
      pos.exitReason = 'TARGET_2_FULL_WIN';

      ledger.closedTrades.unshift(pos);
      ledger.totalTrades++;
      ledger.winningTrades++;
      ledger.totalPnl += pos.realizedPnl;
      ledger.currentCapital += pos.realizedPnl;

      // Update Bayesian Flywheel Priors
      updateFlywheelPriors({
        ruleKey: pos.ruleKey,
        isWin: true,
        pnl: pos.realizedPnl,
        symbol: pos.symbol,
        grade: pos.grade
      });

      console.log(`[Confluence Trader] 🏆 TARGET 2 HIT on ${pos.symbol} ${pos.contract}: Closed with Total PnL: +₹${pos.realizedPnl}!`);
      modified = true;
      continue;
    }

    // ── 4. STOP LOSS HIT & STOCKDALE DISCIPLINE (Jim Collins) ────────────────
    const stockdale = applyStockdaleDiscipline(pos, currentSpot);
    const slHit = stockdale.shouldLiquidate || (isPE ? (currentSpot >= pos.spotSl) : (currentSpot <= pos.spotSl));

    if (slHit) {
      const lossPnl = Math.round((pos.optionSl - pos.entryPremium) * pos.lotSize);
      pos.realizedPnl += lossPnl;
      pos.status = 'STOPPED_OUT';
      pos.exitSpot = currentSpot;
      pos.exitTime = new Date().toISOString();
      pos.exitReason = stockdale.shouldLiquidate ? stockdale.exitReason : 'SL_HIT';

      ledger.closedTrades.unshift(pos);
      ledger.totalTrades++;
      ledger.losingTrades++;
      ledger.totalPnl += pos.realizedPnl;
      ledger.currentCapital += pos.realizedPnl;

      // Update Bayesian Flywheel Priors
      updateFlywheelPriors({
        ruleKey: pos.ruleKey,
        isWin: false,
        pnl: pos.realizedPnl,
        symbol: pos.symbol,
        grade: pos.grade
      });

      // ── SELF-HEALING QUARANTINE CHECK ─────────────────────────────────────
      const ruleHistory = ledger.closedTrades.filter(t => t.ruleKey === pos.ruleKey);
      if (ruleHistory.length >= 2 && ruleHistory[0].status === 'STOPPED_OUT' && ruleHistory[1].status === 'STOPPED_OUT') {
        ledger.quarantinedRules[pos.ruleKey] = {
          pausedAt: new Date().toISOString(),
          lossesCount: 2,
          reason: 'Self-Healing Auto Quarantine: 2 consecutive stop loss hits. Pausing setup to protect capital.'
        };
        console.warn(`[Confluence Trader] 🚨 RULE QUARANTINED: ${pos.ruleKey} paused due to 2 consecutive losses!`);
      }

      console.log(`[Confluence Trader] 🛑 SL HIT on ${pos.symbol} ${pos.contract}: Exit PnL: ₹${pos.realizedPnl} (${pos.exitReason})`);
      modified = true;
      continue;
    }

    remainingPositions.push(pos);
  }

  if (modified) {
    ledger.activePositions = remainingPositions;
    ledger.winRate = ledger.totalTrades > 0 ? parseFloat(((ledger.winningTrades / ledger.totalTrades) * 100).toFixed(1)) : 0;
    saveLedger(ledger);
  }

  return ledger;
}

export function getLedgerSummary() {
  const ledger = readLedger();
  ledger.winRate = ledger.totalTrades > 0 ? parseFloat(((ledger.winningTrades / ledger.totalTrades) * 100).toFixed(1)) : 0;
  return ledger;
}
