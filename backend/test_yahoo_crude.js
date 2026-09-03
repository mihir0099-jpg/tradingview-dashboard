import fetch from 'node-fetch';

async function search() {
  const query = 'crude';
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const json = await res.json();
  console.log('Yahoo Search Results:', json.quotes?.slice(0, 8).map(q => ({
    symbol: q.symbol,
    shortname: q.shortname,
    exchange: q.exchange,
    quoteType: q.quoteType
  })));
}

search();
