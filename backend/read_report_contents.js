import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/today_skew_gamma_report.md';
const content = fs.readFileSync(path, 'utf8');
console.log(content);
