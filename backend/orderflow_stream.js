import WebSocket from 'ws';
import { angelOneBridge } from './angelone_bridge.js';

// Supported Order Flow Instruments
export const ORDERFLOW_SYMBOLS = [
  { symbol: 'RELIANCE', token: '2885', exchange: 'NSE', tickSize: 0.20, lotSize: 250 },
  { symbol: 'SBIN', token: '3045', exchange: 'NSE', tickSize: 0.10, lotSize: 750 },
  { symbol: 'HDFCBANK', token: '1333', exchange: 'NSE', tickSize: 0.10, lotSize: 550 },
  { symbol: 'ICICIBANK', token: '4963', exchange: 'NSE', tickSize: 0.10, lotSize: 700 },
  { symbol: 'INFY', token: '1594', exchange: 'NSE', tickSize: 0.20, lotSize: 400 },
  { symbol: 'TCS', token: '11536', exchange: 'NSE', tickSize: 0.50, lotSize: 175 },
  { symbol: 'AXISBANK', token: '5900', exchange: 'NSE', tickSize: 0.10, lotSize: 625 },
  { symbol: 'BHARTIARTL', token: '10604', exchange: 'NSE', tickSize: 0.20, lotSize: 475 },
  { symbol: 'LT', token: '11483', exchange: 'NSE', tickSize: 0.50, lotSize: 175 },
  { symbol: 'KOTAKBANK', token: '1922', exchange: 'NSE', tickSize: 0.20, lotSize: 400 }
];

