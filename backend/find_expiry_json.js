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
    } else if (file.endsWith('.json') || file.endsWith('.txt')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('expiry') || content.includes('Expiry') || content.includes('260')) {
        console.log(`Found relevant file: ${fullPath}`);
      }
    }
  });
}

searchDir(path.join(__dirname, '..'));
