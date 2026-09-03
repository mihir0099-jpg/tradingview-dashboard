import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/data/reports/report_2026_08_17.json', 'utf8'));
console.log('optionsPremiums structure:', JSON.stringify(data.optionsPremiums, null, 2).slice(0, 1000));
