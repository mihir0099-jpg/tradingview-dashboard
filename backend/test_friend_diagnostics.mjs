async function checkLive() {
  const r = await fetch("https://marshalavi-tradingguru.static.hf.space/live_backend.json?_t=" + Date.now());
  const j = await r.json();
  console.log("Current live_backend.json:", j);
  
  const base = j.backendUrl;
  console.log("Testing base URL:", base);

  const eps = [
    { name: "Health", url: "/health" },
    { name: "Matrix Scanner", url: "/api/scanner/results" },
    { name: "Confluences", url: "/api/scanner/confluences" },
    { name: "Weekly 200 EMA", url: "/api/scanner/weekly-200-ema" },
    { name: "Doji Signals", url: "/api/doji-signals" },
    { name: "Volume Breakouts", url: "/api/volume-breakouts" },
    { name: "Opening Bias / Live Signals", url: "/api/scanner/opening-bias" }
  ];

  for (const ep of eps) {
    try {
      const start = Date.now();
      const res = await fetch(base + ep.url, { signal: AbortSignal.timeout(8000) });
      const elapsed = Date.now() - start;
      const text = await res.text();
      let info = text.substring(0, 100);
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) info = parsed.length + " items";
        else if (parsed.stocks) info = parsed.stocks.length + " stocks";
        else if (parsed.results) info = Object.keys(parsed.results).length + " symbols in results";
        else if (parsed.todaySignals) info = parsed.todaySignals.length + " todaySignals";
        else if (parsed.error) info = "ERROR: " + parsed.error;
        else info = Object.keys(parsed).join(", ");
      } catch(e) {}
      console.log(`[${res.status}] ${ep.name} (${elapsed}ms) -> ${info}`);
    } catch(err) {
      console.log(`[FAIL] ${ep.name} -> ${err.message}`);
    }
  }
}
checkLive();
