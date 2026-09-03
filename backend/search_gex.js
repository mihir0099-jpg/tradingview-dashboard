import fs from 'fs';
import path from 'path';

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchDir(filePath, query);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.toLowerCase().includes(query.toLowerCase())) {
          console.log(`Found in: ${filePath}`);
          // Print matching lines
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              console.log(`  L${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  });
}

searchDir('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard', 'gex');
