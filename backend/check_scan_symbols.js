import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/scan_symbols.json');
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  try {
    const arr = JSON.parse(content);
    console.log('Total symbols in scan_symbols.json:', arr.length);
    console.log('First 10 symbols:', arr.slice(0, 10));
  } catch (e) {
    console.log('Parse error:', e.message);
  }
} else {
  console.log('File not found');
}
