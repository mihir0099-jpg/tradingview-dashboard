// ==============================================================================
// lot_size_service.js - Official NSE Contract Lot Size Service
// Automatically fetches live market lots from official NSE archives:
// https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv
// Fallback to disk cache & hardcoded defaults.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NSE_MKT_LOTS_URL = 'https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv';
const CACHE_FILE = path.join(__dirname, 'data', 'nse_lot_sizes.json');
const UNIVERSE_FILE = path.join(__dirname, 'data', 'all_fno_universe.json');

// In-memory cache with official defaults
const memoryLotCache = new Map([
  ['NIFTY', 65],
  ['BANKNIFTY', 30],
  ['FINNIFTY', 60],
  ['MIDCPNIFTY', 120],
  ['NIFTYNXT50', 25],
  ['NIFTYFPI', 1100],
  ['SENSEX', 10],
  ['BANKEX', 15],
  ['CRUDEOIL', 100],
  ['GOLD', 1],
  ['NATURALGAS', 1250],
  ['RELIANCE', 500],
  ['HDFCBANK', 650],
  ['ICICIBANK', 700],
  ['SBIN', 750],
  ['INFY', 400],
  ['TCS', 225],
  ['BAJFINANCE', 750],
  ['KOTAKBANK', 2000],
  ['ITC', 1725],
  ['TATACONSUM', 550],
  ['TATAPOWER', 1450],
  ['TATASTEEL', 2750]
]);

let lastFetchTime = null;
let lastFetchSuccess = false;

/**
 * Clean & normalize symbol to standard key (e.g. 'NSE:NIFTY' -> 'NIFTY')
 */
export function normalizeSymbol(sym) {
  if (!sym) return '';
  return sym
    .toString()
    .toUpperCase()
    .replace('NSE:', '')
    .replace('BSE:', '')
    .replace('MCX:', '')
    .replace('.NS', '')
    .replace('.BO', '')
    .trim();
}

/**
 * Parse NSE fo_mktlots.csv format:
 * UNDERLYING, SYMBOL, <EXPIRY_1>, <EXPIRY_2>, ...
 */
export function parseNseMktLotsCsv(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  const lots = {};
  
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 3) continue;

    const sym = parts[1].toUpperCase();
    if (!sym || sym === 'SYMBOL' || sym === 'UNDERLYING') continue;

    // First valid integer in expiry columns is current month lot size
    for (let i = 2; i < parts.length; i++) {
      const val = parseInt(parts[i], 10);
      if (!isNaN(val) && val > 0) {
        lots[sym] = val;
        break;
      }
    }
  }

  return lots;
}

/**
 * Fetch latest market lots directly from NSE Archives
 */
export function fetchOnlineNseLotSizes() {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    };

    https.get(NSE_MKT_LOTS_URL, options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`NSE archives HTTP ${res.statusCode}: ${res.statusMessage}`));
      }

      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsed = parseNseMktLotsCsv(rawData);
          const count = Object.keys(parsed).length;
          if (count < 10) {
            return reject(new Error(`Parsed only ${count} symbols from NSE lots CSV; expected ~200+`));
          }

          // Populate in-memory cache
          for (const [s, lot] of Object.entries(parsed)) {
            memoryLotCache.set(s, lot);
          }

          lastFetchTime = new Date().toISOString();
          lastFetchSuccess = true;

          // Save to disk cache
          try {
            const cachePayload = {
              updatedAt: lastFetchTime,
              source: NSE_MKT_LOTS_URL,
              count,
              lots: parsed
            };
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cachePayload, null, 2), 'utf8');
            console.log(`[LotSizeService] Successfully updated ${count} official NSE lot sizes from online archives.`);
          } catch (writeErr) {
            console.warn('[LotSizeService] Warning: Could not write cache file:', writeErr.message);
          }

          // Also synchronize all_fno_universe.json so static references have exact lot sizes
          syncLotSizesToUniverse(parsed);

          resolve(parsed);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    }).on('error', (err) => {
      reject(err);
    }).on('timeout', () => {
      reject(new Error('NSE lot size fetch request timed out'));
    });
  });
}