class OrderFlowStreamEngine {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.activeSymbol = 'RELIANCE';
    this.activeToken = '2885';
    this.timeframeMinutes = 1; // 1-minute footprint candles
    this.lastLtp = null;
    this.lastSide = 'BUY';
    this.runningCvd = 0;
    this.candles = [];
    this.currentCandle = null;
    this.recentTicks = [];
    this.reconnectTimer = null;
    this.pingTimer = null;
  }

  start() {
    this.connect();
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

        // Keep-alive ping every 25 seconds
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

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        console.log(`[OrderFlow WS Closed] Code: ${code}. Reconnecting in 5s...`);
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      });

    } catch (e) {
      console.error('[OrderFlow WS Connect Error]:', e.message);
      this.reconnectTimer = setTimeout(() => this.connect(), 8000);
    }
  }

  subscribeActive() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const subMsg = {
      correlationID: 'orderflow_' + this.activeSymbol,
      action: 1, // Subscribe
      params: {
        mode: 2, // Mode 2: Quote (includes LTP, Last Trade Qty, and Volume)
        tokenList: [
          {
            exchangeType: 1, // NSE CM
            tokens: [this.activeToken]
          }
        ]
      }
    };
    this.ws.send(JSON.stringify(subMsg));
    console.log(`[OrderFlow WS] Subscribed to ${this.activeSymbol} (Token: ${this.activeToken}) in Mode 2`);
  }

  switchSymbol(symbolName, timeframe = 1) {
    const found = ORDERFLOW_SYMBOLS.find(s => s.symbol.toUpperCase() === symbolName.toUpperCase());
    if (!found) throw new Error(`Symbol ${symbolName} not supported in Order Flow`);

    // Unsubscribe previous if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.activeToken) {
      try {
        this.ws.send(JSON.stringify({
          correlationID: 'unsub_' + this.activeSymbol,
          action: 0, // Unsubscribe
          params: { mode: 2, tokenList: [{ exchangeType: 1, tokens: [this.activeToken] }] }
        }));
      } catch (e) {}
    }

    this.activeSymbol = found.symbol;
    this.activeToken = found.token;
    this.timeframeMinutes = timeframe;
    this.candles = [];
    this.currentCandle = null;
    this.runningCvd = 0;
    this.lastLtp = null;
    this.recentTicks = [];

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
    } catch (err) {
      // Ignore corrupted binary packet
    }
  }

  processTick(price, qty, dayVol) {
    const now = Date.now();

    // Determine aggressive side (Lee-Ready Tick Rule)
    let side = this.lastSide;
    if (this.lastLtp !== null) {
      if (price > this.lastLtp) side = 'BUY';
      else if (price < this.lastLtp) side = 'SELL';
    }
    this.lastSide = side;
    this.lastLtp = price;

    // Update running CVD
    const tickDelta = side === 'BUY' ? qty : -qty;
    this.runningCvd += tickDelta;

    const d = new Date();
    const timeStr = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');

    // Log to recent ticks tape (max 25)
    this.recentTicks.unshift({
      id: now + '-' + Math.random(),
      timeStr,
      price,
      qty,
      side,
      delta: tickDelta
    });
    if (this.recentTicks.length > 25) this.recentTicks.pop();

    // Align candle to timeframe period
    const bucketMs = this.timeframeMinutes * 60 * 1000;
    const bucketTime = Math.floor(now / bucketMs) * bucketMs;

    // Check if new candle needed
    if (!this.currentCandle || this.currentCandle.timestamp !== bucketTime) {
      if (this.currentCandle) {
        this.finalizeCandle(this.currentCandle);
        this.candles.push(this.currentCandle);
        if (this.candles.length > 20) this.candles.shift();
      }

      this.currentCandle = {
        timestamp: bucketTime,
        timeStr: new Date(bucketTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        delta: 0,
        cvd: this.runningCvd,
        priceLevels: {}, // price -> { bidVol, askVol, totalVol, delta }
        pocPrice: price,
        maxDelta: 0,
        minDelta: 0,
        imbalanceLevels: [] // Stacked buy/sell imbalances
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

    // Price level rounding
    const priceKey = price.toFixed(2);
    if (!c.priceLevels[priceKey]) {
      c.priceLevels[priceKey] = {
        price: parseFloat(priceKey),
        bidVol: 0, // aggressive sells at Bid
        askVol: 0, // aggressive buys at Ask
        totalVol: 0,
        delta: 0
      };
    }

    const pl = c.priceLevels[priceKey];
    if (side === 'BUY') {
      pl.askVol += qty;
    } else {
      pl.bidVol += qty;
    }
    pl.totalVol += qty;
    pl.delta = pl.askVol - pl.bidVol;

    // Update POC
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

  finalizeCandle(c) {
    // Detect Footprint Imbalances (Diagonal comparison: Buy at Price P vs Sell at Price P-1)
    const sortedPrices = Object.values(c.priceLevels).sort((a, b) => b.price - a.price);
    const imbalances = [];

    for (let i = 0; i < sortedPrices.length - 1; i++) {
      const upper = sortedPrices[i];
      const lower = sortedPrices[i + 1];

      // Buy Imbalance: Ask Volume at upper is >= 300% of Bid Volume at lower
      if (upper.askVol >= 100 && lower.bidVol > 0 && (upper.askVol / lower.bidVol) >= 3.0) {
        imbalances.push({ price: upper.price, type: 'BUY_IMBALANCE', ratio: (upper.askVol / lower.bidVol).toFixed(1) });
      }
      // Sell Imbalance: Bid Volume at lower is >= 300% of Ask Volume at upper
      else if (lower.bidVol >= 100 && upper.askVol > 0 && (lower.bidVol / upper.askVol) >= 3.0) {
        imbalances.push({ price: lower.price, type: 'SELL_IMBALANCE', ratio: (lower.bidVol / upper.askVol).toFixed(1) });
      }
    }
    c.imbalanceLevels = imbalances;
  }

  getState() {
    const allCandles = [...this.candles];
    if (this.currentCandle) {
      allCandles.push(this.currentCandle);
    }

    // Determine CVD Divergence
    let divergence = 'NONE';
    if (allCandles.length >= 3) {
      const last = allCandles[allCandles.length - 1];
      const prev = allCandles[allCandles.length - 2];
      if (last.close > prev.close && last.cvd < prev.cvd) {
        divergence = 'BEARISH_EXHAUSTION (Price Up, CVD Down)';
      } else if (last.close < prev.close && last.cvd > prev.cvd) {
        divergence = 'BULLISH_ABSORPTION (Price Down, CVD Up)';
      }
    }

    return {
      success: true,
      connected: this.connected,
      activeSymbol: this.activeSymbol,
      activeToken: this.activeToken,
      timeframe: this.timeframeMinutes,
      lastPrice: this.lastLtp,
      runningCvd: this.runningCvd,
      divergence,
      candlesCount: allCandles.length,
      candles: allCandles.map(c => ({
        timestamp: c.timestamp,
        timeStr: c.timeStr,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        delta: c.delta,
        cvd: c.cvd,
        pocPrice: c.pocPrice,
        maxDelta: c.maxDelta,
        minDelta: c.minDelta,
        priceLevels: Object.values(c.priceLevels).sort((a, b) => b.price - a.price),
        imbalanceLevels: c.imbalanceLevels || []
      })),
      recentTicks: this.recentTicks
    };
  }
}

export const orderFlowStreamEngine = new OrderFlowStreamEngine();
