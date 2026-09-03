import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const presetsPath = path.join(__dirname, 'data/presets.json');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));

const querySyms = ['RELIANCE', 'TCS', 'SBIN', 'TATASTEEL', 'TATAMOTORS'];
querySyms.forEach(qs => {
  const matches = presets.filter(p => p.value.includes(qs));
  console.log(`Matches for ${qs}:`, matches);
});
