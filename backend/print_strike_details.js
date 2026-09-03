import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3002/api/scanner/opening-bias');
    const json = await res.json();
    console.log('API Response status:', res.status);
    console.log('NIFTY straddleSkew keys:', Object.keys(json.nifty?.straddleSkew || {}));
    console.log('NIFTY itmStrike details:', json.nifty?.straddleSkew?.itmStrike);
    console.log('NIFTY otmStrike details:', json.nifty?.straddleSkew?.otmStrike);
    console.log('BANKNIFTY itmStrike details:', json.banknifty?.straddleSkew?.itmStrike);
    console.log('BANKNIFTY otmStrike details:', json.banknifty?.straddleSkew?.otmStrike);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
