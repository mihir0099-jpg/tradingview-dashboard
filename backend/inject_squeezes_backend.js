import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/server.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetCheck = `          if (skewSpreadPct > 15 || (gammaRatio > 1.8 && skewSpreadPct > 8)) {
            earlyWarningSignal = '🚀 IMMINENT BULLISH DRIVE DETECTED (60-90s)';`;

const replacementCheck = `          const isPerfectReversalSqueeze = (gammaRatio > 1.8 && gexValue > 0.012 && spotPrice >= (openPrice || spotPrice - 15));
          
          if (isPerfectReversalSqueeze) {
            earlyWarningSignal = '🚨 PERFECT REVERSAL SQUEEZE DETECTED (100% Reversal Fade)';
            earlyWarningAction = 'BUY PUTS OF ITM';
            earlyWarningConfidence = 100;
            moveTriggerType = 'PERFECT_REVERSAL_SQUEEZE';
            expectedMoveDirection = 'BEARISH (BUY PE)';
          } else if (skewSpreadPct > 15 || (gammaRatio > 1.8 && skewSpreadPct > 8)) {
            earlyWarningSignal = '🚀 IMMINENT BULLISH DRIVE DETECTED (60-90s)';`;

if (!content.includes(targetCheck)) {
  console.error('Target check block not found in server.js!');
  process.exit(1);
}
content = content.replace(targetCheck, replacementCheck);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected Perfect Reversal Squeeze detection logic on backend!');
