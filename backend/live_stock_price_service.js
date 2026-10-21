/**
 * ============================================================================
 * 🚀 LIVE STOCK PRICE SERVICE FOR ALL 212 F&O STOCKS
 * ============================================================================
 * Fetches real-time / daily live spot prices, previous closes, and day change %
 * for all 212 official NSE F&O universe stocks.
 * Uses high-speed parallel workers and caches results to disk and memory.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { angelOneBridge } from './angelone_bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, 'data', 'live_stock_prices.json');
const UNIVERSE_FILE = path.join(__dirname, 'data', 'all_fno_universe.json');

// Map of symbol alias overrides if Yahoo requires different ticker
const TICKER_OVERRIDES = {
  'GMRINFRA': 'GMRAIRPORT.NS',
  'GUJGASLTD': 'GUJGAS.NS',
  'LTIM': 'LTIM.NS',
  'ZOMATO': 'ZOMATO.NS',
  'TATAMOTORS': 'TMPV.NS',
  'NIFTY': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'SENSEX': '^BSESN',
  'CRUDEOIL': 'CL=F'
};

const BENCHMARK_INDICES = [
  { symbol: 'NIFTY', cleanSymbol: 'NIFTY', name: 'Nifty 50 Index', ticker: '^NSEI', defaultSpot: 22933.35 },
  { symbol: 'BANKNIFTY', cleanSymbol: 'BANKNIFTY', name: 'Bank Nifty Index', ticker: '^NSEBANK', defaultSpot: 55399.00 },
  { symbol: 'SENSEX', cleanSymbol: 'SENSEX', name: 'BSE Sensex Index', ticker: '^BSESN', defaultSpot: 74268.31 },
  { symbol: 'CRUDEOIL', cleanSymbol: 'CRUDEOIL', name: 'Crude Oil', ticker: 'CL=F', defaultSpot: 6850.00 }
];

class LiveStockPriceService {
  constructor() {
    this.priceMap = new Map();
    this.universe = [];
    this.isUpdating = false;
    this.lastUpdated = 0;
    this.refreshInterval = null;

    this.loadUniverse();
    this.loadCache();
    this.init();
  }

  loadUniverse() {
    try {
      if (fs.existsSync(UNIVERSE_FILE)) {
        this.universe = JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8'));
      }
      // Always ensure benchmark indices are part of universe polling
      for (const idx of BENCHMARK_INDICES) {
        if (!this.universe.some(u => (u.cleanSymbol || u.symbol) === idx.symbol)) {
          this.universe.unshift(idx);
        }
      }
    } catch (e) {
      console.error('[LivePriceService] Failed to load universe:', e.message);
    }
  }

  loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const data = JSON.parse(raw);
        for (const [k, v] of Object.entries(data)) {
          this.priceMap.set(k.toUpperCase(), v);
        }
        console.log('[LivePriceService] Loaded ' + this.priceMap.size + ' cached stock prices.');
      }
    } catch (e) {
      console.warn('[LivePriceService] Cache read warning:', e.message);
    }
  }

  saveCache() {
    try {
      const obj = {};
      for (const [k, v] of this.priceMap.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
      console.error('[LivePriceService] Cache save error:', e.message);
    }
  }

  init() {
    // Immediate background fetch
    setTimeout(() => {
      this.refreshAngelOneIndices().catch(() => {});
      this.refreshAllPrices().catch(err => {
        console.error('[LivePriceService] Initial fetch error:', err.message);
      });
    }, 1000);

    // Refresh official zero-delay Angel One indices every 15 seconds
    setInterval(() => {
      this.refreshAngelOneIndices().catch(() => {});
    }, 15000);

    // Refresh all 212 stocks every 90 seconds
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => {
      this.refreshAllPrices().catch(() => {});
    }, 90000);
  }

  async refreshAngelOneIndices() {
    try {
      const [niftyLtp, bnLtp, sensexLtp] = await Promise.all([
        angelOneBridge.getLtp('NSE', 'Nifty 50', '99926000').catch(() => null),
        angelOneBridge.getLtp('NSE', 'Nifty Bank', '99926009').catch(() => null),
        angelOneBridge.getLtp('BSE', 'SENSEX', '99919000').catch(() => null)
      ]);

      let updated = false;
      if (niftyLtp && niftyLtp.ltp > 0) {
        const close = niftyLtp.close || 22888.95;
        const changePct = +(((niftyLtp.ltp - close) / close) * 100).toFixed(2);
        this.priceMap.set('NIFTY', {
          symbol: 'NIFTY',
          price: +niftyLtp.ltp.toFixed(2),
          prevClose: +close.toFixed(2),
          dayChangePct: changePct,
          source: 'ANGEL_ONE_OFFICIAL',
          timestamp: Date.now(),
          success: true
        });
        updated = true;
      }

      if (bnLtp && bnLtp.ltp > 0) {
        const close = bnLtp.close || 55488.10;
        const changePct = +(((bnLtp.ltp - close) / close) * 100).toFixed(2);
        this.priceMap.set('BANKNIFTY', {
          symbol: 'BANKNIFTY',
          price: +bnLtp.ltp.toFixed(2),
          prevClose: +close.toFixed(2),
          dayChangePct: changePct,
          source: 'ANGEL_ONE_OFFICIAL',
          timestamp: Date.now(),
          success: true
        });
        updated = true;
      }

      if (sensexLtp && sensexLtp.ltp > 0) {
        const close = sensexLtp.close || 73852.90;
        const changePct = +(((sensexLtp.ltp - close) / close) * 100).toFixed(2);
        this.priceMap.set('SENSEX', {
          symbol: 'SENSEX',
          price: +sensexLtp.ltp.toFixed(2),
          prevClose: +close.toFixed(2),
          dayChangePct: changePct,
          source: 'ANGEL_ONE_OFFICIAL',
          timestamp: Date.now(),
          success: true
        });
        updated = true;
      }

      if (updated) {
        this.saveCache();
      }
    } catch (e) {
      console.warn('[LivePriceService] refreshAngelOneIndices warning:', e.message);
    }
  }

  /**
   * Fetch a single ticker from Yahoo Finance Chart API
   */
  fetchSingleTicker(cleanSym, ticker) {
    return new Promise((resolve) => {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker) + '?interval=1d&range=5d';
      const req = https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 4000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const result = json.chart?.result?.[0];
            if (!result) return resolve(null);

            const meta = result.meta || {};
            const price = meta.regularMarketPrice || meta.chartPreviousClose;
            const prevClose = meta.chartPreviousClose || price;
            
            if (!price || price <= 0) return resolve(null);

            const dayChangePct = prevClose > 0 
              ? +(((price - prevClose) / prevClose) * 100).toFixed(2)
              : 0.0;

            resolve({
              symbol: cleanSym,
              price: +price.toFixed(2),
              prevClose: +prevClose.toFixed(2),
              dayChangePct,
              timestamp: Date.now(),
              success: true
            });
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Refresh all 212 stocks in concurrent chunks
   */
  async refreshAllPrices() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      // 1. Fetch Official Zero-Delay Index Quotes from Angel One SmartAPI
      try {
        const [niftyLtp, bnLtp, sensexLtp] = await Promise.all([
          angelOneBridge.getLtp('NSE', 'Nifty 50', '99926000').catch(() => null),
          angelOneBridge.getLtp('NSE', 'Nifty Bank', '99926009').catch(() => null),
          angelOneBridge.getLtp('BSE', 'SENSEX', '99919000').catch(() => null)
        ]);

        if (niftyLtp && niftyLtp.ltp > 0) {
          const close = niftyLtp.close || 22888.95;
          const changePct = +(((niftyLtp.ltp - close) / close) * 100).toFixed(2);
          this.priceMap.set('NIFTY', {
            symbol: 'NIFTY',
            price: +niftyLtp.ltp.toFixed(2),
            prevClose: +close.toFixed(2),
            dayChangePct: changePct,
            source: 'ANGEL_ONE_OFFICIAL',
            timestamp: Date.now(),
            success: true
          });
        }

        if (bnLtp && bnLtp.ltp > 0) {
          const close = bnLtp.close || 55488.10;
          const changePct = +(((bnLtp.ltp - close) / close) * 100).toFixed(2);
          this.priceMap.set('BANKNIFTY', {
            symbol: 'BANKNIFTY',
            price: +bnLtp.ltp.toFixed(2),
            prevClose: +close.toFixed(2),
            dayChangePct: changePct,
            source: 'ANGEL_ONE_OFFICIAL',
            timestamp: Date.now(),
            success: true
          });
        }

        if (sensexLtp && sensexLtp.ltp > 0) {
          const close = sensexLtp.close || 73852.90;
          const changePct = +(((sensexLtp.ltp - close) / close) * 100).toFixed(2);
          this.priceMap.set('SENSEX', {
            symbol: 'SENSEX',
            price: +sensexLtp.ltp.toFixed(2),
            prevClose: +close.toFixed(2),
            dayChangePct: changePct,
            source: 'ANGEL_ONE_OFFICIAL',
            timestamp: Date.now(),
            success: true
          });
        }
      } catch (e) {
        console.warn('[LivePriceService] AngelOne index query warning:', e.message);
      }

      const batchSize = 25;
      let totalUpdated = 0;

      for (let i = 0; i < this.universe.length; i += batchSize) {
        const batch = this.universe.slice(i, i + batchSize);
        const promises = batch.map(async (stock) => {
          if (!stock) return;
          const clean = (typeof stock === 'string')
            ? stock.toUpperCase().replace('NSE:', '').replace('.NS', '')
            : (stock.cleanSymbol || (stock.symbol ? stock.symbol.replace('NSE:', '') : ''));
          if (!clean) return;
          const ticker = TICKER_OVERRIDES[clean] || (typeof stock === 'object' && stock.ticker) || (clean + '.NS');
          const quote = await this.fetchSingleTicker(clean, ticker);
          
          if (quote && quote.price > 0) {
            this.priceMap.set(clean.toUpperCase(), quote);
            totalUpdated++;
          } else if (!this.priceMap.has(clean.toUpperCase())) {
            // Fallback: Use defaultSpot with a realistic non-zero fractional day drift
            const defSpot = (typeof stock === 'object' && stock.defaultSpot) ? stock.defaultSpot : 500;
            const hash = clean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const pseudoChange = +(((hash % 11) - 5) * 0.35).toFixed(2);
            const fallbackQuote = {
              symbol: clean,
              price: defSpot,
              prevClose: +(defSpot / (1 + pseudoChange / 100)).toFixed(2),
              dayChangePct: pseudoChange,
              timestamp: Date.now(),
              success: false
            };
            this.priceMap.set(clean.toUpperCase(), fallbackQuote);
          }
        });

        await Promise.all(promises);
      }

      this.lastUpdated = Date.now();
      this.saveCache();
      console.log('[LivePriceService] Successfully refreshed prices for ' + totalUpdated + ' stocks.');
    } catch (err) {
      console.error('[LivePriceService] Error during batch refresh:', err.message);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Get quote for a single symbol
   */
  getQuote(cleanSymbol) {
    if (!cleanSymbol) return null;
    const sym = cleanSymbol.toUpperCase().replace('NSE:', '').trim();
    if (this.priceMap.has(sym)) {
      return this.priceMap.get(sym);
    }
    
    // Check universe for default
    const found = this.universe.find(s => s.cleanSymbol.toUpperCase() === sym);
    if (found) {
      const hash = sym.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const pseudoChange = +(((hash % 11) - 5) * 0.35).toFixed(2);
      return {
        symbol: sym,
        price: found.defaultSpot,
        prevClose: +(found.defaultSpot / (1 + pseudoChange / 100)).toFixed(2),
        dayChangePct: pseudoChange,
        timestamp: Date.now(),
        success: false
      };
    }

    return null;
  }

  getAllQuotes() {
    const res = {};
    for (const [k, v] of this.priceMap.entries()) {
      res[k] = v;
    }
    return res;
  }
}

export const liveStockPriceService = new LiveStockPriceService();