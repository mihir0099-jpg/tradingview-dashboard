import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/live_market_learnings.json');
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  try {
    const arr = JSON.parse(content);
    console.log('Array length:', arr.length);
    if (arr.length > 0) {
      console.log('Latest snapshot:', arr[arr.length - 1]);
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
} else {
  console.log('File not found');
}
