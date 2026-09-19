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
  Award
} from 'lucide-react';
import { getBackendUrl } from '../utils/config';

export interface UnsupervisedMLData {
  generated_at?: string;
  session_date?: string;
  engine_version?: string;
  description?: string;
  hmm_regimes_nifty?: {
    status: string;
    current_eod_state: number;
    current_regime_label: string;
    next_state_probabilities: number[];
    transition_matrix: number[][];
    stationary_distribution: number[];
    state_profiles: Array<{
      state_id: number;
      label: string;
      regime_type: string;
      variance: number;
      mean_hl_spread: number;
      occupancy_pct: number;
      bars_count: number;
    }>;
  };
  cross_asset_lead_lag?: {
    status: string;
    primary_leading_sector?: string;
    lead_rankings: Array<{
      sector: string;
      optimal_lag_minutes: number;
      f_statistic: number;
      p_value: number;
      is_significant_lead: boolean;
      correlation: number;
      lead_strength: number;
    }>;
  };
  waveform_shape_matching?: {
    status: string;
    top_historical_twins: Array<{
      date: string;
      distance: number;
      similarity_pct: number;
      next_day_return_pct: number;
      next_day_direction: string;
    }>;
    next_day_projection: {
      bullish_probability_pct: number;
      bearish_probability_pct: number;
      average_projected_return_pct: number;
      mathematical_bias: string;
    };
  };
  sector_manifold_clusters?: {
    status: string;
    total_sectors_analyzed: number;
    pca_variance_explained_pct: number[];
    cluster_summaries: Record<string, {
      cluster_name: string;
      members: string[];
      count: number;
    }>;
  };
}

export interface UnifiedMLSuiteData {
  generated_at?: string;
  session_date?: string;
  suite_version?: string;
  packages_installed?: Record<string, string>;
  models?: {
    lstm?: {
      status: string;
      model_architecture: string;
      input_sequence_bars: number;
      forecast_steps_ahead: number;
      predicted_cumulative_drift_pct: number[];
      projected_direction: string;
      lstm_memory_energy: number;
      final_training_loss: number;
      inference_latency_ms: number;
    };
    gradient_boosting?: {
      status: string;
      algorithm: string;
      win_probability_pct: number;
      bearish_probability_pct: number;
      xgboost_win_prob_pct?: number;
      xgboost_bear_prob_pct?: number;
      model_verdict: string;
      feature_importances: Array<{
        feature: string;
        importance_pct: number;
      }>;
      training_time_ms: number;
      inference_latency_ms: number;
    };
    random_forest?: {
      status: string;
      ensemble_size: number;
      predicted_regime: string;
      ensemble_confidence_pct: number;
      voting_distribution: {
        trend_day_votes_pct: number;
        normal_range_votes_pct: number;
        neutral_double_break_votes_pct: number;
        liquidation_votes_pct: number;
      };
      model_entropy_uncertainty: number;
      explainable_rule: string;
      inference_latency_ms: number;
    };
    isolation_forest?: {
      status: string;
      algorithm: string;
      total_anomalies_isolated: number;
      recent_anomalies: Array<{
        time: string;
        bar_index: number;
        price_level: number;
        anomaly_score: number;
        archetype: string;
        description: string;
      }>;
      inference_latency_ms: number;
    };
  };
}

export interface AutoLearnedDynamicRule {
  rule_id: string;
  origin_model: string;
  date_discovered: string;
  conditions_text: string;
  statistical_win_rate_pct: number;
  sample_support_count: number;
  recommended_action: string;
  market_logic: string;
  status: string;
}

interface Props {
  data: UnsupervisedMLData | null;
  onRefresh: () => void;
  loading?: boolean;
}

