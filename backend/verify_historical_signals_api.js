import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3002/api/scanner/historical-signals');
    const json = await res.json();
    console.log('API Response status:', res.status);
    console.log('Type of json:', typeof json);
    console.log('Is Array:', Array.isArray(json));
    console.log('JSON value:', json);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

test();
