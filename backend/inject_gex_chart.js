import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variable and hook for biasData
const stateInsertTarget = `  const [activeTab, setActiveTab] = useState<'chart' | 'bhaichara' | 'dada_thoughts' | 'fifteen_min' | 'scanner' | 'options' | 'signals' | 'doji' | 'doji_novol' | 'volume' | 'opening_bias' | 'hourly_updates' | 'backtest_results' | 'confluences' | 'early_picks'>('fifteen_min');`;
const stateInsertValue = `  const [activeTab, setActiveTab] = useState<'chart' | 'bhaichara' | 'dada_thoughts' | 'fifteen_min' | 'scanner' | 'options' | 'signals' | 'doji' | 'doji_novol' | 'volume' | 'opening_bias' | 'hourly_updates' | 'backtest_results' | 'confluences' | 'early_picks'>('fifteen_min');
  const [biasData, setBiasData] = useState<any>(null);

  useEffect(() => {
    const backendUrl = (window.location.port && window.location.port !== '3002')
      ? 'http://localhost:3002'
      : window.location.origin;

    const fetchBias = async () => {
      try {
        const res = await fetch(\`\${backendUrl}/api/scanner/opening-bias?_t=\${Date.now()}\`);
        if (res.ok) {
          const data = await res.json();
          setBiasData(data);
        }
      } catch (e) {}
    };
    fetchBias();
    const interval = setInterval(fetchBias, 4000);
    return () => clearInterval(interval);
  }, []);`;

if (!content.includes(stateInsertTarget)) {
  console.error('State insert target not found!');
  process.exit(1);
}
content = content.replace(stateInsertTarget, stateInsertValue);

// 2. Resolve gexLevels and pass to ChartContainer
const renderTarget = `                <ChartContainer
                  candles={candles}
                  symbol={symbol}
                  timeframe={timeframe}
                  matrixSeriesData={matrixSeriesData}
                />`;

const renderValue = `                {(() => {
                  const currentBias = symbol.includes('BANKNIFTY') ? biasData?.banknifty : biasData?.nifty;
                  const gexLevels = currentBias?.straddleSkew || {};
                  return (
                    <ChartContainer
                      candles={candles}
                      symbol={symbol}
                      timeframe={timeframe}
                      matrixSeriesData={matrixSeriesData}
                      gexCallWall={gexLevels.gexCallWall}
                      gexPutWall={gexLevels.gexPutWall}
                      gexFlipZone={gexLevels.gexFlipZone}
                      gexMaxPain={gexLevels.gexMaxPain}
                    />
                  );
                })()}`;

if (!content.includes(renderTarget)) {
  console.error('Render target not found!');
  process.exit(1);
}
content = content.replace(renderTarget, renderValue);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated App.tsx to fetch GEX levels and render them in ChartContainer!');
