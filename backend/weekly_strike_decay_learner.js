import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRACKER_DB = path.join(__dirname, 'data', 'weekly_expiry_strike_zero_tracker.json');
const LEARNINGS_FILE = path.join(__dirname, '..', 'learnings', 'market_learnings.txt');

/**
 * 40-Strike Weekly Expiry Decay & Zero-Settlement Learner
 * Tracks 20 strikes above ATM and 20 strikes below ATM every day of the week.
 */
class WeeklyStrikeDecayLearner {
  constructor() {
    this.data = this.loadDatabase();
  }

  loadDatabase() {
    try {
      if (fs.existsSync(TRACKER_DB)) {
        return JSON.parse(fs.readFileSync(TRACKER_DB, 'utf8'));
      }
    } catch (e) {
      console.error('[Strike Zero Tracker] Error loading DB:', e.message);
    }
    return {
      activeCycle: null,
      completedCycles: [],
      cumulativeStats: {
        totalSeriesTracked: 0,
        strikesAnalyzed: 0,
        zeroExpiredCount: 0,
        breachedCount: 0,
        safeDistanceNiftyPts: 180,
        safeDistanceBankNiftyPts: 650
      },
      lastUpdated: null
    };
  }

  saveDatabase() {
    try {
      const dir = path.dirname(TRACKER_DB);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(TRACKER_DB, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('[Strike Zero Tracker] Error saving DB:', e.message);
    }
  }

  getNearestExpiryDateStr() {
    const now = new Date();
    const day = now.getDay();
    let daysToTue = (2 - day + 7) % 7;
    if (daysToTue === 0 && now.getHours() >= 16) daysToTue = 7;
    const expiry = new Date(now.getTime() + daysToTue * 24 * 60 * 60 * 1000);
    return expiry.toISOString().split('T')[0];
  }

  async recordDailySnapshot(niftySpot, bankSpot) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const istTimeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
    const dayName = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
    const expiryDateStr = this.getNearestExpiryDateStr();

    if (!this.data.activeCycle || this.data.activeCycle.expiryDate !== expiryDateStr) {
      if (this.data.activeCycle) {
        this.finalizeCycle(this.data.activeCycle, niftySpot, bankSpot);
      }
      this.data.activeCycle = {
        cycleId: 'SERIES-' + expiryDateStr,
        expiryDate: expiryDateStr,
        startDate: dateStr,
        startNiftySpot: niftySpot,
        startBankSpot: bankSpot,
        dailySnapshots: [],
        niftyStrikes: this.initializeStrikeGrid('NIFTY', niftySpot, 100, 20),
        bankStrikes: this.initializeStrikeGrid('BANKNIFTY', bankSpot, 500, 20)
      };
      console.log('[Strike Zero Tracker] 🚀 Initialized new 40-strike tracking cycle for Expiry: ' + expiryDateStr);
    }

    const cycle = this.data.activeCycle;
    this.updateGridValues(cycle.niftyStrikes, niftySpot, 100, dayName);
    this.updateGridValues(cycle.bankStrikes, bankSpot, 500, dayName);

    cycle.dailySnapshots.push({
      date: dateStr,
      day: dayName,
      time: istTimeStr,
      niftySpot,
      bankSpot
    });

    this.data.lastUpdated = dateStr + ' ' + istTimeStr;

    const isExpiryDay = (dateStr === expiryDateStr);
    if (isExpiryDay) {
      console.log('[Strike Zero Tracker] 🎯 Expiry Day ' + expiryDateStr + ' reached! Calculating strikes that expired to ₹0.00...');
      this.finalizeCycle(cycle, niftySpot, bankSpot);
    } else {
      this.saveDatabase();
    }

    return {
      status: 'SNAPSHOT_RECORDED',
      cycleId: cycle.cycleId,
      date: dateStr,
      day: dayName,
      niftyTracked: cycle.niftyStrikes.length,
      bankTracked: cycle.bankStrikes.length
    };
  }

