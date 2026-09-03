import fs from 'fs';

const serverContent = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/server.js', 'utf8');
const serverLines = serverContent.split('\n');
serverLines.forEach((line, idx) => {
  if (line.includes('historical-signals') || line.includes('persistentSignals') || line.includes('signalsCache') || line.includes('signals')) {
    if (idx > 50 && idx < 200 || line.includes('/api/')) {
      console.log(`server.js L${idx + 1}: ${line.trim()}`);
    }
  }
});

const scannerContent = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/scanner.js', 'utf8');
const scannerLines = scannerContent.split('\n');
scannerLines.forEach((line, idx) => {
  if (line.includes('historical-signals') || line.includes('persistentSignals') || line.includes('signalsCache') || line.includes('signals')) {
    console.log(`scanner.js L${idx + 1}: ${line.trim()}`);
  }
});
