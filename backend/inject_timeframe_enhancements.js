import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/ScannerContainer.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inject auto-selecting non-empty level logic on timeframe fetch
const targetFetch = `        const res = await fetch(\`\${backendUrl}/api/scanner/results?timeframe=\${activeTimeframe}&_t=\${Date.now()}\`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setScannerData(data);
            setLoading(false);
          }
        }`;

const replacementFetch = `        const res = await fetch(\`\${backendUrl}/api/scanner/results?timeframe=\${activeTimeframe}&_t=\${Date.now()}\`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setScannerData(data);
            setLoading(false);
            
            // Auto-select first level that has stocks if current active level has 0 stocks
            const currentLevelCount = data.results[activeLevel]?.length || 0;
            if (currentLevelCount === 0) {
              const firstNonEmptyLevel = Object.keys(LEVEL_LABELS).find(
                (lvlKey) => data.results[lvlKey] && data.results[lvlKey].length > 0
              );
              if (firstNonEmptyLevel) {
                setActiveLevel(firstNonEmptyLevel);
              }
            }
          }
        }`;

if (!content.includes(targetFetch)) {
  console.error('Target fetch block not found in ScannerContainer.tsx!');
  process.exit(1);
}
content = content.replace(targetFetch, replacementFetch);

// Also inject the logic into the manual refresh fetch block to auto-select levels after manual scan
const targetManualRefresh = `      await fetch(\`\${backendUrl}/api/scanner/trigger-scan?timeframe=\${activeTimeframe}&_t=\${Date.now()}\`, { method: 'POST' });
      // Short delay for backend to queue it up
      await new Promise(r => setTimeout(r, 1000));
      setRefreshKey(prev => prev + 1);`;

const replacementManualRefresh = `      await fetch(\`\${backendUrl}/api/scanner/trigger-scan?timeframe=\${activeTimeframe}&_t=\${Date.now()}\`, { method: 'POST' });
      // Short delay for backend to queue it up
      await new Promise(r => setTimeout(r, 1500));
      setRefreshKey(prev => prev + 1);`;

if (!content.includes(targetManualRefresh)) {
  console.error('Target manual refresh block not found in ScannerContainer.tsx!');
  process.exit(1);
}
content = content.replace(targetManualRefresh, replacementManualRefresh);


// 2. Replace Timeframe Switcher Toggle with high-visibility buttons
const targetSwitcher = `          {/* Timeframe Switcher Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)', gap: '2px' }}>
            <button
              onClick={() => setActiveTimeframe('5')}
              style={{
                background: activeTimeframe === '5' ? 'var(--bg-input)' : 'transparent',
                color: activeTimeframe === '5' ? '#3b82f6' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              5 Min
            </button>
            <button
              onClick={() => setActiveTimeframe('D')}
              style={{
                background: activeTimeframe === 'D' ? 'var(--bg-input)' : 'transparent',
                color: activeTimeframe === 'D' ? '#3b82f6' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              1 Day
            </button>
          </div>`;

const replacementSwitcher = `          {/* Timeframe Switcher Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.08)', gap: '4px' }}>
            <button
              onClick={() => setActiveTimeframe('5')}
              style={{
                background: activeTimeframe === '5' ? '#10b981' : 'transparent',
                color: activeTimeframe === '5' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTimeframe === '5' ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              ⚡ 5 Min (Daily Matrix)
            </button>
            <button
              onClick={() => setActiveTimeframe('D')}
              style={{
                background: activeTimeframe === 'D' ? '#8b5cf6' : 'transparent',
                color: activeTimeframe === 'D' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTimeframe === 'D' ? '0 0 10px rgba(139, 92, 246, 0.3)' : 'none'
              }}
            >
              📅 1 Day (Monthly Matrix)
            </button>
          </div>`;

if (!content.includes(targetSwitcher)) {
  console.error('Target switcher block not found in ScannerContainer.tsx!');
  process.exit(1);
}
content = content.replace(targetSwitcher, replacementSwitcher);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected timeframe switcher visual enhancements and auto-selection logic!');
