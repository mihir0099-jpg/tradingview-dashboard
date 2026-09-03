import fs from 'fs';
import path from 'path';

const appPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/App.tsx';
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');
  console.log('App.tsx content:');
  console.log(content.slice(0, 1000));
}
