import fetch from 'node-fetch';

async function check() {
  try {
    const res = await fetch('http://localhost:3002/api/options/chain?symbol=NSE:NIFTY');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data keys:', Object.keys(data));
    if (data.error) {
      console.log('Error payload:', data);
    } else {
      console.log('underlyingPrice:', data.underlyingPrice);
      console.log('strikes sample:', data.data.slice(0, 3));
    }
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

check();
