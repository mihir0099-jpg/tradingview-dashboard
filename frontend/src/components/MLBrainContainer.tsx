import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../utils/config';
import { RefreshCw, Brain, TrendingUp, TrendingDown, Zap, Shield, Target, BarChart2, Award, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SynthesizedRule {
  rule_id: string;
  rule_type: string;
  name: string;
  condition: string;
  action: string;
  statistical_win_rate_pct: number | null;
  sample_support_count?: number;
  session_frequency_pct?: number;
  avg_pnl_per_trade?: number;
  confidence_pct: number;
  status: string;
  source: string;
  date_discovered: string;
  expires_after_sessions: number;
  reasoning: string;
  target_symbol?: string;
}

interface SetupRanking {
  category: string;
  wins: number;
  sl: number;
  closed: number;
  total: number;
  winRate: number;
  avgPnL: number;
}

interface SymbolPerf {
  symbol: string;
  total: number;
  wins: number;
  sl: number;
  closed: number;
  win_rate_pct: number;
  total_pnl: number;
  avg_pnl: number;
}

interface TPOStat {
  period: string;
  total: number;
  wins: number;
  sl: number;
  win_rate_pct: number;
  avg_pnl: number;
}

interface SynthResponse {
  ok: boolean;
  generated_at?: string;
  summary?: {
    total_rules_synthesized: number;
    total_trades_analyzed: number;
    total_sessions_analyzed: number;
    dynamic_rules_deduped: { before: number; after: number; issues_fixed: number };
  };
  synthesized_rules: SynthesizedRule[];
  setup_performance_ranking: SetupRanking[];
  symbol_performance: SymbolPerf[];
  tpo_period_empirical_stats: TPOStat[];
}

const RULE_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  NEGATIVE_FILTER:           { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '🚫', label: 'Block Filter' },
  POSITIVE_AMPLIFIER:        { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '⚡', label: 'Amplifier' },
  TIME_FILTER:               { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: '⏱️', label: 'Time Filter' },
  POSITION_MANAGEMENT:       { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🎯', label: 'Position Mgmt' },
  SETUP_PRIORITY:            { color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', icon: '🏆', label: 'Priority Setup' },
  ENTRY_FILTER:              { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: '🔍', label: 'Entry Filter' },
  CONFLUENCE_BOOSTER:        { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: '🔗', label: 'Confluence' },
  INSTRUMENT_PREFERENCE:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: '📊', label: 'Instrument' },
  AUTONOMOUSLY_PROMOTED_NUANCE: { color: '#fde047', bg: 'rgba(253,224,71,0.1)', icon: '🧠', label: 'Auto-Promoted' },
};

const TPO_COLORS: Record<string, string> = {
  A: '#94a3b8', B: '#94a3b8', C: '#10b981', D: '#34d399',
  E: '#22d3ee', F: '#f59e0b', G: '#a855f7', H: '#60a5fa',
  I: '#60a5fa', J: '#60a5fa', K: '#f59e0b', L: '#ef4444', M: '#ef4444'
};

function WinRateBar({ winRate, total }: { winRate: number; total: number }) {
  const color = winRate >= 60 ? '#10b981' : winRate >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${winRate}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 800, color, minWidth: '40px' }}>{winRate}%</span>
      <span style={{ fontSize: '10px', color: '#475569' }}>({total})</span>
    </div>
  );
}

