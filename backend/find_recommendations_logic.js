import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/server.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('recommendations') || line.includes('alerts') || line.includes('recommend') || line.includes('tradeAlerts') || line.includes('TradeRecommendation')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
