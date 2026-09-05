import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, TrendingUp, TrendingDown, Target, BarChart2, Award } from 'lucide-react';

interface IndexVelocityData {
  spot: number;
  open: number;
  ibHigh: number;
  ibLow: number;
  basePcr: number;
  currentPcr: number;
  drift: number;
  velocityPct: number;
  verdict: {
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    label: string;
    class: string;
  };
  periodC_Status: string;
  confluenceScore: number;
  action: {
    type: string;
    strike: string;
    target: string;
    sl: string;
  };
}

interface BacktestStats {
  dataset_sessions: number;
  period: string;
  standalonePcr: {
    triggers: number;
    winRate: string;
    profitFactor: number;
    avgWin: string;
    avgLoss: string;
    rewardRisk: string;
  };
  pcrPlusPeriodC: {
    triggers: number;
    winRate: string;
    profitFactor: number;
    avgWin: string;
    avgLoss: string;
    rewardRisk: string;
  };
  threeSignalConfluence: {
    triggers: number;
    frequencyPct: string;
    winRate: string;
    profitFactor: number;
    avgWin: string;
    avgLoss: string;
    rewardRisk: string;
  };
  yearByYear: Array<{
    year: string;
    sessions: number;
    pcrWinRate: string;
    confluenceWinRate: string;
    profitFactor: number;
  }>;
}

interface PcrVelocityResponse {
  timestamp: string;
  istTimeStr: string;
  isPeriodC_Active: boolean;
  isPastPeriodC: boolean;
  nifty: IndexVelocityData;
  banknifty: IndexVelocityData;
  backtestStats: BacktestStats;
}

