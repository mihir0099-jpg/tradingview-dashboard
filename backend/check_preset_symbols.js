import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/presets.json');
if (fs.existsSync(file)) {
  const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
  const matches = arr.filter(s => s.value.includes('M_M') || s.value.includes('M&M') || s.value.includes('LTF') || s.value.includes('L&T'));
  console.log('Matches:', matches);
}
