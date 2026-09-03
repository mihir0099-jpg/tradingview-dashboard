import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/nifty_5min_candles.json';
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  const candles = JSON.parse(content);
  console.log(`Candles in file: ${candles.length}`);
  console.log('First candle time:', new Date(candles[0].time * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('Last candle time:', new Date(candles[candles.length - 1].time * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
} else {
  console.log('File not found');
}
