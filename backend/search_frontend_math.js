import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('ACTIVE PRE-BREAKOUT') || content.includes('Pre-Breakout') || content.includes('recommendations')) {
        console.log(`Found match in frontend file: ${fullPath}`);
        // Print lines containing match
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('ACTIVE PRE-BREAKOUT') || line.includes('recommendations') || line.includes('api/math')) {
            console.log(`  L${idx + 1}: ${line.trim().slice(0, 150)}`);
          }
        });
      }
    }
  });
}

searchDir('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src');
