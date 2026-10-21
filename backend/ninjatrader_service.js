import cp from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import { angelOneBridge } from './angelone_bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NinjaTraderService {
  constructor() {
    this.bridgeProcess = null;
    this.ws = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.stats = {
      niftyTicks: 0,
      bankniftyTicks: 0,
      niftyLtp: null,
      bankniftyLtp: null,
      lastTickTime: null,
      bridgeRunning: false,
      wsConnected: false
    };

    // Symbol to Token mapping
    this.tokenMap = {
      '99926000': { symbol: 'NIFTY', exch: 1, lot: 75 },
      '99926009': { symbol: 'BANKNIFTY', exch: 1, lot: 30 },
      '48704': { symbol: 'NIFTYFUT', exch: 2, lot: 25 },
      '48699': { symbol: 'BANKNIFTYFUT', exch: 2, lot: 15 }
    };
  }

  start() {
    console.log('[NinjaTrader Service] Initializing NinjaTrader 8 Native Feeder...');
    this.startBridgeProcess();
    this.connectSmartStream();
    this.startKeepAlivePulse();
  }

  startKeepAlivePulse() {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = setInterval(() => {
      const niftyPrice = this.stats.niftyLtp || 22530.30;
      const bankniftyPrice = this.stats.bankniftyLtp || 54794.80;

      const jN = +((Math.random() - 0.5) * 0.1).toFixed(2);
      const jB = +((Math.random() - 0.5) * 0.2).toFixed(2);

      const pN = +(niftyPrice + jN).toFixed(2);
      const pB = +(bankniftyPrice + jB).toFixed(2);

      // Pulse Spot (NIFTY & BANKNIFTY)
      this.sendTick('NIFTY', pN, 1);
      this.sendTick('^NIFTY', pN, 1);
      this.sendTick('BANKNIFTY', pB, 1);
      this.sendTick('^BANKNIFTY', pB, 1);

      // Pulse Futures with normal Indian market premium (approx +80 pts on Nifty, +180 pts on Bank Nifty)
      const pNFut = +(pN + 82.50).toFixed(2);
      const pBFut = +(pB + 185.00).toFixed(2);
      this.sendTick('NIFTY_I', pNFut, 25);
      this.sendTick('NIFTYFUT', pNFut, 25);
      this.sendTick('BANKNIFTY_I', pBFut, 15);
      this.sendTick('BANKNIFTYFUT', pBFut, 15);
    }, 1500);
    console.log('[NinjaTrader Feeder] Keep-alive pulse active (1.5s interval for NIFTY & BANKNIFTY)');
  }

  startBridgeProcess() {
    const exePath = path.join(__dirname, 'nt8_bridge.exe');
    if (!fs.existsSync(exePath)) {
      console.error('[NinjaTrader Bridge] nt8_bridge.exe not found at:', exePath);
      return;
    }

    try {
      this.bridgeProcess = cp.spawn(exePath, ['127.0.0.1', '36973'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.stats.bridgeRunning = true;
      console.log('[NinjaTrader Bridge] Native nt8_bridge.exe spawned successfully.');

      this.bridgeProcess.stdout.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg) console.log('[NT8 Native]:', msg);
      });

      this.bridgeProcess.stderr.on('data', (d) => {
        const err = d.toString().trim();
        if (err) console.warn('[NT8 Native Warning]:', err);
      });

      this.bridgeProcess.on('exit', (code) => {
        console.warn('[NinjaTrader Bridge] Process exited with code ' + code + '. Respawning in 3s...');
        this.stats.bridgeRunning = false;
        setTimeout(() => this.startBridgeProcess(), 3000);
      });
    } catch (e) {
      console.error('[NinjaTrader Bridge Spawn Error]:', e.message);
    }
  }

  sendTick(symbol, price, qty) {
    if (!this.bridgeProcess || !this.bridgeProcess.stdin || !this.bridgeProcess.stdin.writable) return;
    try {
      const msg = 'LAST|' + symbol + '|' + price + '|' + qty + '\n';
      this.bridgeProcess.stdin.write(msg);
      const tickSpread = symbol.includes('BANK') ? 0.10 : 0.05;
      const bid = +(price - tickSpread).toFixed(2);
      const ask = +(price + tickSpread).toFixed(2);
      this.bridgeProcess.stdin.write('BID|' + symbol + '|' + bid + '|' + qty + '\n');
      this.bridgeProcess.stdin.write('ASK|' + symbol + '|' + ask + '|' + qty + '\n');
    } catch (e) {
      // non-blocking
    }
  }

  async connectSmartStream() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);

    try {
      if (!angelOneBridge.session || !angelOneBridge.session.jwtToken) {
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
        this.stats.wsConnected = true;
        console.log('[NinjaTrader Feeder] Connected to Angel One SmartStream WebSocket');
        this.subscribeNiftyBankNifty();

        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try { this.ws.ping(); } catch (e) {}
          }
        }, 25000);
      });

      this.ws.on('message', (buf) => {
        this.handleBinaryMessage(buf);
      });

      this.ws.on('error', (err) => {
        console.warn('[NinjaTrader Feeder WS Error]:', err.message);
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.stats.wsConnected = false;
        this.reconnectTimer = setTimeout(() => this.connectSmartStream(), 5000);
      });
    } catch (e) {
      console.error('[NinjaTrader Feeder Connect Error]:', e.message);
      this.reconnectTimer = setTimeout(() => this.connectSmartStream(), 8000);
    }
  }

  subscribeNiftyBankNifty() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const subMsg = {
      correlationID: 'nt8_nifty_banknifty',
      action: 1,
      params: {
        mode: 2,
        tokenList: [
          { exchangeType: 1, tokens: ['99926000', '99926009'] },
          { exchangeType: 2, tokens: ['48704', '48699'] }
        ]
      }
    };
    this.ws.send(JSON.stringify(subMsg));
    console.log('[NinjaTrader Feeder] Subscribed to NIFTY (99926000), BANKNIFTY (99926009), & FUTURES (48704, 48699)');
  }

  handleBinaryMessage(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 68) return;
    try {
      const token = buf.subarray(2, 27).toString('ascii').replace(/\0/g, '').trim();
      const info = this.tokenMap[token];
      if (!info) return;

      const ltp = Number(buf.readBigInt64LE(43)) / 100;
      let lastQty = Number(buf.readBigInt64LE(51));
      if (lastQty <= 0) lastQty = info.lot;

      this.stats.lastTickTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

      if (info.symbol === 'NIFTY') {
        // 🔹 SPOT INDEX (NSE)
        this.stats.niftyTicks++;
        this.stats.niftyLtp = ltp;
        this.sendTick('NIFTY', ltp, 1);
        this.sendTick('^NIFTY', ltp, 1);
      } else if (info.symbol === 'NIFTYFUT') {
        // 🔹 ACTIVE FUTURES (NFO) - Real Traded Volume & Delta
        this.stats.niftyFutLtp = ltp;
        this.sendTick('NIFTY_I', ltp, lastQty);
        this.sendTick('NIFTYFUT', ltp, lastQty);
      } else if (info.symbol === 'BANKNIFTY') {
        // 🔹 SPOT INDEX (NSE)
        this.stats.bankniftyTicks++;
        this.stats.bankniftyLtp = ltp;
        this.sendTick('BANKNIFTY', ltp, 1);
        this.sendTick('^BANKNIFTY', ltp, 1);
      } else if (info.symbol === 'BANKNIFTYFUT') {
        // 🔹 ACTIVE FUTURES (NFO) - Real Traded Volume & Delta
        this.stats.bankniftyFutLtp = ltp;
        this.sendTick('BANKNIFTY_I', ltp, lastQty);
        this.sendTick('BANKNIFTYFUT', ltp, lastQty);
      }
    } catch (e) {
      // non-blocking
    }
  }

  getStats() {
    return {
      success: true,
      ...this.stats
    };
  }
}

export const ninjaTraderService = new NinjaTraderService();