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
      if (file !== 'node_modules' && file !== 'data' && file !== '.git') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('expiry') || content.includes('Expiry') || content.includes('dates')) {
        console.log(`Found in markdown file: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('expiry') || line.includes('dates')) {
            console.log(`  L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchDir(path.join(__dirname, '..'));
