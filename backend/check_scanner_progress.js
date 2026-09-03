import fs from 'fs';

const logPath = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-9918.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log('Total lines in log:', lines.length);
  console.log('Last 40 lines of log:');
  console.log(lines.slice(-40).join('\n'));
} else {
  console.log('Log file not found');
}
