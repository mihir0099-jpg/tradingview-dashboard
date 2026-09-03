import fs from 'fs';
import path from 'path';

function findFile(dir, targetName) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          findFile(fullPath, targetName);
        }
      } else if (file === targetName) {
        console.log('FOUND IT AT:', fullPath);
      }
    }
  } catch (e) {}
}

findFile('C:/Users/mihir/.gemini', 'today_skew_gamma_report.md');
