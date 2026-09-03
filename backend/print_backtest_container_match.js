import fs from 'fs';

const content = fs.readFileSync('C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('ACTIVE PRE-BREAKOUT') || line.includes('Active Pre-Breakout') || line.includes('tradeRecommendations') || line.includes('Math Trade Alerts')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
