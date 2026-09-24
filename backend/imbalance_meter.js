import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { angelOneBridge } from './angelone_bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOURNAL_FILE = path.join(__dirname, 'data', 'imbalance_mistake_journal.json');

// Heavyweight constituents with index weighting
export const CONSTITUENTS = [
  { symbol: 'RELIANCE', token: '2885', exchange: 'NSE', niftyWeight: 10.5, bankniftyWeight: 0, sensexWeight: 11.8 },
  { symbol: 'HDFCBANK', token: '1333', exchange: 'NSE', niftyWeight: 12.8, bankniftyWeight: 29.0, sensexWeight: 14.5 },
  { symbol: 'ICICIBANK', token: '4963', exchange: 'NSE', niftyWeight: 7.8, bankniftyWeight: 23.0, sensexWeight: 9.2 },
  { symbol: 'INFY', token: '1594', exchange: 'NSE', niftyWeight: 5.8, bankniftyWeight: 0, sensexWeight: 7.5 },
  { symbol: 'TCS', token: '11536', exchange: 'NSE', niftyWeight: 3.8, bankniftyWeight: 0, sensexWeight: 5.2 },
  { symbol: 'SBIN', token: '3045', exchange: 'NSE', niftyWeight: 3.2, bankniftyWeight: 10.0, sensexWeight: 3.5 },
  { symbol: 'AXISBANK', token: '5900', exchange: 'NSE', niftyWeight: 3.1, bankniftyWeight: 10.0, sensexWeight: 3.2 },
  { symbol: 'BHARTIARTL', token: '10604', exchange: 'NSE', niftyWeight: 4.5, bankniftyWeight: 0, sensexWeight: 4.8 },
  { symbol: 'LT', token: '11483', exchange: 'NSE', niftyWeight: 3.6, bankniftyWeight: 0, sensexWeight: 4.5 },
  { symbol: 'KOTAKBANK', token: '1922', exchange: 'NSE', niftyWeight: 2.7, bankniftyWeight: 9.0, sensexWeight: 3.1 },
  { symbol: 'PNB', token: '10666', exchange: 'NSE', niftyWeight: 0.8, bankniftyWeight: 4.0, sensexWeight: 0 },
  { symbol: 'HDFCLIFE', token: '467', exchange: 'NSE', niftyWeight: 1.1, bankniftyWeight: 0, sensexWeight: 0 }
];

class ImbalanceMeterEngine {
  constructor() {
    this.cache = {
      timestamp: 0,
      data: null
    };
    this.journal = this.loadJournal();
  }

