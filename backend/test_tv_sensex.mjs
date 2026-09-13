import { TradingViewBridge } from "./tradingview.js";

async function run() {
  const bridge = new TradingViewBridge();
  try {
    await bridge.subscribeSymbol("BSE:SENSEX", "5", (data) => {
      console.log("isSnapshot:", data.isSnapshot, "candles count:", data.candles?.length);
      if (data.candles && data.candles.length > 0) {
        data.candles.forEach(c => {
          console.log("CANDLE: " + new Date(c.time * 1000).toLocaleTimeString("en-IN", {timeZone: "Asia/Kolkata"}) + " | O=" + c.open + " H=" + c.high + " L=" + c.low + " C=" + c.close);
        });
      }
    }, (err) => {
      console.log("TV error:", err);
    }, 20);
  } catch (e) {
    console.log("Err:", e.message);
  }
}
run();
