import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/presets.json');
const arr = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('Search for "REL":');
console.log(arr.filter(p => p.value.includes('REL') || p.label.includes('Reliance') || p.label.includes('RELIANCE')).slice(0, 10));

console.log('\nSearch for "TCS":');
console.log(arr.filter(p => p.value.includes('TCS') || p.label.includes('TATA CONS') || p.label.includes('Tata Consultancy')).slice(0, 10));

console.log('\nSearch for "SBI":');
console.log(arr.filter(p => p.value.includes('SBI') || p.label.includes('State Bank') || p.label.includes('STATE BANK')).slice(0, 10));