export function MLBrainContainer() {
  const [data, setData] = useState<SynthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEGATIVE_FILTER' | 'POSITIVE_AMPLIFIER' | 'TIME_FILTER' | 'POSITION_MANAGEMENT' | 'SETUP_PRIORITY' | 'CONFLUENCE_BOOSTER'>('ALL');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'setups' | 'symbols' | 'tpo'>('rules');

  const fetchData = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/ml/synthesized-rules?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('ML Brain fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSynthesis = async () => {
    setTriggering(true);
    setTriggerMsg('Mining rules from all data sources...');
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/ml/trigger-synthesis`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        setTriggerMsg(`✅ ${json.message}`);
        await fetchData();
      } else {
        setTriggerMsg(`❌ Error: ${json.error}`);
      }
    } catch (e: any) {
      setTriggerMsg(`❌ ${e.message}`);
    } finally {
      setTriggering(false);
      setTimeout(() => setTriggerMsg(null), 6000);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, []);

  const filteredRules = (data?.synthesized_rules || []).filter(r =>
    activeFilter === 'ALL' || r.rule_type === activeFilter
  );

  const containerStyle: React.CSSProperties = {
    padding: '16px', fontFamily: 'system-ui, sans-serif', color: 'var(--text-primary)', minHeight: '100vh'
  };

  if (loading && !data) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px' }}>
        <RefreshCw size={28} style={{ color: '#a855f7', animation: 'spin 1.2s linear infinite' }} />
        <span style={{ color: '#94a3b8', fontSize: '15px' }}>Loading ML Brain & Synthesized Rules...</span>
      </div>
    );
  }

  const ruleTypeKeys = ['ALL', 'NEGATIVE_FILTER', 'POSITIVE_AMPLIFIER', 'TIME_FILTER', 'POSITION_MANAGEMENT', 'SETUP_PRIORITY', 'CONFLUENCE_BOOSTER'] as const;

  return (
    <div style={containerStyle}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Brain size={22} style={{ color: '#a855f7' }} />
          <div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#a855f7', letterSpacing: '0.5px' }}>
              ML Brain — Autonomous Rule Synthesizer
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
              Mines ALL data sources → Generates statistically-backed trading rules automatically
            </div>
          </div>
        </div>
        <button
          onClick={handleTriggerSynthesis}
          disabled={triggering}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: '1px solid #a855f7',
            background: triggering ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.18)',
            color: '#c084fc', fontSize: '12px', fontWeight: 800, cursor: triggering ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {triggering ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={13} />}
          {triggering ? 'Mining...' : 'Re-Mine Rules Now'}
        </button>
      </div>

      {triggerMsg && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)', fontSize: '12px', fontWeight: 700, color: '#c084fc' }}>
          {triggerMsg}
        </div>
      )}

      {/* ── Summary Strip ── */}
      {data?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          {[
            { label: 'Rules Synthesized', value: data.summary.total_rules_synthesized, icon: '🤖', color: '#a855f7' },
            { label: 'Trades Analyzed', value: data.summary.total_trades_analyzed, icon: '📈', color: '#22d3ee' },
            { label: 'Sessions Scanned', value: data.summary.total_sessions_analyzed, icon: '📅', color: '#10b981' },
            { label: 'Duplicate IDs Fixed', value: data.summary.dynamic_rules_deduped?.issues_fixed || 0, icon: '🔧', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(30,41,59,0.7)', border: `1px solid ${s.color}30` }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sub-Tab Navigation ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '2px' }}>
        {([
          { id: 'rules',   label: `Rules (${data?.synthesized_rules?.length || 0})`,  icon: '🤖' },
          { id: 'setups',  label: `Setup Rankings`,                                    icon: '🏆' },
          { id: 'symbols', label: `Symbol P&L`,                                        icon: '📊' },
          { id: 'tpo',     label: `TPO Empirical`,                                     icon: '⏱️' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '7px 14px', border: 'none', borderRadius: '6px 6px 0 0',
            background: activeTab === tab.id ? 'rgba(168,85,247,0.2)' : 'transparent',
            borderBottom: activeTab === tab.id ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === tab.id ? '#c084fc' : '#64748b',
            fontSize: '12px', fontWeight: 800, cursor: 'pointer'
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: RULES ══════════════ */}
      {activeTab === 'rules' && (
        <>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {ruleTypeKeys.map(f => {
              const cfg = f === 'ALL' ? { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '📋', label: 'All' } : RULE_TYPE_CONFIG[f];
              const count = f === 'ALL' ? (data?.synthesized_rules?.length || 0) : (data?.synthesized_rules || []).filter(r => r.rule_type === f).length;
              if (f !== 'ALL' && count === 0) return null;
              return (
                <button key={f} onClick={() => setActiveFilter(f as any)} style={{
                  padding: '4px 12px', border: `1px solid ${cfg?.color || '#94a3b8'}40`,
                  borderRadius: '20px', background: activeFilter === f ? (cfg?.bg || 'rgba(148,163,184,0.15)') : 'transparent',
                  color: cfg?.color || '#94a3b8', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                }}>
                  {cfg?.icon} {cfg?.label || f} ({count})
                </button>
              );
            })}
          </div>

          {filteredRules.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
              No rules found. Click "Re-Mine Rules Now" to synthesize rules from your trading data.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredRules.map(rule => {
                const cfg = RULE_TYPE_CONFIG[rule.rule_type] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '📋', label: rule.rule_type };
                const isExpanded = expandedRule === rule.rule_id;
                const wr = rule.statistical_win_rate_pct;
                const wrColor = wr === null ? '#94a3b8' : wr >= 60 ? '#10b981' : wr >= 45 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={rule.rule_id} style={{
                    borderRadius: '10px', border: `1px solid ${cfg.color}30`,
                    background: isExpanded ? cfg.bg : 'rgba(15,23,42,0.7)',
                    overflow: 'hidden', transition: 'all 0.2s'
                  }}>
                    {/* Rule header — always visible */}
                    <div
                      onClick={() => setExpandedRule(isExpanded ? null : rule.rule_id)}
                      style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}
                    >
                      <span style={{ fontSize: '16px' }}>{cfg.icon}</span>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: cfg.color }}>{rule.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginTop: '1px' }}>
                          {rule.rule_id} · {rule.source.replace('ML_', '').replace(/_/g, ' ')} · {rule.date_discovered}
                        </div>
                      </div>
                      {/* Win Rate badge */}
                      {wr !== null ? (
                        <span style={{ fontSize: '12px', fontWeight: 900, color: wrColor, background: `${wrColor}18`, border: `1px solid ${wrColor}40`, padding: '3px 10px', borderRadius: '8px' }}>
                          {wr}% WR
                        </span>
                      ) : rule.session_frequency_pct ? (
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#fde047', background: 'rgba(253,224,71,0.12)', border: '1px solid rgba(253,224,71,0.3)', padding: '3px 10px', borderRadius: '8px' }}>
                          {rule.session_frequency_pct}% freq
                        </span>
                      ) : null}
                      {/* Confidence */}
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', minWidth: '70px', textAlign: 'right' }}>
                        {rule.confidence_pct}% conf
                      </span>
                      {/* Type badge */}
                      <span style={{ fontSize: '9.5px', fontWeight: 800, color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {cfg.label}
                      </span>
                      <span style={{ color: '#475569', fontSize: '14px' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${cfg.color}20` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Condition</div>
                            <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(15,23,42,0.6)', padding: '8px', borderRadius: '6px' }}>
                              {rule.condition}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Action</div>
                            <div style={{ fontSize: '11.5px', color: cfg.color, fontWeight: 800, lineHeight: 1.5, background: `${cfg.color}10`, padding: '8px', borderRadius: '6px', border: `1px solid ${cfg.color}25` }}>
                              {rule.action.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>ML Reasoning</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.6 }}>{rule.reasoning}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                          {rule.sample_support_count && <span style={{ fontSize: '10px', color: '#64748b' }}>📊 {rule.sample_support_count} samples</span>}
                          {rule.avg_pnl_per_trade !== undefined && rule.avg_pnl_per_trade !== null && (
                            <span style={{ fontSize: '10px', color: rule.avg_pnl_per_trade >= 0 ? '#10b981' : '#ef4444' }}>
                              💰 Avg P&L ₹{rule.avg_pnl_per_trade}/trade
                            </span>
                          )}
                          {rule.expires_after_sessions && <span style={{ fontSize: '10px', color: '#64748b' }}>⏳ Expires after {rule.expires_after_sessions} sessions</span>}
                          {rule.target_symbol && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🎯 {rule.target_symbol}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════ TAB: SETUP RANKINGS ══════════════ */}
      {activeTab === 'setups' && (
        <div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '12px' }}>
            Setup performance from real live trades — which setup actually makes money
          </div>
          {(data?.setup_performance_ranking || []).map((s, idx) => {
            const winColor = s.winRate >= 55 ? '#10b981' : s.winRate >= 40 ? '#f59e0b' : '#ef4444';
            const pnlColor = s.avgPnL >= 0 ? '#10b981' : '#ef4444';
            const cleanName = s.category.replace(/_/g, ' ');
            return (
              <div key={s.category} style={{
                padding: '14px 16px', borderRadius: '10px', marginBottom: '8px',
                background: 'rgba(15,23,42,0.8)', border: `1px solid ${winColor}25`,
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#475569', minWidth: '20px' }}>#{idx + 1}</span>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#e2e8f0' }}>{cleanName}</div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px' }}>
                    {s.wins}W / {s.sl}SL / {s.closed}C — {s.total} total trades
                  </div>
                  <div style={{ marginTop: '5px' }}><WinRateBar winRate={s.winRate} total={s.total} /></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: pnlColor, fontFamily: 'monospace' }}>
                    {s.avgPnL >= 0 ? '+' : ''}₹{s.avgPnL}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>avg P&L/trade</div>
                </div>
              </div>
            );
          })}
          {(data?.setup_performance_ranking || []).length === 0 && (
            <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Run synthesis to generate setup rankings.</div>
          )}
          {/* Key Insight Box */}
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#ef4444', marginBottom: '6px' }}>⚠️ ML INSIGHT FROM FORENSICS</div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.6 }}>
              <strong style={{ color: '#fca5a5' }}>GEX Put Wall Bounce</strong> appears to be the most common setup (24 trades) but has only 37.5% WR — 
              it is being entered too early without candle close confirmation. PCR Call-Writing Breakdown has 52.9% WR with positive avg P&L.
              <br/><br/>
              <strong style={{ color: '#86efac' }}>Rule synthesized:</strong> Require 5-min candle close + PCR confluence before entering any GEX wall bounce setup.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: SYMBOL P&L ══════════════ */}
      {activeTab === 'symbols' && (
        <div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '12px' }}>
            Per-symbol win rate & P&L from all live paper trades — shows which symbols to focus on
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['Symbol', 'Win Rate', 'W/SL/C', 'Total PnL', 'Avg PnL/Trade', 'ML Signal'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.symbol_performance || []).map(s => {
                  const wrColor = s.win_rate_pct >= 60 ? '#10b981' : s.win_rate_pct >= 40 ? '#f59e0b' : '#ef4444';
                  const pnlColor = s.total_pnl >= 0 ? '#10b981' : '#ef4444';
                  const avgPnlColor = s.avg_pnl >= 0 ? '#10b981' : '#ef4444';
                  let mlSignal = '—';
                  let mlColor = '#475569';
                  if (s.total >= 5 && s.win_rate_pct >= 70) { mlSignal = '⚡ HIGH EDGE'; mlColor = '#10b981'; }
                  else if (s.total >= 5 && s.win_rate_pct < 40) { mlSignal = '🚫 AVOID'; mlColor = '#ef4444'; }
                  else if (s.total >= 2 && s.win_rate_pct === 100) { mlSignal = '🌟 PERFECT (small sample)'; mlColor = '#fde047'; }
                  else { mlSignal = '📊 Monitor'; mlColor = '#64748b'; }
                  return (
                    <tr key={s.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 900, color: '#e2e8f0' }}>{s.symbol}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '50px', height: '5px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${s.win_rate_pct}%`, height: '100%', background: wrColor }} />
                          </div>
                          <span style={{ fontWeight: 900, color: wrColor, fontSize: '12px' }}>{s.win_rate_pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', color: '#94a3b8', fontSize: '11px' }}>
                        <span style={{ color: '#10b981' }}>{s.wins}W</span>
                        {' / '}
                        <span style={{ color: '#ef4444' }}>{s.sl}SL</span>
                        {' / '}
                        <span style={{ color: '#64748b' }}>{s.closed}C</span>
                      </td>
                      <td style={{ padding: '9px 10px', fontWeight: 800, color: pnlColor, fontFamily: 'monospace' }}>
                        {s.total_pnl >= 0 ? '+' : ''}₹{s.total_pnl.toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 10px', fontWeight: 800, color: avgPnlColor, fontFamily: 'monospace', fontSize: '11px' }}>
                        {s.avg_pnl >= 0 ? '+' : ''}₹{s.avg_pnl}
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: '10.5px', fontWeight: 800, color: mlColor }}>{mlSignal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: TPO EMPIRICAL STATS ══════════════ */}
      {activeTab === 'tpo' && (
        <div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '14px' }}>
            Win rates computed from <strong style={{ color: '#94a3b8' }}>actual live paper trades</strong> by TPO period — compares vs backtested win rates from global rules
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {(data?.tpo_period_empirical_stats || []).map(s => {
              const col = TPO_COLORS[s.period] || '#94a3b8';
              const pnlColor = s.avg_pnl >= 0 ? '#10b981' : '#ef4444';
              // Backtest win rates from global rules
              const backtestWR: Record<string, string> = {
                C: '86-92%', E: '86%', F: '86%', G: '88%', L: '84%', A: '62%',
                B: '55%', D: '80%', H: '75%', I: '70%', J: '72%', K: '78%', M: '65%'
              };
              const empiricalColor = s.win_rate_pct >= 60 ? '#10b981' : s.win_rate_pct >= 40 ? '#f59e0b' : '#ef4444';
              return (
                <div key={s.period} style={{
                  padding: '14px', borderRadius: '10px', border: `1px solid ${col}30`,
                  background: 'rgba(15,23,42,0.8)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: `${col}20`, border: `1px solid ${col}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 900, color: col
                    }}>{s.period}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: empiricalColor, fontFamily: 'monospace' }}>{s.win_rate_pct}%</div>
                      <div style={{ fontSize: '9px', color: '#475569', fontWeight: 700 }}>LIVE WR</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>
                    Backtest WR: <span style={{ color: col, fontWeight: 800 }}>{backtestWR[s.period] || '—'}</span>
                  </div>
                  <div style={{ marginBottom: '8px' }}><WinRateBar winRate={s.win_rate_pct} total={s.total} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#475569' }}>
                    <span>{s.wins}W / {s.sl}SL / {s.total - s.wins - s.sl}C</span>
                    <span style={{ color: pnlColor, fontWeight: 800 }}>₹{s.avg_pnl}/trade</span>
                  </div>
                  {s.win_rate_pct < 40 && s.total >= 3 && (
                    <div style={{ marginTop: '6px', fontSize: '9.5px', color: '#ef4444', fontWeight: 800 }}>
                      ⚠️ Below threshold — require 80+ confluence score
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(data?.tpo_period_empirical_stats || []).length === 0 && (
            <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Run synthesis to generate TPO stats.</div>
          )}
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#a855f7', marginBottom: '6px' }}>🤖 ML INSIGHT</div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.6 }}>
              Period <strong style={{ color: '#22d3ee' }}>E (62.5% WR)</strong>, <strong style={{ color: '#f59e0b' }}>K (66.7%)</strong>, and <strong style={{ color: '#f59e0b' }}>L (66.7%)</strong> show the highest live win rates from our forensics —
              consistent with global rules (Period E: 86.4% backtest). 
              Period <strong style={{ color: '#ef4444' }}>H (0% WR, 3 trades)</strong> and <strong style={{ color: '#ef4444' }}>I (0% WR)</strong> are dead zones — trades entered here are systematically failing.
              <strong style={{ color: '#86efac' }}> New rule synthesized:</strong> Block entries in Periods H and I unless confluence score ≥ 80.
            </div>
          </div>
        </div>
      )}

      {!data?.ok && !loading && (
        <div style={{ padding: '32px', textAlign: 'center', borderRadius: '10px', border: '1px dashed #1e293b' }}>
          <Brain size={32} style={{ color: '#334155', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700 }}>No synthesized rules found yet.</div>
          <div style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>Click "Re-Mine Rules Now" to run the ML synthesizer on your trading data.</div>
        </div>
      )}

      {/* Generated at footer */}
      {data?.generated_at && (
        <div style={{ marginTop: '16px', fontSize: '10px', color: '#334155', textAlign: 'center', fontWeight: 700 }}>
          Last synthesized: {new Date(data.generated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </div>
      )}
    </div>
  );
}
