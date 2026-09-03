import fetch from 'node-fetch';

async function check() {
  try {
    const res = await fetch('http://localhost:3002/api/options/chain?symbol=NSE:AXISBANK');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('AXISBANK UnderlyingPrice:', data.underlyingPrice);
    console.log('AXISBANK Expiries found:', data.expiries);
    console.log('AXISBANK Selected Expiry:', data.selectedExpiry);
    console.log('AXISBANK strikes sample:', data.data.slice(0, 3));
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

check();
