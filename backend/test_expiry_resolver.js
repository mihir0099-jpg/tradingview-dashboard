import fs from 'fs';
import path from 'path';

const reportsDir = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/reports';
const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(reportsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const reportDate = data.date; // e.g. "17/8/2026"
    
    // Find options contracts in optionsPremiums to extract the actual expiry code
    let resolvedExpiry = null;
    if (data.optionsPremiums) {
      const keys = Object.keys(data.optionsPremiums);
      if (keys.length > 0) {
        // e.g. "NIFTY_ATM_24300_EXP_260818" -> extract "260818"
        const match = keys[0].match(/EXP_(\d+)/);
        if (match) {
          resolvedExpiry = match[1];
        }
      }
    }
    
    console.log(`File: ${file} | Date: ${reportDate} | Extracted Expiry: ${resolvedExpiry}`);
  } catch (e) {
    console.error(`Error parsing ${file}:`, e.message);
  }
});
