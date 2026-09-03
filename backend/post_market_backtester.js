import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runPostMarketBacktest() {
  console.log('====================================================================');
  console.log('[Post-Market Scheduler] Running Automated Daily Skew & Gamma Backtest...');
  console.log('====================================================================');
  
  try {
    const pyScript = path.join(__dirname, 'backtest_put_climax_skew_sweep.py');
    const pyOutput = execSync(`python "${pyScript}"`, { encoding: 'utf8' });
    console.log('[Post-Market Scheduler] Backtest Execution Output:\n', pyOutput);
    
    const todayStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const logPath = path.join(__dirname, 'data', 'daily_post_market_backtests.json');
    let history = [];
    if (fs.existsSync(logPath)) {
      try {
        history = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      } catch (e) {}
    }
    
    const backtestResultFile = path.join(__dirname, 'data', 'put_climax_skew_backtest.json');
    if (fs.existsSync(backtestResultFile)) {
      const resultData = JSON.parse(fs.readFileSync(backtestResultFile, 'utf8'));
      history.push({
        run_date: todayStr,
        run_time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        summary: resultData.summary
      });
      fs.writeFileSync(logPath, JSON.stringify(history, null, 2));
      console.log(`[Post-Market Scheduler] Successfully logged daily backtest report for ${todayStr}.`);
    }
  } catch (err) {
    console.error('[Post-Market Scheduler Error]:', err.message || err);
  }
}

// If executed directly from command line
if (process.argv[1] && process.argv[1].endsWith('post_market_backtester.js')) {
  runPostMarketBacktest();
}
