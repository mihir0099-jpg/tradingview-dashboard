import fetch from 'node-fetch';

async function query() {
  try {
    const resD = await fetch('http://localhost:3002/api/doji-signals?slot=first_5min');
    const dataD = await resD.json();
    console.log('Doji response stocks list length:', dataD.stocks.length);
    console.log('Doji response allDojiStocks list length:', dataD.allDojiStocks.length);
    if (dataD.stocks.length > 0) {
      console.log('Sample Doji Stock:', dataD.stocks[0]);
    }

    const resO = await fetch('http://localhost:3002/api/options/chain?symbol=NSE:NIFTY');
    const dataO = await resO.json();
    console.log('Options chain underlyingPrice:', dataO.underlyingPrice);
    console.log('Options chain data array length:', dataO.data.length);
    if (dataO.data.length > 0) {
      console.log('Sample Options Chain Strike:', dataO.data[5]);
    }
  } catch (err) {
    console.error('Failed to query backend:', err.message);
  }
}

query();