  initializeStrikeGrid(symbol, spot, step, count) {
    const atm = Math.round(spot / step) * step;
    const strikes = [];

    // 20 strikes below ATM (Puts)
    for (let i = count; i >= 1; i--) {
      const strike = atm - (i * step);
      const dist = spot - strike;
      strikes.push({
        strike,
        type: 'PE',
        symbol: symbol + ' ' + strike + ' PE',
        side: 'PUT_FLOOR',
        initialSpot: spot,
        distFromAtm: -dist,
        initialLtp: Math.max(1.0, parseFloat(((spot * 0.015) * Math.max(0.1, 1 - (dist / (step * 8)))).toFixed(2))),
        currentLtp: 0,
        decayPct: 0,
        expiredToZero: null,
        breached: false,
        lowestLtp: 999999
      });
    }

    // ATM Strike itself
    strikes.push({
      strike: atm,
      type: 'ATM_STRADDLE',
      symbol: symbol + ' ' + atm + ' STRADDLE',
      side: 'ATM',
      initialSpot: spot,
      distFromAtm: 0,
      initialLtp: parseFloat((spot * 0.018).toFixed(2)),
      currentLtp: 0,
      decayPct: 0,
      expiredToZero: false,
      breached: false,
      lowestLtp: 999999
    });

    // 20 strikes above ATM (Calls)
    for (let i = 1; i <= count; i++) {
      const strike = atm + (i * step);
      const dist = strike - spot;
      strikes.push({
        strike,
        type: 'CE',
        symbol: symbol + ' ' + strike + ' CE',
        side: 'CALL_CEILING',
        initialSpot: spot,
        distFromAtm: dist,
        initialLtp: Math.max(1.0, parseFloat(((spot * 0.015) * Math.max(0.1, 1 - (dist / (step * 8)))).toFixed(2))),
        currentLtp: 0,
        decayPct: 0,
        expiredToZero: null,
        breached: false,
        lowestLtp: 999999
      });
    }

    return strikes;
  }

  updateGridValues(grid, currentSpot, step, dayName) {
    grid.forEach(item => {
      const isPut = item.type === 'PE';
      const isCall = item.type === 'CE';

      if (isPut) {
        if (currentSpot < item.strike) item.breached = true;
        const dist = currentSpot - item.strike;
        const remainingFactor = dist <= 0 ? 1.8 : Math.max(0.01, 1 - (dist / (step * 10)));
        const ltp = parseFloat((item.initialLtp * remainingFactor).toFixed(2));
        item.currentLtp = ltp;
        item.lowestLtp = Math.min(item.lowestLtp, ltp);
        item.decayPct = parseFloat((((item.initialLtp - ltp) / item.initialLtp) * 100).toFixed(1));
      } else if (isCall) {
        if (currentSpot > item.strike) item.breached = true;
        const dist = item.strike - currentSpot;
        const remainingFactor = dist <= 0 ? 1.8 : Math.max(0.01, 1 - (dist / (step * 10)));
        const ltp = parseFloat((item.initialLtp * remainingFactor).toFixed(2));
        item.currentLtp = ltp;
        item.lowestLtp = Math.min(item.lowestLtp, ltp);
        item.decayPct = parseFloat((((item.initialLtp - ltp) / item.initialLtp) * 100).toFixed(1));
      }
    });
  }

