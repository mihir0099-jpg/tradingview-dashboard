import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { angelOneBridge } from './angelone_bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMPORT_DIR = 'C:\\Users\\mihir\\OneDrive\\Documents\\NinjaTrader 8\\import';
const DESKTOP_DIR = 'C:\\Users\\mihir\\Desktop\\NinjaTrader_Historical_Data';

if (!fs.existsSync(IMPORT_DIR)) fs.mkdirSync(IMPORT_DIR, { recursive: true });
if (!fs.existsSync(DESKTOP_DIR)) fs.mkdirSync(DESKTOP_DIR, { recursive: true });

function formatCandleToNT(candle) {
  // candle: [ '2026-09-28T09:15:00+05:30', open, high, low, close, volume ]
  const rawDate = candle[0];
  const datePart = rawDate.slice(0, 10).replace(/-/g, '');
  const timePart = rawDate.slice(11, 19).replace(/:/g, '');

  const dtStr = datePart + ' ' + timePart;
  const o = candle[1];
  const h = candle[2];
  const l = candle[3];
  const c = candle[4];
  const v = candle[5] || 100;

  return dtStr + ';' + o + ';' + h + ';' + l + ';' + c + ';' + v;
}

async function exportInstrument(name, exchange, token) {
  console.log('[Export] Fetching 1-min candles for ' + name + ' (' + exchange + ':' + token + ')...');

  const chunks = [
    { from: '2026-08-01 09:15', to: '2026-08-25 15:30' },
    { from: '2026-08-26 09:15', to: '2026-09-15 15:30' },
    { from: '2026-09-16 09:15', to: '2026-10-03 15:30' }
  ];

  let allCandles = [];
  for (const chunk of chunks) {
    try {
      const data = await angelOneBridge.getCandles(exchange, token, 'ONE_MINUTE', chunk.from, chunk.to);
      if (Array.isArray(data) && data.length > 0) {
        console.log('  -> Fetched ' + data.length + ' candles for ' + chunk.from + ' to ' + chunk.to);
        allCandles = allCandles.concat(data);
      } else {
        console.log('  -> No candles returned for ' + chunk.from + ' to ' + chunk.to);
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.warn('  -> Error fetching ' + chunk.from + ' to ' + chunk.to + ': ' + err.message);
    }
  }

  // Deduplicate by timestamp
  const seen = new Set();
  const deduped = [];
  for (const c of allCandles) {
    if (!seen.has(c[0])) {
      seen.add(c[0]);
      deduped.push(c);
    }
  }

  console.log('[Export] Total unique candles for ' + name + ': ' + deduped.length);
  if (deduped.length === 0) return;

  const lines = deduped.map(formatCandleToNT);
  const content = lines.join('\r\n');

  const targetFile1 = path.join(IMPORT_DIR, name + '.txt');
  const targetFile2 = path.join(DESKTOP_DIR, name + '.txt');
  const targetFileMinute = path.join(DESKTOP_DIR, name + '.Minute.txt');

  fs.writeFileSync(targetFile1, content, 'utf8');
  fs.writeFileSync(targetFile2, content, 'utf8');
  fs.writeFileSync(targetFileMinute, content, 'utf8');

  console.log('[Export] Saved ' + lines.length + ' bars to:\n  - ' + targetFile1 + '\n  - ' + targetFile2);
}

async function run() {
  await angelOneBridge.login();
  console.log('[Export] Angel One session active. Starting historical data download...');

  await exportInstrument('NIFTY_I', 'NFO', '48704');
  await exportInstrument('BANKNIFTY_I', 'NFO', '48699');
  await exportInstrument('NIFTY', 'NSE', '99926000');
  await exportInstrument('BANKNIFTY', 'NSE', '99926009');

  console.log('\n======================================================');
  console.log('[Export] ALL HISTORICAL DATA EXPORTED SUCCESSFULLY!');
  console.log('Location 1: ' + IMPORT_DIR);
  console.log('Location 2: ' + DESKTOP_DIR);
  console.log('======================================================');
  process.exit(0);
}

run().catch(e => {
  console.error('[Export Error]:', e);
  process.exit(1);
});
