import fs from 'fs';

const logPath = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-9494.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  console.log(content.split('\n').slice(-30).join('\n'));
} else {
  console.log('Pinggy log not found');
}