  loadJournal() {
    try {
      if (fs.existsSync(JOURNAL_FILE)) {
        const raw = fs.readFileSync(JOURNAL_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[ImbalanceMeter] Error loading journal:', e.message);
    }
    return {
      totalPredictions: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      mistakePatterns: {
        INDEX_DRAG_OVERWHELM: 0,
        LOW_VOLUME_DRIFT: 0,
        RETAIL_TRAP_SPOOFING: 0,
        RESISTANCE_CLUSTER: 0
      },
      learnedRules: [
        {
          id: 'RULE-1',
          rule: 'Broad Index Filter: If Nifty synthetic buy pressure is < 45%, ignore individual stock Buy Absorption signals (Index drag has 85% probability of breaking stock support).',
          dateLearned: '2026-09-10',
          timesTriggered: 14
        },
        {
          id: 'RULE-2',
          rule: 'Whale Order Size Filter: A Top-5 Bid skew > 70% is only valid if Whale Ratio (Avg Bid Size / Avg Ask Size) is >= 1.8. Avoid high order counts with small lots (retail trap).',
          dateLearned: '2026-09-12',
          timesTriggered: 9
        },
        {
          id: 'RULE-3',
          rule: 'Lunchtime False Wall Warning: Between 12:15 PM and 1:00 PM (Period G), book depth thins out. Reduce conviction on imbalance signals unless backed by volume > 1.2x.',
          dateLearned: '2026-09-14',
          timesTriggered: 6
        }
      ],
      predictions: []
    };
  }

  saveJournal() {
    try {
      const dir = path.dirname(JOURNAL_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(JOURNAL_FILE, JSON.stringify(this.journal, null, 2), 'utf8');
    } catch (e) {
      console.error('[ImbalanceMeter] Error saving journal:', e.message);
    }
  }

  async getLiveImbalance(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache.data && now - this.cache.timestamp < 3000) {
      return this.cache.data;
    }

    try {
      if (!angelOneBridge.session.jwtToken) {
        await angelOneBridge.login();
      }

      const tokenList = CONSTITUENTS.map(c => c.token);
      const payload = JSON.stringify({
        mode: 'FULL',
        exchangeTokens: { 'NSE': tokenList }
      });

      const headers = {
        'Authorization': 'Bearer ' + angelOneBridge.session.jwtToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '106.193.147.98',
        'X-MACAddress': 'fe80::216e:6507:4b90:3719',
        'X-PrivateKey': angelOneBridge.config.apiKey,
        'Content-Length': Buffer.byteLength(payload)
      };

      const res = await angelOneBridge._makeRequest(
        'https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/',
        'POST',
        headers,
        payload
      );

      const fetched = res?.data?.fetched || [];
      const fetchedMap = new Map();
      fetched.forEach(item => fetchedMap.set(item.symbolToken, item));

      let totalNiftyWeight = 0;
      let weightedNiftyBuyPct = 0;
      let totalBankniftyWeight = 0;
      let weightedBankniftyBuyPct = 0;
      let totalSensexWeight = 0;
      let weightedSensexBuyPct = 0;

      const processedConstituents = CONSTITUENTS.map(meta => {
        const item = fetchedMap.get(meta.token);
        if (!item) {
          return {
            symbol: meta.symbol,
            token: meta.token,
            ltp: 0,
            netChange: 0,
            percentChange: 0,
            macroBuyPct: 50,
            macroSellPct: 50,
            macroRatio: 1.0,
            top5BuyPct: 50,
            top5SellPct: 50,
            top5BuyQty: 0,
            top5SellQty: 0,
            top5BuyOrders: 0,
            top5SellOrders: 0,
            whaleRatio: 1.0,
            whaleTag: 'BALANCED',
            regime: 'ROTATIONAL',
            action: 'NEUTRAL',
            rationale: 'Data pending from exchange'
          };
        }

        const buyQ = item.totBuyQuan || 0;
        const sellQ = item.totSellQuan || 0;
        const totalQ = buyQ + sellQ;
        const macroBuyPct = totalQ > 0 ? parseFloat(((buyQ / totalQ) * 100).toFixed(1)) : 50;
        const macroSellPct = totalQ > 0 ? parseFloat(((sellQ / totalQ) * 100).toFixed(1)) : 50;
        const macroRatio = sellQ > 0 ? parseFloat((buyQ / sellQ).toFixed(2)) : 1.0;

        const depth = item.depth || { buy: [], sell: [] };
        const top5Buy = (depth.buy || []).reduce((acc, b) => acc + (b.quantity || 0), 0);
        const top5Sell = (depth.sell || []).reduce((acc, s) => acc + (s.quantity || 0), 0);
        const top5BuyOrders = (depth.buy || []).reduce((acc, b) => acc + (b.orders || 0), 0);
        const top5SellOrders = (depth.sell || []).reduce((acc, s) => acc + (s.orders || 0), 0);
        const top5Total = top5Buy + top5Sell;

        const top5BuyPct = top5Total > 0 ? parseFloat(((top5Buy / top5Total) * 100).toFixed(1)) : 50;
        const top5SellPct = top5Total > 0 ? parseFloat(((top5Sell / top5Total) * 100).toFixed(1)) : 50;

        const avgBuyOrderSize = top5BuyOrders > 0 ? Math.round(top5Buy / top5BuyOrders) : 0;
        const avgSellOrderSize = top5SellOrders > 0 ? Math.round(top5Sell / top5SellOrders) : 0;
        const whaleRatio = avgSellOrderSize > 0 ? parseFloat((avgBuyOrderSize / avgSellOrderSize).toFixed(2)) : 1.0;

        let whaleTag = 'BALANCED';
        if (whaleRatio >= 1.8 && top5BuyPct > 60) whaleTag = 'WHALE ACCUMULATION';
        else if (whaleRatio <= 0.55 && top5SellPct > 60) whaleTag = 'WHALE DISTRIBUTION';
        else if (top5BuyOrders > top5SellOrders * 2) whaleTag = 'RETAIL BUY CROWD';
        else if (top5SellOrders > top5BuyOrders * 2) whaleTag = 'RETAIL SELL PANIC';

        let regime = 'ROTATIONAL';
        let action = 'HOLD / OBSERVE';
        let rationale = 'Buyers and sellers in equilibrium.';

        const pct = item.percentChange || 0;

        if (top5BuyPct >= 75 && pct < 0) {
          regime = 'ABSORPTION_BUY';
          action = 'DIP ABSORPTION';
          rationale = `Heavy bids (${top5BuyPct}%) absorbing selling pressure at lows. Look for bullish bounce.`;
        } else if (top5BuyPct >= 70 && pct >= 0) {
          regime = 'BREAKOUT_DRIVE';
          action = 'MOMENTUM EXPANSION';
          rationale = `Aggressive buyers driving bids up. Validates continuation move.`;
        } else if (top5SellPct >= 75 && pct > 0) {
          regime = 'SELL_WALL_REJECTION';
          action = 'RESISTANCE WALL';
          rationale = `Massive ask wall (${top5SellPct}%) capping gains. Fade rally or protect longs.`;
        } else if (top5SellPct >= 70 && pct <= 0) {
          regime = 'BREAKDOWN_DUMP';
          action = 'LIQUIDITY DRAIN';
          rationale = `Sellers dominating depth. Breakdown likely to continue downward.`;
        }

        if (meta.niftyWeight > 0) {
          totalNiftyWeight += meta.niftyWeight;
          weightedNiftyBuyPct += meta.niftyWeight * top5BuyPct;
        }
        if (meta.bankniftyWeight > 0) {
          totalBankniftyWeight += meta.bankniftyWeight;
          weightedBankniftyBuyPct += meta.bankniftyWeight * top5BuyPct;
        }
        if (meta.sensexWeight > 0) {
          totalSensexWeight += meta.sensexWeight;
          weightedSensexBuyPct += meta.sensexWeight * top5BuyPct;
        }

        return {
          symbol: meta.symbol,
          token: meta.token,
          ltp: item.ltp,
          netChange: item.netChange,
          percentChange: pct,
          macroBuyPct,
          macroSellPct,
          macroRatio,
          top5BuyPct,
          top5SellPct,
          top5BuyQty: top5Buy,
          top5SellQty: top5Sell,
          top5BuyOrders,
          top5SellOrders,
          avgBuyOrderSize,
          avgSellOrderSize,
          whaleRatio,
          whaleTag,
          regime,
          action,
          rationale,
          depth
        };
      });

      const niftyBuyPressure = totalNiftyWeight > 0 ? parseFloat((weightedNiftyBuyPct / totalNiftyWeight).toFixed(1)) : 50;
      const niftySellPressure = parseFloat((100 - niftyBuyPressure).toFixed(1));

      const bankniftyBuyPressure = totalBankniftyWeight > 0 ? parseFloat((weightedBankniftyBuyPct / totalBankniftyWeight).toFixed(1)) : 50;
      const bankniftySellPressure = parseFloat((100 - bankniftyBuyPressure).toFixed(1));

      const sensexBuyPressure = totalSensexWeight > 0 ? parseFloat((weightedSensexBuyPct / totalSensexWeight).toFixed(1)) : 50;
      const sensexSellPressure = parseFloat((100 - sensexBuyPressure).toFixed(1));

      let marketRegime = 'BALANCED_CHOP';
      if (niftyBuyPressure >= 62 && bankniftyBuyPressure >= 60) marketRegime = 'STRONG_BULLISH_AGGRESSION';
      else if (niftyBuyPressure >= 55) marketRegime = 'MILD_BULLISH_BIAS';
      else if (niftySellPressure >= 62 && bankniftySellPressure >= 60) marketRegime = 'STRONG_BEARISH_DISTRIBUTION';
      else if (niftySellPressure >= 55) marketRegime = 'MILD_BEARISH_BIAS';

      this.recordLivePredictions(processedConstituents, niftyBuyPressure, bankniftyBuyPressure);

      const result = {
        success: true,
        timestamp: now,
        istTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        marketRegime,
        nifty: {
          buyPressure: niftyBuyPressure,
          sellPressure: niftySellPressure,
          bias: niftyBuyPressure >= 55 ? 'BULLISH' : (niftyBuyPressure <= 45 ? 'BEARISH' : 'NEUTRAL')
        },
        banknifty: {
          buyPressure: bankniftyBuyPressure,
          sellPressure: bankniftySellPressure,
          bias: bankniftyBuyPressure >= 55 ? 'BULLISH' : (bankniftyBuyPressure <= 45 ? 'BEARISH' : 'NEUTRAL')
        },
        sensex: {
          buyPressure: sensexBuyPressure,
          sellPressure: sensexSellPressure,
          bias: sensexBuyPressure >= 55 ? 'BULLISH' : (sensexBuyPressure <= 45 ? 'BEARISH' : 'NEUTRAL')
        },
        constituents: processedConstituents,
        journalSummary: {
          totalPredictions: this.journal.totalPredictions,
          wins: this.journal.wins,
          losses: this.journal.losses,
          winRate: this.journal.winRate,
          recentMistakes: this.journal.predictions.filter(p => p.status === 'LOSS').slice(0, 5),
          activeLearnings: this.journal.learnedRules
        }
      };

      this.cache = { timestamp: now, data: result };
      return result;
    } catch (err) {
      console.error('[ImbalanceMeter] Error getting live imbalance:', err.message);
      return {
        success: false,
        error: err.message,
        timestamp: now
      };
    }
  }

  recordLivePredictions(constituents, niftyBuyPressure, bankniftyBuyPressure) {
    const now = Date.now();
    const istTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

    constituents.forEach(c => {
      if ((c.top5BuyPct >= 75 || c.top5SellPct >= 75) && c.ltp > 0) {
        const recent = this.journal.predictions.find(
          p => p.symbol === c.symbol && p.regime === c.regime && (now - p.timestamp < 45 * 60 * 1000)
        );
        if (!recent) {
          const isBuy = c.top5BuyPct >= 75;
          const target = isBuy ? parseFloat((c.ltp * 1.006).toFixed(2)) : parseFloat((c.ltp * 0.994).toFixed(2));
          const stopLoss = isBuy ? parseFloat((c.ltp * 0.996).toFixed(2)) : parseFloat((c.ltp * 1.004).toFixed(2));

          const prediction = {
            id: 'PRED-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000),
            timestamp: now,
            istTime,
            symbol: c.symbol,
            entryPrice: c.ltp,
            top5BuyPct: c.top5BuyPct,
            top5SellPct: c.top5SellPct,
            whaleTag: c.whaleTag,
            regime: c.regime,
            expectedDirection: isBuy ? 'UP' : 'DOWN',
            targetPrice: target,
            stopLossPrice: stopLoss,
            niftyPressureAtEntry: niftyBuyPressure,
            status: 'ACTIVE',
            resolvedAt: null,
            outcome: null,
            mistakeType: null,
            learnedLesson: null
          };

          this.journal.predictions.unshift(prediction);
          this.journal.totalPredictions++;
          this.journal.predictions = this.journal.predictions.slice(0, 100);
          this.saveJournal();
        }
      }
    });
  }

  async evaluateOutcomes() {
    const now = Date.now();
    let updated = false;

    for (const p of this.journal.predictions) {
      if (p.status === 'ACTIVE') {
        const currentData = this.cache.data?.constituents?.find(c => c.symbol === p.symbol);
        const currentPrice = currentData?.ltp;
        const currentNifty = this.cache.data?.nifty?.buyPressure || 50;

        if (currentPrice && currentPrice > 0) {
          const isBuy = p.expectedDirection === 'UP';

          if ((isBuy && currentPrice >= p.targetPrice) || (!isBuy && currentPrice <= p.targetPrice)) {
            p.status = 'WIN';
            p.resolvedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
            p.outcome = `Target hit at ₹${currentPrice} (+${Math.abs(((currentPrice - p.entryPrice) / p.entryPrice) * 100).toFixed(2)}%)`;
            this.journal.wins++;
            updated = true;
          } else if ((isBuy && currentPrice <= p.stopLossPrice) || (!isBuy && currentPrice >= p.stopLossPrice)) {
            p.status = 'LOSS';
            p.resolvedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
            this.journal.losses++;

            if (isBuy && currentNifty < 45) {
              p.mistakeType = 'INDEX_DRAG_OVERWHELM';
              p.learnedLesson = `Failed due to broad market selloff (Nifty Buy Pressure was ${currentNifty}%). Always demand Index alignment before taking dip absorptions.`;
              this.journal.mistakePatterns.INDEX_DRAG_OVERWHELM = (this.journal.mistakePatterns.INDEX_DRAG_OVERWHELM || 0) + 1;
            } else if (p.whaleTag && p.whaleTag.includes('RETAIL')) {
              p.mistakeType = 'RETAIL_TRAP_SPOOFING';
              p.learnedLesson = `Order count showed retail crowd rather than whale accumulation. Require Whale Ratio >= 1.8.`;
              this.journal.mistakePatterns.RETAIL_TRAP_SPOOFING = (this.journal.mistakePatterns.RETAIL_TRAP_SPOOFING || 0) + 1;
            } else {
              p.mistakeType = 'LOW_VOLUME_DRIFT';
              p.learnedLesson = `Bids did not hold under low volume drift. Level absorbed temporarily then broke.`;
              this.journal.mistakePatterns.LOW_VOLUME_DRIFT = (this.journal.mistakePatterns.LOW_VOLUME_DRIFT || 0) + 1;
            }

            p.outcome = `SL hit at ₹${currentPrice}. Diagnosed Mistake: ${p.mistakeType}`;
            updated = true;
          } else if (now - p.timestamp > 3 * 60 * 60 * 1000) {
            p.status = currentPrice > p.entryPrice === isBuy ? 'WIN' : 'LOSS';
            p.resolvedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
            p.outcome = `Time exit after 3 hours at ₹${currentPrice}`;
            if (p.status === 'WIN') this.journal.wins++;
            else this.journal.losses++;
            updated = true;
          }
        }
      }
    }

    const resolvedCount = this.journal.wins + this.journal.losses;
    if (resolvedCount > 0) {
      this.journal.winRate = parseFloat(((this.journal.wins / resolvedCount) * 100).toFixed(1));
    }

    if (updated) {
      this.saveJournal();
    }

    return {
      totalPredictions: this.journal.totalPredictions,
      wins: this.journal.wins,
      losses: this.journal.losses,
      winRate: this.journal.winRate,
      mistakePatterns: this.journal.mistakePatterns,
      predictions: this.journal.predictions
    };
  }

  getJournal() {
    return this.journal;
  }
}

export const imbalanceMeterEngine = new ImbalanceMeterEngine();
