import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3002/');
    const text = await res.text();
    console.log('Server HTML Response:');
    const match = text.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
    if (match) {
      console.log('Referenced script:', match[1]);
    } else {
      console.log('Script tag not found in response HTML!');
    }
  } catch (err) {
    console.error('Server fetch failed:', err);
  }
}

test();
