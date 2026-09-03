import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/localtunnel.log';
if (fs.existsSync(path)) {
  console.log(fs.readFileSync(path, 'utf8'));
} else {
  console.log('localtunnel.log not found');
}
