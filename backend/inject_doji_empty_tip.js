import fs from 'fs';

const filePath = 'C:/Users/mihir/.gemini/antigravity/scratch/tradingview-dashboard/frontend/src/components/DojiContainer.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetEmptyState = `          ) : (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No stocks matched the Doji criteria for this selection. Click "Rescan Slot" to trigger fresh scan.
            </div>
          )}`;

const replacementEmptyState = `          ) : (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
              <span>No stocks matched the Doji criteria for this selection. Click "Rescan Slot" to trigger fresh scan.</span>
              {!noVolumeFilter && data && data.allDojiStocks && data.allDojiStocks.length > 0 && (
                <div style={{ fontSize: '12px', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '8px 16px', borderRadius: '8px', marginTop: '12px', maxWidth: '450px' }}>
                  💡 <strong>Tip:</strong> {data.allDojiStocks.length} Doji patterns were found without volume constraints today. Switch to the <strong>"Doji (No Vol)"</strong> tab to view them!
                </div>
              )}
            </div>
          )}`;

if (!content.includes(targetEmptyState)) {
  console.error('Target empty state block not found in DojiContainer.tsx!');
  process.exit(1);
}
content = content.replace(targetEmptyState, replacementEmptyState);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected doji container helpful tips!');
