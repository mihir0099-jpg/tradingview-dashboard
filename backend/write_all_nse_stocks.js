import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const presetsPath = path.join(__dirname, 'data/presets.json');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));

// Filter to indices and stocks that belong to NSE exchange
const nseSymbols = presets
  .filter(p => p.exchange === 'NSE' && (p.type === 'stock' || p.type === 'index'))
  .map(p => p.value);

// Remove duplicates
const uniqueNseSymbols = Array.from(new Set(nseSymbols));

const outputPath = path.join(__dirname, 'data/scan_symbols.json');
fs.writeFileSync(outputPath, JSON.stringify(uniqueNseSymbols, null, 2), 'utf8');

console.log('Successfully wrote', uniqueNseSymbols.length, 'NSE symbols to scan_symbols.json!');
