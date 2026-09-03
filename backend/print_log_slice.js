import fs from 'fs';

const logPath = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-9918.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  const matchIdx = lines.findIndex((line, idx) => idx > 10 && line.includes('WebSocket Patch'));
  if (matchIdx !== -1) {
    console.log(`Match found at line ${matchIdx + 1}`);
    console.log(lines.slice(Math.max(0, matchIdx - 10), matchIdx + 15).join('\n'));
  } else {
    console.log('No second match found');
  }
}
