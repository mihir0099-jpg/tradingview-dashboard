import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The main workspace render target
const targetRender = `      {/* Main Workspace */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0' }}>
        {activeTab === 'fifteen_min' ? (
          <FifteenMinForensicContainer />
        ) : activeTab === 'bhaichara' ? (
          <BhaicharaWorkContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        ) : activeTab === 'dada_thoughts' ? (
          <DadaThoughtsContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        ) : activeTab === 'hourly_updates' ? (
          <HourlyUpdatesContainer />
        ) : activeTab === 'backtest_results' ? (
          <BacktestResultsContainer />
        ) : activeTab === 'scanner' ? (
          <ScannerContainer 
            onSymbolSelect={setSymbol} 
            onSwitchToChart={() => setActiveTab('chart')} 
          />
        ) : activeTab === 'confluences' ? (
          <ConfluencesContainer 
            onSymbolSelect={setSymbol} 
            onSwitchToChart={() => setActiveTab('chart')} 
          />
        ) : activeTab === 'options' ? (
          <OptionsChain
            currentSymbol={symbol}
            onSymbolChange={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        ) : activeTab === 'signals' ? (
          <SignalsContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        ) : activeTab === 'doji' ? (
          <DojiContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        ) : activeTab === 'doji_novol' ? (
          <DojiContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
            noVolumeFilter={true}
          />
        ) : activeTab === 'volume' ? (
          <VolumeContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        ) : activeTab === 'opening_bias' ? (
          <OpeningBiasContainer />
        ) : activeTab === 'early_picks' ? (
          <EarlyPicksContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        ) : (
          <>
            {error && (
              <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', marginBottom: '20px' }}>
                <AlertCircle color="#ef4444" size={20} />
                <div>
                  <strong style={{ color: '#ef4444', fontSize: '14px' }}>Connection Error:</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="glass-panel" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '400px' }}>
                <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Connecting to TradingView WebSocket & streaming data...</p>
              </div>
            ) : (
              <div style={{ flex: '1', display: 'flex', minHeight: '0' }}>
                {(() => {
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
                })()}
              </div>
            )}
          </>
        )}`;

const replacementRender = `      {/* Main Workspace */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0' }}>
        <div style={{ display: activeTab === 'fifteen_min' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <FifteenMinForensicContainer />
        </div>
        <div style={{ display: activeTab === 'bhaichara' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <BhaicharaWorkContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        </div>
        <div style={{ display: activeTab === 'dada_thoughts' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <DadaThoughtsContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        </div>
        <div style={{ display: activeTab === 'hourly_updates' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <HourlyUpdatesContainer />
        </div>
        <div style={{ display: activeTab === 'backtest_results' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <BacktestResultsContainer />
        </div>
        <div style={{ display: activeTab === 'scanner' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <ScannerContainer 
            onSymbolSelect={setSymbol} 
            onSwitchToChart={() => setActiveTab('chart')} 
          />
        </div>
        <div style={{ display: activeTab === 'confluences' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <ConfluencesContainer 
            onSymbolSelect={setSymbol} 
            onSwitchToChart={() => setActiveTab('chart')} 
          />
        </div>
        <div style={{ display: activeTab === 'options' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <OptionsChain
            currentSymbol={symbol}
            onSymbolChange={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        </div>
        <div style={{ display: activeTab === 'signals' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <SignalsContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        </div>
        <div style={{ display: activeTab === 'doji' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <DojiContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        </div>
        <div style={{ display: activeTab === 'doji_novol' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <DojiContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
            noVolumeFilter={true}
          />
        </div>
        <div style={{ display: activeTab === 'volume' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <VolumeContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        </div>
        <div style={{ display: activeTab === 'opening_bias' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <OpeningBiasContainer />
        </div>
        <div style={{ display: activeTab === 'early_picks' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <EarlyPicksContainer
            onSymbolSelect={setSymbol}
            onSwitchToChart={() => setActiveTab('chart')}
          />
        </div>
        
        {/* Chart Workspace (default fallback) */}
        <div style={{ display: activeTab === 'chart' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          {error && (
            <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', marginBottom: '20px' }}>
              <AlertCircle color="#ef4444" size={20} />
              <div>
                <strong style={{ color: '#ef4444', fontSize: '14px' }}>Connection Error:</strong>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="glass-panel" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '400px' }}>
              <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Connecting to TradingView WebSocket & streaming data...</p>
            </div>
          ) : (
            <div style={{ flex: '1', display: 'flex', minHeight: '0' }}>
              {(() => {
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
              })()}
            </div>
          )}
        </div>`;

if (!content.includes(targetRender)) {
  console.error('Target render block not found in App.tsx!');
  process.exit(1);
}
content = content.replace(targetRender, replacementRender);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully modified App.tsx to use CSS display:none for instantaneous tab switching!');
