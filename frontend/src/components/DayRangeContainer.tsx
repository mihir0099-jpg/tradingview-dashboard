import { getBackendUrl } from '../utils/config';
import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Target, Maximize2, Shield, Activity, Compass, Anchor, Zap, Calendar, Cpu, Radar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

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

interface CanaryItem {
  name: string;
  status: string;
  alert: boolean;
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
  macroState?: string;
  macroBadge?: string;
  macroColor?: string;
  canaries?: CanaryItem[];
  learnedSafeguards?: {
    candleCloseFilter: { required: boolean; label: string; status: string; winRateBoost: string; description: string };
    exhaustionFilter: { isExhaustion: boolean; rangePct: number; label: string; status: string; description: string };
    trailingStopLossRule: { label: string; status: string; description: string };
    indexConfluenceFilter?: { label: string; status: string; description: string };
    liquiditySweepFilter?: { label: string; status: string; description: string };
  };
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
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [casData, setCasData] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<'nifty' | 'banknifty'>('nifty');
  const [selectedHorizon, setSelectedHorizon] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchRangeData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const backendUrl = getBackendUrl();
      const [rangeRes, predRes, casRes] = await Promise.all([
        fetch(`${backendUrl}/api/day-range?_t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${backendUrl}/api/predictions/audit?_t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${backendUrl}/api/cas/learnings?_t=${Date.now()}`, { cache: 'no-store' })
      ]);
      if (rangeRes.ok) {
        const json = await rangeRes.json();
        setData(json);
      }
      if (predRes.ok) {
        const predJson = await predRes.json();
        setForecasts(predJson.forecasts || []);
      }
      if (casRes.ok) {
        const casJson = await casRes.json();
        setCasData(casJson.learnings || []);
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
  const currentForecast = forecasts.find(
    f => (f.symbol || 'NIFTY').toUpperCase() === selectedAsset.toUpperCase()
  );

  const safeFmt = (val: any, decimals: number = 0) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '---';
    return Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

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
              Early direction detection, 4-canary regime monitoring, and expansion targets
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

      {/* Early Move Predictor & 4-Canary Directional Radar */}
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
              {asset.earlyMoveDetector.macroBadge && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: asset.earlyMoveDetector.macroColor || '#10b981',
                  background: `${asset.earlyMoveDetector.macroColor || '#10b981'}20`,
                  border: `1px solid ${asset.earlyMoveDetector.macroColor || '#10b981'}40`,
                  padding: '3px 10px',
                  borderRadius: '6px'
                }}>
                  {asset.earlyMoveDetector.macroBadge}
                </span>
              )}
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

          {/* Dedicated 9:30 AM First 15-Minute Trade Signal Card */}
          {(() => {
            const stepStrike = selectedAsset === 'nifty' ? 50 : 100;
            const atmStrike = Math.round(asset.spot / stepStrike) * stepStrike;
            const isSpotBullish = asset.spot >= asset.open;
            const tradeAction = isSpotBullish ? `BUY ${atmStrike} CE` : `BUY ${atmStrike} PE`;
            const triggerLevel = isSpotBullish ? asset.m15High : asset.m15Low;
            const oppositeLevel = isSpotBullish ? asset.m15Low : asset.m15High;
            const spotRiskPts = Math.abs(triggerLevel - oppositeLevel);
            const optionRiskPts = Math.round(spotRiskPts * 0.5);
            const t1Pts = Math.min(Math.round(Math.abs(asset.earlyMoveDetector.target1Price - triggerLevel)), selectedAsset === 'nifty' ? 38 : 95);
            const t2Pts = Math.round(Math.abs(asset.earlyMoveDetector.target2Price - triggerLevel));
            const isTriggered = isSpotBullish ? asset.spot >= triggerLevel : asset.spot <= triggerLevel;

            return (
              <div style={{
                background: isSpotBullish ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                border: `1px solid ${isSpotBullish ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isSpotBullish ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Zap size={22} color={isSpotBullish ? '#10b981' : '#f43f5e'} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                        9:30 AM FIRST 15-MIN TRADE SIGNAL
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        color: isSpotBullish ? '#10b981' : '#f43f5e',
                        background: isSpotBullish ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        border: `1px solid ${isSpotBullish ? '#10b981' : '#f43f5e'}40`,
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {tradeAction}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: isTriggered ? '#10b981' : '#f59e0b',
                        background: isTriggered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        padding: '2px 7px',
                        borderRadius: '4px'
                      }}>
                        {isTriggered ? 'TRIGGER ACTIVE' : 'PENDING 5M CLOSE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                      Trigger: <strong style={{ color: '#ffffff' }}>{safeFmt(triggerLevel)}</strong> (5m Close Required) | SL: <strong style={{ color: '#f43f5e' }}>{safeFmt(oppositeLevel)}</strong> (Opt SL ~{safeFmt(optionRiskPts)} pts)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Target 1 (Trail SL)</div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                      {safeFmt(asset.earlyMoveDetector?.target1Price)} (+{safeFmt(t1Pts)} pts)
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '26px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Target 2 (Runner)</div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#60a5fa', fontFamily: 'monospace' }}>
                      {safeFmt(asset.earlyMoveDetector?.target2Price)} (+{safeFmt(t2Pts)} pts)
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4 Actionable Level Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '14px'
          }}>
            {/* Early Trigger */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Trigger Level</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff', marginTop: '3px' }}>
                {safeFmt(asset.earlyMoveDetector?.earlyTriggerPrice)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Status: <span style={{ color: asset.earlyMoveDetector?.earlyWarningColor, fontWeight: 700 }}>{asset.earlyMoveDetector?.earlyWarningStatus}</span>
              </div>
            </div>

            {/* Target 1 */}
            <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Target 1</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#10b981', marginTop: '3px' }}>
                {safeFmt(asset.earlyMoveDetector?.target1Price)}
              </div>
              <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '2px' }}>
                First profit scaling milestone
              </div>
            </div>

            {/* Target 2 */}
            <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Target 2</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#60a5fa', marginTop: '3px' }}>
                {safeFmt(asset.earlyMoveDetector?.target2Price)}
              </div>
              <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>
                Primary trend continuation target
              </div>
            </div>

            {/* Expansion Cap */}
            <div style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 700, textTransform: 'uppercase' }}>Expansion Cap</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#facc15', marginTop: '3px' }}>
                {safeFmt(asset.earlyMoveDetector?.expansionCapPrice)}
              </div>
              <div style={{ fontSize: '11px', color: '#fde047', marginTop: '2px' }}>
                Expansion limit boundary
              </div>
            </div>
          </div>

          {/* 4 Canaries of Regime Shift Monitoring Bar */}
          {asset.earlyMoveDetector.canaries && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              alignItems: 'center'
            }}>
              {asset.earlyMoveDetector.canaries.map((canary, cIdx) => (
                <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {canary.alert ? (
                    <AlertTriangle size={14} color="#f43f5e" />
                  ) : (
                    <CheckCircle2 size={14} color="#10b981" />
                  )}
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{canary.name}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: canary.alert ? '#f43f5e' : '#e2e8f0' }}>
                      {canary.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Learned Execution Safeguards Bar */}
          {asset.earlyMoveDetector.learnedSafeguards && (
            <div style={{
              marginTop: '10px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '10px',
              alignItems: 'center'
            }}>
              {/* Filter 1: Candle Close */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>
                    {asset.earlyMoveDetector.learnedSafeguards.candleCloseFilter.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3, marginTop: '2px' }}>
                    {asset.earlyMoveDetector.learnedSafeguards.candleCloseFilter.description}
                  </div>
                </div>
              </div>

              {/* Filter 2: Exhaustion */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {asset.earlyMoveDetector.learnedSafeguards.exhaustionFilter.isExhaustion ? (
                  <AlertTriangle size={16} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: asset.earlyMoveDetector.learnedSafeguards.exhaustionFilter.isExhaustion ? '#f59e0b' : '#10b981'
                  }}>
                    {asset.earlyMoveDetector.learnedSafeguards.exhaustionFilter.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3, marginTop: '2px' }}>
                    {asset.earlyMoveDetector.learnedSafeguards.exhaustionFilter.description}
                  </div>
                </div>
              </div>

              {/* Filter 3: Trailing SL */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#a855f7" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc' }}>
                    {asset.earlyMoveDetector.learnedSafeguards.trailingStopLossRule.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3, marginTop: '2px' }}>
                    {asset.earlyMoveDetector.learnedSafeguards.trailingStopLossRule.description}
                  </div>
                </div>
              </div>

              {/* Filter 4: Index Confluence */}
              {asset.earlyMoveDetector.learnedSafeguards.indexConfluenceFilter && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa' }}>
                      {asset.earlyMoveDetector.learnedSafeguards.indexConfluenceFilter.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3, marginTop: '2px' }}>
                      {asset.earlyMoveDetector.learnedSafeguards.indexConfluenceFilter.description}
                    </div>
                  </div>
                </div>
              )}

              {/* Filter 5: Liquidity Sweep */}
              {asset.earlyMoveDetector.learnedSafeguards.liquiditySweepFilter && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#eab308" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#facc15' }}>
                      {asset.earlyMoveDetector.learnedSafeguards.liquiditySweepFilter.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3, marginTop: '2px' }}>
                      {asset.earlyMoveDetector.learnedSafeguards.liquiditySweepFilter.description}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
            {safeFmt(asset.spot, 2)}
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
              {safeFmt(asset.open, 2)}
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prev Close</div>
            <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {safeFmt(asset.prevClose, 2)}
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Central Pivot</div>
            <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: '#facc15' }}>
              {safeFmt(asset.keyPivot)}
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
              Expected Move: {safeFmt(horizonData.expectedRange)} pts
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
                {safeFmt(horizonData.predictedHigh)}
              </div>
              <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '2px' }}>
                +{Math.max(0, Math.round((horizonData.predictedHigh || 0) - (asset.spot || 0)))} pts from spot
              </div>
            </div>

            {/* Projected Low */}
            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase' }}>Projected {horizonData.label} Low</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#f43f5e', marginTop: '2px' }}>
                {safeFmt(horizonData.predictedLow)}
              </div>
              <div style={{ fontSize: '11px', color: '#fda4af', marginTop: '2px' }}>
                -{Math.max(0, Math.round((asset.spot || 0) - (horizonData.predictedLow || 0)))} pts from spot
              </div>
            </div>

            {/* Expected Body Size */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Expected Body Size</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#60a5fa', marginTop: '2px' }}>
                {safeFmt(horizonData.expectedBody)} pts
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

      {/* Quantitative Daily Prediction vs Actual Post-Market Audit Scorecard */}
      {currentForecast && currentForecast.prediction && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <Target size={20} color="#38bdf8" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                    Quantitative Session Forecast &amp; Audit Scorecard
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', background: 'rgba(59, 130, 246, 0.15)', color: '#38bdf8', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    {currentForecast.target_date} ({currentForecast.target_day})
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Multi-factor quantitative projection (14-ATR, CPR squeeze band, directional skew &amp; empirical verification)
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '7px',
                background: currentForecast.actual_evaluation?.outcome === 'ACCURATE_WIN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: currentForecast.actual_evaluation?.outcome === 'ACCURATE_WIN' ? '#10b981' : '#facc15',
                border: `1px solid ${currentForecast.actual_evaluation?.outcome === 'ACCURATE_WIN' ? '#10b981' : '#facc15'}40`
              }}>
                {currentForecast.actual_evaluation?.outcome ? `VERIFIED: ${currentForecast.actual_evaluation.outcome}` : 'STATUS: LIVE PENDING'}
              </span>
            </div>
          </div>

          {/* Grid of 5 Prediction Columns (Matching User Screenshot) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {/* Directional Bias */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Directional Bias</div>
              <div style={{
                fontSize: '14px',
                fontWeight: 800,
                marginTop: '4px',
                color: currentForecast.prediction.directional_bias === 'GREEN' ? '#10b981' : '#f43f5e'
              }}>
                {currentForecast.prediction.expected_candle || '---'}
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px', color: currentForecast.actual_evaluation?.directional_bias_match ? '#10b981' : '#94a3b8' }}>
                {currentForecast.actual_evaluation ? (
                  <span>Actual: <strong>{currentForecast.actual_evaluation.actual_candle || '---'}</strong> ({currentForecast.actual_evaluation.directional_bias_match ? '✓ 100% Match' : '✗ Miss'})</span>
                ) : 'Awaiting 3:30 Close'}
              </div>
            </div>

            {/* Predicted Day High */}
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Predicted High</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#10b981', marginTop: '2px' }}>
                {safeFmt(currentForecast.prediction?.predicted_high)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {currentForecast.actual_evaluation ? (
                  <span>Actual High: <strong style={{ color: '#fff' }}>{safeFmt(currentForecast.actual_evaluation.actual_high)}</strong> ({currentForecast.actual_evaluation.high_error_pts > 0 ? '+' : ''}{safeFmt(currentForecast.actual_evaluation.high_error_pts)} pts)</span>
                ) : 'Upper boundary test'}
              </div>
            </div>

            {/* Predicted Day Low */}
            <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase' }}>Predicted Low</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#f43f5e', marginTop: '2px' }}>
                {safeFmt(currentForecast.prediction?.predicted_low)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {currentForecast.actual_evaluation ? (
                  <span>Actual Low: <strong style={{ color: '#fff' }}>{safeFmt(currentForecast.actual_evaluation.actual_low)}</strong> ({currentForecast.actual_evaluation.low_error_pts > 0 ? '+' : ''}{safeFmt(currentForecast.actual_evaluation.low_error_pts)} pts)</span>
                ) : 'Lower boundary test'}
              </div>
            </div>

            {/* Predicted Day Range */}
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Predicted Range</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#60a5fa', marginTop: '2px' }}>
                {safeFmt(currentForecast.prediction?.predicted_range)} <span style={{ fontSize: '12px', color: '#94a3b8' }}>pts</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {currentForecast.actual_evaluation ? (
                  <span>Actual: <strong style={{ color: '#fff' }}>{safeFmt(currentForecast.actual_evaluation.actual_range)} pts</strong> ({Math.round(((currentForecast.actual_evaluation.actual_range || 0) / (currentForecast.prediction.predicted_range || 1)) * 100)}% consumed)</span>
                ) : 'Estimated total session move'}
              </div>
            </div>

            {/* Predicted Day Close */}
            <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>Predicted Close</div>
              <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#c084fc', marginTop: '2px' }}>
                {safeFmt(currentForecast.prediction?.predicted_close)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {currentForecast.actual_evaluation ? (
                  <span>Actual Close: <strong style={{ color: '#fff' }}>{safeFmt(currentForecast.actual_evaluation.actual_close)}</strong> ({safeFmt(currentForecast.actual_evaluation.close_error_pct, 2)}% err)</span>
                ) : 'Projected 3:30 PM settlement'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAS (Closing Auction Session) Daily Intelligence & Learning Card */}
      {casData && casData.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(15, 23, 42, 0.85))',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <Clock size={20} color="#a855f7" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                    CAS (Closing Auction Session) Daily Intelligence &amp; Audit
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                    NSE CAS Effective: Aug 3, 2026
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  3:15 PM Continuous Close vs 3:30 PM Equilibrium Settlement &amp; Slippage Tracking
                </p>
              </div>
            </div>

            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '7px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              🚨 MANDATORY EXIT: 3:12 PM IST
            </span>
          </div>

          {/* Current Asset CAS Summary */}
          {(() => {
            const todayCas = casData && casData.length > 0 ? casData[0] : null;
            if (!todayCas) return null;
            const assetCas = selectedAsset === 'nifty' ? todayCas?.nifty : todayCas?.banknifty;
            if (!assetCas) return null;

            const ltpContinuous = assetCas.continuousCloseAt327 ?? assetCas.ltpAt315 ?? 0;
            const casClose = assetCas.casEquilibriumClose ?? assetCas.casClosePrice ?? 0;
            const slippagePts = assetCas.casSlippagePts ?? 0;
            const slippagePct = assetCas.casSlippagePct ?? 0;
            const driftDir = assetCas.casDriftDirection ?? 'EQUILIBRIUM';
            const gapBias = (assetCas.nextDayGapBias || 'NEUTRAL').replace(/_/g, ' ');

            return (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>3:15 / 3:26 Continuous LTP</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: '#38bdf8', marginTop: '2px' }}>
                      ₹{safeFmt(ltpContinuous, 2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {assetCas.isDayExtremeAt315 ? '⚠️ Coincided with Day Extreme' : 'Continuous trading halt'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>3:30 PM CAS Equilibrium Price</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: '#c084fc', marginTop: '2px' }}>
                      ₹{safeFmt(casClose, 2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '2px' }}>
                      Official SEBI Settlement
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>CAS Auction Slippage</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: slippagePts > 0 ? '#10b981' : (slippagePts < 0 ? '#f43f5e' : '#facc15'), marginTop: '2px' }}>
                      {slippagePts > 0 ? '+' : ''}{safeFmt(slippagePts, 2)} pts ({safeFmt(slippagePct, 2)}%)
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {driftDir}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Next-Day Gap Bias</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#f43f5e', marginTop: '4px' }}>
                      {gapBias}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Based on auction extreme closing
                    </div>
                  </div>
                </div>

                {/* Key Findings List */}
                {todayCas.keyFindings && todayCas.keyFindings.length > 0 && (
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', padding: '10px 14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Today's Auto-Learned CAS Observations:</div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {todayCas.keyFindings.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
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
            {safeFmt(asset.predictedHigh)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Distance: +{Math.max(0, Math.round((asset.predictedHigh || 0) - (asset.spot || 0)))} pts
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
            {safeFmt(asset.predictedLow)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Distance: -{Math.max(0, Math.round((asset.spot || 0) - (asset.predictedLow || 0)))} pts
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
            {safeFmt(asset.gapRetestLevel, 2)}
          </div>
          <div style={{ fontSize: '11px', color: asset.gapStatus?.includes('FILLED') ? '#10b981' : '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
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
            {safeFmt(asset.expectedDayRange)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>pts</span>
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
            {safeFmt(asset.currentRange)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            High: {safeFmt(asset.dayHigh)} | Low: {safeFmt(asset.dayLow)}
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
            {safeFmt(asset.ibRange)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            IB High: {safeFmt(asset.ibHigh)} | IB Low: {safeFmt(asset.ibLow)}
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
              { label: `${horizonData?.label} Target 1`, price: horizonData?.target1 || 0 },
              { label: `${horizonData?.label} Target 2`, price: horizonData?.target2 || 0 },
              { label: `${horizonData?.label} Target 3`, price: horizonData?.target3 || 0 },
              { label: `${horizonData?.label} Extended Max`, price: horizonData?.targetMax || 0 }
            ]).map((item, idx) => {
              const diffPts = Math.round(item.price - asset.spot);
              const isHit = asset.spot >= item.price;
              const cleanLabel = item.label.replace(/\s*\([^)]*\)/g, '').trim();

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
                      {cleanLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: isHit ? '#10b981' : 'var(--text-primary)' }}>
                      {safeFmt(item.price)}
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
              { label: `${horizonData?.label} Target 1`, price: horizonData?.bearTarget1 || 0 },
              { label: `${horizonData?.label} Target 2`, price: horizonData?.bearTarget2 || 0 },
              { label: `${horizonData?.label} Target 3`, price: horizonData?.bearTarget3 || 0 },
              { label: `${horizonData?.label} Extended Max`, price: horizonData?.bearTargetMax || 0 }
            ]).map((item, idx) => {
              const diffPts = Math.round(asset.spot - item.price);
              const isHit = asset.spot <= item.price;
              const cleanLabel = item.label.replace(/\s*\([^)]*\)/g, '').trim();

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
                      {cleanLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: isHit ? '#f43f5e' : 'var(--text-primary)' }}>
                      {safeFmt(item.price)}
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
