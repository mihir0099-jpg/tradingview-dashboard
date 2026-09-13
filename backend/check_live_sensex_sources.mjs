async function run() {
  console.log("Checking live SENSEX sources...");

  // 1. BSE India direct API
  try {
    const res = await fetch("https://api.bseindia.com/BseIndiaAPI/api/Sensex/w", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://www.bseindia.com/"
      }
    });
    const data = await res.json();
    console.log("[BSE India API]:", JSON.stringify(data));
  } catch(e) {
    console.log("[BSE India Error]:", e.message);
  }

  // 2. Moneycontrol Indices API
  try {
    const res = await fetch("https://priceapi.moneycontrol.com/pricefeed/bse/equitycash/BSX", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const data = await res.json();
    console.log("[Moneycontrol]: Price=" + data?.data?.pricecurrent + ", High=" + data?.data?.HP + ", Low=" + data?.data?.LP + ", Open=" + data?.data?.OPN + ", PrevClose=" + data?.data?.priceprevclose);
  } catch(e) {
    console.log("[Moneycontrol Error]:", e.message);
  }

  // 3. Google Finance HTML search
  try {
    const res = await fetch("https://www.google.com/finance/quote/INDEXBOM:SENSEX", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const text = await res.text();
    const idx = text.indexOf("INDEXBOM:SENSEX");
    if (idx !== -1) {
      const slice = text.substring(idx, idx + 2000);
      const m = slice.match(/([0-9]{2},[0-9]{3}\.[0-9]{2})/);
      if (m) console.log("[Google Finance Found]:", m[1]);
    }
  } catch(e) {
    console.log("[Google Finance Error]:", e.message);
  }

  // 4. TradingView bridge from local backend (port 3002)
  try {
    const res = await fetch("http://localhost:3002/api/live-market");
    const data = await res.json();
    console.log("[Local Backend Live Indices]:", Object.keys(data || {}));
  } catch(e) {
    console.log("[Local Backend Error]:", e.message);
  }
}
run();
