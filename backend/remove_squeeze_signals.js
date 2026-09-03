import fs from 'fs';

// 1. Clean server.js
const serverPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

const targetServerBlock = `          const isPerfectReversalSqueeze = (gammaRatio > 1.8 && gexValue > 0.012 && spotPrice >= (openPrice || spotPrice - 15));
          
          if (isPerfectReversalSqueeze) {
            earlyWarningSignal = '🚨 PERFECT REVERSAL SQUEEZE DETECTED (100% Reversal Fade)';
            earlyWarningAction = 'BUY PUTS OF ITM';
            earlyWarningConfidence = 100;
            moveTriggerType = 'PERFECT_REVERSAL_SQUEEZE';
            expectedMoveDirection = 'BEARISH (BUY PE)';
          } else if (skewSpreadPct > 15 || (gammaRatio > 1.8 && skewSpreadPct > 8)) {`;

const replacementServerBlock = `          if (skewSpreadPct > 15 || (gammaRatio > 1.8 && skewSpreadPct > 8)) {`;

if (serverContent.includes(targetServerBlock)) {
  serverContent = serverContent.replace(targetServerBlock, replacementServerBlock);
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('Successfully removed Perfect Reversal Squeeze detection from server.js backend!');
} else {
  console.log('Target block not found in server.js (already removed or modified).');
}

// 2. Clean BacktestResultsContainer.tsx
const containerPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx';
let containerContent = fs.readFileSync(containerPath, 'utf8');

// Remove BN squeeze check
const bnSqueezeTarget = `            // 1A. Bank Nifty Perfect Reversal Squeeze Signal
            const isBankSqueeze = bSkewData?.moveTriggerType === 'PERFECT_REVERSAL_SQUEEZE' || (bSkew > 15 && bGamma < 0.45);
            if (isBankSqueeze) {
              const existingSig = currentHistory.find(s => s.id === 'BN-SQUEEZE-REVERSAL-PE');
              if (existingSig) {
                signals.push(existingSig);
              } else {
                const atmStrike = Math.round(currentBank / 100) * 100;
                const itmStrike = atmStrike + 100; // ITM Put strike is 1 strike above ATM
                const baseLtp = Number(bSkewData?.peLtp) || 500;
                const optLtp = baseLtp + 70; // approximate ITM premium offset
                const optSL = Math.max(1, optLtp - 100);

                signals.push({
                  id: 'BN-SQUEEZE-REVERSAL-PE',
                  timestamp: 'LIVE ACTIVE',
                  symbol: 'BANKNIFTY',
                  action: 'BUY PE',
                  strike: \`\${itmStrike} PE (ITM)\`,
                  currentOptionPrice: Number(optLtp.toFixed(2)),
                  entryRange: \`₹\${(optLtp * 0.95).toFixed(1)} - ₹\${(optLtp * 1.05).toFixed(1)}\`,
                  spotPrice: currentBank,
                  spotSL: currentBank + 150,
                  optionSL: Number(optSL.toFixed(2)),
                  target1: Number((optLtp * 1.40).toFixed(2)),
                  target2: Number((optLtp * 1.80).toFixed(2)),
                  confidence: 100,
                  mathTrigger: '🚨 PERFECT REVERSAL SQUEEZE: Call over-accumulation ceiling hit (100% Reversal Fade).',
                  conceptUsed: 'Long-Gamma Volatility Ceiling / Institutional Call Fade',
                  isUrgent: true
                });
              }
            }

`;

if (containerContent.includes(bnSqueezeTarget)) {
  containerContent = containerContent.replace(bnSqueezeTarget, '');
}

// Remove Nifty squeeze check
const niftySqueezeTarget = `            // 2A. Nifty Perfect Reversal Squeeze Signal
            const isNiftySqueeze = nSkewData?.moveTriggerType === 'PERFECT_REVERSAL_SQUEEZE' || (nSkew > 15 && nGamma < 0.45);
            if (isNiftySqueeze) {
              const existingSig = currentHistory.find(s => s.id === 'NIFTY-SQUEEZE-REVERSAL-PE');
              if (existingSig) {
                signals.push(existingSig);
              } else {
                const atmStrike = Math.round(currentNifty / 50) * 50;
                const itmStrike = atmStrike + 50; // ITM Put strike is 1 strike above ATM
                const baseLtp = Number(nSkewData?.peLtp) || 65;
                const optLtp = baseLtp + 35; // approximate ITM premium offset
                const optSL = Math.max(1, optLtp - 20);

                signals.push({
                  id: 'NIFTY-SQUEEZE-REVERSAL-PE',
                  timestamp: 'LIVE ACTIVE',
                  symbol: 'NIFTY 50',
                  action: 'BUY PE',
                  strike: \`\${itmStrike} PE (ITM)\`,
                  currentOptionPrice: Number(optLtp.toFixed(2)),
                  entryRange: \`₹\${(optLtp * 0.95).toFixed(1)} - ₹\${(optLtp * 1.05).toFixed(1)}\`,
                  spotPrice: currentNifty,
                  spotSL: currentNifty + 30,
                  optionSL: Number(optSL.toFixed(2)),
                  target1: Number((optLtp * 1.40).toFixed(2)),
                  target2: Number((optLtp * 1.80).toFixed(2)),
                  confidence: 100,
                  mathTrigger: '🚨 PERFECT REVERSAL SQUEEZE: Call over-accumulation ceiling hit (100% Reversal Fade).',
                  conceptUsed: 'Long-Gamma Volatility Ceiling / Institutional Call Fade',
                  isUrgent: true
                });
              }
            }

`;

if (containerContent.includes(niftySqueezeTarget)) {
  containerContent = containerContent.replace(niftySqueezeTarget, '');
}

// Remove Voice alerts customization for Squeeze Reversals
const voiceTarget = `                let voiceMsg = \`Alert! \${topSig.symbol} \${topSig.action}. Buy \${topSig.strike} at \${Math.round(topSig.currentOptionPrice)} rupees. Stop loss \${Math.round(topSig.optionSL)} rupees.\`;
                if (topSig.id.includes('SQUEEZE-REVERSAL')) {
                  voiceMsg = \`Warning! Perfect Reversal Squeeze detected on \${topSig.symbol}. Buy puts of I T M! Buy puts of I T M!\`;
                }
                speakAIVoiceAlert(voiceMsg, topSig.action.includes('CE'));`;

const voiceReplacement = `                const voiceMsg = \`Alert! \${topSig.symbol} \${topSig.action}. Buy \${topSig.strike} at \${Math.round(topSig.currentOptionPrice)} rupees. Stop loss \${Math.round(topSig.optionSL)} rupees.\`;
                speakAIVoiceAlert(voiceMsg, topSig.action.includes('CE'));`;

if (containerContent.includes(voiceTarget)) {
  containerContent = containerContent.replace(voiceTarget, voiceReplacement);
}

fs.writeFileSync(containerPath, containerContent, 'utf8');
console.log('Successfully removed Perfect Reversal Squeeze signals and voice warnings from frontend components!');
