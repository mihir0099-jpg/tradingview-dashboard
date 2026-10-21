import React, { useState, useEffect, useCallback } from 'react';

interface FailureReasons {
  [key: string]: number;
}

interface Prediction {
  signal: string;
  confidence: number;
  strike: number | null;
  atmStrike: number | null;
  avgExpectedMove?: number;
  avgLossIfFailed?: number;
  winRate?: number;
  failRate?: number;
  sampleCount?: number;
  workedCount?: number;
  failedCount?: number;
  flatCount?: number;
  isHighConfidence?: boolean;
  reason?: string;
  failureInsight?: string;
  wallStatus?: string | null;
  topFailureReason?: string | null;
  failureReasons?: FailureReasons;
  winRate60?: number | null;
  wallApproach?: string;
  dominantMigDir?: string;
  tpoPeriod?: string;
  samplesCollected?: number;
  samplesNeeded?: number;
  todaySamples?: number;
  scenarioKey?: string;
  lastUpdated?: string;
}

interface Rule {
  key: string;
  symbol: string;
  wallApproach: string;
  tpoPeriod: string;
  migrationDirection: string;
  signal: string;
  sampleCount: number;
  workedCount: number;
  failedCount: number;
  winRate: number;
  failRate: number;
  avgPtsOnWin: number;
  avgPtsOnFail: number;
  topFailureReason: string | null;
  failureReasons: FailureReasons;
  wallHoldRate: number | null;
  isHighConfidence: boolean;
  description: string;
  sampleDates: string[];
  lastUpdated: string;
}

interface RulesData {
  rules: Rule[];
  totalRules: number;
  highConfidenceRules: number;
  totalObservations: number;
  evaluatedObservations: number;
  lastCrystallized: string | null;
}

interface LiveAlert {
  id: string;
  symbol: string;
  timestamp: string;
  istTime: string;
  setup: string;
  signal: string;
  strike: number;
  spotPrice: number;
  callWall: number;
  putWall: number;
  tpoPeriod: string;
  winRate: string;
  avgExpectedMove: string;
  action: string;
  description: string;
}

interface GexAutoRulesFeedProps {
  symbol: string;
  backendUrl?: string;
}

const SIGNAL_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  BUY_CE:       { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',  icon: '🟢', label: 'BUY CALL (CE)' },
  BUY_PE:       { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)',  icon: '🔴', label: 'BUY PUT (PE)' },
  HOLD:         { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', icon: '🟡', label: 'HOLD / WAIT' },
  LEARNING:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.3)', icon: '🤖', label: 'LEARNING...' },
  MARKET_CLOSED:{ color: '#6b7280', bg: 'rgba(107,114,128,0.10)',border: 'rgba(107,114,128,0.3)',icon: '🌙', label: 'MARKET CLOSED' },
  NO_DATA:      { color: '#6b7280', bg: 'rgba(107,114,128,0.10)',border: 'rgba(107,114,128,0.3)',icon: '⚪', label: 'NO DATA' },
};

const FAILURE_LABELS: Record<string, string> = {
  PUT_WALL_BROKE:            'Put Wall broke (no support)',
  CALL_WALL_BROKE:           'Call Wall broke (resistance failed)',
  NO_FOLLOW_THROUGH:         'Dots moved but price didn\'t follow',
  LUNCHTIME_TRAP:            'G-period lunchtime trap / fake move',
  OPENING_VOLATILITY_NOISE:  'Opening period noise (A/B period)',
  WRONG_DIRECTION_CONTINUATION: 'Continuation in wrong direction',
};

function formatSignalLabel(signal: string) {
  return SIGNAL_CONFIG[signal]?.label ?? signal.replace(/_/g, ' ');
}

function formatWallApproach(wa: string) {
  return wa?.replace(/_/g, ' ').toLowerCase() ?? '';
}

