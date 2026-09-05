import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Target, Maximize2, Shield, Activity } from 'lucide-react';

interface TargetItem {
  label: string;
  price: number;
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
        <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading Day Range & Levels...</p>
      </div>
    );
  }

  const asset = selectedAsset === 'nifty' ? data?.nifty : data?.banknifty;
  if (!asset) return null;

  const isUp = asset.changePts >= 0;

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1440px', margin: '0 auto', width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Navigation & Asset Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.15))', padding: '10px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Activity size={24} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Day Range
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Intraday Range, Key Auction Reference Levels & Targets
            </p>
          </div>
        </div>

        {/* Asset Toggle & Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setSelectedAsset('nifty')}
              style={{
                background: selectedAsset === 'nifty' ? '#3b82f6' : 'transparent',
                color: selectedAsset === 'nifty' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 18px',
                borderRadius: '8px',
                fontSize: '13px',
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
                padding: '6px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              BANK NIFTY
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
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{data?.istTimeStr || 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Spot Price & Session Overview Banner */}
      <div style={{
        background: 'rgba(17, 24, 39, 0.65)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '20px',
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

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
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
        </div>
      </div>

      {/* 4 Range Summary Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
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
            Projected total expansion for the session
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
            Day High ({asset.dayHigh}) - Day Low ({asset.dayLow})
          </div>
        </div>

        {/* Initial Balance Range */}
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
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IB Range</span>
            <Shield size={16} color="#facc15" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: '#facc15' }}>
            {asset.ibRange} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            IB High ({asset.ibHigh}) - IB Low ({asset.ibLow})
          </div>
        </div>

        {/* Range Consumed % */}
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
            <span style={{ fontSize: '12px', fontWeight: 800, color: asset.rangeConsumedPct >= 85 ? '#f43f5e' : '#10b981' }}>
              {asset.rangeConsumedPct}%
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: asset.rangeConsumedPct >= 85 ? '#f43f5e' : '#10b981' }}>
            {asset.rangeConsumedPct}%
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, asset.rangeConsumedPct)}%`,
              height: '100%',
              background: asset.rangeConsumedPct >= 85 ? '#f43f5e' : (asset.rangeConsumedPct >= 65 ? '#f59e0b' : '#10b981'),
              borderRadius: '3px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Auction Reference Levels Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '18px 20px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
          Auction Reference Levels
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px'
        }}>
          {/* Expected High */}
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Expected High</div>
            <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'monospace', color: '#10b981', marginTop: '4px' }}>
              {asset.expectedHigh}
            </div>
          </div>

          {/* Day High */}
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, textTransform: 'uppercase' }}>Day High</div>
            <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'monospace', color: '#86efac', marginTop: '4px' }}>
              {asset.dayHigh}
            </div>
          </div>

          {/* IB High */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>IB High</div>
            <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'monospace', color: '#60a5fa', marginTop: '4px' }}>
              {asset.ibHigh}
            </div>
          </div>

          {/* Current Spot */}
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#ffffff', fontWeight: 800, textTransform: 'uppercase' }}>Live Spot</div>
            <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff', marginTop: '4px' }}>
              {asset.spot}
            </div>
          </div>

          {/* IB Low */}
          <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#fb923c', fontWeight: 700, textTransform: 'uppercase' }}>IB Low</div>
            <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'monospace', color: '#fb923c', marginTop: '4px' }}>
              {asset.ibLow}
            </div>
          </div>

          {/* Day Low */}
          <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#fda4af', fontWeight: 700, textTransform: 'uppercase' }}>Day Low</div>
            <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'monospace', color: '#fda4af', marginTop: '4px' }}>
              {asset.dayLow}
            </div>
          </div>

          {/* Expected Low */}
          <div style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.3)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase' }}>Expected Low</div>
            <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'monospace', color: '#f43f5e', marginTop: '4px' }}>
              {asset.expectedLow}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Target Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Bullish Breakout Targets Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} color="#10b981" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>Bullish Targets</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6ee7b7', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Above {asset.ibHigh}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {asset.bullishTargets.map((item, idx) => {
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

        {/* Bearish Breakdown Targets Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} color="#f43f5e" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#f43f5e' }}>Bearish Targets</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fda4af', background: 'rgba(244, 63, 94, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Below {asset.ibLow}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {asset.bearishTargets.map((item, idx) => {
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
