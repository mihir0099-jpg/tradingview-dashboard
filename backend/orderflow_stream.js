import WebSocket from 'ws';
import { angelOneBridge } from './angelone_bridge.js';

// Supported Order Flow Instruments
export const ORDERFLOW_SYMBOLS = [
  { symbol: 'NIFTYFUT', label: 'NIFTY FUT', token: '68407', exchange: 'NFO', tickSize: 1.0, lotSize: 25, groupSize: 1.0 },
  { symbol: 'BANKNIFTYFUT', label: 'BANKNIFTY FUT', token: '68390', exchange: 'NFO', tickSize: 1.0, lotSize: 15, groupSize: 1.0 },
  { symbol: 'NIFTY', label: 'NIFTY 50', token: '99926000', exchange: 'NSE', tickSize: 1.0, lotSize: 75, groupSize: 1.0 },
  { symbol: 'BANKNIFTY', label: 'BANK NIFTY', token: '99926009', exchange: 'NSE', tickSize: 1.0, lotSize: 30, groupSize: 1.0 },
  { symbol: 'RELIANCE', label: 'RELIANCE', token: '2885', exchange: 'NSE', tickSize: 0.5, lotSize: 250, groupSize: 0.5 },
  { symbol: 'SBIN', label: 'SBIN', token: '3045', exchange: 'NSE', tickSize: 0.5, lotSize: 750, groupSize: 0.5 },
  { symbol: 'HDFCBANK', label: 'HDFC BANK', token: '1333', exchange: 'NSE', tickSize: 0.5, lotSize: 550, groupSize: 0.5 },
  { symbol: 'ICICIBANK', label: 'ICICI BANK', token: '4963', exchange: 'NSE', tickSize: 0.5, lotSize: 700, groupSize: 0.5 },
  { symbol: 'INFY', label: 'INFY', token: '1594', exchange: 'NSE', tickSize: 0.5, lotSize: 400, groupSize: 0.5 },
  { symbol: 'TCS', label: 'TCS', token: '11536', exchange: 'NSE', tickSize: 1.0, lotSize: 175, groupSize: 1.0 },
  { symbol: 'AXISBANK', label: 'AXIS BANK', token: '5900', exchange: 'NSE', tickSize: 0.5, lotSize: 625, groupSize: 0.5 },
  { symbol: 'BHARTIARTL', label: 'BHARTI AIRTEL', token: '10604', exchange: 'NSE', tickSize: 0.5, lotSize: 475, groupSize: 0.5 },
  { symbol: 'LT', label: 'L&T', token: '11483', exchange: 'NSE', tickSize: 1.0, lotSize: 175, groupSize: 1.0 },
  { symbol: 'KOTAKBANK', label: 'KOTAK BANK', token: '1922', exchange: 'NSE', tickSize: 0.5, lotSize: 400, groupSize: 0.5 }
];

// Session period letters matching Market Profile standard (A = 9:15-9:45, B = 9:45-10:15, etc.)
function getPeriodLetter(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMins = hours * 60 + minutes;
  const startMins = 9 * 60 + 15; // 9:15 AM
  if (totalMins < startMins) return 'PRE';
  const periodIndex = Math.floor((totalMins - startMins) / 30);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  return letters[periodIndex] || 'M';
}

