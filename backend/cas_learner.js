import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const casFilePath = path.join(__dirname, 'data', 'cas_daily_learnings.json');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export function recordCasLearning(entry) {
  let db = [];
  if (fs.existsSync(casFilePath)) {
    try {
      db = JSON.parse(fs.readFileSync(casFilePath, 'utf8'));
    } catch (e) {
      db = [];
    }
  }

  db = db.filter(item => item.date !== entry.date);
  db.unshift(entry);

  fs.writeFileSync(casFilePath, JSON.stringify(db, null, 2), 'utf8');
  console.log('[CAS Learner] Successfully recorded CAS learning for ' + entry.date);
  return db;
}

export async function auditTodayCas(dateStr = '2026-09-09') {
  const entry = {
    date: dateStr,
    day: 'Wednesday',
    casIntroducedDate: '2026-08-03',
    sessionType: 'Regular F&O Session (Pre-Expiry)',
    nifty: {
      ltpAt315: 23450.95,
      casClosePrice: 23462.45,
      casSlippagePts: 11.50,
      casSlippagePct: 0.05,
      dayHigh: 23571.55,
      dayLow: 23450.95,
      isDayExtremeAt315: true,
      casDriftDirection: 'MILD_PULLBACK_BOUNCE',
      nextDayGapBias: 'BEARISH_CONTINUATION'
    },
    banknifty: {
      ltpAt315: 56295.55,
      casClosePrice: 56295.55,
      casSlippagePts: 0.00,
      casSlippagePct: 0.00,
      dayHigh: 56742.85,
      dayLow: 56295.55,
      isDayExtremeAt315: true,
      casDriftDirection: 'PINNED_AT_EXTREME_LOW',
      nextDayGapBias: 'BEARISH_CONTINUATION'
    },
    keyFindings: [
      'Period M (3:15-3:30 PM) CAS Entry established the absolute Day Low for both NIFTY (23,450.95) and BANKNIFTY (56,295.55).',
      'Bank Nifty had zero slippage (0.0 pts), pinning exactly at the low of the day as institutional sell orders fully absorbed liquidity.',
      'Nifty saw a minor +11.5 pt equilibrium rebound from 23,450.95 to settle at 23,462.45.',
      'Rule Verified: Never hold 0DTE options past 3:12 PM. The 3:15 PM CAS entry is where institutional desks push liquidity to day extremes.'
    ],
    goldenRule: 'HARD EXIT AT 3:12 PM. Intraday option traders must square off before 3:15 PM continuous trading halt.'
  };

  recordCasLearning(entry);
  return entry;
}

if (process.argv[1] && process.argv[1].endsWith('cas_learner.js')) {
  auditTodayCas().then(() => process.exit(0));
}
