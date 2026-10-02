import React, { useState } from 'react';
import { 
  Activity, ArrowRight, ArrowLeft, Shield, AlertTriangle, CheckCircle, 
  TrendingUp, TrendingDown, Info, Flame, Target, Zap, Clock, ChevronRight
} from 'lucide-react';

interface StrikeDots {
  m1: number;
  m5: number;
  m10: number;
  m15: number;
  m30: number;
}

interface StrikeGex {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;
  absGex: number;
  callOi: number;
  putOi: number;
  iv: number;
  isAtm: boolean;
  dots?: StrikeDots;
  migrationDirection?: 'RIGHTWARD' | 'LEFTWARD' | 'STABLE';
  migrationSpeed?: number;
}

interface GexData {
  symbol: string;
  name: string;
  exchange: string;
  spotPrice: number;
  netGex: number;
  absGex: number;
  regime: string;
  unit: string;
  gammaFlip: {
    mid: number;
    band: string;
    isSpotInside: boolean;
    spreadPts: number;
  };
  walls: {
    callWall: number;
    putWall: number;
    callDistPts: number;
    putDistPts: number;
  };
  strikes: StrikeGex[];
  gammaDeltaVector?: {
    putWallMigrationSpeed: number;
    callWallMigrationSpeed: number;
    isPutUnwindActive: boolean;
    isCallUnwindActive: boolean;
    putUnwindSignal: {
      active: boolean;
      type: string;
      strike: number;
      speed: number;
      description: string;
    };
    callUnwindSignal: {
      active: boolean;
      type: string;
      strike: number;
      speed: number;
      description: string;
    };
  };
  maxChangeGammaMatrix?: {
    m1: { value: number; isPositive: boolean; label: string };
    m5: { value: number; isPositive: boolean; label: string };
    m10: { value: number; isPositive: boolean; label: string };
    m15: { value: number; isPositive: boolean; label: string };
    m30: { value: number; isPositive: boolean; label: string };
    positiveCount: number;
    negativeCount: number;
    alignment: string;
    alignmentLabel: string;
    summary: string;
  };
  strictDownsideGuard?: {
    isActive: boolean;
    status: string;
    reason: string;
  };
}

interface Props {
  gexData: GexData;
  visibleStrikes: StrikeGex[];
}

