import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert Bank Nifty Perfect Reversal Squeeze Signal
const bnSignalInsertTarget = `            // 1. Bank Nifty Live Trade Signal (Skew-based)
            if (Math.abs(bSkew) > 8.0 || bSkewData?.earlyWarningConfidence > 75) {`;

const bnSignalInsertValue = `            // 1A. Bank Nifty Perfect Reversal Squeeze Signal
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

            // 1. Bank Nifty Live Trade Signal (Skew-based)
            if (Math.abs(bSkew) > 8.0 || bSkewData?.earlyWarningConfidence > 75) {`;

if (!content.includes(bnSignalInsertTarget)) {
  console.error('BN Signal insert target not found!');
  process.exit(1);
}
content = content.replace(bnSignalInsertTarget, bnSignalInsertValue);


// 2. Insert Nifty Perfect Reversal Squeeze Signal
const niftySignalInsertTarget = `            // 2. Nifty Live Trade Signal (Skew-based)
            if (Math.abs(nSkew) > 5.0 || nSkewData?.earlyWarningConfidence > 75) {`;

const niftySignalInsertValue = `            // 2A. Nifty Perfect Reversal Squeeze Signal
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

            // 2. Nifty Live Trade Signal (Skew-based)
            if (Math.abs(nSkew) > 5.0 || nSkewData?.earlyWarningConfidence > 75) {`;

if (!content.includes(niftySignalInsertTarget)) {
  console.error('Nifty Signal insert target not found!');
  process.exit(1);
}
content = content.replace(niftySignalInsertTarget, niftySignalInsertValue);


// 3. Customize Voice Alert for Squeeze Reversals
const voiceAnnounceTarget = `            // Play voice announcement only ONCE when a new unique strike setup triggers
            if (signals.length > 0) {
              const topSig = signals[0];
              if (topSig.id !== lastSignalIdRef.current) {
                lastSignalIdRef.current = topSig.id;
                const voiceMsg = \`Alert! \${topSig.symbol} \${topSig.action}. Buy \${topSig.strike} at \${Math.round(topSig.currentOptionPrice)} rupees. Stop loss \${Math.round(topSig.optionSL)} rupees.\`;
                speakAIVoiceAlert(voiceMsg, topSig.action.includes('CE'));
              }
            }`;

const voiceAnnounceValue = `            // Play voice announcement only ONCE when a new unique strike setup triggers
            if (signals.length > 0) {
              const topSig = signals[0];
              if (topSig.id !== lastSignalIdRef.current) {
                lastSignalIdRef.current = topSig.id;
                let voiceMsg = \`Alert! \${topSig.symbol} \${topSig.action}. Buy \${topSig.strike} at \${Math.round(topSig.currentOptionPrice)} rupees. Stop loss \${Math.round(topSig.optionSL)} rupees.\`;
                if (topSig.id.includes('SQUEEZE-REVERSAL')) {
                  voiceMsg = \`Warning! Perfect Reversal Squeeze detected on \${topSig.symbol}. Buy puts of I T M! Buy puts of I T M!\`;
                }
                speakAIVoiceAlert(voiceMsg, topSig.action.includes('CE'));
              }
            }`;

if (!content.includes(voiceAnnounceTarget)) {
  console.error('Voice announce target not found!');
  process.exit(1);
}
content = content.replace(voiceAnnounceTarget, voiceAnnounceValue);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected Perfect Reversal Squeeze signals and customized voice alerts into frontend!');