function formatMigDir(dir: string) {
  if (dir === 'RIGHTWARD') return '→ Rightward (bullish)';
  if (dir === 'LEFTWARD') return '← Leftward (bearish)';
  return '— Stable';
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${value}%`, height: '100%', background: color,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ color, fontWeight: 700, fontSize: 13, minWidth: 34 }}>{value}%</span>
    </div>
  );
}

export function GexAutoRulesFeed({ symbol, backendUrl }: GexAutoRulesFeedProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [rulesData, setRulesData] = useState<RulesData | null>(null);
  const [activeAlert, setActiveAlert] = useState<LiveAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<string>('');
  const [showRules, setShowRules] = useState(false);
  const [showFailure, setShowFailure] = useState(false);

  const getBase = useCallback(() => {
    if (backendUrl) return backendUrl;
    const proto = window.location.protocol;
    const host = window.location.hostname;
    return `${proto}//${host}:3002`;
  }, [backendUrl]);

  const fetchData = useCallback(async () => {
    try {
      const base = getBase();
      const [predRes, rulesRes, alertsRes] = await Promise.all([
        fetch(`${base}/api/gex/advance-prediction?symbol=${symbol}`),
        fetch(`${base}/api/gex/auto-rules?symbol=${symbol}`),
        fetch(`${base}/api/gex/live-alerts?symbol=${symbol}`),
      ]);
      if (predRes.ok) {
        const p = await predRes.json();
        if (p.success) setPrediction(p);
      }
      if (rulesRes.ok) {
        const r = await rulesRes.json();
        if (r.success) setRulesData(r);
      }
      if (alertsRes.ok) {
        const al = await alertsRes.json();
        if (al.success && al.alerts && al.alerts.length > 0) {
          setActiveAlert(al.alerts[0]);
        } else {
          setActiveAlert(null);
        }
      }
      const now = new Date();
      const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      setLastFetch(ist.toISOString().slice(11, 16) + ' IST');
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [symbol, getBase]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 30 * 1000); // refresh every 30s
    return () => clearInterval(timer);
  }, [fetchData]);

  const sigCfg = SIGNAL_CONFIG[prediction?.signal ?? 'NO_DATA'] ?? SIGNAL_CONFIG['NO_DATA'];

  return (
    <div style={{
      margin: '8px 0 0 0',
      background: 'rgba(10,12,20,0.97)',
      border: `1px solid ${activeAlert ? '#ef4444' : sigCfg.border}`,
      borderRadius: 10,
      overflow: 'hidden',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      boxShadow: activeAlert ? '0 0 20px rgba(239,68,68,0.25)' : 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>GEX AUTO-LEARNER</span>
          <span style={{
            background: 'rgba(96,165,250,0.15)', color: '#60a5fa',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600,
          }}>{symbol}</span>
          {rulesData && (
            <span style={{
              background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
              borderRadius: 4, padding: '1px 7px', fontSize: 11,
            }}>
              {rulesData.totalObservations} obs · {rulesData.totalRules} rules · {rulesData.highConfidenceRules} 🔥
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastFetch && (
            <span style={{ color: '#64748b', fontSize: 11 }}>Updated {lastFetch}</span>
          )}
          <button
            onClick={fetchData}
            style={{
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
              color: '#60a5fa', borderRadius: 4, padding: '2px 8px',
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
            }}
          >↻ Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Loading prediction...
        </div>
      ) : (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ── 🚨 100% HIGHEST-CONVICTION ALERT BANNER (CALL WALL FADE) ── */}
          {activeAlert && (
            <div style={{
              background: 'linear-gradient(90deg, rgba(239,68,68,0.22) 0%, rgba(185,28,28,0.35) 100%)',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 0 16px rgba(239,68,68,0.35)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🚨</span>
                <div>
                  <div style={{ color: '#fca5a5', fontWeight: 900, fontSize: 13.5, letterSpacing: 0.3 }}>
                    100% HIGHEST-CONVICTION SETUP DETECTED: {activeAlert.symbol} CALL WALL FADE!
                  </div>
                  <div style={{ color: '#ffffff', fontSize: 12.5, marginTop: 3 }}>
                    👉 <strong style={{ color: '#f87171' }}>{activeAlert.action}</strong> · Historical Win Rate: <strong style={{ color: '#4ade80' }}>{activeAlert.winRate}</strong> ({activeAlert.avgExpectedMove})
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: 11, marginTop: 2 }}>
                    Institutional tape: Leftward March active at Call Wall {activeAlert.callWall}. Dealers dumping long hedges.
                  </div>
                </div>
              </div>
              <span style={{
                background: '#b91c1c', color: '#ffffff',
                padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 900,
                fontFamily: 'ui-monospace, monospace'
              }}>
                {activeAlert.istTime}
              </span>
            </div>
          )}

          {/* ── LIVE SIGNAL BLOCK ── */}
          {prediction && (
            <div style={{
              background: sigCfg.bg,
              border: `1px solid ${sigCfg.border}`,
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                {/* Signal */}
                <div style={{ minWidth: 160 }}>
                  <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, marginBottom: 2, letterSpacing: 0.5 }}>LIVE SIGNAL</div>
                  <div style={{ color: sigCfg.color, fontSize: 15, fontWeight: 800 }}>
                    {sigCfg.icon} {formatSignalLabel(prediction.signal)}
                  </div>
                  {prediction.strike && (
                    <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>
                      Strike: <strong style={{ color: sigCfg.color }}>₹{prediction.strike.toLocaleString()}</strong>
                      {prediction.atmStrike && prediction.atmStrike !== prediction.strike && (
                        <span style={{ color: '#64748b', fontSize: 11 }}> (ATM: {prediction.atmStrike})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Confidence + stats */}
                {prediction.signal !== 'LEARNING' && prediction.signal !== 'MARKET_CLOSED' && prediction.signal !== 'NO_DATA' ? (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 }}>CONFIDENCE</div>
                    <ConfidenceBar value={prediction.confidence} color={sigCfg.color} />
                    <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                      {prediction.avgExpectedMove != null && (
                        <span style={{ color: '#22c55e', fontSize: 12 }}>
                          ✅ Avg Win: <strong>+{prediction.avgExpectedMove} pts</strong>
                        </span>
                      )}
                      {prediction.avgLossIfFailed != null && prediction.avgLossIfFailed > 0 && (
                        <span style={{ color: '#ef4444', fontSize: 12 }}>
                          ❌ Avg Loss: <strong>-{prediction.avgLossIfFailed} pts</strong>
                        </span>
                      )}
                      {prediction.sampleCount != null && (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>
                          📊 <strong>{prediction.workedCount}/{prediction.sampleCount}</strong> hits
                          {prediction.failedCount != null && prediction.failedCount > 0 && ` · ${prediction.failedCount} fails`}
                        </span>
                      )}
                      {prediction.winRate60 != null && (
                        <span style={{ color: '#a78bfa', fontSize: 12 }}>
                          60min: <strong>{prediction.winRate60}%</strong>
                        </span>
                      )}
                    </div>
                    {prediction.isHighConfidence && (
                      <div style={{
                        marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#22c55e',
                      }}>🔥 HIGH CONFIDENCE — ≥70% WR + ≥10 samples</div>
                    )}
                  </div>
                ) : prediction.signal === 'LEARNING' ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#60a5fa', fontSize: 12, marginBottom: 4 }}>
                      📡 Collecting data... <strong>{prediction.samplesCollected ?? 0}/{prediction.samplesNeeded ?? 8} samples</strong> for this pattern
                    </div>
                    <div style={{
                      height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 4,
                    }}>
                      <div style={{
                        width: `${Math.min(100, ((prediction.samplesCollected ?? 0) / (prediction.samplesNeeded ?? 8)) * 100)}%`,
                        height: '100%', background: '#60a5fa', borderRadius: 3,
                      }} />
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>
                      Today: {prediction.todaySamples ?? 0} obs · Needs {prediction.samplesNeeded ?? 8} total to crystallize rule
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Reason */}
              {prediction.reason && prediction.signal !== 'LEARNING' && (
                <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6 }}>
                  📌 <strong style={{ color: '#cbd5e1' }}>Why:</strong> {prediction.reason}
                </div>
              )}

              {/* Context tags */}
              {(prediction.wallApproach || prediction.dominantMigDir || prediction.tpoPeriod) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {prediction.wallApproach && (
                    <span style={{ background: 'rgba(255,255,255,0.07)', color: '#cbd5e1', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                      📍 {formatWallApproach(prediction.wallApproach)}
                    </span>
                  )}
                  {prediction.dominantMigDir && (
                    <span style={{ background: 'rgba(255,255,255,0.07)', color: '#cbd5e1', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                      {formatMigDir(prediction.dominantMigDir)}
                    </span>
                  )}
                  {prediction.tpoPeriod && (
                    <span style={{ background: 'rgba(255,255,255,0.07)', color: '#f59e0b', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                      Period {prediction.tpoPeriod}
                    </span>
                  )}
                </div>
              )}

              {/* Failure section toggle */}
              {prediction.topFailureReason && (
                <div style={{ marginTop: 6 }}>
                  <button
                    onClick={() => setShowFailure(f => !f)}
                    style={{
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#f87171', borderRadius: 4, padding: '2px 8px',
                      cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    {showFailure ? '▲' : '▼'} Why it fails ({prediction.failedCount} times)
                  </button>
                  {showFailure && prediction.failureReasons && (
                    <div style={{
                      marginTop: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 6, padding: '8px 10px',
                    }}>
                      <div style={{ color: '#f87171', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                        ❌ FAILURE BREAKDOWN
                      </div>
                      {Object.entries(prediction.failureReasons).map(([reason, count]) => (
                        <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ color: '#fca5a5', fontSize: 12 }}>
                            {FAILURE_LABELS[reason] ?? reason.replace(/_/g, ' ')}
                          </span>
                          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>{count}×</span>
                        </div>
                      ))}
                      {prediction.failureInsight && (
                        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                          💡 {prediction.failureInsight}
                        </div>
                      )}
                      {prediction.wallStatus && (
                        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                          🧱 {prediction.wallStatus}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── LEARNED RULES TABLE ── */}
          {rulesData && rulesData.rules && rulesData.rules.length > 0 && (
            <div>
              <button
                onClick={() => setShowRules(r => !r)}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', borderRadius: 6, padding: '5px 12px',
                  cursor: 'pointer', fontSize: 12, width: '100%', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span>📚 Learned Rules ({rulesData.totalRules} total · {rulesData.highConfidenceRules} 🔥 high confidence)</span>
                <span>{showRules ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {showRules && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {rulesData.rules.slice(0, 12).map(rule => {
                    const rc = SIGNAL_CONFIG[rule.signal] ?? SIGNAL_CONFIG['HOLD'];
                    return (
                      <div key={rule.key} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${rule.isHighConfidence ? rc.border : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 6, padding: '6px 10px',
                        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                      }}>
                        {/* Signal badge */}
                        <span style={{
                          color: rc.color, background: rc.bg,
                          border: `1px solid ${rc.border}`, borderRadius: 4,
                          padding: '1px 7px', fontSize: 11, fontWeight: 700, minWidth: 70, textAlign: 'center',
                        }}>
                          {rc.icon} {rule.signal.replace(/_/g, ' ')}
                        </span>
                        {/* Description */}
                        <span style={{ color: '#cbd5e1', fontSize: 12, flex: 1 }}>{rule.description}</span>
                        {/* Win rate */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>✅ {rule.winRate}%</span>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>({rule.workedCount}/{rule.sampleCount})</span>
                          {rule.avgPtsOnWin > 0 && (
                            <span style={{ color: '#22c55e', fontSize: 11 }}>+{rule.avgPtsOnWin}pts</span>
                          )}
                          {rule.failedCount > 0 && (
                            <span style={{ color: '#ef4444', fontSize: 11 }}>❌ {rule.failRate}%</span>
                          )}
                          {rule.isHighConfidence && <span title="High confidence rule">🔥</span>}
                        </div>
                      </div>
                    );
                  })}
                  {rulesData.rules.length > 12 && (
                    <div style={{ color: '#64748b', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>
                      + {rulesData.rules.length - 12} more rules as engine learns more data
                    </div>
                  )}
                  {rulesData.lastCrystallized && (
                    <div style={{ color: '#475569', fontSize: 10, textAlign: 'right', marginTop: 2 }}>
                      Last crystallized: {new Date(rulesData.lastCrystallized).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No rules yet */}
          {rulesData && (!rulesData.rules || rulesData.rules.length === 0) && (
            <div style={{
              background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)',
              borderRadius: 8, padding: '10px 14px', textAlign: 'center',
            }}>
              <div style={{ color: '#60a5fa', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                🤖 Engine is Learning...
              </div>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                {rulesData.totalObservations > 0
                  ? `${rulesData.totalObservations} observations collected · Need ${Math.max(0, 8 - rulesData.evaluatedObservations)} more evaluated samples per scenario to crystallize first rules`
                  : 'Observations will begin at market open (9:15 AM IST). Rules appear after 7–10 trading days.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
