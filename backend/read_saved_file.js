import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/today_skew_gamma_report.md';
if (fs.existsSync(path)) {
  console.log('File exists! Size:', fs.statSync(path).size);
  const content = fs.readFileSync(path, 'utf8');
  console.log(content.slice(0, 1000));
} else {
  console.log('File does NOT exist at:', path);
}
