import fs from 'fs';

const path = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-11445.log';
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  console.log(content.split('\n').slice(-40).join('\n'));
} else {
  console.log('Log not found');
}