export const GexbotClassicDotsView: React.FC<Props> = ({ gexData, visibleStrikes }) => {
  const [hoveredStrike, setHoveredStrike] = useState<StrikeGex | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'WALLS_ONLY' | 'UNWINDING'>('ALL');

  const spot = gexData.spotPrice;
  const putWall = gexData.walls.putWall;
  const callWall = gexData.walls.callWall;
  const zeroGamma = gexData.gammaFlip.mid;

  const deltaVector = gexData.gammaDeltaVector;
  const matrix = gexData.maxChangeGammaMatrix;
  const downsideGuard = gexData.strictDownsideGuard;

  // Filter strikes around spot
  const displayedStrikes = visibleStrikes.filter(s => {
    if (filterMode === 'WALLS_ONLY') {
      return s.strike === putWall || s.strike === callWall || Math.abs(s.strike - zeroGamma) < 30 || s.isAtm;
    }
    if (filterMode === 'UNWINDING') {
      return s.migrationDirection === 'RIGHTWARD' || s.migrationDirection === 'LEFTWARD';
    }
    return true;
  });

  // Calculate max absolute net GEX for horizontal bar scaling
  const maxAbsGex = Math.max(...visibleStrikes.map(s => {
    const dotsVals = s.dots ? [Math.abs(s.dots.m1), Math.abs(s.dots.m5), Math.abs(s.dots.m10), Math.abs(s.dots.m15), Math.abs(s.dots.m30)] : [];
    return Math.max(Math.abs(s.netGex || 0), ...dotsVals, 1);
  }), 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* ── TOP COCKPIT: DOWNSIDE GUARD & AUTO-UNWIND TRIGGERS ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
        
        {/* Card 1: Strict Downside Guard */}
        <div style={{
          backgroundColor: downsideGuard?.isActive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)',
          border: downsideGuard?.isActive ? '1px solid #ef4444' : '1px solid #10b981',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: downsideGuard?.isActive ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: downsideGuard?.isActive ? '#f87171' : '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} />
              Strict Downside Guard
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: downsideGuard?.isActive ? '#ef4444' : '#10b981',
              color: '#ffffff'
            }}>
              {downsideGuard?.isActive ? 'LOCKED OUT' : 'CLEARED'}
            </span>
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.4', color: downsideGuard?.isActive ? '#fca5a5' : '#a7f3d0' }}>
            {downsideGuard?.isActive
              ? '🚨 Price below Zero Gamma with unanimous negative delta vectors across 1m, 5m, 10m, 15m, 30m. All Call (CE) entries locked out. Trend breakdown continuation expected.'
              : '✅ Downside Guard Cleared: Price in healthy balance or above Zero Gamma. Long setups permitted when structural criteria are met.'}
          </div>
        </div>

        {/* Card 2: Rightward March (Put Liquidation => Bullish Turnaround) */}
        <div style={{
          backgroundColor: deltaVector?.isPutUnwindActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(30, 41, 59, 0.5)',
          border: deltaVector?.isPutUnwindActive ? '1px solid #10b981' : '1px solid #334155',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: deltaVector?.isPutUnwindActive ? '0 0 18px rgba(16, 185, 129, 0.35)' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: deltaVector?.isPutUnwindActive ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} />
              The Rightward March (Put Unwind)
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: deltaVector?.isPutUnwindActive ? '#10b981' : '#475569',
              color: '#ffffff'
            }}>
              {deltaVector?.isPutUnwindActive ? 'BULLISH TURNAROUND ACTIVE' : 'MONITORING'}
            </span>
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.4', color: deltaVector?.isPutUnwindActive ? '#6ee7b7' : '#94a3b8' }}>
            <strong>Put Wall Migration:</strong> {deltaVector?.putWallMigrationSpeed ? `${deltaVector.putWallMigrationSpeed > 0 ? '+' : ''}${deltaVector.putWallMigrationSpeed} Cr/min` : '0 Cr/min'}.
            {deltaVector?.isPutUnwindActive 
              ? ` ⚡ Institutional put profit-taking verified at Put Wall (₹${putWall}). Dealers buying back futures hedge!`
              : ` Watching Put Wall ₹${putWall}. Rightward march will trigger long reversal setup.`}
          </div>
        </div>

        {/* Card 3: Leftward March (Call Liquidation => Bearish Turnaround) */}
        <div style={{
          backgroundColor: deltaVector?.isCallUnwindActive ? 'rgba(244, 63, 94, 0.15)' : 'rgba(30, 41, 59, 0.5)',
          border: deltaVector?.isCallUnwindActive ? '1px solid #f43f5e' : '1px solid #334155',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: deltaVector?.isCallUnwindActive ? '0 0 18px rgba(244, 63, 94, 0.35)' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: deltaVector?.isCallUnwindActive ? '#f43f5e' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingDown size={14} />
              The Leftward March (Call Unwind)
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: deltaVector?.isCallUnwindActive ? '#f43f5e' : '#475569',
              color: '#ffffff'
            }}>
              {deltaVector?.isCallUnwindActive ? 'BEARISH TURNAROUND ACTIVE' : 'MONITORING'}
            </span>
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.4', color: deltaVector?.isCallUnwindActive ? '#fda4af' : '#94a3b8' }}>
            <strong>Call Wall Migration:</strong> {deltaVector?.callWallMigrationSpeed ? `${deltaVector.callWallMigrationSpeed > 0 ? '+' : ''}${deltaVector.callWallMigrationSpeed} Cr/min` : '0 Cr/min'}.
            {deltaVector?.isCallUnwindActive 
              ? ` ⚡ Institutional call profit-taking verified at Call Wall (₹${callWall}). Dealers liquidating long futures!`
              : ` Watching Call Wall ₹${callWall}. Leftward march will trigger short reversal setup.`}
          </div>
        </div>

      </div>

      {/* ── MAX CHANGE GAMMA VERIFICATION MATRIX ────────────────────────────── */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '14px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#38bdf8" />
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#f8fafc' }}>
              Max Change Gamma Verification Matrix (ΔGEX Multi-Timeframe)
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '4px',
            backgroundColor: matrix?.alignment.includes('BULLISH') ? 'rgba(16, 185, 129, 0.2)' : (matrix?.alignment.includes('BEARISH') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'),
            color: matrix?.alignment.includes('BULLISH') ? '#34d399' : (matrix?.alignment.includes('BEARISH') ? '#f87171' : '#facc15'),
            border: `1px solid ${matrix?.alignment.includes('BULLISH') ? '#10b981' : (matrix?.alignment.includes('BEARISH') ? '#ef4444' : '#eab308')}`
          }}>
            {matrix?.alignmentLabel || 'ROTATIONAL EQUILIBRIUM'}
          </span>
        </div>

        {/* 5-Timeframe Matrix Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {[
            { key: 'm1', label: '1 Min', data: matrix?.m1 },
            { key: 'm5', label: '5 Min', data: matrix?.m5 },
            { key: 'm10', label: '10 Min', data: matrix?.m10 },
            { key: 'm15', label: '15 Min', data: matrix?.m15 },
            { key: 'm30', label: '30 Min', data: matrix?.m30 }
          ].map(col => {
            const isPos = col.data?.isPositive ?? true;
            return (
              <div key={col.key} style={{
                backgroundColor: isPos ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: isPos ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '8px 10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '3px' }}>
                  {col.label}
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: isPos ? '#34d399' : '#f87171',
                  fontFamily: 'ui-monospace, monospace'
                }}>
                  {col.data?.label || '0.0 Cr'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={13} color="#60a5fa" />
          <span>{matrix?.summary || 'Multi-timeframe institutional gamma flows in balance.'}</span>
        </div>
      </div>

      {/* ── THE GEXBOT CLASSIC HORIZONTAL HISTOGRAM (THE DOTS VIEW) ─────────── */}
      <div style={{
        backgroundColor: '#090d16',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '16px',
        overflowX: 'auto'
      }}>
        
        {/* Header & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔬 Gexbot Classic Strike View (The Dots)</span>
              <span style={{ fontSize: '11px', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                SPOT: ₹{spot.toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Dots reveal institutional gamma migration over 30m, 15m, 10m, 5m, and 1m. Rightward march = Put Liquidation. Leftward march = Call Liquidation.
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'WALLS_ONLY', 'UNWINDING'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterMode(f)}
                style={{
                  backgroundColor: filterMode === f ? '#0284c7' : '#1e293b',
                  color: filterMode === f ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Legend for the 5 Dots */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '8px 12px',
          backgroundColor: '#0f172a',
          borderRadius: '6px',
          marginBottom: '14px',
          fontSize: '11px',
          color: '#cbd5e1',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 800, color: '#94a3b8' }}>DOTS TIMEFRAME:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#c084fc' }}></span>
            Dot 1 (30m ago)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#60a5fa' }}></span>
            Dot 2 (15m ago)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#facc15' }}></span>
            Dot 3 (10m ago)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fb923c' }}></span>
            Dot 4 (5m ago)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#34d399', boxShadow: '0 0 6px #34d399' }}></span>
            Dot 5 (1m ago)
          </span>
        </div>

        {/* Column Headers: Puts (Left) | Zero Line | Calls (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 2px 1fr 120px', gap: '4px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>
          <div style={{ textAlign: 'left', paddingLeft: '8px' }}>STRIKE</div>
          <div style={{ color: '#f87171', textAlign: 'right', paddingRight: '12px' }}>◄ NEGATIVE GAMMA (PUTS)</div>
          <div style={{ backgroundColor: '#475569' }}></div>
          <div style={{ color: '#34d399', textAlign: 'left', paddingLeft: '12px' }}>POSITIVE GAMMA (CALLS) ►</div>
          <div style={{ textAlign: 'right', paddingRight: '8px' }}>MIGRATION</div>
        </div>

        {/* Strike Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {displayedStrikes.map(s => {
            const K = s.strike;
            const isPutWall = K === putWall;
            const isCallWall = K === callWall;
            const isAtm = s.isAtm;
            const isZeroGamma = Math.abs(K - zeroGamma) < 30;

            const net = s.netGex || 0;
            const isPutDom = net < 0;
            const isCallDom = net > 0;

            // Bar width percentage relative to maxAbsGex
            const barWidthPct = Math.min(100, (Math.abs(net) / maxAbsGex) * 95);

            // Compute dot positions relative to center line (50% center)
            const getDotOffsetPct = (val: number) => {
              const clamped = Math.max(-maxAbsGex, Math.min(maxAbsGex, val));
              return (clamped / maxAbsGex) * 45; // -45% to +45% from center
            };

            const dots = s.dots || { m1: net, m5: net, m10: net, m15: net, m30: net };

            return (
              <div 
                key={K}
                onMouseEnter={() => setHoveredStrike(s)}
                onMouseLeave={() => setHoveredStrike(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '130px 1fr 2px 1fr 120px',
                  gap: '4px',
                  alignItems: 'center',
                  padding: '4px 0',
                  backgroundColor: isAtm ? 'rgba(56, 189, 248, 0.12)' : (isPutWall ? 'rgba(244, 63, 94, 0.08)' : (isCallWall ? 'rgba(45, 212, 191, 0.08)' : 'transparent')),
                  borderRadius: '4px',
                  border: isPutWall ? '1px solid rgba(244, 63, 94, 0.4)' : (isCallWall ? '1px solid rgba(45, 212, 191, 0.4)' : '1px solid transparent'),
                  transition: 'background-color 0.15s'
                }}
              >
                
                {/* Strike Label & Wall Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: isAtm ? 900 : 700,
                    fontFamily: 'ui-monospace, monospace',
                    color: isAtm ? '#38bdf8' : (isPutWall ? '#f87171' : (isCallWall ? '#34d399' : '#e2e8f0'))
                  }}>
                    {K.toLocaleString()}
                  </span>
                  {isPutWall && (
                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', backgroundColor: '#e11d48', color: '#fff' }}>
                      PUT WALL
                    </span>
                  )}
                  {isCallWall && (
                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', backgroundColor: '#0d9488', color: '#fff' }}>
                      CALL WALL
                    </span>
                  )}
                  {isAtm && (
                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', backgroundColor: '#0284c7', color: '#fff' }}>
                      ATM
                    </span>
                  )}
                  {isZeroGamma && (
                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', backgroundColor: '#6366f1', color: '#fff' }}>
                      FLIP
                    </span>
                  )}
                </div>

                {/* Left Side: Put Gamma Bar (Extends from right to left) */}
                <div style={{ position: 'relative', height: '22px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {isPutDom && (
                    <div style={{
                      width: `${barWidthPct}%`,
                      height: '14px',
                      backgroundColor: isPutWall ? 'rgba(244, 63, 94, 0.65)' : 'rgba(239, 68, 68, 0.35)',
                      borderRadius: '3px 0 0 3px',
                      boxShadow: isPutWall ? '0 0 10px rgba(244, 63, 94, 0.4)' : 'none'
                    }} />
                  )}

                  {/* Render Negative Dots (Dots situated on left side of zero line) */}
                  {dots.m30 < 0 && (
                    <div title={`30m ago: ${dots.m30} Cr`} style={{ position: 'absolute', right: `${Math.abs(getDotOffsetPct(dots.m30)) * 2}%`, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#c084fc', transform: 'translate(50%, 0)', zIndex: 2 }} />
                  )}
                  {dots.m15 < 0 && (
                    <div title={`15m ago: ${dots.m15} Cr`} style={{ position: 'absolute', right: `${Math.abs(getDotOffsetPct(dots.m15)) * 2}%`, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60a5fa', transform: 'translate(50%, 0)', zIndex: 3 }} />
                  )}
                  {dots.m10 < 0 && (
                    <div title={`10m ago: ${dots.m10} Cr`} style={{ position: 'absolute', right: `${Math.abs(getDotOffsetPct(dots.m10)) * 2}%`, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#facc15', transform: 'translate(50%, 0)', zIndex: 4 }} />
                  )}
                  {dots.m5 < 0 && (
                    <div title={`5m ago: ${dots.m5} Cr`} style={{ position: 'absolute', right: `${Math.abs(getDotOffsetPct(dots.m5)) * 2}%`, width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fb923c', transform: 'translate(50%, 0)', zIndex: 5 }} />
                  )}
                  {dots.m1 < 0 && (
                    <div title={`1m ago: ${dots.m1} Cr`} style={{ position: 'absolute', right: `${Math.abs(getDotOffsetPct(dots.m1)) * 2}%`, width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#34d399', border: '1px solid #ffffff', boxShadow: '0 0 6px #34d399', transform: 'translate(50%, 0)', zIndex: 6 }} />
                  )}
                </div>

                {/* Central Zero Line */}
                <div style={{ height: '22px', backgroundColor: '#38bdf8', width: '2px', opacity: 0.8 }} />

                {/* Right Side: Call Gamma Bar (Extends from left to right) */}
                <div style={{ position: 'relative', height: '22px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  {isCallDom && (
                    <div style={{
                      width: `${barWidthPct}%`,
                      height: '14px',
                      backgroundColor: isCallWall ? 'rgba(45, 212, 191, 0.65)' : 'rgba(16, 185, 129, 0.35)',
                      borderRadius: '0 3px 3px 0',
                      boxShadow: isCallWall ? '0 0 10px rgba(45, 212, 191, 0.4)' : 'none'
                    }} />
                  )}

                  {/* Render Positive Dots (Dots situated on right side of zero line) */}
                  {dots.m30 > 0 && (
                    <div title={`30m ago: +${dots.m30} Cr`} style={{ position: 'absolute', left: `${getDotOffsetPct(dots.m30) * 2}%`, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#c084fc', transform: 'translate(-50%, 0)', zIndex: 2 }} />
                  )}
                  {dots.m15 > 0 && (
                    <div title={`15m ago: +${dots.m15} Cr`} style={{ position: 'absolute', left: `${getDotOffsetPct(dots.m15) * 2}%`, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60a5fa', transform: 'translate(-50%, 0)', zIndex: 3 }} />
                  )}
                  {dots.m10 > 0 && (
                    <div title={`10m ago: +${dots.m10} Cr`} style={{ position: 'absolute', left: `${getDotOffsetPct(dots.m10) * 2}%`, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#facc15', transform: 'translate(-50%, 0)', zIndex: 4 }} />
                  )}
                  {dots.m5 > 0 && (
                    <div title={`5m ago: +${dots.m5} Cr`} style={{ position: 'absolute', left: `${getDotOffsetPct(dots.m5) * 2}%`, width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fb923c', transform: 'translate(-50%, 0)', zIndex: 5 }} />
                  )}
                  {dots.m1 > 0 && (
                    <div title={`1m ago: +${dots.m1} Cr`} style={{ position: 'absolute', left: `${getDotOffsetPct(dots.m1) * 2}%`, width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#34d399', border: '1px solid #ffffff', boxShadow: '0 0 6px #34d399', transform: 'translate(-50%, 0)', zIndex: 6 }} />
                  )}
                </div>

                {/* Migration Indicator */}
                <div style={{ textAlign: 'right', paddingRight: '8px' }}>
                  {s.migrationDirection === 'RIGHTWARD' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 800, color: '#34d399' }} title="Rightward March: Net Gamma becoming less negative/more positive (Put Liquidation / Bullish Turnaround)">
                      <span>➡️ Right</span>
                      <span style={{ fontSize: '9px', opacity: 0.8 }}>+{s.migrationSpeed}</span>
                    </span>
                  ) : (s.migrationDirection === 'LEFTWARD' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 800, color: '#f87171' }} title="Leftward March: Net Gamma becoming less positive/more negative (Call Liquidation / Bearish Turnaround)">
                      <span>⬅️ Left</span>
                      <span style={{ fontSize: '9px', opacity: 0.8 }}>{s.migrationSpeed}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#64748b' }}>Stable</span>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

        {/* Hover Tooltip Card if Strike Hovered */}
        {hoveredStrike && (
          <div style={{
            marginTop: '12px',
            backgroundColor: '#0f172a',
            border: '1px solid #38bdf8',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8' }}>
                Strike ₹{hoveredStrike.strike.toLocaleString()} — Gamma Historical Migration
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Net GEX Now: <strong style={{ color: hoveredStrike.netGex >= 0 ? '#34d399' : '#f87171' }}>{hoveredStrike.netGex >= 0 ? '+' : ''}{hoveredStrike.netGex} Cr</strong> | Call: +{hoveredStrike.callGex} Cr | Put: -{hoveredStrike.putGex} Cr
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
              <span>30m: <strong>{hoveredStrike.dots?.m30} Cr</strong></span>
              <span>15m: <strong>{hoveredStrike.dots?.m15} Cr</strong></span>
              <span>10m: <strong>{hoveredStrike.dots?.m10} Cr</strong></span>
              <span>5m: <strong>{hoveredStrike.dots?.m5} Cr</strong></span>
              <span style={{ color: '#34d399' }}>1m: <strong>{hoveredStrike.dots?.m1} Cr</strong></span>
            </div>
          </div>
        )}

      </div>

      {/* ── EDUCATIONAL FOOTER NOTE (GEXBOT TRADING RULES) ────────────────── */}
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        border: '1px dashed #334155',
        borderRadius: '6px',
        padding: '10px 14px',
        fontSize: '11.5px',
        lineHeight: '1.5',
        color: '#94a3b8'
      }}>
        <strong style={{ color: '#f8fafc' }}>💡 Institutional Tape Rules from @gextrading:</strong>
        <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
          <li><span style={{ color: '#34d399' }}>The Rightward March</span>: When dots move rightward towards zero at the Major Put Wall, institutions are taking profits on puts. Dealers who were short futures to hedge those puts must buy back futures. <em>Never short into a rightward march!</em></li>
          <li><span style={{ color: '#f87171' }}>The Leftward March</span>: When dots move leftward towards zero at the Major Call Wall, call buyers are dumping options before lunchtime decay. Dealers unwind long futures. <em>Fade the call wall!</em></li>
          <li><span style={{ color: '#ef4444' }}>Strict Downside Guard</span>: When Price is below Zero Gamma and the 5-timeframe matrix is unanimous red, market makers are aggressively selling into every bounce. Lock out all calls until the Put Wall floor is struck.</li>
        </ul>
      </div>

    </div>
  );
};
