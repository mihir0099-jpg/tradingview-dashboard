async function testHisTabs() {
  const base = "https://occasionally-yorkshire-wonder-retro.trycloudflare.com";
  console.log("Testing Marshalavi TradingGuru exact tabs against backend:", base);

  const tabs = [
    { name: "1. Real-Time Matrix Scanner", url: "/api/scanner/results" },
    { name: "2. Level Confluences", url: "/api/scanner/confluences" },
    { name: "3. Weekly 200 EMA", url: "/api/scanner/weekly-200-ema" },
    { name: "4. Doji Signals", url: "/api/doji-signals" },
    { name: "5. Volume Breakouts", url: "/api/volume-breakouts" },
    { name: "6. Opening Bias", url: "/api/scanner/opening-bias" },
    { name: "7. Presets / Search", url: "/api/symbols/presets" }
  ];

  for (const t of tabs) {
    try {
      const start = Date.now();
      const res = await fetch(base + t.url, { signal: AbortSignal.timeout(10000) });
      const elapsed = Date.now() - start;
      const text = await res.text();
      let count = "unknown";
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j)) count = j.length + " items";
        else if (j.stocks) count = j.stocks.length + " stocks";
        else if (j.results) count = Object.keys(j.results).length + " results";
        else if (j.confluences) count = j.confluences.length + " confluences";
        else count = Object.keys(j).length + " keys";
      } catch(e) {
        count = text.substring(0, 50);
      }
      console.log(`[${res.status}] ${t.name} (${elapsed}ms) -> ${count}`);
    } catch(err) {
      console.log(`[FAIL] ${t.name} -> ${err.message}`);
    }
  }
}
testHisTabs();
