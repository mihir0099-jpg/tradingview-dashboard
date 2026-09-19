// backfill_footprint_signals.mjs
// Run: node backend/backfill_footprint_signals.mjs
import { analyseCompletedCandle, getLiveFootprintSignals, getFootprintSummary, getIcebergFloors } from './footprint_ml_reader.js';
import fs from 'fs';

const state = JSON.parse(fs.readFileSync('C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/scratch/of_state_raw.json'));
const meta = { symbol: 'NIFTYFUT', groupSize: 1.0 };

console.log('Analysing', state.candles.length, 'footprint candles from today...\n');
for (const c of state.candles) {
  analyseCompletedCandle(c, meta);
}

const summary = getFootprintSummary();
console.log('=== FOOTPRINT ML SUMMARY ===');
console.log('Total Signals Found:', summary.totalSignals);
console.log('Session VWAP:', summary.sessionVwap);
console.log('Signal Types:', JSON.stringify(summary.byType, null, 2));
console.log('');

const floors = getIcebergFloors();
if (floors.length > 0) {
  console.log('=== ICEBERG FLOORS DETECTED ===');
  floors.forEach(f => {
    console.log(`  ${f.side === 'BUY' ? '🟢' : '🔴'} ₹${f.price} | Absorbed: ${f.totalAbsorbed} contracts | Hits: ${f.hits} candles | First: ${f.firstSeen} → Last: ${f.lastSeen}`);
  });
  console.log('');
}

const signals = getLiveFootprintSignals(30);
if (signals.length === 0) {
  console.log('No signals generated — candles may lack enough bid/ask volume from seeded data.');
} else {
  console.log('=== ALL SIGNALS (latest first) ===');
  signals.forEach(s => {
    const icon = s.data.action?.includes('CALL') ? '🟢' : '🔴';
    console.log(`${icon} [${s.timeStr}][Period ${s.period}] ${s.type}`);
    console.log(`   Conf: ${s.data.confidence}% | Close: ${s.candleClose} | Delta: ${s.candleDelta} | Vol: ${s.candleVolume}`);
    console.log(`   ${s.data.message}`);
    console.log('');
  });
}
