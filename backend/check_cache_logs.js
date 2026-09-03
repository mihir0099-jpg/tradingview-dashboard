import fs from 'fs';

const logPath = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-10134.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('Restored') || line.includes('Doji Scanner') || line.includes('Scanner]')) {
      console.log(`L${idx + 1}: ${line}`);
    }
  });
} else {
  console.log('Log file not found');
}
