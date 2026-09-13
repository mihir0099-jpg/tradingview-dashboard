import React, { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '../utils/config';

interface Signal {
  tier: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'WATCH' | 'INFO';
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  id: string;
  title: string;
  shortTitle: string;
  winRate: string;
  samples: number;
  avgMove: string;
  action: string;
  conditions: string[];
}

interface MarketState {
  vix: number;
  vixPrev: number;
  vixChgPct: string;
  vixRegime: string;
  dow: string;
  month: string;
  period: string;
  time: string;
  ibHigh: number;
  ibLow: number;
  ibBreakUp: boolean;
  ibBreakDown: boolean;
  todayGap: string;
  prevDayRet: string;
  threeDayBullStreak: boolean;
}

interface LiveSignalsResponse {
  generatedAt: string;
  marketState: MarketState;
  activeSignals: Signal[];
  totalActive: number;
  criticalCount: number;
  highCount: number;
}

const URGENCY_CONFIG: Record<string, { bg: string; border: string; badge: string; badgeBg: string; glow: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.07)', border: '#ef4444', badge: '🚨 CRITICAL', badgeBg: '#ef4444', glow: '0 0 20px rgba(239,68,68,0.25)' },
  HIGH:     { bg: 'rgba(234,179,8,0.07)',  border: '#eab308', badge: '⚡ HIGH',     badgeBg: '#b45309', glow: '0 0 15px rgba(234,179,8,0.2)' },
  MEDIUM:   { bg: 'rgba(99,102,241,0.07)', border: '#6366f1', badge: '📍 MEDIUM',  badgeBg: '#4f46e5', glow: 'none' },
  WATCH:    { bg: 'rgba(148,163,184,0.05)',border: '#94a3b8', badge: '👁 WATCH',   badgeBg: '#475569', glow: 'none' },
  INFO:     { bg: 'rgba(96,165,250,0.05)', border: '#60a5fa', badge: 'ℹ INFO',     badgeBg: '#1d4ed8', glow: 'none' },
};

const VIX_REGIME_COLOR: Record<string, string> = {
  'ultra-low': '#34d399', 'low': '#60a5fa', 'moderate': '#facc15',
  'elevated': '#f97316', 'high+': '#ef4444',
};