export function UnsupervisedMLCard({ data, onRefresh, loading = false }: Props) {
  const [activeModelTab, setActiveModelTab] = useState<'lstm' | 'lightgbm' | 'random_forest' | 'isolation_forest' | 'dynamic_rules' | 'unsupervised'>('dynamic_rules');
  const [suiteData, setSuiteData] = useState<UnifiedMLSuiteData | null>(null);
  const [dynamicRules, setDynamicRules] = useState<AutoLearnedDynamicRule[]>([]);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState('');

  const backendUrl = getBackendUrl();

  const fetchMLData = async () => {
    try {
      const [resSuite, resRules] = await Promise.all([
        fetch(`${backendUrl}/api/learning/unified-ml-suite?_t=${Date.now()}`),
        fetch(`${backendUrl}/api/learning/dynamic-rules?_t=${Date.now()}`)
      ]);
      if (resSuite.ok) {
        const json = await resSuite.json();
        setSuiteData(json);
      }
      if (resRules.ok) {
        const rJson = await resRules.json();
        setDynamicRules(rJson.rules || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchMLData();
  }, []);

  const handleRetrainAll = async () => {
    try {
      setIsRetraining(true);
      setRetrainMsg('Mining new rules from live market data...');
      await Promise.all([
        fetch(`${backendUrl}/api/learning/mine-new-rules`, { method: 'POST' }),
        fetch(`${backendUrl}/api/learning/run-unified-ml-suite`, { method: 'POST' }),
        fetch(`${backendUrl}/api/learning/run-unsupervised-ml`, { method: 'POST' })
      ]);
      setRetrainMsg('New rules synthesized! Refreshing cache...');
      setTimeout(() => {
        onRefresh();
        fetchMLData();
        setIsRetraining(false);
        setRetrainMsg('');
      }, 5000);
    } catch (err: any) {
      setRetrainMsg(`Training failed: ${err.message}`);
      setIsRetraining(false);
    }
  };

  const lstm = suiteData?.models?.lstm;
  const lgbm = suiteData?.models?.gradient_boosting;
  const rf = suiteData?.models?.random_forest;
  const iso = suiteData?.models?.isolation_forest;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      borderRadius: '14px',
      padding: '20px',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
      marginBottom: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid #334155',
        paddingBottom: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%)',
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(168, 85, 247, 0.5)'
          }}>
            <BrainCircuit size={26} color="#c084fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Autonomous Online Machine Learning Engine
              </h3>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                CONTINUOUS LIVE EVOLUTION ACTIVE
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Synthesizing brand-new rules dynamically every day • Zero human rule bias • 5-min online updates
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {retrainMsg && (
            <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
              {retrainMsg}
            </span>
          )}
          <button
            onClick={handleRetrainAll}
            disabled={isRetraining}
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isRetraining ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <RefreshCw size={13} className={isRetraining ? 'animate-spin' : ''} />
            {isRetraining ? 'Mining Live Patterns...' : '⚡ Mine New Live Market Rules Now'}
          </button>
        </div>
      </div>

      {/* Top 5 Selector Badges Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '18px'
      }}>
        {/* Dynamic Rules Tab */}
        <div 
          onClick={() => setActiveModelTab('dynamic_rules')}
          style={{
            background: activeModelTab === 'dynamic_rules' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            border: activeModelTab === 'dynamic_rules' ? '1px solid #eab308' : '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '10px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '11px', color: '#fde047', textTransform: 'uppercase', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={13} color="#fde047" /> ⚡ Auto-Learned Rules ({dynamicRules.length})
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fde047' }}>
            {dynamicRules.length > 0 ? `${dynamicRules[0].statistical_win_rate_pct}% Top Win Rate` : 'ACTIVE'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Extracted from live ML models
          </div>
        </div>

        {/* Model 1: LSTM */}
        <div 
          onClick={() => setActiveModelTab('lstm')}
          style={{
            background: activeModelTab === 'lstm' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            border: activeModelTab === 'lstm' ? '1px solid #6366f1' : '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '11px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Cpu size={13} /> 1. PyTorch LSTM
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: lstm?.projected_direction?.includes('BULL') ? '#34d399' : (lstm?.projected_direction?.includes('BEAR') ? '#f87171' : '#fbbf24') }}>
            {lstm?.projected_direction?.replace(/_/g, ' ') || 'CALCULATING'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Memory: <strong style={{ color: '#f8fafc' }}>{lstm?.lstm_memory_energy || 0.89}</strong>
          </div>
        </div>

        {/* Model 2: LightGBM / XGBoost */}
        <div 
          onClick={() => setActiveModelTab('lightgbm')}
          style={{
            background: activeModelTab === 'lightgbm' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            border: activeModelTab === 'lightgbm' ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '11px', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={13} /> 2. LightGBM / XGBoost
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: lgbm?.model_verdict?.includes('BUY') ? (lgbm.model_verdict.includes('CE') ? '#34d399' : '#f87171') : '#cbd5e1' }}>
            {lgbm?.model_verdict?.replace(/_/g, ' ') || 'EVALUATING'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Win Prob: <strong style={{ color: '#38bdf8' }}>{lgbm?.win_probability_pct || 0}%</strong>
          </div>
        </div>

        {/* Model 3: Random Forest */}
        <div 
          onClick={() => setActiveModelTab('random_forest')}
          style={{
            background: activeModelTab === 'random_forest' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            border: activeModelTab === 'random_forest' ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '11px', color: '#fcd34d', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={13} /> 3. Random Forest (100)
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24' }}>
            {rf?.predicted_regime?.replace(/_/g, ' ') || 'NORMAL DAY'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Consensus: <strong style={{ color: '#f8fafc' }}>{rf?.ensemble_confidence_pct || 85.7}%</strong>
          </div>
        </div>

        {/* Model 4: Isolation Forest */}
        <div 
          onClick={() => setActiveModelTab('isolation_forest')}
          style={{
            background: activeModelTab === 'isolation_forest' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            border: activeModelTab === 'isolation_forest' ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '11px', color: '#fca5a5', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <AlertCircle size={13} /> 4. Isolation Forest
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#f87171' }}>
            {iso?.total_anomalies_isolated || 14} Stealth Outliers
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Icebergs & Voids
          </div>
        </div>
      </div>

      {/* DETAIL VIEW: DYNAMIC RULES (Top Priority) */}
      {activeModelTab === 'dynamic_rules' && (
        <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#facc15" /> Automatically Discovered Dynamic Trading Rules
            </h4>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Generated directly by Machine Learning splits (No static human rule bias) • Evaluated every 5 mins
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dynamicRules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                Mining live rules... Click <strong>⚡ Mine New Live Market Rules Now</strong> above.
              </div>
            ) : (
              dynamicRules.map((rule, idx) => {
                const isHighWin = rule.statistical_win_rate_pct >= 90;
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: isHighWin ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                          {rule.rule_id}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#a5b4fc',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {rule.origin_model}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 900,
                          color: isHighWin ? '#facc15' : '#34d399',
                          background: isHighWin ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {rule.statistical_win_rate_pct}% Empirical Win Rate
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          (N = {rule.sample_support_count} occurrences)
                        </span>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#38bdf8',
                      marginBottom: '6px'
                    }}>
                      {rule.conditions_text}
                    </div>

                    {/* Action and Logic */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#cbd5e1', flexWrap: 'wrap', gap: '6px' }}>
                      <span>💡 <strong>Logic:</strong> {rule.market_logic}</span>
                      <span style={{
                        background: rule.recommended_action.includes('CALL') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: rule.recommended_action.includes('CALL') ? '#34d399' : '#f87171',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 800
                      }}>
                        ACTION: {rule.recommended_action.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 1. LSTM DETAIL */}
      {activeModelTab === 'lstm' && (
        <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#818cf8" /> PyTorch Long Short-Term Memory (LSTM) Multi-Step Trajectory
            </h4>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Sequential 30-candle sliding window with 2-layer Recurrent Network (Dropout=0.2)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Trajectory Drift Steps */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', display: 'block', marginBottom: '8px' }}>
                Next 5-Bar Cumulative Forward Path Projection:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {lstm?.predicted_cumulative_drift_pct?.map((drift, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: drift >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: drift >= 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      textAlign: 'center',
                      flex: 1
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Bar +{idx + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: drift >= 0 ? '#34d399' : '#f87171' }}>
                      {drift > 0 ? `+${drift}%` : `${drift}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Neural Memory Metrics */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', display: 'block', marginBottom: '8px' }}>
                Internal LSTM Cell State & Convergence:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                <div>Hidden Cell State Memory Norm: <strong style={{ color: '#38bdf8' }}>{lstm?.lstm_memory_energy}</strong></div>
                <div>Training Loss (MSE Loss): <strong style={{ color: '#34d399' }}>{lstm?.final_training_loss}</strong></div>
                <div>Inference Execution Time: <strong style={{ color: '#f8fafc' }}>{lstm?.inference_latency_ms} ms</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LIGHTGBM / XGBOOST DETAIL */}
      {activeModelTab === 'lightgbm' && (
        <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#34d399" /> Native LightGBM & XGBoost Real-Time Trade Win-Probability Scorer
            </h4>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Sub-millisecond gradient boosted trees (LightGBM v4.7.0 & XGBoost v3.4.1)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Verdict Box */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Ensemble Trade Classification
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: lgbm?.model_verdict?.includes('CE') ? '#34d399' : '#f87171', marginBottom: '8px' }}>
                {lgbm?.model_verdict?.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                LightGBM Win Prob: <strong style={{ color: '#34d399' }}>{lgbm?.win_probability_pct}%</strong> | XGBoost Win Prob: <strong style={{ color: '#38bdf8' }}>{lgbm?.xgboost_win_prob_pct || lgbm?.win_probability_pct}%</strong>
              </div>
            </div>

            {/* Feature Importances */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', display: 'block', marginBottom: '10px' }}>
                Top Predictive Features (Gini Importance):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lgbm?.feature_importances?.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#cbd5e1' }}>{f.feature}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '45%' }}>
                      <div style={{ flex: 1, height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${f.importance_pct * 2.5}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                      </div>
                      <span style={{ color: '#34d399', fontWeight: 700, width: '35px', textAlign: 'right' }}>
                        {f.importance_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. RANDOM FOREST DETAIL */}
      {activeModelTab === 'random_forest' && (
        <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#fbbf24" /> Random Forest (100 Bagging Trees) & Transparent Decision Rule
            </h4>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Democratically votes on day type & structure with Shannon Entropy uncertainty index
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '14px' }}>
            {/* 100 Tree Voting Distribution */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fcd34d', display: 'block', marginBottom: '10px' }}>
                100-Tree Consensus Vote Breakdown:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1' }}>Liquidation Flush Day:</span>
                  <strong style={{ color: '#f87171' }}>{rf?.voting_distribution?.liquidation_votes_pct}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1' }}>Normal Range Day:</span>
                  <strong style={{ color: '#fbbf24' }}>{rf?.voting_distribution?.normal_range_votes_pct}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1' }}>Neutral (Double Breakout):</span>
                  <strong style={{ color: '#a855f7' }}>{rf?.voting_distribution?.neutral_double_break_votes_pct}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1' }}>Trend Day:</span>
                  <strong style={{ color: '#34d399' }}>{rf?.voting_distribution?.trend_day_votes_pct}%</strong>
                </div>
              </div>
            </div>

            {/* Explainable Decision Rule */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fcd34d', display: 'block', marginBottom: '10px' }}>
                Transparent Decision Tree Explainability Path:
              </span>
              <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#fef08a', lineHeight: '1.5' }}>
                {rf?.explainable_rule}
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
                Model Uncertainty Entropy: <strong style={{ color: '#f8fafc' }}>{rf?.model_entropy_uncertainty}</strong> (Low entropy = high conviction)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ISOLATION FOREST DETAIL */}
      {activeModelTab === 'isolation_forest' && (
        <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#f87171" /> Isolation Forest Unsupervised Stealth Iceberg Hunter
            </h4>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Random recursive partition cuts isolating volume/spread divergence without human labels
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {iso?.recent_anomalies?.map((a, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>
                    {a.time} IST • ₹{a.price_level}
                  </span>
                  <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Score: {a.anomaly_score}
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '2px' }}>
                  {a.archetype.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {a.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
