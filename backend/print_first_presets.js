import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/presets.json');
const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(arr.slice(0, 30));
