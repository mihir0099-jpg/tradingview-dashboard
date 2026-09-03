import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components';
const files = fs.readdirSync(dir);

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  if (content.includes('Math') || content.includes('Pre-Breakout') || content.includes('recommendations')) {
    console.log(`Found in: ${file}`);
  }
});
