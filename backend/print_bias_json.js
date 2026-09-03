import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3002/api/scanner/opening-bias');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

test();
