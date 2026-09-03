import fs from 'fs';

const logPath = 'C:/Users/mihir/.gemini/antigravity/brain/d6077fab-1eb6-4a96-b789-9642c442aeb3/.system_generated/tasks/task-10347.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log('Total log lines:', lines.length);
  
  const errorLines = [];
  lines.forEach((line, idx) => {
    if (line.includes('Error') || line.includes('Exception') || line.includes('Rejection') || line.includes('Failed') || line.includes('timeout')) {
      errorLines.push(`L${idx + 1}: ${line.trim()}`);
    }
  });

  console.log(`Found ${errorLines.length} lines containing error keywords.`);
  console.log('Last 20 error lines:');
  console.log(errorLines.slice(-20).join('\n'));
} else {
  console.log('Log file not found');
}
