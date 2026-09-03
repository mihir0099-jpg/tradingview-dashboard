import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variables niftyGex and bankGex
const stateInsertTarget = `  const [historicalSignals, setHistoricalSignals] = useState<LiveSignal[]>([]);`;
const stateInsertValue = `  const [historicalSignals, setHistoricalSignals] = useState<LiveSignal[]>([]);
  const [niftyGex, setNiftyGex] = useState<number>(0);
  const [bankGex, setBankGex] = useState<number>(0);`;

if (!content.includes(stateInsertTarget)) {
  console.error('State insert target not found!');
  process.exit(1);
}
content = content.replace(stateInsertTarget, stateInsertValue);

// 2. Set niftyGex and bankGex inside fetchLiveSignals
const fetchSetTarget = `            setNiftyGamma(nGamma);
            setBankGamma(bGamma);
            setNiftyStraddle(nStraddle);
            setBankStraddle(bStraddle);`;

const fetchSetValue = `            setNiftyGamma(nGamma);
            setBankGamma(bGamma);
            setNiftyStraddle(nStraddle);
            setBankStraddle(bStraddle);
            
            const nGex = Number(json.nifty?.straddleSkew?.gex || 0);
            const bGex = Number(json.banknifty?.straddleSkew?.gex || 0);
            setNiftyGex(nGex);
            setBankGex(bGex);`;

if (!content.includes(fetchSetTarget)) {
  console.error('Fetch set target not found!');
  process.exit(1);
}
content = content.replace(fetchSetTarget, fetchSetValue);

// 3. Render Nifty GEX in the UI Spotlight panel
const niftyUiTarget = `              <span style={{ fontSize: '13px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: niftySkew > 15 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)', color: niftySkew > 15 ? '#10b981' : '#e2e8f0' }}>
                Skew: {niftySkew > 0 ? '+' : ''}{niftySkew.toFixed(1)}%
              </span>`;

const niftyUiValue = `              <span style={{ fontSize: '13px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: niftySkew > 15 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)', color: niftySkew > 15 ? '#10b981' : '#e2e8f0' }}>
                Skew: {niftySkew > 0 ? '+' : ''}{niftySkew.toFixed(1)}%
              </span>
              <span style={{ fontSize: '13px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: niftyGex >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: niftyGex >= 0 ? '#10b981' : '#f87171' }}>
                GEX: {niftyGex > 0 ? '+' : ''}{niftyGex.toFixed(2)} Cr
              </span>`;

if (!content.includes(niftyUiTarget)) {
  console.error('Nifty UI target not found!');
  process.exit(1);
}
content = content.replace(niftyUiTarget, niftyUiValue);

// 4. Render Bank Nifty GEX in the UI Spotlight panel
const bankUiTarget = `              <span style={{ fontSize: '13px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: bankSkew > 15 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)', color: bankSkew > 15 ? '#10b981' : '#e2e8f0' }}>
                Skew: {bankSkew > 0 ? '+' : ''}{bankSkew.toFixed(1)}% 🚨
              </span>`;

const bankUiValue = `              <span style={{ fontSize: '13px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: bankSkew > 15 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)', color: bankSkew > 15 ? '#10b981' : '#e2e8f0' }}>
                Skew: {bankSkew > 0 ? '+' : ''}{bankSkew.toFixed(1)}% 🚨
              </span>
              <span style={{ fontSize: '13px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: bankGex >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: bankGex >= 0 ? '#10b981' : '#f87171' }}>
                GEX: {bankGex > 0 ? '+' : ''}{bankGex.toFixed(2)} Cr
              </span>`;

if (!content.includes(bankUiTarget)) {
  console.error('Bank UI target not found!');
  process.exit(1);
}
content = content.replace(bankUiTarget, bankUiValue);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected GEX states and UI components into BacktestResultsContainer.tsx!');
