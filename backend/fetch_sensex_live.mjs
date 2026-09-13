async function fetchAllSensex() {
  console.log("=== FETCHING BSE SENSEX REAL-TIME DATA ===");
  
  // 1. Google Finance
  try {
    const res = await fetch("https://www.google.com/finance/quote/INDEXBOM:SENSEX", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await res.text();
    const match = html.match(/class="YMlKec fxKbKc">([^<]+)</);
    if (match) console.log("[Google Finance] SENSEX Live:", match[1]);
    const rangeMatch = html.match(/Day range<\/div><div class="P6K39c">([^<]+)</);
    if (rangeMatch) console.log("[Google Finance] Day Range:", rangeMatch[1]);
  } catch (e) {
    console.log("GF err:", e.message);
  }

  // 2. Yahoo Finance Real-Time 5m Intraday
  try {
    const yUrl = "https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=5m&range=1d";
    const res = await fetch(yUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const j = await res.json();
    const r = j.chart?.result?.[0];
    if (r) {
      const q = r.indicators.quote[0];
      const meta = r.meta;
      const validHighs = q.high.filter(v => v !== null && v !== undefined);
      const validLows = q.low.filter(v => v !== null && v !== undefined);
      const validCloses = q.close.filter(v => v !== null && v !== undefined);
      const validOpens = q.open.filter(v => v !== null && v !== undefined);
      console.log("[Yahoo Finance] Regular Market Price:", meta.regularMarketPrice);
      console.log("[Yahoo Finance] Prev Close:", meta.chartPreviousClose);
      console.log("[Yahoo Finance] Day Open:", validOpens[0]);
      console.log("[Yahoo Finance] Day High:", Math.max(...validHighs));
      console.log("[Yahoo Finance] Day Low:", Math.min(...validLows));
      console.log("[Yahoo Finance] Current Close:", validCloses[validCloses.length - 1]);
      
      // Compute Initial Balance (9:15 to 10:15 AM = first 12 5-min bars)
      const ibOpens = validOpens.slice(0, 12);
      const ibHighs = validHighs.slice(0, 12);
      const ibLows = validLows.slice(0, 12);
      const ibCloses = validCloses.slice(0, 12);
      const ibHigh = Math.max(...ibHighs);
      const ibLow = Math.min(...ibLows);
      console.log("-----------------------------------------");
      console.log("INITIAL BALANCE (IB: 9:15 - 10:15 AM IST):");
      console.log("IB High: " + ibHigh.toFixed(1));
      console.log("IB Low:  " + ibLow.toFixed(1));
      console.log("IB Range: " + (ibHigh - ibLow).toFixed(1) + " pts");
      console.log("-----------------------------------------");
    }
  } catch (e) {
    console.log("YF err:", e.message);
  }

  // 3. Historical Daily for ATR14 & CPR
  try {
    const yDaily = "https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=1mo";
    const res = await fetch(yDaily, { headers: { "User-Agent": "Mozilla/5.0" } });
    const j = await res.json();
    const r = j.chart?.result?.[0];
    if (r) {
      const ts = r.timestamp;
      const q = r.indicators.quote[0];
      const candles = [];
      for (let i = 0; i < ts.length; i++) {
        if (q.open[i] && q.close[i]) {
          candles.push({
            date: new Date(ts[i]*1000).toISOString().split("T")[0],
            open: q.open[i],
            high: q.high[i],
            low: q.low[i],
            close: q.close[i]
          });
        }
      }
      const yest = candles[candles.length - 2];
      console.log("Yesterday (" + yest.date + "): Open=" + yest.open.toFixed(1) + ", High=" + yest.high.toFixed(1) + ", Low=" + yest.low.toFixed(1) + ", Close=" + yest.close.toFixed(1));
      
      let sumTR = 0;
      for (let i = candles.length - 15; i < candles.length - 1; i++) {
        const c = candles[i];
        const p = candles[i - 1];
        const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
        sumTR += tr;
      }
      const atr14 = sumTR / 14;
      console.log("SENSEX 14-Day ATR: " + atr14.toFixed(1) + " pts");

      const H = yest.high;
      const L = yest.low;
      const C = yest.close;
      const P = (H + L + C) / 3;
      const BCP = (H + L) / 2;
      const TCP = (P - BCP) + P;
      console.log("CPR: Pivot=" + P.toFixed(1) + ", BCP=" + Math.min(BCP, TCP).toFixed(1) + ", TCP=" + Math.max(BCP, TCP).toFixed(1));
      
      const R = H - L;
      const r4 = C + R * 1.1 / 2;
      const r3 = C + R * 1.1 / 4;
      const s3 = C - R * 1.1 / 4;
      const s4 = C - R * 1.1 / 2;
      console.log("Camarilla: R4=" + r4.toFixed(1) + ", R3=" + r3.toFixed(1) + ", S3=" + s3.toFixed(1) + ", S4=" + s4.toFixed(1));
    }
  } catch (e) {
    console.log("Daily err:", e.message);
  }
}
fetchAllSensex();
