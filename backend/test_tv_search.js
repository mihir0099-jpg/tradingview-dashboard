import fetch from 'node-fetch';

async function main() {
  const query = 'NIFTY';
  const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(query)}&type=options&country=IN`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.tradingview.com/',
      'Origin': 'https://www.tradingview.com'
    }
  });
  const data = await res.json();
  console.log('Results (first 10):');
  data.slice(0, 10).forEach(item => {
    console.log(`  Symbol: ${item.symbol} | Description: ${item.description}`);
  });
}
main();
