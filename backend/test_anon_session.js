import '../backend/patch_ws.js';
import { createSession, createChart, createSeries } from '@ch99q/twc';

async function test() {
  try {
    console.log('Testing createSession()...');
    const s = await createSession();
    console.log('Success! Session object:', typeof s);
    const chart = await createChart(s);
    const sym = await chart.resolve('NIFTY', 'NSE');
    console.log('Resolved symbol:', sym);
    const series = await createSeries(s, chart, sym, '5', 10);
    series.on('data', (d) => {
      console.log('CANDLE DATA RECEIVED:', d.length);
      process.exit(0);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
