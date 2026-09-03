import { TradingViewBridge } from './tradingview.js';
import { fetchCandlesForSymbol, getExpiriesForSymbol } from './scanner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tvBridge = new TradingViewBridge();

async function trackFullDaySkewAndGamma() {
  try {
    const spotCandles = await fetchCandlesForSymbol(tvBridge, 'NSE:NIFTY', '5', 100);
    
    const todayStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    
    const todaySpot = spotCandles.filter(c => {
      const d = new Date(c.time * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      return d === todayStr;
    }).sort((a, b) => a.time - b.time);
    
    if (todaySpot.length === 0) {
      console.log(`[Full-Day Tracker ${nowTimeStr}] Waiting for today's market candles...`);
      return;
    }
    
    const lastSpot = todaySpot[todaySpot.length - 1].close;
    const currentAtmStrike = Math.round(lastSpot / 50) * 50;
    const otmStrike = currentAtmStrike + 50;
    const itmStrike = currentAtmStrike - 50;
    
    const expiries = getExpiriesForSymbol('NSE:NIFTY');
    const activeExpiryCode = expiries && expiries.length > 0 ? expiries[0].code : '260903';
    
    const atmCallSym = `NSE:NIFTY${activeExpiryCode}C${currentAtmStrike}`;
    const atmPutSym  = `NSE:NIFTY${activeExpiryCode}P${currentAtmStrike}`;
    
    const otmCallSym = `NSE:NIFTY${activeExpiryCode}C${otmStrike}`;
    const otmPutSym  = `NSE:NIFTY${activeExpiryCode}P${otmStrike}`;
    
    const itmCallSym = `NSE:NIFTY${activeExpiryCode}C${itmStrike}`;
    const itmPutSym  = `NSE:NIFTY${activeExpiryCode}P${itmStrike}`;
    
    const [atmCallC, atmPutC, otmCallC, otmPutC, itmCallC, itmPutC] = await Promise.all([
      fetchCandlesForSymbol(tvBridge, atmCallSym, '5', 100).catch(() => []),
      fetchCandlesForSymbol(tvBridge, atmPutSym, '5', 100).catch(() => []),
      fetchCandlesForSymbol(tvBridge, otmCallSym, '5', 100).catch(() => []),
      fetchCandlesForSymbol(tvBridge, otmPutSym, '5', 100).catch(() => []),
      fetchCandlesForSymbol(tvBridge, itmCallSym, '5', 100).catch(() => []),
      fetchCandlesForSymbol(tvBridge, itmPutSym, '5', 100).catch(() => [])
    ]);
    
    const atmCallMap = new Map(atmCallC.map(c => [c.time, c]));
    const atmPutMap  = new Map(atmPutC.map(c => [c.time, c]));
    const otmCallMap = new Map(otmCallC.map(c => [c.time, c]));
    const otmPutMap  = new Map(otmPutC.map(c => [c.time, c]));
    const itmCallMap = new Map(itmCallC.map(c => [c.time, c]));
    const itmPutMap  = new Map(itmPutC.map(c => [c.time, c]));
    
    const timeline = [];
    
    todaySpot.forEach(spot => {
      const timeStr = new Date(spot.time * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
      
      const atmC = atmCallMap.get(spot.time);
      const atmP = atmPutMap.get(spot.time);
      const otmC = otmCallMap.get(spot.time);
      const otmP = otmPutMap.get(spot.time);
      const itmC = itmCallMap.get(spot.time);
      const itmP = itmPutMap.get(spot.time);
      
      const atmCLtp = atmC ? atmC.close : null;
      const atmPLtp = atmP ? atmP.close : null;
      const otmCLtp = otmC ? otmC.close : null;
      const otmPLtp = otmP ? otmP.close : null;
      const itmCLtp = itmC ? itmC.close : null;
      const itmPLtp = itmP ? itmP.close : null;
      
      const atmCVol = atmC ? (atmC.volume || 0) : 0;
      const atmPVol = atmP ? (atmP.volume || 0) : 0;
      
      const atmSkew = (atmCLtp && atmPLtp && (atmCLtp + atmPLtp) > 0) ? ((atmCLtp - atmPLtp) / (atmCLtp + atmPLtp)) * 100 : 0;
      const otmSkew = (otmCLtp && otmPLtp && (otmCLtp + otmPLtp) > 0) ? ((otmCLtp - otmPLtp) / (otmCLtp + otmPLtp)) * 100 : 0;
      const itmSkew = (itmCLtp && itmPLtp && (itmCLtp + itmPLtp) > 0) ? ((itmCLtp - itmPLtp) / (itmCLtp + itmPLtp)) * 100 : 0;
      
      const straddlePrice = (atmCLtp && atmPLtp) ? (atmCLtp + atmPLtp) : 0;
      const gammaRatio = atmPVol > 0 ? (atmCVol / atmPVol) : 1.0;
      
      timeline.push({
        time: timeStr,
        spot_open: spot.open,
        spot_high: spot.high,
        spot_low: spot.low,
        spot_close: spot.close,
        atm_strike: currentAtmStrike,
        atm_call: atmCLtp,
        atm_put: atmPLtp,
        straddle: straddlePrice,
        atm_skew: parseFloat(atmSkew.toFixed(1)),
        otm_skew: parseFloat(otmSkew.toFixed(1)),
        itm_skew: parseFloat(itmSkew.toFixed(1)),
        gamma_ratio: parseFloat(gammaRatio.toFixed(2)),
        atm_call_vol: atmCVol,
        atm_put_vol: atmPVol
      });
    });
    
    const firstCandle = timeline[0];
    const lastCandle  = timeline[timeline.length - 1];
    
    const totalSpotMove = lastCandle.spot_close - firstCandle.spot_open;
    const skewShift = lastCandle.atm_skew - firstCandle.atm_skew;
    const avgGamma = timeline.reduce((a, b) => a + b.gamma_ratio, 0) / timeline.length;
    
    let patternClassification = "Neutral / Range-Bound";
    let patternDescription = "";
    
    if (skewShift > 5.0 && totalSpotMove > 0) {
      patternClassification = "Bullish Accumulation (Aggressive Put Writing)";
      patternDescription = `ATM Skew shifted +${skewShift.toFixed(1)}% higher while Spot moved +${totalSpotMove.toFixed(1)} pts. Put writers building strong floor support.`;
    } else if (skewShift < -5.0 && totalSpotMove < 0) {
      patternClassification = "Bearish Inflow (Aggressive Call Writing)";
      patternDescription = `ATM Skew expanded -${Math.abs(skewShift).toFixed(1)}% downward while Spot dropped ${totalSpotMove.toFixed(1)} pts. Heavy Call overhead resistance.`;
    } else if (Math.abs(skewShift) < 3.0) {
      patternClassification = "Vol Squeeze / Equilibrium";
      patternDescription = `ATM Skew remained flat (drift ${skewShift.toFixed(1)}%), reflecting Straddle theta decay & balanced option writing.`;
    }
    
    const output = {
      date: todayStr,
      last_updated: nowTimeStr,
      symbol: 'NSE:NIFTY',
      total_candles: timeline.length,
      first_candle_time: firstCandle.time,
      last_candle_time: lastCandle.time,
      spot_start: firstCandle.spot_open,
      spot_end: lastCandle.spot_close,
      spot_change: parseFloat(totalSpotMove.toFixed(2)),
      atm_skew_start: firstCandle.atm_skew,
      atm_skew_end: lastCandle.atm_skew,
      skew_shift: parseFloat(skewShift.toFixed(1)),
      avg_gamma_ratio: parseFloat(avgGamma.toFixed(2)),
      pattern: patternClassification,
      pattern_description: patternDescription,
      timeline: timeline
    };
    
    const jsonPath = path.join(__dirname, 'data', 'today_full_day_skew_gamma_report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
    
    // Also format and write to the artifact file
    let mdContent = `# Intraday Skew, Gamma & Spot Pattern Tracking Report\n`;
    mdContent += `**Date**: ${todayStr} | **Last Updated**: ${nowTimeStr} IST\n`;
    mdContent += `**Symbol**: NIFTY 50 (\`NSE:NIFTY\`) | **Active Series**: Weekly Expiry (\`${activeExpiryCode}\`)\n\n`;
    mdContent += `---\n\n`;
    mdContent += `## 📊 Live Intraday Data Matrix (${timeline.length} Candles Recorded)\n\n`;
    mdContent += `| Time (IST) | Nifty Spot | ATM Strike | ATM Skew% (${currentAtmStrike}) | OTM Skew% (${otmStrike}) | ITM Skew% (${itmStrike}) | Gamma Ratio | ATM Straddle ₹ | Call Vol | Put Vol |\n`;
    mdContent += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
    
    timeline.forEach(t => {
      mdContent += `| **${t.time}** | ₹${t.spot_close.toFixed(2)} | ${t.atm_strike} | **${t.atm_skew}%** | ${t.otm_skew}% | ${t.itm_skew}% | ${t.gamma_ratio}x | ₹${t.straddle.toFixed(2)} | ${t.atm_call_vol.toLocaleString()} | ${t.atm_put_vol.toLocaleString()} |\n`;
    });
    
    mdContent += `\n---\n\n`;
    mdContent += `## 🔍 Structural Pattern Summary\n`;
    mdContent += `* **Total Spot Net Move**: ${totalSpotMove > 0 ? '+' : ''}${totalSpotMove.toFixed(2)} pts (₹${firstCandle.spot_open} ➔ ₹${lastCandle.spot_close})\n`;
    mdContent += `* **ATM Skew Velocity Shift**: ${firstCandle.atm_skew}% ➔ ${lastCandle.atm_skew}% (${skewShift > 0 ? '+' : ''}${skewShift.toFixed(1)}%)\n`;
    mdContent += `* **Average Gamma Ratio**: ${avgGamma.toFixed(2)}x\n`;
    mdContent += `* **Detected Pattern**: **${patternClassification}**\n`;
    mdContent += `* **Analysis**: ${patternDescription}\n`;

    const artifactPath = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/intraday_skew_gamma_pattern_report.md';
    fs.writeFileSync(artifactPath, mdContent);
    
    console.log(`[Full-Day Tracker ${nowTimeStr}] Logged ${timeline.length} candles. Current Spot: ₹${lastCandle.spot_close}, Skew: ${lastCandle.atm_skew}%, Pattern: ${patternClassification}`);
  } catch (err) {
    console.error('[Full-Day Tracker Error]:', err.message);
  }
}

// Initial execution
await new Promise(r => setTimeout(r, 2000));
trackFullDaySkewAndGamma();

// Loop every 60 seconds continuously until 15:55 IST
const intervalId = setInterval(() => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  if (timeStr > '15:55') {
    console.log('[Full-Day Tracker] Market session completed for today. Daemon exiting.');
    clearInterval(intervalId);
    process.exit(0);
  } else {
    trackFullDaySkewAndGamma();
  }
}, 60000);
