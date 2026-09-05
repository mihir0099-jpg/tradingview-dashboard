import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Target, Maximize2, Shield, Activity, Compass, Anchor, Zap, Calendar, Cpu, Radar } from 'lucide-react';

interface TargetItem {
  label: string;
  price: number;
}

interface TimeframePrediction {
  label: string;
  expectedRange: number;
  predictedHigh: number;
  predictedLow: number;
  expectedBody: number;
  expectedUpperWick: number;
  expectedLowerWick: number;
  target1: number;
  target2: number;
  target3: number;
  targetMax: number;
  bearTarget1: number;
  bearTarget2: number;
  bearTarget3: number;
  bearTargetMax: number;
}

interface ActiveRegimeData {
  era: string;
  label: string;
  speed: string;
  calibration: string;
  pinningStrike: number;
  closingDriveProb: string;
}

interface EarlyMoveDetectorData {
  markovState: string;
  markovLabel: string;
  directionalAsymmetry: string;
  earlyWarningBadge: string;
  earlyWarningColor: string;
  earlyWarningStatus: string;
  earlyDirection: string;
  earlyTriggerPrice: number;
  target1Price: number;
  target2Price: number;
  expansionCapPrice: number;
  hurstRegime: string;
  hurstAction: string;
  parkinsonExpectedRange: number;
  expansionMultiplier: string;
}

interface AssetRangeData {
  name: string;
  spot: number;
  open: number;
  prevClose: number;
  changePts: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  ibHigh: number;
  ibLow: number;
  ibRange: number;
  currentRange: number;
  expectedDayRange: number;
  rangeConsumedPct: number;
  expectedHigh: number;
  expectedLow: number;
  m15High: number;
  m15Low: number;
  m15Color: 'GREEN' | 'RED';
  gapPts: number;
  gapPct: number;
  gapType: string;
  gapRetestLevel: number;
  gapStatus: string;
  predictedBias: string;
  predictedHigh: number;
  predictedLow: number;
  keyPivot: number;
  timeWindowContext: string;
  activeRegime?: ActiveRegimeData;
  earlyMoveDetector?: EarlyMoveDetectorData;
  multiTimeframe?: {
    daily: TimeframePrediction;
    weekly: TimeframePrediction;
    monthly: TimeframePrediction;
    yearly: TimeframePrediction;
  };
  bullishTargets: TargetItem[];
  bearishTargets: TargetItem[];
}

interface DayRangeApiResponse {
  timestamp: number;
  istTimeStr: string;
  nifty: AssetRangeData;
  banknifty: AssetRangeData;
}