export function DataLearningContainer() {
  const [data, setData] = useState<LiveSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(60);

  // Manual override inputs for testing non-market-hours
  const [manualMode, setManualMode] = useState(false);
  const [params, setParams] = useState({
    vix: '', vixPrev: '', spot: '', spotOpen: '', high: '', low: '',
    ibHigh: '', ibLow: '', prevClose: '', prevDayRet: '',
    prevPrevDayRet: '', prevPrevPrevDayRet: '', period: 'C', dow: '', time: '',
    // Period B inputs (10:15 AM bar)
    paHigh: '', paLow: '', pbHigh: '', pbLow: '',
    // Bank Nifty Period A/B levels
    bankPAHigh: '', bankPALow: '', bankHigh: '', bankLow: '',
    // First 15-min candle
    fcBear: '', fcBull: '', fcBig: ''
  });

  const fetchSignals = useCallback(async () => {
    try {
      const backendUrl = getBackendUrl();
      let url = `${backendUrl}/api/live-signals`;
      if (manualMode) {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
        url += '?' + q.toString();
      }
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [manualMode, params]);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60000);
    const countdown = setInterval(() => setRefreshCountdown(c => c <= 1 ? 60 : c - 1), 1000);
    return () => { clearInterval(interval); clearInterval(countdown); };
  }, [fetchSignals]);

  const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, WATCH: 3, INFO: 4 };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100%', padding: '16px', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#f8fafc', letterSpacing: '1px' }}>
            🧠 DATA LEARNING — LIVE SIGNAL SCANNER
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Shows ONLY conditions actively firing right now • Backed by 2,816 sessions (2015–2026)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Refreshes in {refreshCountdown}s
          </span>
          <button onClick={fetchSignals} style={{
            background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
            color: '#818cf8', padding: '6px 12px', borderRadius: '6px',
            fontSize: '12px', cursor: 'pointer', fontWeight: 700
          }}>↻ Refresh Now</button>
          <button onClick={() => setManualMode(m => !m)} style={{
            background: manualMode ? 'rgba(234,179,8,0.15)' : 'rgba(148,163,184,0.1)',
            border: `1px solid ${manualMode ? '#eab308' : '#475569'}`,
            color: manualMode ? '#fbbf24' : '#94a3b8', padding: '6px 12px',
            borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700
          }}>
            {manualMode ? '✏️ Manual Mode ON' : '✏️ Manual Mode'}
          </button>
        </div>
      </div>

      {/* Manual input panel */}
      {manualMode && (
        <div style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid #92400e', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>
            MANUAL INPUT MODE — Enter today's values to test any historical condition
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Row 1: Basic market data */}
            <div>
              <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>Basic Market Data</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '6px' }}>
                {[
                  ['vix', 'VIX Now'], ['vixPrev', 'VIX Yesterday'], ['spot', 'Nifty Spot'],
                  ['spotOpen', 'Today Open'], ['high', 'Day High'], ['low', 'Day Low'],
                  ['prevClose', 'Prev Close'], ['prevDayRet', 'Prev Day Ret%'],
                  ['prevPrevDayRet', 'Day-2 Ret%'], ['prevPrevPrevDayRet', 'Day-3 Ret%'],
                  ['period', 'Period (A-M)'], ['dow', 'Day (Mon/Tue...)'], ['time', 'Time HH:MM']
                ].map(([key, label]) => (
                  <div key={key}>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px' }}>{label}</div>
                    <input value={params[key as keyof typeof params]} onChange={e => setParams(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', borderRadius: '4px', color: '#f1f5f9', padding: '3px 6px', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Row 2: Period A/B levels (for Period B 100% setups) */}
            <div>
              <div style={{ fontSize: '9px', color: '#a78bfa', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>🔑 Period A & B Levels (NIFTY) — for 100% setups</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '6px' }}>
                {[
                  ['paHigh', 'PA High (9:15-10:15)'], ['paLow', 'PA Low'],
                  ['ibHigh', 'IB High (A+B)'], ['ibLow', 'IB Low'],
                  ['pbHigh', 'PB High (10:15 bar)'], ['pbLow', 'PB Low (10:15 bar)']
                ].map(([key, label]) => (
                  <div key={key}>
                    <div style={{ fontSize: '9px', color: '#a78bfa', marginBottom: '2px' }}>{label}</div>
                    <input value={params[key as keyof typeof params]} onChange={e => setParams(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(109,40,217,0.1)', border: '1px solid #6d28d9', borderRadius: '4px', color: '#f1f5f9', padding: '3px 6px', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Row 3: Bank Nifty levels */}
            <div>
              <div style={{ fontSize: '9px', color: '#34d399', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>Bank Nifty Period A & B Levels — for Bank double-confirm</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '6px' }}>
                {[
                  ['bankPAHigh', 'Bank PA High'], ['bankPALow', 'Bank PA Low'],
                  ['bankHigh', 'Bank PB High'], ['bankLow', 'Bank PB Low']
                ].map(([key, label]) => (
                  <div key={key}>
                    <div style={{ fontSize: '9px', color: '#34d399', marginBottom: '2px' }}>{label}</div>
                    <input value={params[key as keyof typeof params]} onChange={e => setParams(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(16,185,129,0.1)', border: '1px solid #065f46', borderRadius: '4px', color: '#f1f5f9', padding: '3px 6px', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Row 4: First candle */}
            <div>
              <div style={{ fontSize: '9px', color: '#fb923c', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>First 15-Min Candle (9:15-9:30 AM) — for FC-based setups</div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  ['fcBull', '🟢 Bullish candle', 'true'],
                  ['fcBear', '🔴 Bearish candle', 'true'],
                  ['fcBig', '📏 Big candle (>0.2%)', 'true']
                ].map(([key, label, val]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={params[key as keyof typeof params] === 'true'}
                      onChange={e => setParams(p => ({ ...p, [key]: e.target.checked ? 'true' : '' }))}
                      style={{ width: '14px', height: '14px' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button onClick={fetchSignals} style={{
            marginTop: '10px', background: '#ca8a04', border: 'none', color: '#fff',
            padding: '7px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700
          }}>▶ RUN SIGNAL SCAN</button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
          <div>Scanning market conditions...</div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '16px', color: '#fca5a5' }}>
          ⚠ Error fetching signals: {error}. Backend may be offline.
        </div>
      )}

      {data && !loading && (
        <>
          {/* Market State Bar */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>VIX</span>
              <span style={{ fontSize: '16px', fontWeight: 900, color: VIX_REGIME_COLOR[data.marketState.vixRegime] || '#f8fafc' }}>
                {data.marketState.vix || '—'}
              </span>
              <span style={{ fontSize: '11px', color: VIX_REGIME_COLOR[data.marketState.vixRegime], background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '1px 6px' }}>
                {data.marketState.vixRegime}
              </span>
              <span style={{ fontSize: '11px', color: data.marketState.vixChgPct?.startsWith('-') ? '#34d399' : '#f87171' }}>
                {data.marketState.vixChgPct}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b' }}>DAY</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>{data.marketState.dow || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b' }}>PERIOD</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa' }}>{data.marketState.period}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b' }}>IB</span>
              <span style={{ fontSize: '11px', color: data.marketState.ibBreakUp ? '#34d399' : data.marketState.ibBreakDown ? '#f87171' : '#64748b' }}>
                {data.marketState.ibBreakUp ? '↑ BROKEN UP' : data.marketState.ibBreakDown ? '↓ BROKEN DOWN' : data.marketState.ibHigh ? 'INTACT' : 'Not set'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b' }}>GAP</span>
              <span style={{ fontSize: '11px', color: data.marketState.todayGap?.startsWith('-') ? '#f87171' : '#34d399' }}>
                {data.marketState.todayGap || '—'}
              </span>
            </div>
            {data.marketState.threeDayBullStreak && (
              <span style={{ fontSize: '11px', background: 'rgba(234,179,8,0.15)', border: '1px solid #92400e', color: '#fbbf24', borderRadius: '4px', padding: '2px 8px' }}>
                ⚠ 3-Day Bull Streak
              </span>
            )}
            <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#334155' }}>
              Updated: {lastRefresh?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          {/* Signal Count Header */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              ACTIVE SIGNALS: <span style={{ color: data.totalActive > 0 ? '#f87171' : '#64748b' }}>{data.totalActive}</span>
            </div>
            {data.criticalCount > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                🚨 {data.criticalCount} CRITICAL
              </span>
            )}
            {data.highCount > 0 && (
              <span style={{ background: '#b45309', color: '#fff', borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                ⚡ {data.highCount} HIGH
              </span>
            )}
          </div>

          {/* No signals state */}
          {data.totalActive === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15,23,42,0.5)', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📡</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>No high-probability conditions firing right now</div>
              <div style={{ fontSize: '12px', color: '#334155' }}>
                Signals will appear automatically when market conditions match any of the 19 historical setups.<br />
                Use Manual Mode to test specific scenarios.
              </div>
            </div>
          )}

          {/* Signal Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.activeSignals.map(signal => {
              const cfg = URGENCY_CONFIG[signal.urgency] || URGENCY_CONFIG.INFO;
              const isLong = signal.direction === 'LONG';
              const isShort = signal.direction === 'SHORT';
              return (
                <div key={signal.id} style={{
                  background: cfg.bg,
                  border: `2px solid ${cfg.border}`,
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: cfg.glow,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Tier stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: cfg.border }} />

                  <div style={{ paddingLeft: '8px' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ background: cfg.badgeBg, color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>
                            {cfg.badge}
                          </span>
                          <span style={{
                            background: isLong ? 'rgba(52,211,153,0.15)' : isShort ? 'rgba(248,113,113,0.15)' : 'rgba(148,163,184,0.1)',
                            color: isLong ? '#34d399' : isShort ? '#f87171' : '#94a3b8',
                            border: `1px solid ${isLong ? '#34d399' : isShort ? '#f87171' : '#475569'}`,
                            borderRadius: '4px', padding: '2px 10px', fontSize: '11px', fontWeight: 800
                          }}>
                            {isLong ? '🟢 LONG / BUY CE' : isShort ? '🔴 SHORT / BUY PE' : '⚪ NEUTRAL'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>Tier {signal.tier}</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', lineHeight: '1.3' }}>{signal.title}</div>
                      </div>
                      {/* Win Rate Badge */}
                      <div style={{ textAlign: 'center', minWidth: '90px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 12px', border: `1px solid ${cfg.border}` }}>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: isLong ? '#34d399' : isShort ? '#f87171' : '#94a3b8', lineHeight: 1 }}>{signal.winRate}</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{signal.samples} sessions</div>
                      </div>
                    </div>

                    {/* Action box */}
                    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px', borderLeft: `3px solid ${cfg.border}` }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase' }}>Action</div>
                      <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5' }}>{signal.action}</div>
                    </div>

                    {/* Stats + Conditions row */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase' }}>Expected Move</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isLong ? '#34d399' : isShort ? '#f87171' : '#94a3b8' }}>{signal.avgMove}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Conditions Met</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {signal.conditions.map((c, i) => (
                            <span key={i} style={{ fontSize: '10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#6ee7b7', borderRadius: '4px', padding: '2px 7px' }}>
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: '24px', background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px 16px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Signal Tier Explanation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px', fontSize: '10px', color: '#64748b' }}>
              <div>🚨 <b style={{color:'#ef4444'}}>CRITICAL</b> = 88%–100% win rate, Period C setups</div>
              <div>⚡ <b style={{color:'#fbbf24'}}>HIGH</b> = 75%–88% win rate, VIX momentum</div>
              <div>📍 <b style={{color:'#818cf8'}}>MEDIUM</b> = 65%–75% win rate, day-start patterns</div>
              <div>👁 <b style={{color:'#94a3b8'}}>WATCH</b> = 60%–65% win rate, bias confirmations</div>
              <div>ℹ <b style={{color:'#60a5fa'}}>INFO</b> = structural context signals</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
