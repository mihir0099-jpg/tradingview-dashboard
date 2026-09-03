import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/scanner.js', 'utf8');
const lines = content.split('\n');

let print = false;
let braceCount = 0;
lines.forEach((line, idx) => {
  if (line.includes('async function runScan') || line.includes('function runScan')) {
    print = true;
  }
  if (print) {
    console.log(`L${idx + 1}: ${line}`);
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceCount += openBraces - closeBraces;
    if (braceCount === 0 && idx > 0 && line.includes('}')) {
      print = false;
    }
  }
});
