import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/BacktestResultsContainer.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variables for walls and zones
const targetState = `  const [niftyGex, setNiftyGex] = useState<number>(0);
  const [bankGex, setBankGex] = useState<number>(0);`;

const replacementState = `  const [niftyGex, setNiftyGex] = useState<number>(0);
  const [bankGex, setBankGex] = useState<number>(0);
  
  const [niftyCallWall, setNiftyCallWall] = useState<number>(24400);
  const [niftyPutWall, setNiftyPutWall] = useState<number>(24100);
  const [niftyFlipZone, setNiftyFlipZone] = useState<number>(24250);
  const [niftyMaxPain, setNiftyMaxPain] = useState<number>(24250);

  const [bankCallWall, setBankCallWall] = useState<number>(57900);
  const [bankPutWall, setBankPutWall] = useState<number>(57600);
  const [bankFlipZone, setBankFlipZone] = useState<number>(57800);
  const [bankMaxPain, setBankMaxPain] = useState<number>(57800);`;

if (!content.includes(targetState)) {
  console.error('Target state not found!');
  process.exit(1);
}
content = content.replace(targetState, replacementState);

// 2. Set the variables from API fetch
const targetFetch = `            setNiftyGex(nGex);
            setBankGex(bGex);`;

const replacementFetch = `            setNiftyGex(nGex);
            setBankGex(bGex);
            
            setNiftyCallWall(json.nifty?.straddleSkew?.gexCallWall || 24400);
            setNiftyPutWall(json.nifty?.straddleSkew?.gexPutWall || 24100);
            setNiftyFlipZone(json.nifty?.straddleSkew?.gexFlipZone || 24250);
            setNiftyMaxPain(json.nifty?.straddleSkew?.gexMaxPain || 24250);

            setBankCallWall(json.banknifty?.straddleSkew?.gexCallWall || 57900);
            setBankPutWall(json.banknifty?.straddleSkew?.gexPutWall || 57600);
            setBankFlipZone(json.banknifty?.straddleSkew?.gexFlipZone || 57800);
            setBankMaxPain(json.banknifty?.straddleSkew?.gexMaxPain || 57800);`;

if (!content.includes(targetFetch)) {
  console.error('Target fetch not found!');
  process.exit(1);
}
content = content.replace(targetFetch, replacementFetch);

// 3. Render Nifty GEX levels row inside Spotlight
const niftyRender = `          {/* 🎯 Real-Time Active Contract Tracker with Dynamic Smart Money Action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed rgba(59, 130, 246, 0.2)' }}>`;

const niftyReplacement = `          {/* GEX Levels display */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', background: 'rgba(59, 130, 246, 0.08)', padding: '6px 10px', borderRadius: '8px', marginTop: '4px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <span>Call Wall: <strong style={{ color: '#f87171' }}>{niftyCallWall}</strong></span>
            <span>Put Wall: <strong style={{ color: '#4ade80' }}>{niftyPutWall}</strong></span>
            <span>Flip: <strong style={{ color: '#60a5fa' }}>{niftyFlipZone}</strong></span>
            <span>Pain: <strong style={{ color: '#c084fc' }}>{niftyMaxPain}</strong></span>
          </div>

          {/* 🎯 Real-Time Active Contract Tracker with Dynamic Smart Money Action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed rgba(59, 130, 246, 0.2)' }}>`;

if (!content.includes(niftyRender)) {
  console.error('Nifty render target not found!');
  process.exit(1);
}
content = content.replace(niftyRender, niftyReplacement);

// 4. Render Bank Nifty GEX levels row inside Spotlight
const bankRender = `          {/* 🎯 Real-Time Active Contract Tracker with Dynamic Smart Money Action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed rgba(168, 85, 247, 0.2)' }}>`;

const bankReplacement = `          {/* GEX Levels display */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', background: 'rgba(168, 85, 247, 0.08)', padding: '6px 10px', borderRadius: '8px', marginTop: '4px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
            <span>Call Wall: <strong style={{ color: '#f87171' }}>{bankCallWall}</strong></span>
            <span>Put Wall: <strong style={{ color: '#4ade80' }}>{bankPutWall}</strong></span>
            <span>Flip: <strong style={{ color: '#60a5fa' }}>{bankFlipZone}</strong></span>
            <span>Pain: <strong style={{ color: '#c084fc' }}>{bankMaxPain}</strong></span>
          </div>

          {/* 🎯 Real-Time Active Contract Tracker with Dynamic Smart Money Action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed rgba(168, 85, 247, 0.2)' }}>`;

if (!content.includes(bankRender)) {
  console.error('Bank render target not found!');
  process.exit(1);
}
content = content.replace(bankRender, bankReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added live GEX levels directly to the Spotlight panel UI!');
