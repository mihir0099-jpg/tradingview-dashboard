import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/server.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('C57') || line.includes('P57') || line.includes('260825') || line.includes('live_math') || line.includes('getLiveOptionPrice')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
