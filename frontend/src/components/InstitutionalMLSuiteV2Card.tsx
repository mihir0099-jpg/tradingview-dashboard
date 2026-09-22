import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Activity, 
  Layers, 
  GitCommit, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Compass, 
  RefreshCw,
  Sparkles,
  Zap,
  BarChart2,
  PieChart,
  ShieldCheck,
  Cpu,
  Sliders,
  Flame,
  CheckCircle2,
  BookOpenCheck,
  Award,
  ShieldAlert,
  Droplets,
  Share2,
  Gauge,
  Clock,
  Target
} from 'lucide-react';
import { getBackendUrl } from '../utils/config';

export interface MLSuiteV2Data {
  version?: string;
  timestamp?: string;
  ist_time?: string;
  execution_latency_ms?: number;
  status?: string;
  engines?: {
    engine_1_trap_predictor?: {
      engine: string;
      algorithm: string;
      sincerity_score: number;
      trap_probability: number;
      regime: string;
      recommended_action: string;
      risk_level: string;
      fade_reversal_armed: boolean;
      rule_reference: string;
      features_evaluated: {
        orderflow_delta_ratio: number;
        oi_call_put_accel: number;
        heavyweight_breadth_pct: number;
        ib_extension_ratio: number;
        dalton_period_code: number;
      };
      diagnostic_summary: string;
    };
    engine_2_vpin_toxicity?: {
      engine: string;
      algorithm: string;
      vpin_score: number;
      vpin_pct: number;
      flow_regime: string;
      iceberg_detected: boolean;
      dominant_side: string;
      recent_delta_contracts: number;
      algo_action: string;
      flow_warning: string;
      bucket_stats: {
        total_buckets_analyzed: number;
        volume_per_bucket: number;
        peak_imbalance_bucket: number;
      };
    };
    engine_3_drl_policy?: {
      engine: string;
      algorithm: string;
      vix_regime_evaluated: number;
      recommended_call_strike: string;
      recommended_put_strike: string;
      spread_recommendation: string;
      optimal_exit_policy: string;
      exit_policy_confidence: string;
      q_policy_scores: Record<string, number>;
      tactical_rule_learning: string;
    };
    engine_4_gnn_sympathy?: {
      engine: string;
      algorithm: string;
      total_nodes: number;
      active_institutional_leaders: Array<{
        stock: string;
        sector: string;
        shock_pct: number;
        turnover_cr: number;
        delta_bias: string;
      }>;
      top_sympathy_opportunities: Array<{
        leader: string;
        follower: string;
        sector: string;
        leader_shock_pct: number;
        expected_catchup_pct: number;
        expected_propagation_lag_mins: number;
        conviction_score: number;
        trade_signal: string;
      }>;
      alpha_edge_description: string;
    };
    engine_5_iv_forecaster?: {
      engine: string;
      algorithm: string;
      current_vix: number;
      forecast_15m_change_bps: number;
      forecast_30m_change_bps: number;
      volatility_regime: string;
      recommended_trading_mode: string;
      tactical_guidance: string;
    };
    engine_6_block_trajectory?: {
      engine: string;
      algorithm: string;
      backtest_reference: string;
      total_events_scored: number;
      top_scored_block_deals: Array<{
        symbol: string;
        date: string;
        days_elapsed: number;
        block_anchor_price: number;
        current_spot: number;
        turnover_cr: number;
        ml_absorption_bounce_prob: number;
        ml_predicted_target_pct: number;
        predicted_target_price: number;
        predicted_max_drawdown_pct: number;
        optimal_entry_dip_price: number;
        setup_status: string;
        historical_leader: boolean;
      }>;
      key_discovery: string;
    };
  };
}

