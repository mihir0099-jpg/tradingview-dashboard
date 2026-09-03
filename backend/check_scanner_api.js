import fetch from 'node-fetch';

async function checkScanner() {
  try {
    const res = await fetch('http://localhost:3002/api/scanner/results?timeframe=5');
    if (res.ok) {
      const data = await res.json();
      console.log('lastScanTime:', data.lastScanTime);
      console.log('isScanning:', data.isScanning);
      console.log('results keys:', Object.keys(data.results));
      console.log('level3 results count:', data.results.level3?.length || 0);
    } else {
      console.log('Status code:', res.status);
    }
  } catch (err) {
    console.error('Error fetching scanner results:', err.message);
  }
}

checkScanner();
