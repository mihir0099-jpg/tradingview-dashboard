import fs from 'fs';
import path from 'path';

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
      if (content.includes('ACTIVE PRE-BREAKOUT') || content.includes('Active Pre-Breakout') || content.includes('Trade Recommendations')) {
        console.log(`Found match in file: ${fullPath}`);
      }
    }
  });
}

searchDir('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src');
