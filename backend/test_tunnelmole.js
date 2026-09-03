import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://eqbmlr-ip-152-59-50-243.tunnelmole.net/');
    console.log('Status:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    const text = await res.text();
    console.log('Text (first 300 chars):', text.slice(0, 300));
  } catch (err) {
    console.error('Failed to fetch Tunnelmole URL:', err.message);
  }
}

test();
