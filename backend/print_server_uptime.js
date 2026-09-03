import fetch from 'node-fetch';

async function check() {
  try {
    const res = await fetch('http://localhost:3002/api/scanner/results?timeframe=5');
    const data = await res.json();
    console.log('lastScanTime:', data.lastScanTime);
    console.log('isScanning:', data.isScanning);
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

check();
