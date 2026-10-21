import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Radar, Target, Shield, AlertTriangle, TrendingUp, TrendingDown, 
  Activity, ArrowRight, Zap, CheckCircle, Crosshair, Pin, Maximize2,
  Volume2, VolumeX, Sparkles, Award
} from 'lucide-react';

interface Props {
  gexData: any;
  visibleStrikes?: any[];
  compact?: boolean;
  position?: 'inChart' | 'top';
  onTogglePosition?: () => void;
  backendUrl?: string;
}

export const GexLiveMarketRadar: React.FC<Props> = ({ 
  gexData, 
  visibleStrikes = [], 
  compact = false,
  position = 'top',
  onTogglePosition,
  backendUrl
}) => {
  const [confluence, setConfluence] = useState<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const lastSpokenAlertRef = useRef<string>('');

  const getBase = useCallback(() => {
    if (backendUrl) return backendUrl;
    const proto = window.location.protocol;
    const host = window.location.hostname;
    return `${proto}//${host}:3002`;
  }, [backendUrl]);

  // Fetch real-time Confluence Score and Option Pricing from backend
  const symbol = gexData?.symbol || 'NIFTY';
  const fetchConfluence = useCallback(async () => {
    try {
      const base = getBase();
      const res = await fetch(`${base}/api/confluence/score?symbol=${symbol}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setConfluence(d);
      }
    } catch (e) {}
  }, [symbol, getBase]);

  useEffect(() => {
    fetchConfluence();
    const interval = setInterval(fetchConfluence, 20000); // 20s
    return () => clearInterval(interval);
  }, [fetchConfluence]);

  // Voice Speech Announcement on Grade A+ Alert
  useEffect(() => {
    if (!voiceEnabled || !confluence) return;
    if (confluence.grade === 'GRADE_A_PLUS' || confluence.score >= 90) {
      const alertKey = `${confluence.symbol}_${confluence.score}_${confluence.signal}_${confluence.tpoPeriod}`;
      if (lastSpokenAlertRef.current !== alertKey) {
        lastSpokenAlertRef.current = alertKey;
        if ('speechSynthesis' in window) {
          const actionText = confluence.optionPlan?.executionAdvice?.action || confluence.signal;
          const utterance = new SpeechSynthesisUtterance(
            `Institutional Alert. ${confluence.symbol} Grade A Plus setup detected. Confluence score ${confluence.score}. ${actionText}.`
          );
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [confluence, voiceEnabled]);

  const radar = useMemo(() => {
    if (!gexData || !gexData.spotPrice) return null;

    const spot = gexData.spotPrice;
    const sym = gexData.symbol || 'INDEX';
    
    // Clean unit string to avoid duplicate currency symbols
    const cleanUnit = (gexData.unit || 'Cr').replace(/₹\s*/g, '').trim();
    const unitDisplay = `₹ ${cleanUnit}/min`;

    const callWall = gexData.walls?.callWall || (spot * 1.01);
    const putWall = gexData.walls?.putWall || (spot * 0.99);
    const flipPoint = gexData.gammaFlip?.mid || Math.round((callWall + putWall) / 2);

    // Sort strikes ascending
    const strikesList = [...(visibleStrikes.length ? visibleStrikes : (gexData.strikes || []))].sort(
      (a: any, b: any) => a.strike - b.strike
    );

    // Calculate approximate strike step
    let strikeStep = 50;
    if (strikesList.length >= 2) {
      const diffs = [];
      for (let i = 1; i < Math.min(strikesList.length, 5); i++) {
        const d = Math.abs(strikesList[i].strike - strikesList[i - 1].strike);
        if (d > 0) diffs.push(d);
      }
      if (diffs.length) strikeStep = Math.min(...diffs);
    } else {
      strikeStep = spot > 10000 ? 50 : (spot > 3000 ? 20 : (spot > 500 ? 10 : 5));
    }

    // Find nearest strikes above and below spot
    const aboveStrikes = strikesList.filter((s: any) => s.strike >= spot);
    const belowStrikes = strikesList.filter((s: any) => s.strike < spot).reverse();

    const targetStrikeObj = aboveStrikes[0] || { strike: Math.ceil(spot / strikeStep) * strikeStep };
    const nextTargetStrikeObj = aboveStrikes[1] || { strike: targetStrikeObj.strike + strikeStep };
    const defenseStrikeObj = belowStrikes[0] || { strike: Math.floor(spot / strikeStep) * strikeStep };
    const secondaryPutObj = belowStrikes[1] || { strike: defenseStrikeObj.strike - strikeStep };

    const targetStrike = targetStrikeObj.strike;
    const nextTargetStrike = nextTargetStrikeObj.strike;
    const defenseStrike = defenseStrikeObj.strike;
    const secondaryPutStrike = secondaryPutObj.strike;

    // Speeds and migration
    const rawTargetSpeed = Math.abs(targetStrikeObj.migrationSpeed || 0);
    const rawDefenseSpeed = Math.abs(defenseStrikeObj.migrationSpeed || 0);

    const formatSpeed = (val: number) => {
      if (val === 0) return '0.00';
      if (val < 1) return val.toFixed(2);
      if (val < 10) return val.toFixed(1);
      return val.toFixed(0);
    };

    const targetSpeedFmt = formatSpeed(rawTargetSpeed);
    const defenseSpeedFmt = formatSpeed(rawDefenseSpeed);

    // Formatted numbers
    const spotFmt = spot.toLocaleString();
    const targetFmt = targetStrike.toLocaleString();
    const nextTargetFmt = nextTargetStrike.toLocaleString();
    const defenseFmt = defenseStrike.toLocaleString();
    const secondaryPutFmt = secondaryPutStrike.toLocaleString();
    const callWallFmt = Math.round(callWall).toLocaleString();
    const putWallFmt = Math.round(putWall).toLocaleString();
    const flipFmt = Math.round(flipPoint).toLocaleString();

    // Range driving calculation
    const rangeMin = Math.round(targetStrike - strikeStep * 0.2).toLocaleString();

    // Bias determination
    const isBullish = spot >= flipPoint;
    const isAboveBoth = spot >= callWall;
    const isBelowBoth = spot <= putWall;

    // Current State text with clean units and proper speed formatting
    let currentState = `Active Rightward March (+${defenseSpeedFmt} ${unitDisplay})`;
    let tradeAdvice = `Hold Longs / Trail SL to ${defenseFmt}`;
    let liveTarget = `Testing ${targetFmt} Gate`;

    if (isAboveBoth) {
      currentState = `Call Squeeze Over Call Wall (+${targetSpeedFmt} ${unitDisplay})`;
      tradeAdvice = `Trailing Stop at ${callWallFmt} / Watch for Exhaustion`;
      liveTarget = `Extending above ${callWallFmt}`;
    } else if (isBelowBoth) {
      currentState = `Put Liquidation Cascade (-${defenseSpeedFmt} ${unitDisplay})`;
      tradeAdvice = `Lock out Longs / Breakdown Active below ${putWallFmt}`;
      liveTarget = `Testing ${putWallFmt} Floor`;
    } else if (!isBullish) {
      currentState = `Leftward Resistance Pressure (-${targetSpeedFmt} ${unitDisplay})`;
      tradeAdvice = `Fade Rallies towards ${flipFmt} / Target ${putWallFmt}`;
      liveTarget = `Defending ${defenseFmt} Floor`;
    }

    // Watch text logic: if target is already at or above Call Wall, watch for expansion/squeeze
    const isTargetAtCallWall = Math.abs(targetStrike - callWall) < (strikeStep * 0.5) || targetStrike >= callWall;
    const watchText = isTargetAtCallWall
      ? `5m candle close above ${targetFmt} triggers Call Wall Breakout / Squeeze toward ${nextTargetFmt}.`
      : `5m candle close above ${targetFmt} targets ${callWallFmt} Call Wall.`;

    // Defense role description
    const isDefenseFlip = Math.abs(defenseStrike - flipPoint) < (strikeStep * 0.5);
    const isDefensePutWall = Math.abs(defenseStrike - putWall) < (strikeStep * 0.5);
    let defenseRole = 'Key Support Floor';
    if (isDefensePutWall && isDefenseFlip) {
      defenseRole = 'Major Put Wall & Zero Gamma Flip';
    } else if (isDefensePutWall) {
      defenseRole = 'Major Put Wall Support';
    } else if (isDefenseFlip) {
      defenseRole = 'Zero Gamma Flip Point';
    }

    return {
      symbol: sym,
      spotFmt,
      targetFmt,
      defenseFmt,
      secondaryPutFmt,
      callWallFmt,
      putWallFmt,
      flipFmt,
      rangeMin,
      targetSpeed: targetSpeedFmt,
      defenseSpeed: defenseSpeedFmt,
      unitDisplay,
      currentState,
      tradeAdvice,
      liveTarget,
      watchText,
      defenseRole,
      isBullish
    };
  }, [gexData, visibleStrikes]);

  if (!radar) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(280px, 1fr))' : 'repeat(auto-fit, minmax(380px, 1fr))',
      gap: '12px',
      marginBottom: compact ? '0' : '16px',
      alignItems: 'stretch'
    }}>
      {/* ── TABLE 1 (LEFT): LIVE INSTITUTIONAL RADAR HUD ───────────────────── */}
      <div style={{
        backgroundColor: '#0a101f',
        border: '1px solid #1e2d4a',
        borderRadius: '8px',
        padding: '14px 16px',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '8px',
          borderBottom: '1px solid #1e293b',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Radar size={17} color="#38bdf8" />
            <span style={{ 
              fontSize: '13.5px', 
              fontWeight: 900, 
              color: '#f8fafc', 
              letterSpacing: '0.4px', 
              textTransform: 'uppercase' 
            }}>
              Radar HUD ({radar.symbol})
            </span>

            {/* LIVE SPOT PRICE BADGE */}
            <span style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '5px',
              fontSize: '12.5px',
              fontWeight: 900,
              fontFamily: 'ui-monospace, monospace',
              boxShadow: '0 0 10px rgba(2, 132, 199, 0.5)'
            }}>
              SPOT: ₹{radar.spotFmt}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Voice Speech Toggle */}
            <button
              onClick={() => setVoiceEnabled(v => !v)}
              style={{
                backgroundColor: voiceEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${voiceEnabled ? '#22c55e' : '#ef4444'}`,
                color: voiceEnabled ? '#4ade80' : '#f87171',
                borderRadius: '4px',
                padding: '3px 7px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={voiceEnabled ? 'Voice Alerts Active (Click to mute)' : 'Voice Alerts Muted (Click to enable)'}
            >
              {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              <span>{voiceEnabled ? 'Voice' : 'Muted'}</span>
            </button>

            {onTogglePosition && (
              <button
                onClick={onTogglePosition}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={position === 'inChart' ? 'Move HUD above chart' : 'Dock HUD inside empty chart space'}
              >
                {position === 'inChart' ? <Maximize2 size={12} /> : <Pin size={12} />}
                <span>{position === 'inChart' ? 'To Top' : 'Dock'}</span>
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }} />
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── CONFLUENCE SCORE METER (0 - 100) ─────────────────────────────── */}
        {confluence && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.6) 100%)',
            border: `1px solid ${confluence.score >= 90 ? '#4ade80' : (confluence.score >= 80 ? '#38bdf8' : '#f59e0b')}`,
            borderRadius: '6px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={15} color={confluence.score >= 90 ? '#4ade80' : '#38bdf8'} />
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>
                  CONFLUENCE: <strong style={{ color: confluence.score >= 90 ? '#4ade80' : '#38bdf8', fontSize: '13px' }}>{confluence.score}/100</strong>
                </span>
                <span style={{
                  backgroundColor: confluence.score >= 90 ? '#064e3b' : (confluence.score >= 80 ? '#0369a1' : '#78350f'),
                  color: confluence.score >= 90 ? '#86efac' : (confluence.score >= 80 ? '#bae6fd' : '#fde68a'),
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 900
                }}>
                  {confluence.grade === 'GRADE_A_PLUS' ? '⭐️ GRADE A+' : (confluence.grade === 'GRADE_A' ? 'GRADE A' : 'GRADE B')}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Win Rate: <strong style={{ color: '#4ade80' }}>{confluence.winRateEstimate}</strong>
              </span>
            </div>

            {/* 4 Pillars Mini Bar */}
            <div style={{ display: 'flex', gap: '4px', fontSize: '10.5px', color: '#94a3b8' }}>
              <span style={{ flex: 1, backgroundColor: '#1e293b', padding: '2px 4px', borderRadius: '3px', textAlign: 'center' }}>
                GEX: <strong style={{ color: '#38bdf8' }}>{confluence.pillars?.gex?.score}/30</strong>
              </span>
              <span style={{ flex: 1, backgroundColor: '#1e293b', padding: '2px 4px', borderRadius: '3px', textAlign: 'center' }}>
                TPO: <strong style={{ color: '#f59e0b' }}>{confluence.pillars?.tpo?.score}/25</strong>
              </span>
              <span style={{ flex: 1, backgroundColor: '#1e293b', padding: '2px 4px', borderRadius: '3px', textAlign: 'center' }}>
                PCR: <strong style={{ color: '#4ade80' }}>{confluence.pillars?.pcr?.score}/25</strong>
              </span>
              <span style={{ flex: 1, backgroundColor: '#1e293b', padding: '2px 4px', borderRadius: '3px', textAlign: 'center' }}>
                VOL: <strong style={{ color: '#a78bfa' }}>{confluence.pillars?.volume?.score}/20</strong>
              </span>
            </div>
          </div>
        )}

        {/* Items List */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          fontSize: '13px', 
          lineHeight: 1.5,
          flex: 1
        }}>
          {/* Item 0: LIVE PRICE LINE */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontWeight: 800 }}>• Live Price:</span>
            <span style={{
              backgroundColor: '#064e3b',
              border: '1px solid #059669',
              color: '#34d399',
              padding: '2px 9px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '13.5px',
              fontFamily: 'ui-monospace, monospace'
            }}>
              ₹{radar.spotFmt}
            </span>
          </div>

          {/* Item 1: Live Price Target */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontWeight: 800 }}>• Live Target:</span>
            <span style={{
              backgroundColor: '#271911',
              border: '1px solid #7c2d12',
              color: '#fb923c',
              padding: '2px 9px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '13px',
              fontFamily: 'ui-monospace, monospace'
            }}>
              {radar.liveTarget}
            </span>
          </div>

          {/* Item 2: Next Resistance */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontWeight: 800 }}>• Resistance:</span>
            <span style={{
              backgroundColor: '#2b1315',
              border: '1px solid #881337',
              color: '#f87171',
              padding: '2px 9px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '13px',
              fontFamily: 'ui-monospace, monospace'
            }}>
              {radar.callWallFmt} Call Wall
            </span>
          </div>

          {/* Item 3: Hard Stop / Floor */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontWeight: 800 }}>• Stop / Floor:</span>
            <span style={{
              backgroundColor: '#064e3b',
              border: '1px solid #047857',
              color: '#34d399',
              padding: '2px 9px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '13px',
              fontFamily: 'ui-monospace, monospace'
            }}>
              {radar.putWallFmt} Put Wall
            </span>
          </div>

          {/* Item 4: Current State */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontWeight: 800 }}>• State:</span>
            <span style={{
              backgroundColor: '#1e2638',
              border: '1px solid #334155',
              color: '#fb923c',
              padding: '2px 9px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '12.5px',
              fontFamily: 'ui-monospace, monospace'
            }}>
              {radar.currentState}
            </span>
          </div>

          {/* Item 5: Real-time Trade Advice */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontWeight: 800 }}>• Advice:</span>
            <span style={{
              backgroundColor: '#082f49',
              border: '1px solid #0284c7',
              color: '#38bdf8',
              padding: '2px 9px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '12.5px',
              fontFamily: 'ui-monospace, monospace'
            }}>
              {radar.tradeAdvice}
            </span>
          </div>
        </div>
      </div>

      {/* ── TABLE 2 (RIGHT): TACTICAL ACTION PLAN & OPTION BLUEPRINT ────────── */}
      <div style={{
        backgroundColor: '#0a101f',
        border: '1px solid #1e2d4a',
        borderRadius: '8px',
        padding: '14px 16px',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '8px',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={17} color="#38bdf8" />
            <span style={{ 
              fontSize: '13.5px', 
              fontWeight: 900, 
              color: '#f8fafc', 
              letterSpacing: '0.4px', 
              textTransform: 'uppercase' 
            }}>
              Tactical Action Plan ({radar.symbol})
            </span>
          </div>

          {confluence?.liquiditySweep && (
            <span style={{
              backgroundColor: 'rgba(239,68,68,0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              ⚡ {confluence.liquiditySweep.type.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* ── OPTION TRADE BLUEPRINT (EXACT ₹ CONTRACT PRICING) ────────────── */}
        {confluence?.optionPlan && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(6,78,59,0.2) 100%)',
            border: '1px solid #10b981',
            borderRadius: '6px',
            padding: '9px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ color: '#34d399', fontWeight: 900, fontSize: '13px' }}>
                🎯 {confluence.optionPlan.executionAdvice.action}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                Lot Size: <strong style={{ color: '#f8fafc' }}>{confluence.optionPlan.lotSize}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
              <span style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 800 }}>
                {confluence.optionPlan.executionAdvice.stopLossText}
              </span>
              <span style={{ color: '#34d399', backgroundColor: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 800 }}>
                {confluence.optionPlan.executionAdvice.target1Text}
              </span>
              <span style={{ color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 800 }}>
                {confluence.optionPlan.executionAdvice.target2Text}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              <span>Capital/Lot: <strong style={{ color: '#f8fafc' }}>₹{confluence.optionPlan.capital.capitalPerLot.toLocaleString()}</strong></span>
              <span>Max Risk/Lot: <strong style={{ color: '#f87171' }}>₹{confluence.optionPlan.capital.maxRiskPerLot.toLocaleString()}</strong></span>
              <span>Exp Gain/Lot: <strong style={{ color: '#34d399' }}>+₹{confluence.optionPlan.capital.expectedProfitTarget1.toLocaleString()}</strong></span>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px', 
          fontSize: '12.5px', 
          lineHeight: 1.5,
          flex: 1
        }}>
          {/* Point 1: Immediate Upside Target */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc', marginBottom: '3px' }}>
              1. The {radar.targetFmt} Test (Upside Target):
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <li>
                Strike <strong style={{ color: '#f8fafc' }}>{radar.targetFmt}</strong> call momentum:{' '}
                <span style={{
                  backgroundColor: '#1e2638',
                  color: '#fb923c',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontWeight: 900,
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}>
                  +{radar.targetSpeed} {radar.unitDisplay}
                </span>.
              </li>
              <li>
                Driving range: <strong style={{ color: '#f8fafc' }}>{radar.rangeMin} – {radar.targetFmt}</strong>.
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>Watch:</strong> {radar.watchText}
              </li>
            </ul>
          </div>

          {/* Point 2: Defense Line (The Tipping Point) */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc', marginBottom: '3px' }}>
              2. The {radar.defenseFmt} Defense Line (Tipping Point):
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <li>
                <strong style={{ color: '#f8fafc' }}>{radar.defenseFmt}</strong> is {radar.defenseRole}.
              </li>
              <li>
                Above <strong style={{ color: '#f8fafc' }}>{radar.defenseFmt}</strong>: Bounce thesis holds.
              </li>
              <li>
                <strong style={{ color: '#f87171' }}>Danger:</strong> Close below{' '}
                <strong style={{ color: '#f87171' }}>{radar.defenseFmt}</strong> triggers dealer panic toward{' '}
                <strong style={{ color: '#f87171' }}>{radar.secondaryPutFmt}</strong>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
