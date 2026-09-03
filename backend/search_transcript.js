import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/logs/transcript.jsonl';
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('expiry') || line.includes('date') || line.includes('day')) {
      // Print first 500 chars of matching lines
      console.log(`L${idx + 1}: ${line.slice(0, 300)}`);
    }
  });
} else {
  console.log('transcript.jsonl not found');
}