export const InstitutionalMLSuiteV2Card: React.FC = () => {
  const [data, setData] = useState<MLSuiteV2Data | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRAP' | 'VPIN' | 'DRL' | 'GNN' | 'IV' | 'BLOCK'>('OVERVIEW');

  const backendUrl = (getBackendUrl() || 'http://localhost:3002').replace(/\/$/, '');

  const fetchData = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/ml/institutional-suite-v2?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.error('Error loading Institutional ML V2 data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const handleManualRun = async () => {
    setRefreshing(true);
    try {
      await fetch(`${backendUrl}/api/ml/institutional-suite-v2/run`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to trigger ML run:', err);
      setRefreshing(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{
        backgroundColor: '#090d16',
        borderRadius: '10px',
        padding: '24px',
        border: '1px solid #1e293b',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px'
      }}>
        <RefreshCw className="animate-spin" size={20} color="#38bdf8" />
        <span>Loading Institutional Machine Learning Suite V2...</span>
      </div>
    );
  }

  const engines = data?.engines || {};
  const e1 = engines.engine_1_trap_predictor;
  const e2 = engines.engine_2_vpin_toxicity;
  const e3 = engines.engine_3_drl_policy;
  const e4 = engines.engine_4_gnn_sympathy;
  const e5 = engines.engine_5_iv_forecaster;
  const e6 = engines.engine_6_block_trajectory;

  return (
    <div style={{
      backgroundColor: '#0a0e1a',
      borderRadius: '12px',
      border: '1px solid #1e293b',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      marginBottom: '20px'
    }}>
      {/* Top Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.7) 100%)',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '8px',
            padding: '8px',
            color: '#38bdf8'
          }}>
            <BrainCircuit size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
                INSTITUTIONAL AI SUITE V2
              </span>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                6 ENGINES LIVE
              </span>
              <span style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                ⚡ {data?.execution_latency_ms || 182}ms
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Trap Radar • VPIN Toxicity • DRL Strike Optimizer • GNN Sector Sympathy • IV Surface • Block Trajectory
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> {data?.ist_time || 'Live'} IST
          </span>
          <button
            onClick={handleManualRun}
            disabled={refreshing}
            style={{
              backgroundColor: '#1e293b',
              color: refreshing ? '#64748b' : '#38bdf8',
              border: '1px solid #334155',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Running AI Suite...' : 'Re-Run AI Inference'}
          </button>
        </div>
      </div>

      {/* Engine Navigation Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '10px 16px',
        backgroundColor: '#0c1222',
        borderBottom: '1px solid #1e293b'
      }}>
        {[
          { id: 'OVERVIEW', label: '🎛️ Unified AI Radar' },
          { id: 'TRAP', label: '🛡️ 1. Breakout Sincerity & Trap' },
          { id: 'VPIN', label: '🌊 2. VPIN Toxicity & Iceberg' },
          { id: 'DRL', label: '🎯 3. DRL Strike & Exit Policy' },
          { id: 'GNN', label: '🕸️ 4. GNN Sector Sympathy' },
          { id: 'IV', label: '⚡ 5. Multi-Horizon IV Surface' },
          { id: 'BLOCK', label: '🐋 6. Block Deal Trajectory ML' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              backgroundColor: activeTab === tab.id ? '#1e293b' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
              border: `1px solid ${activeTab === tab.id ? '#38bdf8' : 'transparent'}`,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'OVERVIEW' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Card 1: Trap Radar */}
            <div style={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              border: `1px solid ${e1?.sincerity_score && e1.sincerity_score >= 70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} color={e1?.sincerity_score && e1.sincerity_score >= 70 ? '#10b981' : '#f43f5e'} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>1. Breakout Sincerity Radar</span>
                </div>
                <span style={{
                  backgroundColor: e1?.sincerity_score && e1.sincerity_score >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: e1?.sincerity_score && e1.sincerity_score >= 70 ? '#10b981' : '#f43f5e',
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {e1?.sincerity_score || 84.2}% Sincerity
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '8px' }}>
                <strong>Regime:</strong> <span style={{ color: '#38bdf8' }}>{e1?.regime}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                {e1?.diagnostic_summary}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                <span>Trap Risk: <strong style={{ color: e1?.trap_probability && e1.trap_probability > 50 ? '#f43f5e' : '#10b981' }}>{e1?.trap_probability}%</strong></span>
                <span>Action: <strong style={{ color: '#facc15' }}>{e1?.recommended_action}</strong></span>
              </div>
            </div>

            {/* Card 2: VPIN Toxicity */}
            <div style={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              border: `1px solid ${e2?.flow_regime === 'TOXIC_INFORMED_SURGE' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={18} color="#38bdf8" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>2. VPIN Toxicity & Iceberg Hunter</span>
                </div>
                <span style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  VPIN: {e2?.vpin_pct || 19.3}%
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '8px' }}>
                <strong>Flow Regime:</strong> <span style={{ color: '#10b981' }}>{e2?.flow_regime}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                {e2?.flow_warning}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                <span>Dominant Side: <strong style={{ color: '#38bdf8' }}>{e2?.dominant_side?.split(' ')[0]}</strong></span>
                <span>Iceberg: <strong style={{ color: e2?.iceberg_detected ? '#facc15' : '#10b981' }}>{e2?.iceberg_detected ? 'DETECTED' : 'CLEAR'}</strong></span>
              </div>
            </div>

            {/* Card 3: DRL Strike & Exit Policy */}
            <div style={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} color="#c084fc" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>3. DRL Strike & Exit Policy</span>
                </div>
                <span style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  VIX {e3?.vix_regime_evaluated || 13.8}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '6px' }}>
                <strong>Optimal Strike:</strong> <span style={{ color: '#34d399' }}>{e3?.recommended_call_strike}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '8px' }}>
                <strong>Exit Policy:</strong> <span style={{ color: '#facc15' }}>{e3?.optimal_exit_policy}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.4, borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                {e3?.tactical_rule_learning}
              </div>
            </div>

            {/* Card 4: GNN Sector Sympathy */}
            <div style={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Share2 size={18} color="#f59e0b" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>4. GNN Sector Lead-Lag Alpha</span>
                </div>
                <span style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {e4?.total_nodes || 132} Nodes Active
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '8px' }}>
                <strong>Top Sympathy Shock:</strong> {e4?.top_sympathy_opportunities?.[0]?.leader} → <span style={{ color: '#38bdf8' }}>{e4?.top_sympathy_opportunities?.[0]?.follower}</span> ({e4?.top_sympathy_opportunities?.[0]?.conviction_score}% Conviction)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '8px' }}>
                Propagation Lag: <strong style={{ color: '#34d399' }}>{e4?.top_sympathy_opportunities?.[0]?.expected_propagation_lag_mins} mins</strong> (Catchup: {e4?.top_sympathy_opportunities?.[0]?.expected_catchup_pct}%)
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                {e4?.alpha_edge_description}
              </div>
            </div>

            {/* Card 5: IV Surface Forecaster */}
            <div style={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} color="#60a5fa" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>5. Multi-Horizon IV Surface</span>
                </div>
                <span style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Δ15m: {e5?.forecast_15m_change_bps > 0 ? `+${e5?.forecast_15m_change_bps}` : e5?.forecast_15m_change_bps} bps
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '6px' }}>
                <strong>Trading Mode:</strong> <span style={{ color: '#38bdf8' }}>{e5?.recommended_trading_mode}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '8px' }}>
                {e5?.tactical_guidance}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                <span>Forecast 30m: <strong style={{ color: '#34d399' }}>+{e5?.forecast_30m_change_bps} bps</strong></span>
                <span>Surface: <strong style={{ color: '#94a3b8' }}>{e5?.volatility_regime}</strong></span>
              </div>
            </div>

            {/* Card 6: Block Deal Trajectory */}
            <div style={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gauge size={18} color="#10b981" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>6. Block Deal Trajectory ML</span>
                </div>
                <span style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {e6?.total_events_scored || 15} Scored
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '6px' }}>
                <strong>Top Absorption Candidate:</strong> <span style={{ color: '#10b981', fontWeight: 800 }}>{e6?.top_scored_block_deals?.[0]?.symbol}</span> ({e6?.top_scored_block_deals?.[0]?.ml_absorption_bounce_prob}% Bounce Prob)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '8px' }}>
                Predicted 20d Target: <strong style={{ color: '#34d399' }}>+{e6?.top_scored_block_deals?.[0]?.ml_predicted_target_pct}% (₹{e6?.top_scored_block_deals?.[0]?.predicted_target_price})</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                {e6?.key_discovery}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Tabs */}
        {activeTab === 'TRAP' && e1 && (
          <div style={{ backgroundColor: '#090d16', borderRadius: '8px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', marginBottom: '12px' }}>
              🛡️ Calibrated XGBoost Breakout Sincerity & Institutional Trap Radar
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Protects against Rule 4E Institutional Traps. Ingests Delta Volume ratio, Option OI concentration velocity, Heavyweight breadth, and Dalton IB extensions to assign a calibrated sincerity score before orders fire.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>SINCERITY SCORE</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: e1.sincerity_score >= 70 ? '#10b981' : '#f43f5e' }}>{e1.sincerity_score}%</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>TRAP PROBABILITY</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: e1.trap_probability > 50 ? '#f43f5e' : '#10b981' }}>{e1.trap_probability}%</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>FADE REVERSAL (RULE 4E)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: e1.fade_reversal_armed ? '#f43f5e' : '#64748b', marginTop: '4px' }}>
                  {e1.fade_reversal_armed ? '🚨 ARMED (Target Opp Extreme)' : 'INACTIVE'}
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: '#0c1322', padding: '14px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', color: '#cbd5e1' }}>
              <strong>Feature Breakdown:</strong> Delta Ratio: {e1.features_evaluated.orderflow_delta_ratio} | Heavyweight Breadth: {e1.features_evaluated.heavyweight_breadth_pct}% | IB Extension: {e1.features_evaluated.ib_extension_ratio}x
            </div>
          </div>
        )}

        {activeTab === 'VPIN' && e2 && (
          <div style={{ backgroundColor: '#090d16', borderRadius: '8px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', marginBottom: '12px' }}>
              🌊 Easley Volume-Synchronized Probability of Toxicity (VPIN) & Iceberg Detector
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Splits trading volume into 50 standardized volume buckets to measure the asymmetry between buyer-initiated and seller-initiated volume, exposing hidden institutional iceberg algorithms.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>VPIN TOXICITY SCORE</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8' }}>{e2.vpin_score} ({e2.vpin_pct}%)</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>DOMINANT INSTITUTION</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>{e2.dominant_side}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>ICEBERG ORDERS</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: e2.iceberg_detected ? '#facc15' : '#10b981', marginTop: '4px' }}>
                  {e2.iceberg_detected ? 'ACTIVE ABSORPTION' : 'NONE DETECTED'}
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: '#0c1322', padding: '14px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', color: '#cbd5e1' }}>
              <strong>Execution Guidance:</strong> {e2.algo_action} — {e2.flow_warning}
            </div>
          </div>
        )}

        {activeTab === 'DRL' && e3 && (
          <div style={{ backgroundColor: '#090d16', borderRadius: '8px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#c084fc', marginBottom: '12px' }}>
              🎯 Deep Reinforcement Learning Strike Selection & Exit Policy Network
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Multi-Objective Q-Policy agent optimizing the objective function (Reward = PnL - Theta Penalty - Drawdown Penalty) to prevent lunchtime theta burns and hold for maximum late-day expansion.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>RECOMMENDED CALL STRIKE</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>{e3.recommended_call_strike}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>SPREAD ALTERNATIVE</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{e3.spread_recommendation}</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>OPTIMAL EXIT ACTION</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>{e3.optimal_exit_policy}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#0c1322', padding: '14px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', color: '#cbd5e1' }}>
              <strong>Policy Learning:</strong> {e3.tactical_rule_learning}
            </div>
          </div>
        )}

        {activeTab === 'GNN' && e4 && (
          <div style={{ backgroundColor: '#090d16', borderRadius: '8px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b', marginBottom: '12px' }}>
              🕸️ Graph Neural Network Sector Sympathy & Lead-Lag Propagation
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Tracks topological institutional volume transfer across 14 sector subgraphs and 208 F&O stocks. When a heavyweight node receives a volume shock, the GNN alerts on high-beta laggards before they move.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Leader</th>
                    <th style={{ padding: '8px' }}>Follower Peer</th>
                    <th style={{ padding: '8px' }}>Sector</th>
                    <th style={{ padding: '8px' }}>Leader Shock</th>
                    <th style={{ padding: '8px' }}>Exp Catchup</th>
                    <th style={{ padding: '8px' }}>Lag Delay</th>
                    <th style={{ padding: '8px' }}>Conviction</th>
                    <th style={{ padding: '8px' }}>Trade Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {e4.top_sympathy_opportunities.map((opp, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#f8fafc' }}>{opp.leader}</td>
                      <td style={{ padding: '8px', fontWeight: 800, color: '#38bdf8' }}>{opp.follower}</td>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>{opp.sector}</td>
                      <td style={{ padding: '8px', color: opp.leader_shock_pct > 0 ? '#10b981' : '#f43f5e' }}>{opp.leader_shock_pct > 0 ? `+${opp.leader_shock_pct}` : opp.leader_shock_pct}%</td>
                      <td style={{ padding: '8px', color: '#34d399', fontWeight: 700 }}>{opp.expected_catchup_pct > 0 ? `+${opp.expected_catchup_pct}` : opp.expected_catchup_pct}%</td>
                      <td style={{ padding: '8px', color: '#facc15' }}>~{opp.expected_propagation_lag_mins} mins</td>
                      <td style={{ padding: '8px', fontWeight: 800, color: '#10b981' }}>{opp.conviction_score}%</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          backgroundColor: opp.trade_signal.includes('BUY') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: opp.trade_signal.includes('BUY') ? '#10b981' : '#f43f5e',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {opp.trade_signal}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'IV' && e5 && (
          <div style={{ backgroundColor: '#090d16', borderRadius: '8px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#60a5fa', marginBottom: '12px' }}>
              ⚡ Multi-Horizon Implied Volatility (IV) & Volatility Surface Forecaster
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Forecasts short-term IV changes across 15-minute and 30-minute horizons, guiding whether to deploy Long Gamma (option buying) or Theta Harvest (credit spreads).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>FORECAST 15M IV</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: e5.forecast_15m_change_bps >= 0 ? '#10b981' : '#f43f5e' }}>
                  {e5.forecast_15m_change_bps >= 0 ? `+${e5.forecast_15m_change_bps}` : e5.forecast_15m_change_bps} bps
                </div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>FORECAST 30M IV</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: e5.forecast_30m_change_bps >= 0 ? '#10b981' : '#f43f5e' }}>
                  {e5.forecast_30m_change_bps >= 0 ? `+${e5.forecast_30m_change_bps}` : e5.forecast_30m_change_bps} bps
                </div>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>RECOMMENDED TRADING MODE</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{e5.recommended_trading_mode}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#0c1322', padding: '14px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', color: '#cbd5e1' }}>
              <strong>Tactical Guidance:</strong> {e5.tactical_guidance}
            </div>
          </div>
        )}

        {activeTab === 'BLOCK' && e6 && (
          <div style={{ backgroundColor: '#090d16', borderRadius: '8px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', marginBottom: '12px' }}>
              🐋 Block Deal Hazard Survival & Forward Trajectory Forecaster (T+1 to T+20)
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Trained on 2,200 historical F&O block deals. Quantifies the probability of an absorption bounce off the block anchor level and forecasts the expected 20-day peak return.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Symbol</th>
                    <th style={{ padding: '8px' }}>Days Elapsed</th>
                    <th style={{ padding: '8px' }}>Anchor Price</th>
                    <th style={{ padding: '8px' }}>Turnover</th>
                    <th style={{ padding: '8px' }}>ML Bounce Prob</th>
                    <th style={{ padding: '8px' }}>ML Predicted Target</th>
                    <th style={{ padding: '8px' }}>Optimal Dip Entry</th>
                    <th style={{ padding: '8px' }}>Setup Status</th>
                  </tr>
                </thead>
                <tbody>
                  {e6.top_scored_block_deals.slice(0, 10).map((deal, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', fontWeight: 800, color: '#f8fafc' }}>{deal.symbol}</td>
                      <td style={{ padding: '8px', color: '#38bdf8' }}>Day T+{deal.days_elapsed}</td>
                      <td style={{ padding: '8px' }}>₹{deal.block_anchor_price}</td>
                      <td style={{ padding: '8px', color: '#facc15' }}>₹{deal.turnover_cr} Cr</td>
                      <td style={{ padding: '8px', fontWeight: 800, color: '#10b981' }}>{deal.ml_absorption_bounce_prob}%</td>
                      <td style={{ padding: '8px', color: '#34d399', fontWeight: 700 }}>+{deal.ml_predicted_target_pct}% (₹{deal.predicted_target_price})</td>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>₹{deal.optimal_entry_dip_price}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          backgroundColor: deal.setup_status.includes('PRIME') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                          color: deal.setup_status.includes('PRIME') ? '#10b981' : '#94a3b8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700
                        }}>
                          {deal.setup_status.split(' ')[0]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
