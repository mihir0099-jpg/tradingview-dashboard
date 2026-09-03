import fs from 'fs';
import path from 'path';

const distPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/dist';
if (!fs.existsSync(distPath)) {
  console.log('dist directory does not exist!');
  process.exit(0);
}

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('itmStrike') || content.includes('niftyItm')) {
        console.log(`Found in compiled file: ${file}`);
      }
    }
  });
}

searchDir(distPath);
