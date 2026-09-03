import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/historical_analysis_raw.txt', 'utf16le');
console.log(content.slice(0, 5000));
