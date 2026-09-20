import React, { useState, useEffect, useMemo } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  RefreshCw, Search, Shield, AlertTriangle, 
  CheckCircle, ArrowUpRight, ArrowDownRight, Filter, Info, Eye, 
  Zap, BarChart2, Flame, Award, Crosshair, Lock
} from 'lucide-react';

export interface StockPcrItem {
  symbol: string;
  name: string;
  sector: string;
  spotPrice: number;
  dayChangePct: number;
  lotSize: number;
  basePcr: number;
  currentPcr: number;
  locked1015Pcr: number;
  isLocked1015: boolean;
  liveDrift: number;
  liveDriftPct: number;
  drift1015: number;
  drift1015Pct: number;
  effectiveDrift: number;
  effectiveDriftPct: number;
  signal: 'BULLISH_PUT_WRITING' | 'BEARISH_CALL_WRITING' | 'NEUTRAL';
  signalLabel: string;
  writingCategory: 'PUT_WRITTEN' | 'CALL_WRITTEN' | 'NEUTRAL';
  action: string;
  stars: string;
  totalCallOi: number;
  totalPutOi: number;
  callWallStrike: number;
  putWallStrike: number;
  volatilitySkew: string;
  skewSpread: number;
}

export interface StockPcrResponse {
  success: boolean;
  timestamp: string;
  istTime: string;
  isPast1015: boolean;
  isMarketHours: boolean;
  totalScanned: number;
  filteredCount?: number;
  summary: {
    putWritingCount: number;
    callWritingCount: number;
    neutralCount: number;
    putWritingPct: number;
    callWritingPct: number;
    neutralPct: number;
    avgMarketDriftPct: number;
    marketBias: 'BULLISH_PUT_WRITING' | 'BEARISH_CALL_WRITING' | 'NEUTRAL';
  };
  sectorRankings: Array<{
    sector: string;
    total: number;
    putWriting: number;
    callWriting: number;
    avgDriftPct: number;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }>;
  stocks: StockPcrItem[];
}

// ── Holographic Circular Dial Component ────────────────────────────────────────
const CircularGauge: React.FC<{
  value: number;
  max?: number;
  label: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}> = ({ value, max = 100, label, color = '#00f0ff', size = 52, strokeWidth = 3.5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          stroke="rgba(255, 255, 255, 0.08)" 
          strokeWidth={strokeWidth} 
          fill="transparent" 
        />
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" 
          fill="transparent"
          style={{ 
            filter: `drop-shadow(0 0 5px ${color})`,
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
      <div style={{ 
        position: 'absolute', 
        fontSize: '10.5px', 
        fontWeight: 900, 
        color: '#ffffff', 
        textAlign: 'center',
        textShadow: `0 0 8px ${color}`
      }}>
        {label}
      </div>
    </div>
  );
};

// ── Mini Institutional Order Flow Histogram ────────────────────────────────────
const OiFootprintHistogram: React.FC<{ putOi: number; callOi: number }> = ({ putOi, callOi }) => {
  const total = (putOi + callOi) || 1;
  const pRatio = putOi / total;
  const cRatio = callOi / total;

  // 7 vertical dual-bars (Green up, Red down)
  const pattern = [
    { up: 4, down: 3 },
    { up: 8, down: 5 },
    { up: 14, down: 8 },
    { up: 16, down: 14 },
    { up: 10, down: 12 },
    { up: 7, down: 7 },
    { up: 3, down: 4 }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ 
        fontSize: '10px', 
        fontWeight: 800, 
        color: '#00ff88', 
        minWidth: '48px', 
        textAlign: 'right',
        textShadow: '0 0 6px rgba(0, 255, 136, 0.5)'
      }}>
        Put: {(putOi / 1000).toFixed(0)}k
      </span>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5px',
        height: '34px',
        width: '58px',
        position: 'relative'
      }}>
        {/* Center line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.25)'
        }} />

        {pattern.map((bar, i) => {
          const upH = Math.max(2, Math.round(bar.up * (pRatio * 1.8)));
          const dnH = Math.max(2, Math.round(bar.down * (cRatio * 1.8)));
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '3.5px', zIndex: 1 }}>
              {/* Green Upper Bar */}
              <div style={{
                width: '3px',
                height: `${upH}px`,
                backgroundColor: '#00ff88',
                borderRadius: '1px 1px 0 0',
                boxShadow: '0 0 5px rgba(0, 255, 136, 0.6)'
              }} />
              {/* Red Lower Bar */}
              <div style={{
                width: '3px',
                height: `${dnH}px`,
                backgroundColor: '#ff3366',
                borderRadius: '0 0 1px 1px',
                boxShadow: '0 0 5px rgba(255, 51, 102, 0.6)'
              }} />
            </div>
          );
        })}
      </div>

      <span style={{ 
        fontSize: '10px', 
        fontWeight: 800, 
        color: '#ff3366', 
        minWidth: '48px',
        textShadow: '0 0 6px rgba(255, 51, 102, 0.5)'
      }}>
        Call: {(callOi / 1000).toFixed(0)}k
      </span>
    </div>
  );
};

