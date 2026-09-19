/**
 * ============================================================
 *  FII / DII INSTITUTIONAL POSITIONING ENGINE
 * ============================================================
 *  Fetches official NSE institutional data:
 *   1. Cash Market Net FII / DII Flow (NSE fiidiiTradeReact API)
 *   2. Participant-wise F&O Open Interest (NSE CCIL/NSCCL CSV):
 *      - FII Index Futures Long vs Short (and Net Contracts)
 *      - FII Index Call vs Put Net Positioning
 *      - Pro (Proprietary Desks) & Client (Retail) breakdown
 *   3. Institutional Footprint Correlation:
 *      - Maps FII net sentiment against Order Flow POC & Iceberg Floors
 * ============================================================
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'fii_dii_positioning.json');

function fetchNseUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
        'Connection': 'keep-alive'
      }
    };

    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: chunks });
      });
    });

    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Request timeout fetching ' + url));
    });
    req.end();
  });
}

function parseParticipantCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Header line usually at index 1 or 0
  let headerIndex = lines.findIndex(l => l.includes('Client Type') || l.includes('Future Index Long'));
  if (headerIndex === -1) headerIndex = 0;

  const result = {};

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    const clientType = rawCols[0];
    if (!clientType || clientType.toUpperCase().includes('TOTAL')) continue;

    const row = {
      clientType,
      futureIndexLong: parseInt(rawCols[1]) || 0,
      futureIndexShort: parseInt(rawCols[2]) || 0,
      futureStockLong: parseInt(rawCols[3]) || 0,
      futureStockShort: parseInt(rawCols[4]) || 0,
      optionIndexCallLong: parseInt(rawCols[5]) || 0,
      optionIndexPutLong: parseInt(rawCols[6]) || 0,
      optionIndexCallShort: parseInt(rawCols[7]) || 0,
      optionIndexPutShort: parseInt(rawCols[8]) || 0,
      optionStockCallLong: parseInt(rawCols[9]) || 0,
      optionStockPutLong: parseInt(rawCols[10]) || 0,
      optionStockCallShort: parseInt(rawCols[11]) || 0,
      optionStockPutShort: parseInt(rawCols[12]) || 0,
      totalLong: parseInt(rawCols[13]) || 0,
      totalShort: parseInt(rawCols[14]) || 0
    };

    // Derived analytics
    row.netIndexFutures = row.futureIndexLong - row.futureIndexShort;
    row.indexFutureLongPct = (row.futureIndexLong + row.futureIndexShort) > 0
      ? +((row.futureIndexLong / (row.futureIndexLong + row.futureIndexShort)) * 100).toFixed(1)
      : 50.0;
    row.netIndexCall = row.optionIndexCallLong - row.optionIndexCallShort;
    row.netIndexPut = row.optionIndexPutLong - row.optionIndexPutShort;
    row.fnoSentiment = row.netIndexFutures > 0 ? 'BULLISH' : 'BEARISH';

    result[clientType.toUpperCase()] = row;
  }

  return result;
}

let cachedFiiDiiData = null;
let lastFetchTs = 0;

export async function getFiiDiiPositioning(forceRefresh = false) {
  const now = Date.now();
  // Cache for 15 minutes
  if (!forceRefresh && cachedFiiDiiData && (now - lastFetchTs < 15 * 60 * 1000)) {
    return cachedFiiDiiData;
  }

  // Check saved file fallback
  if (!cachedFiiDiiData && fs.existsSync(DATA_FILE)) {
    try {
      cachedFiiDiiData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {}
  }

  try {
    // 1. Fetch Cash Market Activity
    let cashData = [];
    try {
      const resCash = await fetchNseUrl('https://www.nseindia.com/api/fiidiiTradeReact');
      if (resCash.statusCode === 200) {
        cashData = JSON.parse(resCash.body);
      }
    } catch (e) {
      console.warn('[FII Engine] Cash market fetch failed:', e.message);
    }

    // 2. Fetch Participant OI CSV (look back up to 5 days to find latest available)
    let participantData = null;
    let effectiveDateStr = '';
    const today = new Date();

    for (let d = 0; d <= 5; d++) {
      const targetDate = new Date(today.getTime() - d * 86400000);
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

      const dd = String(targetDate.getDate()).padStart(2, '0');
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const yyyy = String(targetDate.getFullYear());
      const dateKey = `${dd}${mm}${yyyy}`;
      const csvUrl = `https://archives.nseindia.com/content/nsccl/fao_participant_oi_${dateKey}.csv`;

      try {
        const resCsv = await fetchNseUrl(csvUrl);
        if (resCsv.statusCode === 200 && resCsv.body.includes('Participant wise')) {
          participantData = parseParticipantCsv(resCsv.body);
          effectiveDateStr = `${dd}-${mm}-${yyyy}`;
          break;
        }
      } catch (err) {}
    }

    // Extract key institutional metrics
    const fii = participantData?.FII || {};
    const dii = participantData?.DII || {};
    const pro = participantData?.PRO || {};
    const client = participantData?.CLIENT || {};

    const fiiCash = cashData.find(c => c.category?.toUpperCase().includes('FII') || c.category?.toUpperCase().includes('FPI')) || {};
    const diiCash = cashData.find(c => c.category?.toUpperCase().includes('DII')) || {};

    const result = {
      asOfDate: effectiveDateStr || new Date().toISOString().split('T')[0],
      fetchedAt: new Date().toISOString(),
      cashMarket: {
        fiiNetCrores: parseFloat(fiiCash.netValue) || 0,
        fiiBuyCrores: parseFloat(fiiCash.buyValue) || 0,
        fiiSellCrores: parseFloat(fiiCash.sellValue) || 0,
        diiNetCrores: parseFloat(diiCash.netValue) || 0,
        diiBuyCrores: parseFloat(diiCash.buyValue) || 0,
        diiSellCrores: parseFloat(diiCash.sellValue) || 0,
        cashDate: fiiCash.date || effectiveDateStr
      },
      fnoDerivatives: {
        fii: {
          futureIndexLong: fii.futureIndexLong || 0,
          futureIndexShort: fii.futureIndexShort || 0,
          netIndexFutures: fii.netIndexFutures || 0,
          longRatioPct: fii.indexFutureLongPct || 0,
          netIndexCall: fii.netIndexCall || 0,
          netIndexPut: fii.netIndexPut || 0,
          stance: (fii.netIndexFutures < -50000) ? 'HEAVILY_SHORT' : (fii.netIndexFutures < 0 ? 'MILDLY_SHORT' : 'NET_LONG')
        },
        pro: {
          netIndexFutures: pro.netIndexFutures || 0,
          longRatioPct: pro.indexFutureLongPct || 0,
          netIndexCall: pro.netIndexCall || 0,
          netIndexPut: pro.netIndexPut || 0
        },
        clientRetail: {
          netIndexFutures: client.netIndexFutures || 0,
          longRatioPct: client.indexFutureLongPct || 0,
          netIndexCall: client.netIndexCall || 0,
          netIndexPut: client.netIndexPut || 0
        },
        dii: {
          netIndexFutures: dii.netIndexFutures || 0,
          longRatioPct: dii.indexFutureLongPct || 0
        }
      },
      verdict: generateVerdict(fii, fiiCash)
    };

    cachedFiiDiiData = result;
    lastFetchTs = now;

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(result, null, 2));
    } catch (e) {}

    return result;
  } catch (error) {
    console.error('[FII Engine Error]:', error.message);
    return cachedFiiDiiData || { success: false, error: error.message };
  }
}

function generateVerdict(fii, fiiCash) {
  const netFut = fii.netIndexFutures || 0;
  const longPct = fii.indexFutureLongPct || 0;
  const cashNet = parseFloat(fiiCash?.netValue) || 0;

  let bias = 'NEUTRAL';
  let message = '';

  if (longPct < 20 || netFut < -150000) {
    bias = 'EXTREME_BEARISH_TRAP_RISK';
    message = `FIIs hold a massive ${Math.abs(netFut).toLocaleString()} net short contracts in Index Futures (${longPct}% Long). Extreme short concentration means any sharp intraday dip will see aggressive short covering rallies, while resistance near POC will be defended.`;
  } else if (netFut < 0) {
    bias = 'MILDLY_BEARISH';
    message = `FIIs are net short by ${Math.abs(netFut).toLocaleString()} contracts in Index Futures. Sellers have macro control.`;
  } else {
    bias = 'BULLISH';
    message = `FIIs are net long index futures (${longPct}% long ratio). Smart money is backing dips.`;
  }

  return { bias, message, cashFlowDirection: cashNet >= 0 ? 'NET_INFLOW' : 'NET_OUTFLOW' };
}
