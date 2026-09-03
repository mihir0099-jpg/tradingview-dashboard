import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/presets.json');
const stats = fs.statSync(file);
console.log('Size:', stats.size, 'bytes');

const content = fs.readFileSync(file, 'utf8');
const arr = JSON.parse(content);
console.log('Total entries:', arr.length);

const types = {};
arr.forEach(item => {
  types[item.type] = (types[item.type] || 0) + 1;
});
console.log('Types counts:', types);
