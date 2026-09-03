import { TradingViewBridge } from './tradingview.js';
import { createChart } from '@ch99q/twc';

async function run() {
  console.log('Testing MCX resolve...');
  const tvBridge = new TradingViewBridge();
  try {
    const session = await tvBridge.getSession();
    const chart = await createChart(session);
    
    console.log('Attempting to resolve MCX:CRUDEOIL1!...');
    const start = Date.now();
    
    // Set a timeout since it might hang
    const timeout = setTimeout(() => {
      console.log('Resolve HUNG after 5 seconds!');
      process.exit(1);
    }, 5000);

    const resolved = await chart.resolve('CRUDEOIL1!', 'MCX');
    clearTimeout(timeout);
    console.log(`Resolved successfully in ${Date.now() - start}ms!`, resolved);
    process.exit(0);
  } catch (err) {
    console.error('Resolve Failed:', err);
    process.exit(1);
  }
}

run();