export function StockPcrScannerContainer() {
  const [data, setData] = useState<StockPcrResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'PUT_WRITTEN' | 'CALL_WRITTEN' | 'HIGH_VELOCITY' | 'NEUTRAL'>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'drift_desc' | 'drift_asc' | 'oi_desc' | 'change_desc'>('drift_desc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const fetchData = async (isManualScan = false) => {
    try {
      if (isManualScan) setScanning(true);
      else if (!data) setLoading(true);

      const backendUrl = getBackendUrl();
      const endpoint = isManualScan 
        ? `${backendUrl}/api/scanner/stock-pcr/scan`
        : `${backendUrl}/api/scanner/stock-pcr?_t=${Date.now()}`;

      const options = isManualScan 
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' } }
        : { cache: 'no-store' as RequestCache };

      const res = await fetch(endpoint, options);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.error('[StockPcrScanner] Fetch error:', err);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(false), 20000);
    return () => clearInterval(interval);
  }, []);

  const sectorList = useMemo(() => {
    if (!data?.stocks) return [];
    const set = new Set<string>();
    data.stocks.forEach(s => {
      if (s.sector) set.add(s.sector);
    });
    return Array.from(set).sort();
  }, [data?.stocks]);

  const processedStocks = useMemo(() => {
    if (!data?.stocks) return [];
    let list = [...data.stocks];

    if (filterCategory === 'PUT_WRITTEN') {
      list = list.filter(s => s.writingCategory === 'PUT_WRITTEN');
    } else if (filterCategory === 'CALL_WRITTEN') {
      list = list.filter(s => s.writingCategory === 'CALL_WRITTEN');
    } else if (filterCategory === 'HIGH_VELOCITY') {
      list = list.filter(s => Math.abs(s.effectiveDriftPct) >= 10.0);
    } else if (filterCategory === 'NEUTRAL') {
      list = list.filter(s => s.writingCategory === 'NEUTRAL');
    }

    if (selectedSector !== 'ALL') {
      list = list.filter(s => s.sector.toLowerCase() === selectedSector.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(s => 
        s.symbol.toLowerCase().includes(q) || 
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'drift_desc') return b.effectiveDriftPct - a.effectiveDriftPct;
      if (sortBy === 'drift_asc') return a.effectiveDriftPct - b.effectiveDriftPct;
      if (sortBy === 'oi_desc') return (b.totalCallOi + b.totalPutOi) - (a.totalCallOi + a.totalPutOi);
      if (sortBy === 'change_desc') return b.dayChangePct - a.dayChangePct;
      return 0;
    });

    return list;
  }, [data?.stocks, filterCategory, selectedSector, searchQuery, sortBy]);

  return (
    <div style={{
      backgroundColor: '#050914',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(14, 165, 233, 0.12) 0%, transparent 65%), linear-gradient(180deg, #070d1a 0%, #03060f 100%)',
      color: '#f1f5f9',
      minHeight: '100vh',
      padding: '16px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ─────────────────────────────────────────────────────────────
          HOLOGRAPHIC COMMAND CENTER CONTAINER
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'rgba(9, 15, 30, 0.75)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        boxShadow: '0 0 30px rgba(14, 165, 233, 0.2), inset 0 0 20px rgba(56, 189, 248, 0.05)',
        padding: '16px 18px',
        marginBottom: '16px'
      }}>
        {/* ── TOP HEADER BAR ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
          paddingBottom: '14px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Crosshair size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '0.8px',
                  textShadow: '0 0 12px rgba(255, 255, 255, 0.4)'
                }}>
                  STOCK PCR SCANNER (RULE #2D)
                </span>

                <span style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  color: '#00ff88',
                  fontSize: '10.5px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  border: '1px solid rgba(0, 255, 136, 0.5)',
                  boxShadow: '0 0 8px rgba(0, 255, 136, 0.25)',
                  letterSpacing: '0.4px'
                }}>
                  10:15 AM FIRST-HOUR VELOCITY (±3% FILTER)
                </span>

                <span style={{
                  backgroundColor: data?.isPast1015 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  color: data?.isPast1015 ? '#d8b4fe' : '#fde047',
                  fontSize: '10.5px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  border: `1px solid ${data?.isPast1015 ? 'rgba(168, 85, 247, 0.5)' : 'rgba(234, 179, 8, 0.5)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Lock size={11} />
                  {data?.isPast1015 ? '10:15 AM SNAPSHOT LOCKED' : 'ACCUMULATING LIVE DRIFT'}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                Scans 100% of the 212 official NSE F&O universe. Identifies institutional put writing floors (&gt; +3%) or call writing ceilings (&lt; -3%).
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              IST Time: <strong style={{ color: '#ffffff' }}>{data?.istTime || '--'}</strong>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={scanning || loading}
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.8)',
                color: '#ffffff',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: scanning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 14px rgba(56, 189, 248, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning...' : 'Scan Now (Live)'}
            </button>
          </div>
        </div>

        {/* ── TOP KPI STRIP WITH HOLOGRAPHIC CIRCULAR GAUGES ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '10px',
          marginBottom: '14px'
        }}>
          {/* Gauge 1: Scanned */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.1)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>SCANNED</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                {data?.totalScanned || 212} Stocks
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>100% official F&O universe</div>
            </div>
            <CircularGauge value={100} label="212" color="#00f0ff" size={48} />
          </div>

          {/* Gauge 2: Put Writing */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(0, 255, 136, 0.4)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 10px rgba(0, 255, 136, 0.15)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#00ff88', fontWeight: 800, textTransform: 'uppercase' }}>PUT WRITING (&gt; +3%)</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#00ff88', marginTop: '2px', textShadow: '0 0 8px rgba(0, 255, 136, 0.4)' }}>
                {data?.summary?.putWritingCount || 0} <span style={{ fontSize: '11px', color: '#a7f3d0' }}>({data?.summary?.putWritingPct || 0}%)</span>
              </div>
              <div style={{ fontSize: '9px', color: '#00ff88' }}>Institutional Support Floor</div>
            </div>
            <CircularGauge 
              value={data?.summary?.putWritingPct || 50} 
              label={`${Math.round(data?.summary?.putWritingPct || 50)}%`} 
              color="#00ff88" 
              size={48} 
            />
          </div>

          {/* Gauge 3: Call Writing */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 51, 102, 0.4)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 10px rgba(255, 51, 102, 0.15)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#ff3366', fontWeight: 800, textTransform: 'uppercase' }}>CALL WRITING (&lt; -3%)</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ff3366', marginTop: '2px', textShadow: '0 0 8px rgba(255, 51, 102, 0.4)' }}>
                {data?.summary?.callWritingCount || 0} <span style={{ fontSize: '11px', color: '#fecaca' }}>({data?.summary?.callWritingPct || 0}%)</span>
              </div>
              <div style={{ fontSize: '9px', color: '#ff3366' }}>Institutional Overhead Ceiling</div>
            </div>
            <CircularGauge 
              value={data?.summary?.callWritingPct || 40} 
              label={`${Math.round(data?.summary?.callWritingPct || 40)}%`} 
              color="#ff3366" 
              size={48} 
            />
          </div>

          {/* Gauge 4: Neutral */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>NEUTRAL / ROTATIONAL</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#e2e8f0', marginTop: '2px' }}>
                {data?.summary?.neutralCount || 0} <span style={{ fontSize: '11px', color: '#64748b' }}>({data?.summary?.neutralPct || 0}%)</span>
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Inside -3% to +3% Range</div>
            </div>
            <CircularGauge 
              value={data?.summary?.neutralPct || 10} 
              label={`${data?.summary?.neutralCount || 16}`} 
              color="#94a3b8" 
              size={48} 
            />
          </div>

          {/* Gauge 5: Writing Bias */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(0, 240, 255, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.1)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>WRITING BIAS</div>
              <div style={{
                fontSize: '18px',
                fontWeight: 900,
                color: (data?.summary?.avgMarketDriftPct || 0) >= 0 ? '#00ff88' : '#ff3366',
                marginTop: '2px',
                textShadow: (data?.summary?.avgMarketDriftPct || 0) >= 0 ? '0 0 8px rgba(0, 255, 136, 0.4)' : '0 0 8px rgba(255, 51, 102, 0.4)'
              }}>
                {(data?.summary?.avgMarketDriftPct || 0) >= 0 ? '+' : ''}{data?.summary?.avgMarketDriftPct || 0}%
              </div>
              <div style={{ fontSize: '9px', color: '#00ff88' }}>
                {data?.summary?.marketBias === 'BULLISH_PUT_WRITING' ? '🟢 Put Writing (Bullish)' : (data?.summary?.marketBias === 'BEARISH_CALL_WRITING' ? '🔴 Call Writing (Bearish)' : '⚪ Neutral Flow')}
              </div>
            </div>
            <CircularGauge 
              value={Math.abs(data?.summary?.avgMarketDriftPct || 2) * 10} 
              label={`${(data?.summary?.avgMarketDriftPct || 0) >= 0 ? '+' : ''}${data?.summary?.avgMarketDriftPct || 0}%`} 
              color={(data?.summary?.avgMarketDriftPct || 0) >= 0 ? '#00ff88' : '#ff3366'} 
              size={48} 
            />
          </div>
        </div>

        {/* ── FILTER BUTTONS & TOOLBAR ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '8px',
          padding: '8px 12px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* Category Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterCategory('ALL')}
              style={{
                backgroundColor: filterCategory === 'ALL' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: filterCategory === 'ALL' ? '#00f0ff' : '#94a3b8',
                border: `1px solid ${filterCategory === 'ALL' ? '#00f0ff' : 'rgba(56, 189, 248, 0.3)'}`,
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: filterCategory === 'ALL' ? '0 0 8px rgba(0, 240, 255, 0.3)' : 'none'
              }}
            >
              All F&O ({data?.totalScanned || 212})
            </button>

            <button
              onClick={() => setFilterCategory('PUT_WRITTEN')}
              style={{
                backgroundColor: filterCategory === 'PUT_WRITTEN' ? 'rgba(0, 255, 136, 0.25)' : 'transparent',
                color: filterCategory === 'PUT_WRITTEN' ? '#00ff88' : '#34d399',
                border: `1px solid ${filterCategory === 'PUT_WRITTEN' ? '#00ff88' : 'rgba(0, 255, 136, 0.3)'}`,
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: filterCategory === 'PUT_WRITTEN' ? '0 0 8px rgba(0, 255, 136, 0.3)' : 'none'
              }}
            >
              🟢 Put Writing &gt; +3% ({data?.summary?.putWritingCount || 0})
            </button>

            <button
              onClick={() => setFilterCategory('CALL_WRITTEN')}
              style={{
                backgroundColor: filterCategory === 'CALL_WRITTEN' ? 'rgba(255, 51, 102, 0.25)' : 'transparent',
                color: filterCategory === 'CALL_WRITTEN' ? '#ff3366' : '#f87171',
                border: `1px solid ${filterCategory === 'CALL_WRITTEN' ? '#ff3366' : 'rgba(255, 51, 102, 0.3)'}`,
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: filterCategory === 'CALL_WRITTEN' ? '0 0 8px rgba(255, 51, 102, 0.3)' : 'none'
              }}
            >
              🔴 Call Writing &lt; -3% ({data?.summary?.callWritingCount || 0})
            </button>

            <button
              onClick={() => setFilterCategory('HIGH_VELOCITY')}
              style={{
                backgroundColor: filterCategory === 'HIGH_VELOCITY' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                color: filterCategory === 'HIGH_VELOCITY' ? '#d8b4fe' : '#c084fc',
                border: `1px solid ${filterCategory === 'HIGH_VELOCITY' ? '#a855f7' : 'rgba(168, 85, 247, 0.3)'}`,
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: filterCategory === 'HIGH_VELOCITY' ? '0 0 8px rgba(168, 85, 247, 0.3)' : 'none'
              }}
            >
              ⚡ High Velocity (|Drift| ≥ 10%)
            </button>

            <button
              onClick={() => setFilterCategory('NEUTRAL')}
              style={{
                backgroundColor: filterCategory === 'NEUTRAL' ? 'rgba(148, 163, 184, 0.2)' : 'transparent',
                color: filterCategory === 'NEUTRAL' ? '#ffffff' : '#94a3b8',
                border: `1px solid ${filterCategory === 'NEUTRAL' ? '#94a3b8' : 'rgba(148, 163, 184, 0.3)'}`,
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ⚪ Neutral ({data?.summary?.neutralCount || 0})
            </button>
          </div>

          {/* Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#ffffff',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Sectors</option>
              {sectorList.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#ffffff',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="drift_desc">Highest Bullish Drift %</option>
              <option value="drift_asc">Highest Bearish Drift %</option>
              <option value="oi_desc">Highest Total OI</option>
              <option value="change_desc">Highest Spot % Change</option>
            </select>

            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '8px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search symbol / sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '6px',
                  padding: '5px 10px 5px 26px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  outline: 'none',
                  width: '160px'
                }}
              />
            </div>
          </div>
        </div>

        {/* ── CURVED HOLOGRAPHIC DATA TABLE ── */}
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          overflow: 'hidden',
          backgroundColor: 'rgba(6, 11, 25, 0.65)',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.08)'
        }}>
          {/* Top Badge: Snapshot 10:15 IST */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(56, 189, 248, 0.25)',
            border: '1px solid #00f0ff',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '2px 14px',
            fontSize: '9.5px',
            fontWeight: 800,
            color: '#00f0ff',
            letterSpacing: '0.6px',
            zIndex: 10,
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.35)'
          }}>
            SNAPSHOT {data?.istTime || '10:15'} IST
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  color: '#00f0ff',
                  borderBottom: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>Symbol & Sector</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>Spot Price & Change</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>09:15 Baseline PCR</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>10:15 / Live PCR</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>PCR Velocity Drift (Rule #2D)</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>Institutional Writing Verdict</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>Put / Call OI Ratio</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>Key Wall Strikes</th>
                  <th style={{ padding: '12px 12px', fontWeight: 900 }}>Strategic Action</th>
                </tr>
              </thead>

              <tbody>
                {processedStocks.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No stocks found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  processedStocks.map((stock, idx) => {
                    const isBull = stock.writingCategory === 'PUT_WRITTEN';
                    const isBear = stock.writingCategory === 'CALL_WRITTEN';
                    const isHover = hoveredRow === stock.symbol;

                    return (
                      <tr
                        key={stock.symbol}
                        onMouseEnter={() => setHoveredRow(stock.symbol)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          backgroundColor: isHover 
                            ? 'rgba(56, 189, 248, 0.12)' 
                            : (idx % 2 === 0 ? 'rgba(9, 16, 32, 0.7)' : 'rgba(5, 10, 22, 0.7)'),
                          borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Col 1: Symbol & Sector */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 900, color: '#ffffff', fontSize: '13.5px', letterSpacing: '0.4px' }}>
                              {stock.symbol}
                            </span>
                            <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                              ({stock.lotSize}L)
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>
                            {stock.sector}
                          </div>
                        </td>

                        {/* Col 2: Spot Price & Change */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '13.5px' }}>
                            ₹{stock.spotPrice.toLocaleString()}
                          </div>
                          <div style={{
                            color: stock.dayChangePct >= 0 ? '#00ff88' : '#ff3366',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            textShadow: stock.dayChangePct >= 0 ? '0 0 6px rgba(0, 255, 136, 0.4)' : '0 0 6px rgba(255, 51, 102, 0.4)'
                          }}>
                            {stock.dayChangePct >= 0 ? '+' : ''}{stock.dayChangePct}%
                          </div>
                        </td>

                        {/* Col 3: Baseline PCR */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '13px', fontFamily: 'monospace' }}>
                            {stock.basePcr.toFixed(3)}
                          </div>
                          <div style={{ fontSize: '9.5px', color: '#64748b' }}>09:15 AM Open</div>
                        </td>

                        {/* Col 4: 10:15 / Live PCR */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{
                            color: '#00f0ff',
                            fontWeight: 900,
                            fontSize: '13.5px',
                            fontFamily: 'monospace',
                            textShadow: '0 0 6px rgba(0, 240, 255, 0.5)'
                          }}>
                            {stock.isLocked1015 ? stock.locked1015Pcr.toFixed(3) : stock.currentPcr.toFixed(3)}
                          </div>
                          <div style={{ fontSize: '9px', color: '#38bdf8' }}>
                            {stock.isLocked1015 ? '10:15 AM Locked' : 'Live Realtime'}
                          </div>
                        </td>

                        {/* Col 5: PCR Velocity Drift */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{
                            display: 'inline-block',
                            backgroundColor: isBull ? 'rgba(0, 255, 136, 0.15)' : (isBear ? 'rgba(255, 51, 102, 0.15)' : 'rgba(100, 116, 139, 0.15)'),
                            color: isBull ? '#00ff88' : (isBear ? '#ff3366' : '#cbd5e1'),
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '12px',
                            border: `1px solid ${isBull ? '#00ff88' : (isBear ? '#ff3366' : 'rgba(100, 116, 139, 0.4)')}`,
                            boxShadow: isBull ? '0 0 6px rgba(0, 255, 136, 0.25)' : (isBear ? '0 0 6px rgba(255, 51, 102, 0.25)' : 'none')
                          }}>
                            {stock.effectiveDriftPct >= 0 ? '+' : ''}{stock.effectiveDriftPct}% ({stock.effectiveDrift >= 0 ? '+' : ''}{stock.effectiveDrift})
                          </div>
                          <div style={{ fontSize: '10px', color: '#fde047', marginTop: '2px', letterSpacing: '0.5px' }}>
                            {stock.stars}
                          </div>
                        </td>

                        {/* Col 6: Institutional Writing Verdict */}
                        <td style={{ padding: '10px 12px' }}>
                          {isBull && (
                            <div>
                              <span style={{
                                color: '#00ff88',
                                fontWeight: 900,
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                textShadow: '0 0 6px rgba(0, 255, 136, 0.4)'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
                                AGGRESSIVE PUT WRITING
                              </span>
                              <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1px' }}>
                                Support floor established
                              </div>
                            </div>
                          )}
                          {isBear && (
                            <div>
                              <span style={{
                                color: '#ff3366',
                                fontWeight: 900,
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                textShadow: '0 0 6px rgba(255, 51, 102, 0.4)'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff3366', boxShadow: '0 0 6px #ff3366' }} />
                                AGGRESSIVE CALL WRITING
                              </span>
                              <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1px' }}>
                                Overhead resistance (CE Blocked)
                              </div>
                            </div>
                          )}
                          {!isBull && !isBear && (
                            <div>
                              <span style={{ color: '#cbd5e1', fontWeight: 800, fontSize: '11px' }}>
                                ⚪ NEUTRAL ROTATION
                              </span>
                              <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                                Open auction range
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Col 7: Put / Call OI Ratio (Mini Histogram) */}
                        <td style={{ padding: '10px 12px' }}>
                          <OiFootprintHistogram putOi={stock.totalPutOi} callOi={stock.totalCallOi} />
                        </td>

                        {/* Col 8: Key Wall Strikes */}
                        <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                          <div style={{ color: '#00ff88', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Call Wall:</span>
                            <span style={{ color: '#ffffff' }}>₹{stock.callWallStrike}</span>
                          </div>
                          <div style={{ color: '#ff3366', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span>Put Wall:</span>
                            <span style={{ color: '#ffffff' }}>₹{stock.putWallStrike}</span>
                          </div>
                        </td>

                        {/* Col 9: Strategic Action */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{
                            color: isBull ? '#00ff88' : (isBear ? '#ff3366' : '#e2e8f0'),
                            fontWeight: 700,
                            fontSize: '11px',
                            lineHeight: '1.4'
                          }}>
                            {stock.action}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── RULE #2D FOOTER EXPLAINER ── */}
      <div style={{
        backgroundColor: 'rgba(9, 15, 30, 0.7)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '10px',
        padding: '14px 18px',
        boxShadow: '0 0 15px rgba(0, 240, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Zap size={16} color="#00f0ff" />
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#00f0ff', letterSpacing: '0.4px' }}>
            WHY RULE #2D (FIRST-HOUR PCR VELOCITY) IS A CRITICAL LEADING INDICATOR:
          </div>
        </div>
        <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.6' }}>
          • <strong style={{ color: '#00ff88' }}>Bullish PCR Drift (&gt; +3% / &gt; +0.03 at 10:15 AM):</strong> Smart money (institutional option writers) is aggressively taking the risk of selling OTM Puts. Since option writers face theoretically unlimited downside risk, aggressive put writing indicates absolute institutional conviction that the stock will not crack that floor. Expect a bullish continuation or gap acceptance.
          <br />
          • <strong style={{ color: '#ff3366' }}>Bearish PCR Drift (&lt; -3% / &lt; -0.03 at 10:15 AM):</strong> Smart money is aggressively shorting OTM Calls. This creates an impenetrable ceiling that absorbs buying liquidity. <em>Trading Rule: Never buy Call Options (CE) on a stock printing negative PCR drift—CE trades are strictly blocked.</em>
          <br />
          • <strong style={{ color: '#94a3b8' }}>Neutral PCR Drift (-3% to +3%):</strong> Institutional option writers have no strong directional bias. Expect rotational, choppy open auctions.
        </div>
      </div>
    </div>
  );
}