export function DayRangeContainer() {
  const [data, setData] = useState<DayRangeApiResponse | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<'nifty' | 'banknifty'>('nifty');
  const [selectedHorizon, setSelectedHorizon] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const getBackendUrl = () => {
    return window.location.hostname.endsWith('github.io')
      ? 'https://tradingview-dashboard-1.onrender.com'
      : ((window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : window.location.origin);
  };

  const fetchRangeData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/day-range?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch day range:', err);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchRangeData();
    const interval = setInterval(() => {
      fetchRangeData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
        <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading Early Move Predictor & Day Range...</p>
      </div>
    );
  }

  const asset = selectedAsset === 'nifty' ? data?.nifty : data?.banknifty;
  if (!asset) return null;

  const isUp = asset.changePts >= 0;
  const horizonData = asset.multiTimeframe ? asset.multiTimeframe[selectedHorizon] : null;

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1440px', margin: '0 auto', width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Top Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.15))', padding: '10px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Activity size={24} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Day Range & Early Move Predictor
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Early direction detection, range extension limits, and price targets
            </p>
          </div>
        </div>

        {/* Timeframe Horizon & Asset Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Horizon Selector */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((hz) => (
              <button
                key={hz}
                onClick={() => setSelectedHorizon(hz)}
                style={{
                  background: selectedHorizon === hz ? '#8b5cf6' : 'transparent',
                  color: selectedHorizon === hz ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {hz}
              </button>
            ))}
          </div>

          {/* Asset Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '9px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setSelectedAsset('nifty')}
              style={{
                background: selectedAsset === 'nifty' ? '#3b82f6' : 'transparent',
                color: selectedAsset === 'nifty' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '5px 14px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              NIFTY 50
            </button>
            <button
              onClick={() => setSelectedAsset('banknifty')}
              style={{
                background: selectedAsset === 'banknifty' ? '#3b82f6' : 'transparent',
                color: selectedAsset === 'banknifty' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '5px 14px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              BANKNIFTY
            </button>
          </div>

          <button
            onClick={() => fetchRangeData(true)}
            title="Refresh Live Levels"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{data?.istTimeStr || 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Modern Market Regime Bar */}
      {asset.activeRegime && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="#38bdf8" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em' }}>
              {asset.activeRegime.era}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
              {asset.activeRegime.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#94a3b8' }}>
            <div>
              Speed: <span style={{ color: '#ffffff', fontWeight: 700 }}>{asset.activeRegime.speed}</span>
            </div>
            <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <div>
              Pinning Strike: <span style={{ color: '#facc15', fontWeight: 800 }}>{asset.activeRegime.pinningStrike}</span>
            </div>
            <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <div>
              Calibration: <span style={{ color: '#86efac', fontWeight: 700 }}>{asset.activeRegime.calibration}</span>
            </div>
          </div>
        </div>
      )}

      {/* Early Move Predictor & Directional Asymmetry Radar */}
      {asset.earlyMoveDetector && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          border: `1px solid ${asset.earlyMoveDetector.earlyWarningColor}55`,
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '14px',
          boxShadow: `0 4px 20px ${asset.earlyMoveDetector.earlyWarningColor}15`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Radar size={20} color={asset.earlyMoveDetector.earlyWarningColor} />
              <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Early Move Detector & Directional Radar
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: asset.earlyMoveDetector.earlyWarningColor,
                background: `${asset.earlyMoveDetector.earlyWarningColor}20`,
                border: `1px solid ${asset.earlyMoveDetector.earlyWarningColor}40`,
                padding: '3px 10px',
                borderRadius: '6px'
              }}>
                {asset.earlyMoveDetector.earlyWarningBadge}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '3px 9px',
                borderRadius: '6px'
              }}>
                {asset.earlyMoveDetector.directionalAsymmetry}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#a78bfa',
                background: 'rgba(167, 139, 250, 0.12)',
                padding: '3px 9px',
                borderRadius: '6px'
              }}>
                {asset.earlyMoveDetector.hurstAction}
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px'
          }}>
            {/* Early Trigger */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Breakout Trigger Level</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff', marginTop: '3px' }}>
                {asset.earlyMoveDetector.earlyTriggerPrice.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Status: <span style={{ color: asset.earlyMoveDetector.earlyWarningColor, fontWeight: 700 }}>{asset.earlyMoveDetector.earlyWarningStatus}</span>
              </div>
            </div>

            {/* Target 1 Quick Scale */}
            <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Target 1 (Quick Scale)</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#10b981', marginTop: '3px' }}>
                {asset.earlyMoveDetector.target1Price.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '2px' }}>
                First profit scaling milestone
              </div>
            </div>

            {/* Target 2 Golden Target */}
            <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Target 2 (Primary Runner)</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#60a5fa', marginTop: '3px' }}>
                {asset.earlyMoveDetector.target2Price.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>
                Primary trend continuation target
              </div>
            </div>

            {/* Session Climax Cap */}
            <div style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 700, textTransform: 'uppercase' }}>Session Climax Cap</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#facc15', marginTop: '3px' }}>
                {asset.earlyMoveDetector.expansionCapPrice.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#fde047', marginTop: '2px' }}>
                Expansion limit boundary
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Spot Banner & Session Overview */}
      <div style={{
        background: 'rgba(17, 24, 39, 0.65)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>{asset.name}</span>
          <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace', color: isUp ? '#10b981' : '#f43f5e' }}>
            {asset.spot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 700,
            color: isUp ? '#10b981' : '#f43f5e',
            background: isUp ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            padding: '3px 8px',
            borderRadius: '6px'
          }}>
            {isUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {isUp ? '+' : ''}{asset.changePts} ({isUp ? '+' : ''}{asset.changePct}%)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Open</div>
            <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {asset.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prev Close</div>
            <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {asset.prevClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Central Pivot</div>
            <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: '#facc15' }}>
              {asset.keyPivot.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Horizon-Specific Predicted Range & Candle Synthesis Card */}
      {horizonData && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.5), rgba(15, 23, 42, 0.8))',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#c084fc" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {horizonData.label} Candle Synthesis & Projection
              </span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '3px 10px', borderRadius: '6px' }}>
              Expected Move: {horizonData.expectedRange.toLocaleString('en-IN')} pts
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            {/* Projected High */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Projected {horizonData.label} High</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#10b981', marginTop: '2px' }}>
                {horizonData.predictedHigh.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '2px' }}>
                +{Math.max(0, Math.round(horizonData.predictedHigh - asset.spot))} pts from spot
              </div>
            </div>

            {/* Projected Low */}
            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase' }}>Projected {horizonData.label} Low</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#f43f5e', marginTop: '2px' }}>
                {horizonData.predictedLow.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#fda4af', marginTop: '2px' }}>
                -{Math.max(0, Math.round(asset.spot - horizonData.predictedLow))} pts from spot
              </div>
            </div>

            {/* Expected Body Size */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Expected Body Size</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#60a5fa', marginTop: '2px' }}>
                {horizonData.expectedBody.toLocaleString('en-IN')} pts
              </div>
              <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>
                Central expansion mass
              </div>
            </div>

            {/* Expected Wick Tails */}
            <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 700, textTransform: 'uppercase' }}>Expected Shadow Tails</div>
              <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#facc15', marginTop: '4px' }}>
                ▲ {horizonData.expectedUpperWick} pts | ▼ {horizonData.expectedLowerWick} pts
              </div>
              <div style={{ fontSize: '11px', color: '#fde047', marginTop: '2px' }}>
                Upper & lower test zones
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantitative Prediction Cards (Intraday) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginBottom: '14px'
      }}>
        {/* Directional Prediction Bias */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Directional Prediction</span>
            <Compass size={15} color="#60a5fa" />
          </div>
          <div style={{
            fontSize: '17px',
            fontWeight: 800,
            color: asset.predictedBias.includes('BULLISH') ? '#10b981' : (asset.predictedBias.includes('BEARISH') ? '#f43f5e' : '#facc15')
          }}>
            {asset.predictedBias}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            15m Candle: <span style={{ fontWeight: 700, color: asset.m15Color === 'GREEN' ? '#10b981' : '#f43f5e' }}>{asset.m15Color}</span>
          </div>
        </div>

        {/* Predicted Day High */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Predicted Day High</span>
            <TrendingUp size={15} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', color: '#10b981' }}>
            {asset.predictedHigh.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Distance: +{Math.max(0, Math.round(asset.predictedHigh - asset.spot))} pts
          </div>
        </div>

        {/* Predicted Day Low */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Predicted Day Low</span>
            <TrendingDown size={15} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', color: '#f43f5e' }}>
            {asset.predictedLow.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Distance: -{Math.max(0, Math.round(asset.spot - asset.predictedLow))} pts
          </div>
        </div>

        {/* Overnight Gap Retest Magnet */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gap Retest Level</span>
            <Zap size={15} color="#facc15" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'monospace', color: '#facc15' }}>
            {asset.gapRetestLevel.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: asset.gapStatus.includes('FILLED') ? '#10b981' : '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
            {asset.gapType} • {asset.gapStatus}
          </div>
        </div>
      </div>

      {/* 4 Range Summary Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '14px'
      }}>
        {/* Expected Total Day Range */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Day Range</span>
            <Maximize2 size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: '#60a5fa' }}>
            {asset.expectedDayRange} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Projected total session expansion
          </div>
        </div>

        {/* Current Range Formed */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Range</span>
            <Activity size={16} color="#c084fc" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: '#c084fc' }}>
            {asset.currentRange} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            High: {asset.dayHigh.toLocaleString('en-IN')} | Low: {asset.dayLow.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Initial Balance (IB) Range */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Initial Balance (IB)</span>
            <Anchor size={16} color="#facc15" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: '#facc15' }}>
            {asset.ibRange} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            IB High: {asset.ibHigh.toLocaleString('en-IN')} | IB Low: {asset.ibLow.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Range Consumed Percentage */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Range Consumed</span>
            <Target size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: asset.rangeConsumedPct > 85 ? '#f43f5e' : (asset.rangeConsumedPct > 60 ? '#facc15' : '#34d399') }}>
            {asset.rangeConsumedPct}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            {asset.rangeConsumedPct >= 100 ? 'Expansion exhausted' : `${Math.round(asset.expectedDayRange - asset.currentRange)} pts remaining`}
          </div>
        </div>
      </div>

      {/* Visual Range Progress Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '14px 20px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Intraday Range Utilization</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {asset.currentRange} / {asset.expectedDayRange} pts ({asset.rangeConsumedPct}%)
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, asset.rangeConsumedPct)}%`,
            height: '100%',
            background: asset.rangeConsumedPct > 85 
              ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
              : 'linear-gradient(90deg, #3b82f6, #10b981)',
            borderRadius: '4px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Target Ladders (Bullish & Bearish) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Bullish Continuation Targets */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '14px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.01em' }}>
                {selectedHorizon === 'daily' ? 'Bullish Extension Targets' : `${horizonData?.label} Bullish Ladder`}
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6ee7b7', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Above {selectedHorizon === 'daily' ? asset.ibHigh : asset.spot}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(selectedHorizon === 'daily' ? asset.bullishTargets : [
              { label: `${horizonData?.label} Target 1 (0.382x)`, price: horizonData?.target1 || 0 },
              { label: `${horizonData?.label} Target 2 (0.618x)`, price: horizonData?.target2 || 0 },
              { label: `${horizonData?.label} Target 3 (1.000x)`, price: horizonData?.target3 || 0 },
              { label: `${horizonData?.label} Extended Max (1.618x)`, price: horizonData?.targetMax || 0 }
            ]).map((item, idx) => {
              const diffPts = Math.round(item.price - asset.spot);
              const isHit = asset.spot >= item.price;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isHit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: isHit ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isHit ? '#10b981' : '#64748b'
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isHit ? '#6ee7b7' : 'var(--text-secondary)' }}>
                      {item.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: isHit ? '#10b981' : 'var(--text-primary)' }}>
                      {item.price.toLocaleString('en-IN')}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      color: isHit ? '#10b981' : '#94a3b8',
                      minWidth: '55px',
                      textAlign: 'right'
                    }}>
                      {isHit ? 'REACHED' : `+${diffPts} pts`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bearish Breakdown Targets */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '14px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={18} color="#f43f5e" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f43f5e', letterSpacing: '-0.01em' }}>
                {selectedHorizon === 'daily' ? 'Bearish Breakdown Targets' : `${horizonData?.label} Bearish Ladder`}
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fda4af', background: 'rgba(244, 63, 94, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Below {selectedHorizon === 'daily' ? asset.ibLow : asset.spot}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(selectedHorizon === 'daily' ? asset.bearishTargets : [
              { label: `${horizonData?.label} Target 1 (0.382x)`, price: horizonData?.bearTarget1 || 0 },
              { label: `${horizonData?.label} Target 2 (0.618x)`, price: horizonData?.bearTarget2 || 0 },
              { label: `${horizonData?.label} Target 3 (1.000x)`, price: horizonData?.bearTarget3 || 0 },
              { label: `${horizonData?.label} Extended Max (1.618x)`, price: horizonData?.bearTargetMax || 0 }
            ]).map((item, idx) => {
              const diffPts = Math.round(asset.spot - item.price);
              const isHit = asset.spot <= item.price;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isHit ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: isHit ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isHit ? '#f43f5e' : '#64748b'
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isHit ? '#fda4af' : 'var(--text-secondary)' }}>
                      {item.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: isHit ? '#f43f5e' : 'var(--text-primary)' }}>
                      {item.price.toLocaleString('en-IN')}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      color: isHit ? '#f43f5e' : '#94a3b8',
                      minWidth: '55px',
                      textAlign: 'right'
                    }}>
                      {isHit ? 'REACHED' : `-${diffPts} pts`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
