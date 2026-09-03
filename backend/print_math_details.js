import fetch from 'node-fetch';

async function check() {
  try {
    const res = await fetch('http://localhost:3002/api/options/chain?symbol=NSE:BANKNIFTY');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('BANKNIFTY UnderlyingPrice:', data.underlyingPrice);
    console.log('BANKNIFTY Expiries found:', data.expiries);
    console.log('BANKNIFTY Selected Expiry:', data.selectedExpiry);
    console.log('BANKNIFTY strikes sample:', data.data.slice(0, 3));
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

check();
