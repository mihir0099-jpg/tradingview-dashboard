import fetch from 'node-fetch';

async function check() {
  try {
    const res5 = await fetch('http://localhost:3002/api/scanner/results?timeframe=5');
    const data5 = await res5.json();
    console.log('--- 5 Min Timeframe Counts ---');
    Object.keys(data5.results).forEach(lvl => {
      console.log(`${lvl}: ${data5.results[lvl].length} stocks`);
    });

    const resD = await fetch('http://localhost:3002/api/scanner/results?timeframe=D');
    const dataD = await resD.json();
    console.log('\n--- 1 Day Timeframe Counts ---');
    Object.keys(dataD.results).forEach(lvl => {
      console.log(`${lvl}: ${dataD.results[lvl].length} stocks`);
    });
  } catch (e) {
    console.error(e.message);
  }
}

check();
