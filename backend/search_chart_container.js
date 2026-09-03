import fs from 'fs';
import path from 'path';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') searchDir(filePath);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('ChartContainer')) {
          console.log(`Used in: ${filePath}`);
        }
      }
    }
  });
}

searchDir('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src');
