import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/levels_cache_backup.json';
if (fs.existsSync(path)) {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log('Keys in 5:', Object.keys(data['5'] || {}).slice(0, 5));
  console.log('Keys in D:', Object.keys(data['D'] || {}).slice(0, 5));
  const sampleKey = Object.keys(data['D'] || {})[0];
  if (sampleKey) {
    console.log(`Sample value for ${sampleKey} in D:`, data['D'][sampleKey]);
  }
} else {
  console.log('levels_cache_backup.json not found');
}
