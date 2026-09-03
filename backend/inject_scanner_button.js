import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/ScannerContainer.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetButton = `          <button
            onClick={handleManualRefresh}
            disabled={scannerData.isScanning}
            style={{
              background: 'var(--bg-input)',
              color: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: scannerData.isScanning ? 0.6 : 1
            }}
          >
            <RefreshCw size={12} className={scannerData.isScanning ? 'spin-anim' : ''} />
            Refresh
          </button>`;

const replacementButton = `          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || scannerData.isScanning}
            style={{
              background: 'var(--bg-input)',
              color: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: (isRefreshing || scannerData.isScanning) ? 0.6 : 1
            }}
          >
            <RefreshCw size={12} className={(isRefreshing || scannerData.isScanning) ? 'animate-spin' : ''} />
            {isRefreshing || scannerData.isScanning ? 'Scanning...' : 'Refresh'}
          </button>`;

if (!content.includes(targetButton)) {
  console.error('Target button block not found!');
  process.exit(1);
}
content = content.replace(targetButton, replacementButton);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated refresh button in ScannerContainer.tsx!');
