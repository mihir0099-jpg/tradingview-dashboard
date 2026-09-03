import fetch from 'node-fetch';

async function query() {
  try {
    const res5 = await fetch('http://localhost:3002/api/scanner/results?timeframe=5');
    const data5 = await res5.json();
    console.log('5m Level 3 results:', data5.results.level3);

    const resD = await fetch('http://localhost:3002/api/scanner/results?timeframe=D');
    const dataD = await resD.json();
    console.log('Daily Level 3 results:', dataD.results.level3);
  } catch (err) {
    console.error('Failed to query backend:', err.message);
  }
}

query();
