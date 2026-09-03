import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://eqbmlr-ip-152-59-50-243.tunnelmole.net/assets/index-R5qrrSTH.js');
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Length:', text.length);
    console.log('Preview:', text.slice(0, 200));
  } catch (err) {
    console.error('Failed to fetch script:', err.message);
  }
}

test();
