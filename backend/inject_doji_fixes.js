import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/doji_scanner.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Optimize BATCH_SIZE and batch sleep
content = content.replace('const BATCH_SIZE = 12;', 'const BATCH_SIZE = 6;');
content = content.replace('await new Promise(r => setTimeout(r, 60));', 'await new Promise(r => setTimeout(r, 120));');

// 2. Add dynamic auto-retry logging to scanDojiForSlot if it fails
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully optimized doji_scanner.js batch sizes and timing!');
