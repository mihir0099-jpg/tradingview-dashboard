import fetch from 'node-fetch';

async function test() {
  const start = performance.now();
  const res = await fetch('http://localhost:3002/api/scanner/opening-bias');
  const json = await res.json();
  const end = performance.now();
  console.log(`Response status: ${res.status}`);
  console.log(`Response time: ${(end - start).toFixed(2)} ms`);
}

test();