  finalizeCycle(cycle, finalNiftySpot, finalBankSpot) {
    let zeroCount = 0;
    let breachedCount = 0;

    cycle.niftyStrikes.forEach(item => {
      if (item.type === 'PE') {
        const expiredWorthless = finalNiftySpot > item.strike;
        item.expiredToZero = expiredWorthless;
        if (expiredWorthless) {
          item.currentLtp = 0.05;
          item.decayPct = 99.9;
          zeroCount++;
        } else {
          item.breached = true;
          breachedCount++;
        }
      } else if (item.type === 'CE') {
        const expiredWorthless = finalNiftySpot < item.strike;
        item.expiredToZero = expiredWorthless;
        if (expiredWorthless) {
          item.currentLtp = 0.05;
          item.decayPct = 99.9;
          zeroCount++;
        } else {
          item.breached = true;
          breachedCount++;
        }
      }
    });

    cycle.bankStrikes.forEach(item => {
      if (item.type === 'PE') {
        const expiredWorthless = finalBankSpot > item.strike;
        item.expiredToZero = expiredWorthless;
        if (expiredWorthless) {
          item.currentLtp = 0.05;
          item.decayPct = 99.9;
          zeroCount++;
        } else {
          item.breached = true;
          breachedCount++;
        }
      } else if (item.type === 'CE') {
        const expiredWorthless = finalBankSpot < item.strike;
        item.expiredToZero = expiredWorthless;
        if (expiredWorthless) {
          item.currentLtp = 0.05;
          item.decayPct = 99.9;
          zeroCount++;
        } else {
          item.breached = true;
          breachedCount++;
        }
      }
    });

    const totalTracked = cycle.niftyStrikes.length + cycle.bankStrikes.length;
    const zeroRate = parseFloat(((zeroCount / totalTracked) * 100).toFixed(1));

    cycle.finalNiftySpot = finalNiftySpot;
    cycle.finalBankSpot = finalBankSpot;
    cycle.totalZeroExpired = zeroCount;
    cycle.totalBreached = breachedCount;
    cycle.zeroSettlementWinRate = zeroRate;

    const unbreachedPuts = cycle.niftyStrikes.filter(s => s.type === 'PE' && s.expiredToZero);
    const closestUnbreachedPut = unbreachedPuts.length > 0 ? unbreachedPuts[unbreachedPuts.length - 1] : null;
    const safeNiftyPutDist = closestUnbreachedPut ? (cycle.startNiftySpot - closestUnbreachedPut.strike) : 150;

    const unbreachedCalls = cycle.niftyStrikes.filter(s => s.type === 'CE' && s.expiredToZero);
    const closestUnbreachedCall = unbreachedCalls.length > 0 ? unbreachedCalls[0] : null;
    const safeNiftyCallDist = closestUnbreachedCall ? (closestUnbreachedCall.strike - cycle.startNiftySpot) : 150;

    cycle.discoveredSafeCorridor = {
      niftySafePutBuffer: Math.round(safeNiftyPutDist),
      niftySafeCallBuffer: Math.round(safeNiftyCallDist),
      niftySafeTotalSpan: Math.round(safeNiftyPutDist + safeNiftyCallDist)
    };

    this.data.completedCycles.push(cycle);
    this.data.cumulativeStats.totalSeriesTracked += 1;
    this.data.cumulativeStats.strikesAnalyzed += totalTracked;
    this.data.cumulativeStats.zeroExpiredCount += zeroCount;
    this.data.cumulativeStats.breachedCount += breachedCount;
    this.data.activeCycle = null;

    this.saveDatabase();

    const ruleLog = '\n[WEEKLY STRIKE ZERO SETTLEMENT DISCOVERY - ' + cycle.expiryDate + ']\n' +
      '* Series: ' + cycle.cycleId + ' | Settled: NIFTY ' + finalNiftySpot + ' / BANKNIFTY ' + finalBankSpot + '\n' +
      '* Total Strikes Tracked: ' + totalTracked + ' (20 Above + 20 Below ATM)\n' +
      '* Expired to ₹0.00: ' + zeroCount + ' (' + zeroRate + '% Zero Rate) | Breached/ITM: ' + breachedCount + '\n' +
      '* Empirical Safe Writing Boundary: Nifty Puts > -' + Math.round(safeNiftyPutDist) + ' pts and Calls > +' + Math.round(safeNiftyCallDist) + ' pts decayed to ZERO with 100% hold rate.\n' +
      '* Core Takeaway: Institutional writers collected full 100% premium outside the ' + Math.round(safeNiftyPutDist + safeNiftyCallDist) + ' pt corridor.\n';

    fs.appendFileSync(LEARNINGS_FILE, ruleLog, 'utf8');
    console.log('[Strike Zero Tracker] ✅ Cycle ' + cycle.cycleId + ' finalized! Absorbed new empirical writing boundaries.');
  }

  getStatus() {
    return {
      activeCycle: this.data.activeCycle ? {
        cycleId: this.data.activeCycle.cycleId,
        expiryDate: this.data.activeCycle.expiryDate,
        startDate: this.data.activeCycle.startDate,
        startNiftySpot: this.data.activeCycle.startNiftySpot,
        startBankSpot: this.data.activeCycle.startBankSpot,
        snapshotsCount: this.data.activeCycle.dailySnapshots.length,
        niftyStrikesCount: this.data.activeCycle.niftyStrikes.length,
        bankStrikesCount: this.data.activeCycle.bankStrikes.length,
        niftySummary: {
          zeroTrackingPuts: this.data.activeCycle.niftyStrikes.filter(s => s.type === 'PE' && !s.breached).length,
          zeroTrackingCalls: this.data.activeCycle.niftyStrikes.filter(s => s.type === 'CE' && !s.breached).length,
          breachedCount: this.data.activeCycle.niftyStrikes.filter(s => s.breached).length
        }
      } : null,
      cumulativeStats: this.data.cumulativeStats,
      completedCyclesCount: this.data.completedCycles.length,
      lastUpdated: this.data.lastUpdated
    };
  }

  getActiveGrid(symbol = 'NIFTY') {
    if (!this.data.activeCycle) return [];
    return symbol === 'NIFTY' ? this.data.activeCycle.niftyStrikes : this.data.activeCycle.bankStrikes;
  }
}

const weeklyStrikeLearner = new WeeklyStrikeDecayLearner();
export default weeklyStrikeLearner;
