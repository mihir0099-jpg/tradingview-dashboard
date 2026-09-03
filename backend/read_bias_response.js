import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/bias_response_raw.json', 'utf16le');
console.log('Size of content:', content.length);
console.log(content.slice(0, 2000));
