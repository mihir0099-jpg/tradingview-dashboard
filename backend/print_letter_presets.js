import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/presets.json');
const arr = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('NSE:R count:', arr.filter(p => p.value.startsWith('NSE:R')).length);
console.log('NSE:R sample:', arr.filter(p => p.value.startsWith('NSE:R')).slice(0, 10).map(p => p.value));

console.log('NSE:T count:', arr.filter(p => p.value.startsWith('NSE:T')).length);
console.log('NSE:T sample:', arr.filter(p => p.value.startsWith('NSE:T')).slice(0, 10).map(p => p.value));

console.log('NSE:S count:', arr.filter(p => p.value.startsWith('NSE:S')).length);
console.log('NSE:S sample:', arr.filter(p => p.value.startsWith('NSE:S')).slice(0, 10).map(p => p.value));