/**
 * Synchronize official lot sizes into all_fno_universe.json
 */
export function syncLotSizesToUniverse(lotMap = null) {
  try {
    if (!lotMap) {
      lotMap = Object.fromEntries(memoryLotCache);
    }
    if (!fs.existsSync(UNIVERSE_FILE)) return;

    const universe = JSON.parse(fs.readFileSync(UNIVERSE_FILE, 'utf8'));
    let updatedCount = 0;

    for (const item of universe) {
      const sym = normalizeSymbol(item.cleanSymbol || item.symbol);
      if (lotMap[sym] && lotMap[sym] !== item.lotSize) {
        item.lotSize = lotMap[sym];
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      fs.writeFileSync(UNIVERSE_FILE, JSON.stringify(universe, null, 2), 'utf8');
      console.log(`[LotSizeService] Updated lot sizes for ${updatedCount} stocks in all_fno_universe.json`);
    }
  } catch (err) {
    console.warn('[LotSizeService] Could not sync to all_fno_universe.json:', err.message);
  }
}

/**
 * Load disk cache on boot
 */
export function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (cached && cached.lots) {
        for (const [sym, lot] of Object.entries(cached.lots)) {
          memoryLotCache.set(sym, lot);
        }
        lastFetchTime = cached.updatedAt || null;
        lastFetchSuccess = true;
        console.log(`[LotSizeService] Loaded ${Object.keys(cached.lots).length} lot sizes from disk cache.`);
        return true;
      }
    }
  } catch (e) {
    console.warn('[LotSizeService] Could not read disk cache:', e.message);
  }
  return false;
}

/**
 * Get lot size for any instrument (case & prefix insensitive)
 * Returns exact official lot size, or fallback if unknown.
 */
export function getLotSize(symbol, fallback = 250) {
  const norm = normalizeSymbol(symbol);
  if (memoryLotCache.has(norm)) {
    return memoryLotCache.get(norm);
  }

  // Common aliases
  if (norm.includes('NIFTY') && !norm.includes('BANK') && !norm.includes('FIN') && !norm.includes('MID') && !norm.includes('NXT')) {
    return memoryLotCache.get('NIFTY') || 65;
  }
  if (norm.includes('BANKNIFTY')) return memoryLotCache.get('BANKNIFTY') || 30;
  if (norm.includes('FINNIFTY')) return memoryLotCache.get('FINNIFTY') || 60;
  if (norm.includes('MIDCPNIFTY')) return memoryLotCache.get('MIDCPNIFTY') || 120;
  if (norm.includes('SENSEX')) return memoryLotCache.get('SENSEX') || 10;
  if (norm.includes('CRUDEOIL')) return 100;
  if (norm.includes('GOLD')) return 1;
  if (norm.includes('NATURALGAS')) return 1250;

  return fallback;
}

/**
 * Get all known lot sizes map
 */
export function getAllLotSizes() {
  return {
    lastFetchTime,
    lastFetchSuccess,
    count: memoryLotCache.size,
    lots: Object.fromEntries(memoryLotCache)
  };
}

/**
 * Initialize the lot size service:
 * 1. Load disk cache immediately
 * 2. Fetch fresh online copy asynchronously
 * 3. Schedule auto-refresh every 12 hours
 */
export function initLotSizeService() {
  loadDiskCache();

  // Background fetch fresh from NSE
  fetchOnlineNseLotSizes().catch(err => {
    console.warn('[LotSizeService] Background online lot size fetch failed, using cached values:', err.message);
  });

  // Periodic refresh every 12 hours (43,200,000 ms)
  setInterval(() => {
    fetchOnlineNseLotSizes().catch(err => {
      console.warn('[LotSizeService] Scheduled refresh failed:', err.message);
    });
  }, 12 * 60 * 60 * 1000);
}