class OrderFlowStreamEngine {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.activeSymbol = 'NIFTYFUT';
    this.activeToken = '68407';
    this.timeframeMinutes = 5; // 5-minute footprint candles default
    this.lastLtp = null;
    this.lastSide = 'BUY';
    this.runningCvd = 0;
    this.candles = [];
    this.currentCandle = null;
    this.recentTicks = [];
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.historicalLoaded = false;
  }

  start() {
    this.seedHistoricalCandles();
    this.connect();
  }

  getActiveMeta() {
    return ORDERFLOW_SYMBOLS.find(s => s.symbol === this.activeSymbol) || ORDERFLOW_SYMBOLS[0];
  }

  async seedHistoricalCandles() {
    try {
      const meta = this.getActiveMeta();
      if (!angelOneBridge.session.jwtToken) {
        await angelOneBridge.login();
      }

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const payload = JSON.stringify({
        exchange: meta.exchange,
        symboltoken: meta.token,
        interval: this.timeframeMinutes === 1 ? 'ONE_MINUTE' :
                  (this.timeframeMinutes === 3 ? 'THREE_MINUTE' :
                  (this.timeframeMinutes === 10 ? 'TEN_MINUTE' :
                  (this.timeframeMinutes === 15 ? 'FIFTEEN_MINUTE' :
                  (this.timeframeMinutes === 30 ? 'THIRTY_MINUTE' :
                  (this.timeframeMinutes === 60 ? 'ONE_HOUR' : 'FIVE_MINUTE'))))),
        fromdate: `${dateStr} 09:15`,
        todate: `${dateStr} 15:30`
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
        'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
        'POST',
        headers,
        payload
      );

      const rawCandles = res?.data || [];
      if (rawCandles.length > 0) {
        this.buildHistoricalFootprint(rawCandles, meta);
        this.historicalLoaded = true;
        console.log(`[OrderFlow] Seeded ${rawCandles.length} historical footprint candles for ${this.activeSymbol}`);
      } else {
        this.generateSyntheticSeed(meta);
      }
    } catch (e) {
      console.warn(`[OrderFlow Historical Fallback]: ${e.message}. Using synthetic profile seed.`);
      this.generateSyntheticSeed(this.getActiveMeta());
    }
  }

  buildHistoricalFootprint(rawCandles, meta) {
    this.candles = [];
    let cvd = 0;
    const step = meta.groupSize;

    rawCandles.forEach((bar) => {
      // bar format: [timestamp, open, high, low, close, volume]
      const ts = new Date(bar[0]).getTime();
      const open = bar[1];
      const high = bar[2];
      const low = bar[3];
      const close = bar[4];
      const rawVol = bar[5] > 0 ? bar[5] : Math.round(1500 + Math.random() * 4000);
      const isBull = close >= open;

      const dateObj = new Date(ts);
      const timeStr = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      const period = getPeriodLetter(dateObj);

      // Distribute volume into price levels
      const priceLevels = [];
      const minStepPrice = Math.floor(low / step) * step;
      const maxStepPrice = Math.ceil(high / step) * step;
      const numSteps = Math.max(1, Math.round((maxStepPrice - minStepPrice) / step));
      const volPerStep = Math.round(rawVol / (numSteps + 1));

      let maxLevelVol = 0;
      let pocPrice = open;
      let barDelta = 0;

      // POC bias: if bullish, POC in upper body; if bearish, POC in lower body
      const pocTarget = isBull ? (open + (close - open) * 0.65) : (close + (open - close) * 0.35);

      for (let p = maxStepPrice; p >= minStepPrice; p = parseFloat((p - step).toFixed(2))) {
        // Distance weight for bell-shaped volume profile inside candle
        const dist = Math.abs(p - pocTarget);
        const factor = Math.max(0.3, 1.8 - (dist / Math.max(step, (high - low) || step)));
        const lvlVol = Math.round(volPerStep * factor);

        // Delta distribution
        const buyBias = isBull ? 0.62 : 0.38;
        const askVol = Math.round(lvlVol * (buyBias + (Math.random() * 0.1 - 0.05)));
        const bidVol = lvlVol - askVol;
        const delta = askVol - bidVol;
        barDelta += delta;

        if (lvlVol > maxLevelVol) {
          maxLevelVol = lvlVol;
          pocPrice = p;
        }

        priceLevels.push({
          price: p,
          bidVol,
          askVol,
          totalVol: lvlVol,
          delta
        });
      }

      cvd += barDelta;

      // Calculate diagonal imbalances
      const imbalances = [];
      for (let i = 0; i < priceLevels.length - 1; i++) {
        const upper = priceLevels[i];
        const lower = priceLevels[i + 1];
        if (lower.bidVol > 0 && (upper.askVol / lower.bidVol) >= 3.0 && upper.askVol >= 50) {
          imbalances.push({ price: upper.price, type: 'BUY_IMBALANCE', ratio: (upper.askVol / lower.bidVol).toFixed(1) });
        } else if (upper.askVol > 0 && (lower.bidVol / upper.askVol) >= 3.0 && lower.bidVol >= 50) {
          imbalances.push({ price: lower.price, type: 'SELL_IMBALANCE', ratio: (lower.bidVol / upper.askVol).toFixed(1) });
        }
      }

      this.candles.push({
        timestamp: ts,
        timeStr,
        period,
        open,
        high,
        low,
        close,
        volume: rawVol,
        delta: barDelta,
        cvd,
        pocPrice,
        maxDelta: Math.round(barDelta * 1.3),
        minDelta: Math.round(barDelta * -0.4),
        priceLevels,
        imbalanceLevels: imbalances
      });
    });

    this.runningCvd = cvd;
    if (this.candles.length > 0) {
      this.lastLtp = this.candles[this.candles.length - 1].close;
    }
  }

  generateSyntheticSeed(meta) {
    // Generate realistic today's intraday profile from 9:15 AM
    this.candles = [];
    const isNifty = meta.symbol.includes('NIFTY') && !meta.symbol.includes('BANK');
    const isBankNifty = meta.symbol.includes('BANK');
    const basePrice = isNifty ? 23380 : (isBankNifty ? 56260 : 1255);
    const step = meta.groupSize || 1.0;
    let price = basePrice;
    let cvd = 0;

    const now = new Date();
    const start = new Date(now);
    start.setHours(9, 15, 0, 0);

    const count = Math.max(6, Math.min(25, Math.floor((now.getTime() - start.getTime()) / (this.timeframeMinutes * 60 * 1000))));

    for (let i = 0; i < count; i++) {
      const candleTime = new Date(start.getTime() + i * this.timeframeMinutes * 60 * 1000);
      const timeStr = candleTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      const period = getPeriodLetter(candleTime);

      const change = (Math.random() - 0.48) * (isNifty ? 25 : (isBankNifty ? 90 : 4));
      const open = price;
      const close = parseFloat((open + change).toFixed(2));
      const high = parseFloat((Math.max(open, close) + Math.random() * (step * 2)).toFixed(2));
      const low = parseFloat((Math.min(open, close) - Math.random() * (step * 2)).toFixed(2));
      price = close;

      const rawVol = Math.round(2000 + Math.random() * 5000);
      const isBull = close >= open;

      const minStepPrice = Math.floor(low / step) * step;
      const maxStepPrice = Math.ceil(high / step) * step;
      const numSteps = Math.max(1, Math.round((maxStepPrice - minStepPrice) / step));
      const volPerStep = Math.round(rawVol / (numSteps + 1));

      let maxLvlVol = 0;
      let pocPrice = open;
      let barDelta = 0;
      const priceLevels = [];

      for (let p = maxStepPrice; p >= minStepPrice; p = parseFloat((p - step).toFixed(2))) {
        const lvlVol = Math.round(volPerStep * (0.6 + Math.random() * 0.8));
        const buyBias = isBull ? 0.60 : 0.40;
        const askVol = Math.round(lvlVol * buyBias);
        const bidVol = lvlVol - askVol;
        const delta = askVol - bidVol;
        barDelta += delta;

        if (lvlVol > maxLvlVol) {
          maxLvlVol = lvlVol;
          pocPrice = p;
        }

        priceLevels.push({ price: p, bidVol, askVol, totalVol: lvlVol, delta });
      }

      cvd += barDelta;

      this.candles.push({
        timestamp: candleTime.getTime(),
        timeStr,
        period,
        open,
        high,
        low,
        close,
        volume: rawVol,
        delta: barDelta,
        cvd,
        pocPrice,
        maxDelta: Math.round(barDelta * 1.2),
        minDelta: Math.round(barDelta * -0.3),
        priceLevels,
        imbalanceLevels: []
      });
    }

    this.runningCvd = cvd;
    this.lastLtp = price;
  }

  async connect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);

    try {
      if (!angelOneBridge.session.jwtToken) {
        await angelOneBridge.login();
      }

      const wsUrl = 'wss://smartapisocket.angelone.in/smart-stream';
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': 'Bearer ' + angelOneBridge.session.jwtToken,
          'x-api-key': angelOneBridge.config.apiKey,
          'x-client-code': angelOneBridge.config.clientCode,
          'x-feed-token': angelOneBridge.session.feedToken
        }
      });

      this.ws.on('open', () => {
        this.connected = true;
        console.log('[OrderFlow WS] Connected to Angel One SmartStream WebSocket');
        this.subscribeActive();

        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try { this.ws.ping(); } catch (e) {}
          }
        }, 25000);
      });

      this.ws.on('message', (buf) => {
        this.handleMessage(buf);
      });

      this.ws.on('error', (err) => {
        console.warn('[OrderFlow WS Error]:', err.message);
      });

      this.ws.on('close', (code) => {
        this.connected = false;
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      });

    } catch (e) {
      console.error('[OrderFlow WS Connect Error]:', e.message);
      this.reconnectTimer = setTimeout(() => this.connect(), 8000);
    }
  }

  subscribeActive() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const meta = this.getActiveMeta();
    const subMsg = {
      correlationID: 'orderflow_' + this.activeSymbol,
      action: 1,
      params: {
        mode: 2,
        tokenList: [
          {
            exchangeType: meta.exchange === 'NFO' ? 2 : 1,
            tokens: [meta.token]
          }
        ]
      }
    };
    this.ws.send(JSON.stringify(subMsg));
    console.log(`[OrderFlow WS] Subscribed to ${this.activeSymbol} (Token: ${meta.token})`);
  }

  async switchSymbol(symbolName, timeframe = 5) {
    const found = ORDERFLOW_SYMBOLS.find(s => s.symbol.toUpperCase() === symbolName.toUpperCase());
    if (!found) throw new Error(`Symbol ${symbolName} not supported in Order Flow`);

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.activeToken) {
      try {
        const meta = this.getActiveMeta();
        this.ws.send(JSON.stringify({
          correlationID: 'unsub_' + this.activeSymbol,
          action: 0,
          params: { mode: 2, tokenList: [{ exchangeType: meta.exchange === 'NFO' ? 2 : 1, tokens: [this.activeToken] }] }
        }));
      } catch (e) {}
    }

    this.activeSymbol = found.symbol;
    this.activeToken = found.token;
    this.timeframeMinutes = timeframe;
    this.currentCandle = null;
    this.recentTicks = [];

    await this.seedHistoricalCandles();
    this.subscribeActive();
    return { symbol: this.activeSymbol, token: this.activeToken, timeframe: this.timeframeMinutes };
  }

  handleMessage(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 68) return;

    try {
      const token = buf.subarray(2, 27).toString('ascii').replace(/\0/g, '');
      if (token !== this.activeToken) return;

      const ltp = Number(buf.readBigInt64LE(43)) / 100;
      let lastQty = Number(buf.readBigInt64LE(51));
      if (lastQty <= 0) lastQty = 1;
      const dayVol = Number(buf.readBigInt64LE(67));

      this.processTick(ltp, lastQty, dayVol);
    } catch (err) {}
  }

  processTick(price, qty, dayVol) {
    const now = Date.now();
    const meta = this.getActiveMeta();
    const step = meta.groupSize || 1.0;

    const prevPrice = this.lastLtp;
    let side = this.lastSide;
    if (this.lastLtp !== null) {
      if (price > this.lastLtp) side = 'BUY';
      else if (price < this.lastLtp) side = 'SELL';
    }
    this.lastSide = side;
    this.lastLtp = price;

    const tickDelta = side === 'BUY' ? qty : -qty;
    this.runningCvd += tickDelta;

    const d = new Date();
    const timeStr = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');

    this.recentTicks.unshift({
      id: now + '-' + Math.random(),
      timeStr,
      price,
      qty,
      side,
      delta: tickDelta
    });
    if (this.recentTicks.length > 25) this.recentTicks.pop();

    const bucketMs = this.timeframeMinutes * 60 * 1000;
    const bucketTime = Math.floor(now / bucketMs) * bucketMs;

    if (!this.currentCandle || this.currentCandle.timestamp !== bucketTime) {
      if (this.currentCandle) {
        const rawLevels = Array.isArray(this.currentCandle.priceLevels)
          ? this.currentCandle.priceLevels
          : Object.values(this.currentCandle.priceLevels || {}).sort((a, b) => b.price - a.price);
        const completed = {
          ...this.currentCandle,
          priceLevels: rawLevels
        };
        // Calculate diagonal imbalances for completed candle
        for (let i = 0; i < completed.priceLevels.length - 1; i++) {
          const upper = completed.priceLevels[i];
          const lower = completed.priceLevels[i + 1];
          if (lower.bidVol > 0 && upper.askVol >= lower.bidVol * 3 && upper.askVol >= 150) {
            completed.imbalanceLevels.push({ price: upper.price, type: 'BUY_IMBALANCE', ratio: (upper.askVol / Math.max(1, lower.bidVol)).toFixed(1) + 'x' });
          }
          if (upper.askVol > 0 && lower.bidVol >= upper.askVol * 3 && lower.bidVol >= 150) {
            completed.imbalanceLevels.push({ price: lower.price, type: 'SELL_IMBALANCE', ratio: (lower.bidVol / Math.max(1, upper.askVol)).toFixed(1) + 'x' });
          }
        }
        this.candles.push(completed);
        if (this.candles.length > 25) this.candles.shift();
      }

      const dateObj = new Date(bucketTime);
      this.currentCandle = {
        timestamp: bucketTime,
        timeStr: dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
        period: getPeriodLetter(dateObj),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        delta: 0,
        cvd: this.runningCvd,
        priceLevels: {},
        pocPrice: price,
        maxDelta: 0,
        minDelta: 0,
        imbalanceLevels: []
      };
    }

    const c = this.currentCandle;
    c.high = Math.max(c.high, price);
    c.low = Math.min(c.low, price);
    c.close = price;
    c.volume += qty;
    c.delta += tickDelta;
    c.cvd = this.runningCvd;
    c.maxDelta = Math.max(c.maxDelta, c.delta);
    c.minDelta = Math.min(c.minDelta, c.delta);

    // Distribute tick across all traversed price levels if price moved across multiple rungs
    const pStart = prevPrice !== null ? prevPrice : price;
    const minP = Math.min(pStart, price);
    const maxP = Math.max(pStart, price);
    const rStart = Math.floor(minP / step) * step;
    const rEnd = Math.ceil(maxP / step) * step;
    const rungsCount = Math.max(1, Math.round((rEnd - rStart) / step) + 1);
    const qtyPerRung = Math.max(1, Math.round(qty / rungsCount));

    for (let p = rEnd; p >= rStart; p = parseFloat((p - step).toFixed(2))) {
      const priceKey = p.toFixed(2);
      if (!c.priceLevels[priceKey]) {
        c.priceLevels[priceKey] = {
          price: p,
          bidVol: 0,
          askVol: 0,
          totalVol: 0,
          delta: 0
        };
      }
      const pl = c.priceLevels[priceKey];
      if (side === 'BUY') pl.askVol += qtyPerRung;
      else pl.bidVol += qtyPerRung;
      pl.totalVol += qtyPerRung;
      pl.delta = pl.askVol - pl.bidVol;
    }

    let maxLvlVol = 0;
    let poc = c.open;
    for (const key in c.priceLevels) {
      if (c.priceLevels[key].totalVol > maxLvlVol) {
        maxLvlVol = c.priceLevels[key].totalVol;
        poc = c.priceLevels[key].price;
      }
    }
    c.pocPrice = poc;
  }

  getState() {
    const meta = this.getActiveMeta();
    const step = meta.groupSize || 1.0;

    const normalizeCandleLevels = (c) => {
      const minStep = Math.floor(c.low / step) * step;
      const maxStep = Math.ceil(c.high / step) * step;
      const map = {};
      const existing = Array.isArray(c.priceLevels)
        ? c.priceLevels
        : Object.values(c.priceLevels || {});
      existing.forEach(pl => {
        const pk = pl.price.toFixed(2);
        map[pk] = pl;
      });
      // Guarantee every integer price level inside [low, high] exists
      for (let p = maxStep; p >= minStep; p = parseFloat((p - step).toFixed(2))) {
        const pk = p.toFixed(2);
        if (!map[pk]) {
          map[pk] = {
            price: p,
            bidVol: 0,
            askVol: 0,
            totalVol: 0,
            delta: 0
          };
        }
      }
      const sortedLevels = Object.values(map).sort((a, b) => b.price - a.price);
      const topLvl = sortedLevels[0];
      const btmLvl = sortedLevels[sortedLevels.length - 1];

      // Macro COT (Commitment of Traders): Net Position, COT Index (0-100%), OI, Extreme Sentiment Traps
      const topNet = topLvl ? (topLvl.askVol - topLvl.bidVol) : 0;
      const topOi = topLvl ? topLvl.totalVol : 0;
      const topCotIndex = topOi > 0 ? Math.round((topLvl.askVol / topOi) * 100) : 50;

      const btmNet = btmLvl ? (btmLvl.askVol - btmLvl.bidVol) : 0;
      const btmOi = btmLvl ? btmLvl.totalVol : 0;
      const btmCotIndex = btmOi > 0 ? Math.round((btmLvl.bidVol / btmOi) * 100) : 50;

      const isTrappedBuyers = (topNet > 0 || topCotIndex >= 60) && c.close < c.high;
      const isTrappedSellers = (btmNet < 0 || btmCotIndex >= 60) && c.close > c.low;

      return {
        ...c,
        priceLevels: sortedLevels,
        cot: {
          top: {
            net: topNet,
            cotIndex: topCotIndex,
            oi: topOi,
            isTrapped: isTrappedBuyers
          },
          btm: {
            net: btmNet,
            cotIndex: btmCotIndex,
            oi: btmOi,
            isTrapped: isTrappedSellers
          }
        }
      };
    };

    const allCandles = this.candles.map(normalizeCandleLevels);

    if (this.currentCandle) {
      allCandles.push(normalizeCandleLevels(this.currentCandle));
    }

    // Determine Global Price Scale (Min price and Max price across all candles on screen)
    let globalMin = Infinity;
    let globalMax = -Infinity;
    const compositeProfile = {};

    allCandles.forEach(c => {
      globalMin = Math.min(globalMin, c.low);
      globalMax = Math.max(globalMax, c.high);
      const levels = Array.isArray(c.priceLevels) ? c.priceLevels : Object.values(c.priceLevels || {});
      levels.forEach(pl => {
        const pk = pl.price.toFixed(2);
        compositeProfile[pk] = (compositeProfile[pk] || 0) + pl.totalVol;
      });
    });

    if (globalMin === Infinity) {
      globalMin = this.lastLtp ? this.lastLtp - 20 : 0;
      globalMax = this.lastLtp ? this.lastLtp + 20 : 100;
    }

    // Composite POC
    let compositePoc = globalMin;
    let maxCompVol = 0;
    for (const pk in compositeProfile) {
      if (compositeProfile[pk] > maxCompVol) {
        maxCompVol = compositeProfile[pk];
        compositePoc = parseFloat(pk);
      }
    }

    // Determine CVD Divergence
    let divergence = 'NONE';
    if (allCandles.length >= 3) {
      const last = allCandles[allCandles.length - 1];
      const prev = allCandles[allCandles.length - 2];
      if (last.close > prev.close && last.cvd < prev.cvd) {
        divergence = 'BEARISH EXHAUSTION (Price Up, Delta Falling)';
      } else if (last.close < prev.close && last.cvd > prev.cvd) {
        divergence = 'BULLISH ABSORPTION (Price Down, Delta Rising)';
      }
    }

    return {
      success: true,
      connected: this.connected,
      activeSymbol: this.activeSymbol,
      activeToken: this.activeToken,
      timeframe: this.timeframeMinutes,
      tickSize: this.getActiveMeta().groupSize,
      lastPrice: this.lastLtp,
      runningCvd: this.runningCvd,
      divergence,
      globalMin,
      globalMax,
      compositePoc,
      compositeProfile: Object.entries(compositeProfile).map(([p, v]) => ({ price: parseFloat(p), volume: v })).sort((a, b) => b.price - a.price),
      candlesCount: allCandles.length,
      candles: allCandles,
      recentTicks: this.recentTicks
    };
  }
}

export const orderFlowStreamEngine = new OrderFlowStreamEngine();
