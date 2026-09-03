import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'data/presets.json');
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      console.log('Is array, length:', data.length);
      console.log('First 5:', data.slice(0, 5));
    } else {
      console.log('Is object, keys:', Object.keys(data));
      const firstKey = Object.keys(data)[0];
      console.log(`First key "${firstKey}" content type:`, Array.isArray(data[firstKey]) ? `Array length ${data[firstKey].length}` : typeof data[firstKey]);
      if (Array.isArray(data[firstKey])) {
        console.log('First 5 in first key:', data[firstKey].slice(0, 5));
      }
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
} else {
  console.log('File not found');
}
