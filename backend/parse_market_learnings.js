import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/live_market_learnings.json';
if (fs.existsSync(path)) {
  const raw = fs.readFileSync(path, 'utf8').trim();
  console.log('File size:', raw.length);
  try {
    const data = JSON.parse(raw);
    console.log('Is array:', Array.isArray(data));
    if (Array.isArray(data) && data.length > 0) {
      console.log('Number of entries:', data.length);
      console.log('First entry:', data[0]);
      console.log('Last entry:', data[data.length - 1]);
    }
  } catch (err) {
    console.log('Failed to parse complete JSON, trying to parse lines or clean trailing commas...');
    try {
      const cleaned = raw.endsWith(']') ? raw : (raw.lastIndexOf('}') !== -1 ? raw.slice(0, raw.lastIndexOf('}') + 1) + ']' : '[]');
      const data = JSON.parse(cleaned);
      console.log('Parsed cleaned array successfully! Size:', data.length);
      console.log('Last entry:', data[data.length - 1]);
    } catch (e2) {
      console.error('Cleaned parse failed:', e2.message);
    }
  }
} else {
  console.log('File not found!');
}
