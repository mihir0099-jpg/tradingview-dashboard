import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/presets.json');
const arr = JSON.parse(fs.readFileSync(file, 'utf8'));

const nseStocks = arr.filter(p => p.exchange === 'NSE' && p.type === 'stock');
console.log('Total NSE Stocks:', nseStocks.length);
console.log('Total BSE Stocks:', arr.filter(p => p.exchange === 'BSE' && p.type === 'stock').length);
console.log('Sample of 10 NSE stocks:', nseStocks.slice(0, 10).map(p => p.value));