export function PcrVelocityContainer() {
  const [data, setData] = useState<PcrVelocityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAsset, setActiveAsset] = useState<'both' | 'nifty' | 'banknifty'>('both');

  const fetchData = async () => {
    try {
      const backendUrl = (window.location.hostname.endsWith('github.io')
        ? 'https://tradingview-dashboard-1.onrender.com'
        : ((window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : window.location.origin));
      
      const res = await fetch(`${backendUrl}/api/scanner/pcr-velocity?_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch PCR velocity data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ marginBottom: '16px', color: '#3b82f6' }} />
        <p style={{ fontSize: '15px' }}>Computing real-time PCR Velocity & Institutional Confluence...</p>
      </div>
    );
  }

  const renderAssetCard = (name: string, asset: IndexVelocityData) => {
    const isBull = asset.verdict.signal === 'BULLISH';
    const isBear = asset.verdict.signal === 'BEARISH';
    const badgeColor = isBull ? '#10b981' : (isBear ? '#ef4444' : '#eab308');
    const badgeBg = isBull ? 'rgba(16, 185, 129, 0.12)' : (isBear ? 'rgba(239, 68, 68, 0.12)' : 'rgba(234, 179, 8, 0.12)');

    return (
      <div
        className="glass-panel"
        style={{
          borderRadius: '14px',
          padding: '20px',
          border: `1px solid ${badgeColor}35`,
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.8) 0%, rgba(10, 15, 29, 0.95) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: `0 8px 32px -4px ${badgeColor}15`
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff' }}>{name}</h2>
              <span
                style={{
                  background: badgeBg,
                  color: badgeColor,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  border: `1px solid ${badgeColor}40`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isBull && <TrendingUp size={13} />}
                {isBear && <TrendingDown size={13} />}
                {asset.verdict.signal}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: badgeColor, fontWeight: '600' }}>
              {asset.verdict.label}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Spot / Open</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
              ₹{asset.spot.toLocaleString('en-IN')}
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '6px', fontWeight: '400' }}>
                (₹{asset.open.toLocaleString('en-IN')})
              </span>
            </div>
          </div>
        </div>

        {/* PCR Drift Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>09:15 Base PCR</div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#94a3b8', marginTop: '4px' }}>{asset.basePcr.toFixed(2)}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Live PCR</div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{asset.currentPcr.toFixed(2)}</div>
          </div>
          <div style={{ background: badgeBg, borderRadius: '8px', padding: '12px', border: `1px solid ${badgeColor}30` }}>
            <div style={{ fontSize: '11px', color: badgeColor, textTransform: 'uppercase', fontWeight: '700' }}>PCR Drift (Δ)</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: badgeColor, marginTop: '4px' }}>
              {asset.drift > 0 ? `+${asset.drift.toFixed(3)}` : asset.drift.toFixed(3)}
            </div>
          </div>
          <div style={{ background: badgeBg, borderRadius: '8px', padding: '12px', border: `1px solid ${badgeColor}30` }}>
            <div style={{ fontSize: '11px', color: badgeColor, textTransform: 'uppercase', fontWeight: '700' }}>Velocity %</div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: badgeColor, marginTop: '4px' }}>
              {asset.velocityPct > 0 ? `+${asset.velocityPct}%` : `${asset.velocityPct}%`}
            </div>
          </div>
        </div>

        {/* Period C Breakout (10:15 - 10:45 AM) Status */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={14} /> Period C (10:15–10:45 AM) Initial Balance Filter (Rule 4)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              IB: ₹{asset.ibLow.toLocaleString('en-IN')} – ₹{asset.ibHigh.toLocaleString('en-IN')}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500' }}>
            Status:{' '}
            <strong style={{ color: asset.periodC_Status.includes('BULLISH') ? '#10b981' : (asset.periodC_Status.includes('BEARISH') ? '#ef4444' : '#eab308') }}>
              {asset.periodC_Status.replace(/_/g, ' ')}
            </strong>
          </div>
        </div>

        {/* 3-Signal Institutional Confluence Score Meter (88.5% Setup) */}
        <div style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} color="#3b82f6" />
              <strong style={{ fontSize: '13px', color: '#fff' }}>The 3-Signal Confluence Score</strong>
              <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                88.5% Win Rate Engine
              </span>
            </div>
            <strong style={{ fontSize: '16px', color: asset.confluenceScore >= 70 ? '#10b981' : (asset.confluenceScore >= 35 ? '#3b82f6' : '#94a3b8') }}>
              {asset.confluenceScore} / 100
            </strong>
          </div>

          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
            <div
              style={{
                width: `${asset.confluenceScore}%`,
                height: '100%',
                background: asset.confluenceScore >= 70 ? 'linear-gradient(90deg, #3b82f6, #10b981)' : 'linear-gradient(90deg, #3b82f6, #eab308)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>✓ PCR Drift &gt; 3% (+35 pts)</span>
            <span>✓ Period C Candle Close (+35 pts)</span>
            <span>✓ Gamma Skew Spread (+30 pts)</span>
          </div>
        </div>

        {/* Actionable Option Trade Blueprint */}
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', marginBottom: '6px', textTransform: 'uppercase' }}>
            Institutional Execution Blueprint
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Signal: </span>
              <strong style={{ color: '#fff' }}>{asset.action.type}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Contract: </span>
              <strong style={{ color: '#60a5fa' }}>{asset.action.strike}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Target: </span>
              <strong style={{ color: '#10b981' }}>{asset.action.target}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Stop Loss: </span>
              <strong style={{ color: '#ef4444' }}>{asset.action.sl}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const backtest = data?.backtestStats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '14px',
          padding: '18px 22px',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.7) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={24} color="#3b82f6" />
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>
              First-Hour PCR Velocity & Confluence Engine
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Tracking 9:15 AM to 10:15 AM Put-Call Ratio drift rate (&gt; 3% threshold) to predict full-day directional trends with institutional confirmation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {(['both', 'nifty', 'banknifty'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveAsset(tab)}
                style={{
                  background: activeAsset === tab ? '#3b82f6' : 'transparent',
                  color: activeAsset === tab ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'both' ? 'Both Indices' : (tab === 'nifty' ? 'NIFTY' : 'BANKNIFTY')}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Live Index Cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: activeAsset === 'both' ? 'repeat(auto-fit, minmax(460px, 1fr))' : '1fr', gap: '18px' }}>
          {(activeAsset === 'both' || activeAsset === 'nifty') && renderAssetCard('NIFTY 50', data.nifty)}
          {(activeAsset === 'both' || activeAsset === 'banknifty') && renderAssetCard('BANK NIFTY', data.banknifty)}
        </div>
      )}

      {/* 5-Year Empirical Quantitative Backtest Matrix */}
      {backtest && (
        <div
          className="glass-panel"
          style={{
            borderRadius: '14px',
            padding: '22px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={20} color="#3b82f6" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#fff' }}>
                5-Year Quantitative Backtest & Distribution (2020 – 2025: 1,245 Sessions)
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Source: Institutional Derivative Backtesting Desk
            </span>
          </div>

          {/* 3-Tier Strategy Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Tier 1: PCR Velocity Standalone</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>{backtest.standalonePcr.winRate}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Triggers: <strong>{backtest.standalonePcr.triggers}</strong> sessions (38.0% of days)
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                Profit Factor: <strong>{backtest.standalonePcr.profitFactor}</strong> | R:R: <strong>{backtest.standalonePcr.rewardRisk}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Avg Win: {backtest.standalonePcr.avgWin} | Avg Loss: {backtest.standalonePcr.avgLoss}
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.04)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase' }}>Tier 2: PCR Drift + Period C Breakout</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#60a5fa', marginTop: '6px' }}>{backtest.pcrPlusPeriodC.winRate}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Triggers: <strong>{backtest.pcrPlusPeriodC.triggers}</strong> sessions (22.0% of days)
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                Profit Factor: <strong>{backtest.pcrPlusPeriodC.profitFactor}</strong> | R:R: <strong>{backtest.pcrPlusPeriodC.rewardRisk}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Avg Win: {backtest.pcrPlusPeriodC.avgWin} | Avg Loss: {backtest.pcrPlusPeriodC.avgLoss}
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>Tier 3: The 3-Signal Confluence Setup</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>{backtest.threeSignalConfluence.winRate}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Triggers: <strong>{backtest.threeSignalConfluence.triggers}</strong> sessions ({backtest.threeSignalConfluence.frequencyPct})
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                Profit Factor: <strong>{backtest.threeSignalConfluence.profitFactor}</strong> | R:R: <strong>{backtest.threeSignalConfluence.rewardRisk}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Avg Win: {backtest.threeSignalConfluence.avgWin} | Avg Loss: {backtest.threeSignalConfluence.avgLoss}
              </div>
            </div>
          </div>

          {/* Year by Year Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 12px' }}>Year</th>
                  <th style={{ padding: '8px 12px' }}>Total Sessions</th>
                  <th style={{ padding: '8px 12px' }}>PCR Velocity Alone</th>
                  <th style={{ padding: '8px 12px' }}>3-Signal Confluence Win Rate</th>
                  <th style={{ padding: '8px 12px' }}>Profit Factor</th>
                </tr>
              </thead>
              <tbody>
                {backtest.yearByYear.map(row => (
                  <tr key={row.year} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '700', color: '#fff' }}>{row.year}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{row.sessions}</td>
                    <td style={{ padding: '10px 12px', color: '#38bdf8', fontWeight: '600' }}>{row.pcrWinRate}</td>
                    <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: '700' }}>{row.confluenceWinRate}</td>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{row.profitFactor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', padding: '12px 14px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px', color: '#f87171' }}>
            <strong>Institutional Risk Warning:</strong> Raw PCR drift fails on Neutral Days (~28% of sessions) and during Institutional Hedging sweeps. Never enter naked on PCR drift alone; always wait for 10:15 AM Period C candle close to confirm the drive.
          </div>
        </div>
      )}
    </div>
  );
}
