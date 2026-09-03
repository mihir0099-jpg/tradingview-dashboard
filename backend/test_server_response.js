import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3002/');
    console.log('Root HTML status:', res.status);
    const htmlText = await res.text();
    console.log('HTML preview (first 200 chars):', htmlText.slice(0, 200));

    // Get asset script source from the HTML
    const match = htmlText.match(/src="([^"]+)"/);
    if (match) {
      const assetUrl = `http://localhost:3002${match[1]}`;
      console.log('Fetching asset script:', assetUrl);
      const assetRes = await fetch(assetUrl);
      console.log('Asset status:', assetRes.status);
      console.log('Asset Content-Type:', assetRes.headers.get('content-type'));
    } else {
      console.log('No script tag found in HTML');
    }
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();
