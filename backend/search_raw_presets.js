import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const presetsPath = path.join(__dirname, 'data/presets.json');
const content = fs.readFileSync(presetsPath, 'utf8');

// Find matches in the raw string
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toUpperCase().includes('RELIANCE')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
