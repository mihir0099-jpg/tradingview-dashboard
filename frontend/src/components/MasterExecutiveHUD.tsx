import React, { useState, useEffect } from 'react';
import { Clock, TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, ChevronUp, ChevronDown, Activity, Zap } from 'lucide-react';
import { getBackendUrl } from '../utils/config';

interface LiveMarketStatus {
  ok: boolean;
  timestamp: number;
  istTime: string;
  tpo?: {
    currentPeriod: string | null;
    periodName: string;
    progressPct: number;
    remainingMinutes: number;
    actionAdvice?: string;
    gPeriod?: {
      isGPeriod: boolean;
      gPeriodStatus: string;
      countdownSeconds?: number;
    };
  };
  pcrVelocity?: {
    drift: number;
    direction: string;
    label: string;
    color: string;
    trendDayConfirmed: boolean;
  };
  initialBalance?: {
    ibHigh: number;
    ibLow: number;
    ibRange: number;
    dayType: string;
    breakoutState: string;
  };
  confluence?: {
    score: number;
    action: string;
    status: string;
    color: string;
  };
  masterAIDirective?: string;
}

export function MasterExecutiveHUD() {
  const [status, setStatus] = useState<LiveMarketStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(false);

  const fetchStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/system/live-market-status?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setStatus(json);
        setError(false);
      }
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const pcr = status.pcrVelocity;
  const ib = status.initialBalance;
  const tpo = status.tpo;
  const conf = status.confluence;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 999,
      background: 'linear-gradient(180deg, #090d16 0%, #0d1526 100%)',
      borderBottom: '1px solid rgba(56,189,248,0.25)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#f8fafc',
      transition: 'all 0.3s ease'
    }}>
      {/* ── Top Bar / Collapsed View ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        fontSize: '11px',
        borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 900,
            color: '#38bdf8',
            letterSpacing: '0.5px'
          }}>
            <Activity size={11} />
            EXECUTIVE HUD
          </span>

          {/* Quick TPO Badge */}
          <span style={{ fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} style={{ color: '#f59e0b' }} />
            {tpo?.currentPeriod ? `Period ${tpo.currentPeriod}` : 'Post-Market'}
          </span>

          <span style={{ color: '#475569' }}>|</span>

          {/* PCR Drift Badge */}
          <span style={{
            fontWeight: 800,
            color: pcr?.color || '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {pcr?.drift && pcr.drift < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            PCR Drift: {pcr?.drift ? `${pcr.drift > 0 ? '+' : ''}${pcr.drift.toFixed(2)}` : '0.00'}
            {pcr?.trendDayConfirmed && (
              <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '1px 4px', borderRadius: '3px', fontSize: '9px' }}>
                TREND DAY
              </span>
            )}
          </span>

          <span style={{ color: '#475569' }}>|</span>

          {/* IB Breakout Badge */}
          <span style={{ fontWeight: 700, color: ib?.breakoutState === 'BREAKDOWN_ACCEPTED' ? '#ef4444' : (ib?.breakoutState === 'BREAKOUT_ACCEPTED' ? '#22c55e' : '#f59e0b') }}>
            IB: {ib?.breakoutState?.replace('_', ' ')}
          </span>
        </div>

        {/* Master Confluence Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Confluence:</span>
            <span style={{
              background: conf?.color ? `${conf.color}22` : 'rgba(239,68,68,0.2)',
              border: `1px solid ${conf?.color || '#ef4444'}60`,
              color: conf?.color || '#ef4444',
              borderRadius: '4px',
              padding: '1px 6px',
              fontWeight: 900,
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              {conf?.score || 82} / 100
            </span>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px'
            }}
            title={collapsed ? 'Expand HUD' : 'Collapse HUD'}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Full Executive HUD ── */}
      {!collapsed && (
        <div style={{ padding: '8px 14px 10px 14px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {/* Module 1: TPO Auction Mechanics */}
            <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>TPO Auction Window</span>
                <Clock size={12} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>
                {tpo?.periodName || 'TPO Period Window'}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                {tpo?.actionAdvice || 'Market Auction Mechanics Active'}
              </div>
            </div>

            {/* Module 2: First-Hour Options PCR Velocity */}
            <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Options Flow (Rule 2D)</span>
                <Zap size={12} style={{ color: pcr?.color || '#38bdf8' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: pcr?.color || '#38bdf8' }}>
                {pcr?.label || 'Options PCR Velocity'}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                Velocity Drift: <b style={{ color: '#f8fafc' }}>{pcr?.drift ? `${pcr.drift > 0 ? '+' : ''}${pcr.drift.toFixed(2)}` : '0.00'}</b> (Threshold: &plusmn;0.03)
              </div>
            </div>

            {/* Module 3: Initial Balance Range */}
            <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Initial Balance (09:15–10:15)</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#a855f7' }}>{ib?.dayType?.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', display: 'flex', gap: '8px' }}>
                <span>High: <b style={{ color: '#22c55e' }}>{ib?.ibHigh}</b></span>
                <span>Low: <b style={{ color: '#ef4444' }}>{ib?.ibLow}</b></span>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                Width: <b style={{ color: '#f8fafc' }}>{ib?.ibRange} pts</b> ({ib?.breakoutState?.replace('_', ' ')})
              </div>
            </div>

            {/* Module 4: Trade Recommendation */}
            <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Institutional Action</span>
                <ShieldCheck size={12} style={{ color: conf?.color || '#22c55e' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: conf?.color || '#ef4444' }}>
                {conf?.action?.replace(/_/g, ' ') || 'CONSIDER PUTS'}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                Signal Conviction: <b style={{ color: conf?.color || '#ef4444' }}>{conf?.status?.replace(/_/g, ' ') || 'HIGH'}</b>
              </div>
            </div>
          </div>

          {/* Master AI Directive Strip */}
          {status.masterAIDirective && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(90deg, rgba(168,85,247,0.12) 0%, rgba(56,189,248,0.08) 100%)',
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px'
            }}>
              <span style={{
                background: 'rgba(168,85,247,0.2)',
                color: '#c084fc',
                fontWeight: 900,
                fontSize: '9px',
                padding: '2px 5px',
                borderRadius: '3px',
                flexShrink: 0
              }}>
                MASTER AI DIRECTIVE
              </span>
              <span style={{ color: '#e2e8f0', fontWeight: 700, flex: 1 }}>
                {status.masterAIDirective}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
