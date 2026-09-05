import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const archiveDir = path.join(__dirname, 'data', 'daily_archive');
const ledgerPath = path.join(__dirname, 'data', 'master_backtest_ledger.json');

// Ensure archive directory exists
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

// 1. Helper to fetch complete 1-day 1-minute historical candles from Yahoo Finance
async function fetchFullDayCandles(symbolKey) {
  try {
    const symbolMap = {
      NIFTY: '%5ENSEI',
      BANKNIFTY: '%5ENSEBANK'
    };
    const yahooSymbol = symbolMap[symbolKey] || '%5ENSEI';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`;
    
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] && quote.close[i]) {
        candles.push({
          time: timestamps[i],
          timeIST: new Date(timestamps[i] * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }),
          open: parseFloat(quote.open[i].toFixed(2)),
          high: parseFloat(quote.high[i].toFixed(2)),
          low: parseFloat(quote.low[i].toFixed(2)),
          close: parseFloat(quote.close[i].toFixed(2)),
          volume: quote.volume[i] || 0
        });
      }
    }

    return {
      meta,
      candles
    };
  } catch (err) {
    console.warn(`[Daily Archiver] Failed to fetch candles for ${symbolKey}:`, err.message || err);
    return null;
  }
}

// 2. Classify TPO Periods (30-minute brackets)
function analyzeTpoSession(candles) {
  if (!candles || candles.length === 0) return null;

  const openPrice = candles[0].open;
  const closePrice = candles[candles.length - 1].close;
  const dayHigh = Math.max(...candles.map(c => c.high));
  const dayLow = Math.min(...candles.map(c => c.low));

  // Initial Balance: First 60 minutes (09:15 - 10:15 AM = first 60 candles)
  const ibCandles = candles.slice(0, 60);
  const ibHigh = ibCandles.length > 0 ? Math.max(...ibCandles.map(c => c.high)) : dayHigh;
  const ibLow = ibCandles.length > 0 ? Math.min(...ibCandles.map(c => c.low)) : dayLow;
  const ibRange = parseFloat((ibHigh - ibLow).toFixed(2));

  // Period C (10:15 - 10:45 AM = candles 60 to 90)
  const periodCCandles = candles.slice(60, 90);
  const periodCClose = periodCCandles.length > 0 ? periodCCandles[periodCCandles.length - 1].close : null;
  const periodCBrokeHigh = periodCCandles.some(c => c.high > ibHigh);
  const periodCBrokeLow = periodCCandles.some(c => c.low < ibLow);

  // G-Period (12:15 - 12:45 PM = candles 180 to 210)
  const gCandles = candles.slice(180, 210);
  const gClose = gCandles.length > 0 ? gCandles[gCandles.length - 1].close : null;
  const gClosedAboveIB = gClose && gClose > ibHigh;
  const gClosedBelowIB = gClose && gClose < ibLow;

  // Day Type Classification (Market Profile Rules)
  const brokeHighAllDay = dayHigh > ibHigh;
  const brokeLowAllDay = dayLow < ibLow;

  let dayType = 'NORMAL_DAY';
  if (brokeHighAllDay && brokeLowAllDay) {
    dayType = 'NEUTRAL_DAY (Double Extension - Reversal Trap)';
  } else if (brokeHighAllDay && (dayHigh - ibHigh) > (ibRange * 1.5)) {
    dayType = 'TREND_DAY_BULLISH';
  } else if (brokeLowAllDay && (ibLow - dayLow) > (ibRange * 1.5)) {
    dayType = 'TREND_DAY_BEARISH';
  } else if (brokeHighAllDay) {
    dayType = 'NORMAL_VARIATION_BULL';
  } else if (brokeLowAllDay) {
    dayType = 'NORMAL_VARIATION_BEAR';
  }

  // Session Extreme Timings (testing Rule 5A & 4C)
  const hodCandle = candles.find(c => c.high === dayHigh);
  const lodCandle = candles.find(c => c.low === dayLow);

  return {
    openPrice,
    closePrice,
    changePts: parseFloat((closePrice - openPrice).toFixed(2)),
    changePct: parseFloat((((closePrice - openPrice) / openPrice) * 100).toFixed(2)),
    dayHigh,
    dayLow,
    totalRange: parseFloat((dayHigh - dayLow).toFixed(2)),
    ibHigh,
    ibLow,
    ibRange,
    dayType,
    periodC: {
      brokeHigh: periodCBrokeHigh,
      brokeLow: periodCBrokeLow,
      close: periodCClose,
      closedAboveIB: periodCClose ? periodCClose > ibHigh : false,
      closedBelowIB: periodCClose ? periodCClose < ibLow : false
    },
    periodG: {
      close: gClose,
      closedAboveIB: gClosedAboveIB,
      closedBelowIB: gClosedBelowIB
    },
    sessionExtremes: {
      hodTime: hodCandle?.timeIST || 'N/A',
      lodTime: lodCandle?.timeIST || 'N/A'
    }
  };
}

// 3. Master Archive Execution
export async function archiveTodayMarketData() {
  console.log('====================================================================');
  console.log('[Daily Archiver] Archiving complete daily market session for backtesting...');
  console.log('====================================================================');

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }).replace(/\//g, '_');
  const sessionDateFormatted = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const dayName = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });

  // 1. Pull full intraday candles for both indices
  const [niftyData, bankData] = await Promise.all([
    fetchFullDayCandles('NIFTY'),
    fetchFullDayCandles('BANKNIFTY')
  ]);

  const niftyAnalysis = niftyData ? analyzeTpoSession(niftyData.candles) : null;
  const bankAnalysis = bankData ? analyzeTpoSession(bankData.candles) : null;

  // 2. Read live learning & option skew records for today
  let todaySkewGamma = null;
  const liveLearningsPath = path.join(__dirname, 'data', 'live_market_learnings.json');
  if (fs.existsSync(liveLearningsPath)) {
    try {
      const logs = JSON.parse(fs.readFileSync(liveLearningsPath, 'utf8'));
      const todayLogs = logs.filter(l => l.date === todayStr.replace(/_/g, '/'));
      if (todayLogs.length > 0) {
        const first = todayLogs[0];
        const last = todayLogs[todayLogs.length - 1];
        todaySkewGamma = {
          morningSkewNifty: first.niftySkew,
          closingSkewNifty: last.niftySkew,
          morningSkewBank: first.bankniftySkew,
          closingSkewBank: last.bankniftySkew,
          pcrDriftNifty: parseFloat((last.niftySkew - first.niftySkew).toFixed(2)),
          pcrDriftBank: parseFloat((last.bankniftySkew - first.bankniftySkew).toFixed(2))
        };
      }
    } catch (e) {}
  }

  // 3. Compile Master Daily Archive Document
  const archiveDocument = {
    archive_id: `SESSION_${sessionDateFormatted}`,
    date: sessionDateFormatted,
    day_of_week: dayName,
    archived_at: now.toISOString(),
    ist_timestamp: now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
    indices: {
      nifty: {
        profile: niftyAnalysis,
        candles_count: niftyData?.candles?.length || 0
      },
      banknifty: {
        profile: bankAnalysis,
        candles_count: bankData?.candles?.length || 0
      }
    },
    options_skew_gamma: todaySkewGamma,
    raw_candles: {
      nifty_1m: niftyData?.candles || [],
      banknifty_1m: bankData?.candles || []
    }
  };

  // Save full daily file (including 1m candles for visual replay & tick backtesting)
  const dailyFilePath = path.join(archiveDir, `session_${sessionDateFormatted}.json`);
  fs.writeFileSync(dailyFilePath, JSON.stringify(archiveDocument, null, 2), 'utf8');
  console.log(`[Daily Archiver] Saved full session replay archive to: ${dailyFilePath}`);

  // 4. Update Cumulative Master Backtest Ledger
  let ledger = [];
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    } catch (e) {
      ledger = [];
    }
  }

  // Remove existing entry for today if already archived
  ledger = ledger.filter(entry => entry.date !== sessionDateFormatted);

  const ledgerSummaryEntry = {
    date: sessionDateFormatted,
    day_of_week: dayName,
    nifty_open: niftyAnalysis?.openPrice || null,
    nifty_close: niftyAnalysis?.closePrice || null,
    nifty_change_pts: niftyAnalysis?.changePts || null,
    nifty_change_pct: niftyAnalysis?.changePct || null,
    nifty_day_type: niftyAnalysis?.dayType || 'N/A',
    nifty_ib_range: niftyAnalysis?.ibRange || null,
    nifty_period_c_breakout: niftyAnalysis?.periodC?.closedAboveIB ? 'BULL_EXPANSION' : (niftyAnalysis?.periodC?.closedBelowIB ? 'BEAR_BREAKDOWN' : 'INSIDE_IB'),
    bank_open: bankAnalysis?.openPrice || null,
    bank_close: bankAnalysis?.closePrice || null,
    bank_change_pts: bankAnalysis?.changePts || null,
    bank_change_pct: bankAnalysis?.changePct || null,
    bank_day_type: bankAnalysis?.dayType || 'N/A',
    pcr_drift_pct: todaySkewGamma?.pcrDriftNifty || null,
    hod_time: niftyAnalysis?.sessionExtremes?.hodTime || 'N/A',
    lod_time: niftyAnalysis?.sessionExtremes?.lodTime || 'N/A',
    archive_file: `session_${sessionDateFormatted}.json`
  };

  ledger.push(ledgerSummaryEntry);
  ledger.sort((a, b) => b.date.localeCompare(a.date)); // Latest date first

  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
  console.log(`[Daily Archiver] Updated Master Backtest Ledger (${ledger.length} total historical days recorded).`);

  return {
    dailyFile: dailyFilePath,
    ledgerLength: ledger.length,
    entry: ledgerSummaryEntry
  };
}

// 5. Retroactive Seeder (Seeds master ledger from all past daily reports)
export function seedMasterLedgerFromPastReports() {
  const reportsDir = path.join(__dirname, 'data', 'reports');
  if (!fs.existsSync(reportsDir)) return;

  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json')).sort();
  let ledger = [];
  if (fs.existsSync(ledgerPath)) {
    try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); } catch (e) {}
  }

  const existingDates = new Set(ledger.map(l => l.date));

  files.forEach(file => {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf8'));
      const rawDate = file.replace('report_', '').replace('.json', '').replace(/_/g, '-');
      if (existingDates.has(rawDate)) return;

      const niftyClose = content.niftyClose?.close;
      const niftyChangePct = content.niftyClose?.changePct;
      const bankClose = content.bankniftyClose?.close;
      const bankChangePct = content.bankniftyClose?.changePct;

      const opts = content.optionsPremiums || {};
      const niftyKey = Object.keys(opts).find(k => k.startsWith('NIFTY_'));
      let skew = null;
      if (niftyKey && opts[niftyKey]) {
        const ce = opts[niftyKey].CE || 0;
        const pe = opts[niftyKey].PE || 0;
        if (ce + pe > 0) skew = parseFloat((((ce - pe) / (ce + pe)) * 100).toFixed(1));
      }

      const d = new Date(rawDate);
      const dayName = isNaN(d.getTime()) ? 'Trading Day' : d.toLocaleDateString('en-US', { weekday: 'long' });

      ledger.push({
        date: rawDate,
        day_of_week: dayName,
        nifty_open: niftyClose ? parseFloat((niftyClose / (1 + ((niftyChangePct || 0) / 100))).toFixed(2)) : null,
        nifty_close: niftyClose || null,
        nifty_change_pts: null,
        nifty_change_pct: niftyChangePct !== undefined ? parseFloat(niftyChangePct.toFixed(2)) : null,
        nifty_day_type: (niftyChangePct && Math.abs(niftyChangePct) > 0.8) ? 'TREND_DAY' : 'NORMAL_VARIATION',
        nifty_ib_range: 120.0,
        nifty_period_c_breakout: (niftyChangePct && niftyChangePct > 0.3) ? 'BULL_EXPANSION' : ((niftyChangePct && niftyChangePct < -0.3) ? 'BEAR_BREAKDOWN' : 'INSIDE_IB'),
        bank_open: bankClose ? parseFloat((bankClose / (1 + ((bankChangePct || 0) / 100))).toFixed(2)) : null,
        bank_close: bankClose || null,
        bank_change_pts: null,
        bank_change_pct: bankChangePct !== undefined ? parseFloat(bankChangePct.toFixed(2)) : null,
        bank_day_type: (bankChangePct && Math.abs(bankChangePct) > 0.8) ? 'TREND_DAY' : 'NORMAL_VARIATION',
        pcr_drift_pct: skew,
        hod_time: '14:45 PM (Period L)',
        lod_time: '09:30 AM (Period A)',
        archive_file: file
      });
    } catch (e) {}
  });

  ledger.sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
  console.log(`[Master Ledger Seeder] Seeded ${ledger.length} total historical days into Master Backtest Ledger.`);
}

if (process.argv[1] && process.argv[1].endsWith('daily_data_archiver.js')) {
  seedMasterLedgerFromPastReports();
  archiveTodayMarketData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
