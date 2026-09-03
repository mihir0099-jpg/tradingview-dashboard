import fs from 'fs';

// 1. Update scanner.js intervals (Daily from 15m to 3m, 5m from 5m to 2m)
const scannerPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/scanner.js';
let scannerContent = fs.readFileSync(scannerPath, 'utf8');

const targetScannerInterval = `  // Repeat 5m scan every 5 minutes (300000 ms)
  setInterval(() => {
    queueScan(tvBridge, '5');
  }, 5 * 60 * 1000);

  // Repeat Daily scan every 15 minutes (since daily price changes much slower)
  setInterval(() => {
    queueScan(tvBridge, 'D');
  }, 15 * 60 * 1000);`;

const replacementScannerInterval = `  // Repeat 5m scan every 2 minutes (120000 ms)
  setInterval(() => {
    queueScan(tvBridge, '5');
  }, 2 * 60 * 1000);

  // Repeat Daily scan every 3 minutes (180000 ms)
  setInterval(() => {
    queueScan(tvBridge, 'D');
  }, 3 * 60 * 1000);`;

if (!scannerContent.includes(targetScannerInterval)) {
  console.error('Target scanner intervals not found!');
  process.exit(1);
}
scannerContent = scannerContent.replace(targetScannerInterval, replacementScannerInterval);
fs.writeFileSync(scannerPath, scannerContent, 'utf8');
console.log('Successfully updated background scan intervals in scanner.js');

// 2. Update server.js imports & define manual trigger route
const serverPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/backend/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

const targetServerImport = `import { startScanner, scannerCache, findClosestValidOptionSymbol, fetchCandlesForSymbol } from './scanner.js';`;
const replacementServerImport = `import { startScanner, scannerCache, findClosestValidOptionSymbol, fetchCandlesForSymbol, queueScan } from './scanner.js';`;

if (!serverContent.includes(targetServerImport)) {
  console.error('Target server import not found!');
  process.exit(1);
}
serverContent = serverContent.replace(targetServerImport, replacementServerImport);

// Inject trigger route right next to /api/scanner/results
const targetResultsRoute = `app.get('/api/scanner/results', (req, res) => {`;
const replacementResultsRoute = `app.post('/api/scanner/trigger-scan', (req, res) => {
  const tf = req.query.timeframe || '5';
  console.log(\`[API Trigger Scan] Manual scan requested for timeframe: \${tf}\`);
  queueScan(tvBridge, tf);
  res.json({ success: true, message: \`Scan queued for timeframe \${tf}\` });
});

app.get('/api/scanner/results', (req, res) => {`;

if (!serverContent.includes(targetResultsRoute)) {
  console.error('Results route target not found in server.js!');
  process.exit(1);
}
serverContent = serverContent.replace(targetResultsRoute, replacementResultsRoute);
fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('Successfully added manual trigger-scan route in server.js');

// 3. Update ScannerContainer.tsx with manual trigger API call on refresh
const containerPath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/ScannerContainer.tsx';
let containerContent = fs.readFileSync(containerPath, 'utf8');

const targetRefreshLogic = `  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);`;

const replacementRefreshLogic = `  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);`;

if (!containerContent.includes(targetRefreshLogic)) {
  console.error('Refresh logic target not found in ScannerContainer.tsx!');
  process.exit(1);
}
containerContent = containerContent.replace(targetRefreshLogic, replacementRefreshLogic);

const targetHandleRefresh = `  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };`;

const replacementHandleRefresh = `  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const backendUrl = window.location.port === '5175' ? 'http://localhost:3002' : window.location.origin;
      await fetch(\`\${backendUrl}/api/scanner/trigger-scan?timeframe=\${activeTimeframe}&_t=\${Date.now()}\`, { method: 'POST' });
      // Short delay for backend to queue it up
      await new Promise(r => setTimeout(r, 1000));
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      console.error('Failed to trigger manual scan:', e);
    } finally {
      setIsRefreshing(false);
    }
  };`;

if (!containerContent.includes(targetHandleRefresh)) {
  console.error('Handle manual refresh target not found in ScannerContainer.tsx!');
  process.exit(1);
}
containerContent = containerContent.replace(targetHandleRefresh, replacementHandleRefresh);

// Update Refresh button rendering
const targetButtonRender = `        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>`;
const replacementButtonRender = `        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {(isRefreshing || scannerData.isScanning) && (
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>
              ⚡ Updating scan results...
            </span>
          )}`;

if (!containerContent.includes(targetButtonRender)) {
  console.error('Button render target not found in ScannerContainer.tsx!');
  process.exit(1);
}
containerContent = containerContent.replace(targetButtonRender, replacementButtonRender);

// Replace button itself to make it spin on refresh
const targetButtonSelf = `<button
            onClick={handleManualRefresh}
            className="glass-button"
            style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRadius: '10px', fontWeight: '700', fontSize: '12px' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>`;

const replacementButtonSelf = `<button
            onClick={handleManualRefresh}
            disabled={isRefreshing || scannerData.isScanning}
            className="glass-button"
            style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRadius: '10px', fontWeight: '700', fontSize: '12px', opacity: (isRefreshing || scannerData.isScanning) ? 0.6 : 1 }}
          >
            <RefreshCw size={14} className={(isRefreshing || scannerData.isScanning) ? 'animate-spin' : ''} /> 
            {isRefreshing || scannerData.isScanning ? 'Scanning...' : 'Refresh'}
          </button>`;

if (!containerContent.includes(targetButtonSelf)) {
  console.error('Button self target not found in ScannerContainer.tsx!');
  process.exit(1);
}
containerContent = containerContent.replace(targetButtonSelf, replacementButtonSelf);

fs.writeFileSync(containerPath, containerContent, 'utf8');
console.log('Successfully injected scan speedups and manual refresh trigger into backend and frontend!');
