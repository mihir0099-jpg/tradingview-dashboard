import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/App.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('tvStreamer.subscribe') || line.includes('tvStreamer.unsubscribe')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
    // Print 10 lines before and after
    const start = Math.max(0, idx - 10);
    const end = Math.min(lines.length, idx + 10);
    console.log('--- SURROUNDINGS ---');
    console.log(lines.slice(start, end).join('\n'));
    console.log('-------------------');
  }
});
