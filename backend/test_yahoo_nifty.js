import fetch from 'node-fetch';

async function test() {
  try {
    const resNifty = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1m&range=1d');
    const jsonNifty = await resNifty.json();
    const metaNifty = jsonNifty.chart.result[0].meta;
    console.log('Yahoo Nifty Spot:', metaNifty.regularMarketPrice);
    
    const resBank = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEBANK?interval=1m&range=1d');
    const jsonBank = await resBank.json();
    const metaBank = jsonBank.chart.result[0].meta;
    console.log('Yahoo Bank Nifty Spot:', metaBank.regularMarketPrice);
  } catch (err) {
    console.error('Yahoo Fetch failed:', err);
  }
}

test();
