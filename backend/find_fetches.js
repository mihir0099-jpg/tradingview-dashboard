import fs from 'fs';
import path from 'path';

const srcDir = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src';

function searchDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('fetch(') || line.includes('fetch(`')) {
          console.log(`${path.basename(fullPath)}:L${idx + 1}: ${line.trim()}`);
        }
      });
    }
  });
}

searchDirectory(srcDir);
