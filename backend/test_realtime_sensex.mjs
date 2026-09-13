async function testBrokers() {
  // 1. Groww API for Sensex
  try {
    const res = await fetch("https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/BSE/segment/CASH/INDEX_SENSEX/latest", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const j = await res.json();
    console.log("[Groww API SENSEX]:", JSON.stringify(j));
  } catch(e) {
    console.log("Groww err:", e.message);
  }

  // 2. Google Finance
  try {
    const res = await fetch("https://www.google.com/finance/quote/INDEXBOM:SENSEX", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const html = await res.text();
    const m = html.match(/class="YMlKec fxKbKc">([^<]+)</);
    if (m) console.log("[Google Finance Live]:", m[1]);
    const dMatch = html.match(/Day range<\/div><div class="P6K39c">([^<]+)</);
    if (dMatch) console.log("[Google Finance Day Range]:", dMatch[1]);
  } catch(e) {
    console.log("GF err:", e.message);
  }

  // 3. NSE India for NIFTY vs SENSEX beta ratio
  try {
    const nUrl = "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1m&range=1d";
    const res = await fetch(nUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const j = await res.json();
    const meta = j.chart?.result?.[0]?.meta;
    console.log("[Yahoo Live NIFTY Spot]:", meta?.regularMarketPrice);
  } catch(e) {}
}
testBrokers();
