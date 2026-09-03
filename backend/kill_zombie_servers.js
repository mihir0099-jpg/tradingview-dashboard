import { execSync } from 'child_process';

try {
  console.log('Querying running node.exe processes...');
  // Use powershell to get process info cleanly
  const output = execSync('powershell "Get-CimInstance Win32_Process -Filter \\"name=\'node.exe\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"', { encoding: 'utf8' });
  
  if (!output.trim()) {
    console.log('No node.exe processes found.');
    process.exit(0);
  }

  const processes = JSON.parse(output);
  const processList = Array.isArray(processes) ? processes : [processes];
  
  console.log(`Found ${processList.length} node processes. Filtering for tradingview-dashboard...`);
  
  let killCount = 0;
  processList.forEach(p => {
    const cmd = p.CommandLine || '';
    const pid = p.ProcessId;
    
    // Ignore if this is the script itself
    if (pid === process.pid) return;

    if (cmd.includes('tradingview-dashboard') || cmd.includes('server.js') || cmd.includes('start_serveo.js') || cmd.includes('start_pinggy.js')) {
      console.log(`Killing target process: PID ${pid} -> ${cmd}`);
      try {
        execSync(`taskkill /f /pid ${pid}`);
        killCount++;
      } catch (e) {
        console.error(`Failed to kill PID ${pid}:`, e.message);
      }
    } else {
      console.log(`Skipping unrelated process: PID ${pid} -> ${cmd}`);
    }
  });
  
  console.log(`Successfully terminated ${killCount} zombie dashboard processes!`);
} catch (err) {
  console.error('Error running process cleaner:', err.message || err);
}
