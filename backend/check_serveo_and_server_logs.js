import fs from 'fs';

const serverLog = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-10178.log';
const serveoLog = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-9962.log';

console.log('--- SERVER LOG LAST 30 LINES ---');
if (fs.existsSync(serverLog)) {
  const content = fs.readFileSync(serverLog, 'utf8');
  const lines = content.split('\n');
  console.log(lines.slice(-30).join('\n'));
} else {
  console.log('Server log not found');
}

console.log('\n--- SERVEO LOG LAST 30 LINES ---');
if (fs.existsSync(serveoLog)) {
  const content = fs.readFileSync(serveoLog, 'utf8');
  const lines = content.split('\n');
  console.log(lines.slice(-30).join('\n'));
} else {
  console.log('Serveo log not found');
}
