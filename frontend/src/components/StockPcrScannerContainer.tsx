import React, { useState, useEffect, useMemo } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  TrendingUp, TrendingDown, RefreshCw, Search, Shield, AlertTriangle, 
  CheckCircle, ArrowUpRight, ArrowDownRight, Layers, Filter, Info, Eye, 
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

  // Unique list of sectors
  const sectorList = useMemo(() => {
    if (!data?.stocks) return [];
    const set = new Set<string>();
    data.stocks.forEach(s => {
      if (s.sector) set.add(s.sector);
    });
    return Array.from(set).sort();
  }, [data?.stocks]);

  // Client-side filtering and sorting for instant UI responsiveness
  const processedStocks = useMemo(() => {
    if (!data?.stocks) return [];
    let list = [...data.stocks];

    // Category filter
    if (filterCategory === 'PUT_WRITTEN') {
      list = list.filter(s => s.writingCategory === 'PUT_WRITTEN');
    } else if (filterCategory === 'CALL_WRITTEN') {
      list = list.filter(s => s.writingCategory === 'CALL_WRITTEN');
    } else if (filterCategory === 'HIGH_VELOCITY') {
      list = list.filter(s => Math.abs(s.effectiveDriftPct) >= 10.0);
    } else if (filterCategory === 'NEUTRAL') {
      list = list.filter(s => s.writingCategory === 'NEUTRAL');
    }

    // Sector filter
    if (selectedSector !== 'ALL') {
      list = list.filter(s => s.sector.toLowerCase() === selectedSector.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(s => 
        s.symbol.toLowerCase().includes(q) || 
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    }

    // Sort
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
      backgroundColor: '#070a11',
      color: '#f1f5f9',
      minHeight: '100vh',
      padding: '16px 22px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* ─────────────────────────────────────────────────────────────
          ULTRA-SHARP HEADER SECTION
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        borderRadius: '10px',
        padding: '14px 20px',
        border: '1px solid #1e293b',
        marginBottom: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '10px',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Crosshair size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '19px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.5px', margin: 0 }}>
                STOCK PCR VELOCITY SCANNER
              </h1>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '14px',
                fontWeight: 800,
                border: '1px solid rgba(16, 185, 129, 0.4)',
                letterSpacing: '0.3px'
              }}>
                RULE #2D FIRST-HOUR VELOCITY (±3% FILTER)
              </span>
              <span style={{
                backgroundColor: data?.isPast1015 ? 'rgba(168, 85, 247, 0.25)' : 'rgba(234, 179, 8, 0.25)',
                color: data?.isPast1015 ? '#c084fc' : '#fde047',
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '14px',
                fontWeight: 800,
                border: `1px solid ${data?.isPast1015 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Lock size={12} />
                {data?.isPast1015 ? '10:15 AM SNAPSHOT LOCKED' : 'ACCUMULATING LIVE DRIFT'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
              Live scan of all 212 official NSE F&O universe. Identifies institutional put writing support floors (&gt; +3%) vs call writing resistance ceilings (&lt; -3%).
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Session Time (IST)</div>
            <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 800 }}>{data?.istTime || '--'}</div>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={scanning || loading}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: '1px solid #38bdf8',
              padding: '8px 16px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: scanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning 212 Stocks...' : 'Scan Now (Live 212 F&O)'}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HIGH-CONTRAST KPI SUMMARY STRIP
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Card 1: Total Scanned */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          borderTop: '3px solid #38bdf8'
        }}>
          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            F&O Universe
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
            {data?.totalScanned || 212}
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '5px', fontWeight: 600 }}>Stocks</span>
          </div>
          <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '3px', fontWeight: 700 }}>
            100% Official NSE F&O Universe
          </div>
        </div>

        {/* Card 2: Aggressive Put Writing */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderTop: '3px solid #10b981'
        }}>
          <div style={{ fontSize: '10.5px', color: '#34d399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🟢 Aggressive Put Writing (&gt; +3%)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
            {data?.summary?.putWritingCount || 0}
            <span style={{ fontSize: '12px', color: '#a7f3d0', marginLeft: '6px', fontWeight: 700 }}>
              ({data?.summary?.putWritingPct || 0}%)
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#10b981', marginTop: '3px', fontWeight: 700 }}>
            Institutional Support Floor Building
          </div>
        </div>

        {/* Card 3: Aggressive Call Writing */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderTop: '3px solid #ef4444'
        }}>
          <div style={{ fontSize: '10.5px', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔴 Aggressive Call Writing (&lt; -3%)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#f87171', marginTop: '4px' }}>
            {data?.summary?.callWritingCount || 0}
            <span style={{ fontSize: '12px', color: '#fecaca', marginLeft: '6px', fontWeight: 700 }}>
              ({data?.summary?.callWritingPct || 0}%)
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#ef4444', marginTop: '3px', fontWeight: 700 }}>
            Institutional Overhead Ceiling (CE Blocked)
          </div>
        </div>

        {/* Card 4: Neutral */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          borderTop: '3px solid #64748b'
        }}>
          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚪ Neutral / Rotational
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#e2e8f0', marginTop: '4px' }}>
            {data?.summary?.neutralCount || 0}
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px', fontWeight: 700 }}>
              ({data?.summary?.neutralPct || 0}%)
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px', fontWeight: 600 }}>
            Inside -3% to +3% Range
          </div>
        </div>

        {/* Card 5: Market Net Bias */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          borderTop: `3px solid ${(data?.summary?.avgMarketDriftPct || 0) >= 0 ? '#10b981' : '#ef4444'}`
        }}>
          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Market Net Drift
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            color: (data?.summary?.avgMarketDriftPct || 0) >= 0 ? '#34d399' : '#f87171',
            marginTop: '4px'
          }}>
            {(data?.summary?.avgMarketDriftPct || 0) >= 0 ? '+' : ''}{data?.summary?.avgMarketDriftPct || 0}%
          </div>
          <div style={{
            fontSize: '10.5px',
            color: (data?.summary?.avgMarketDriftPct || 0) >= 0 ? '#34d399' : '#f87171',
            marginTop: '3px',
            fontWeight: 700
          }}>
            {data?.summary?.marketBias === 'BULLISH_PUT_WRITING' ? '🟢 Net Put Writing (Bullish Market)' : (data?.summary?.marketBias === 'BEARISH_CALL_WRITING' ? '🔴 Net Call Writing (Bearish Market)' : '⚪ Balanced Open Auction')}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FILTER CONTROLS & SEARCH TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        padding: '12px 16px',
        border: '1px solid #1e293b',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCategory('ALL')}
            style={{
              backgroundColor: filterCategory === 'ALL' ? '#0284c7' : '#1e293b',
              color: filterCategory === 'ALL' ? '#ffffff' : '#cbd5e1',
              border: `1px solid ${filterCategory === 'ALL' ? '#38bdf8' : '#334155'}`,
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All F&O ({data?.totalScanned || 212})
          </button>

          <button
            onClick={() => setFilterCategory('PUT_WRITTEN')}
            style={{
              backgroundColor: filterCategory === 'PUT_WRITTEN' ? '#059669' : '#1e293b',
              color: filterCategory === 'PUT_WRITTEN' ? '#ffffff' : '#34d399',
              border: `1px solid ${filterCategory === 'PUT_WRITTEN' ? '#34d399' : '#334155'}`,
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🟢 Put Writing &gt; +3% ({data?.summary?.putWritingCount || 0})</span>
          </button>

          <button
            onClick={() => setFilterCategory('CALL_WRITTEN')}
            style={{
              backgroundColor: filterCategory === 'CALL_WRITTEN' ? '#dc2626' : '#1e293b',
              color: filterCategory === 'CALL_WRITTEN' ? '#ffffff' : '#f87171',
              border: `1px solid ${filterCategory === 'CALL_WRITTEN' ? '#f87171' : '#334155'}`,
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🔴 Call Writing &lt; -3% ({data?.summary?.callWritingCount || 0})</span>
          </button>

          <button
            onClick={() => setFilterCategory('HIGH_VELOCITY')}
            style={{
              backgroundColor: filterCategory === 'HIGH_VELOCITY' ? '#7c3aed' : '#1e293b',
              color: filterCategory === 'HIGH_VELOCITY' ? '#ffffff' : '#c084fc',
              border: `1px solid ${filterCategory === 'HIGH_VELOCITY' ? '#a855f7' : '#334155'}`,
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>⚡ High Velocity (|Drift| ≥ 10%)</span>
          </button>

          <button
            onClick={() => setFilterCategory('NEUTRAL')}
            style={{
              backgroundColor: filterCategory === 'NEUTRAL' ? '#475569' : '#1e293b',
              color: filterCategory === 'NEUTRAL' ? '#ffffff' : '#94a3b8',
              border: `1px solid ${filterCategory === 'NEUTRAL' ? '#94a3b8' : '#334155'}`,
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            ⚪ Neutral ({data?.summary?.neutralCount || 0})
          </button>
        </div>

        {/* Dropdowns & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Sector Selector */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Sectors ({sectorList.length})</option>
            {sectorList.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
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

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search symbol / sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '7px 12px 7px 30px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none',
                width: '190px'
              }}
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ULTRA-SHARP DATA TABLE
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        overflowX: 'auto',
        marginBottom: '18px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', color: '#cbd5e1', borderBottom: '2px solid #334155' }}>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>Symbol & Sector</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>Spot Price & Change</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>09:15 Baseline</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>10:15 / Live PCR</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>PCR Velocity Drift (Rule #2D)</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>Institutional Writing Verdict</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>Put / Call OI Ratio</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>Key Wall Strikes</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>Strategic Action</th>
            </tr>
          </thead>
          <tbody>
            {processedStocks.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No stocks match the selected filter criteria.
                </td>
              </tr>
            ) : (
              processedStocks.map((stock, idx) => {
                const isBull = stock.writingCategory === 'PUT_WRITTEN';
                const isBear = stock.writingCategory === 'CALL_WRITTEN';
                const totalOi = stock.totalCallOi + stock.totalPutOi;
                const putOiPct = totalOi > 0 ? (stock.totalPutOi / totalOi) * 100 : 50;
                const isHovered = hoveredRow === stock.symbol;
                const rowBg = isHovered 
                  ? '#1e293b' 
                  : (idx % 2 === 0 ? '#0b1120' : '#0f172a');

                return (
                  <tr 
                    key={stock.symbol}
                    onMouseEnter={() => setHoveredRow(stock.symbol)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ 
                      backgroundColor: rowBg,
                      borderBottom: '1px solid #1e293b',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Column 1: Symbol & Sector */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 900, color: '#ffffff', fontSize: '14.5px', letterSpacing: '0.3px' }}>
                          {stock.symbol}
                        </span>
                        <span style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.18)',
                          color: '#38bdf8',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(56, 189, 248, 0.3)'
                        }}>
                          {stock.lotSize}L
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                        {stock.sector}
                      </div>
                    </td>

                    {/* Column 2: Spot Price & Change */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '14px' }}>
                        ₹{stock.spotPrice.toLocaleString()}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        marginTop: '3px',
                        backgroundColor: stock.dayChangePct >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: stock.dayChangePct >= 0 ? '#34d399' : '#f87171',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border: `1px solid ${stock.dayChangePct >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                      }}>
                        {stock.dayChangePct >= 0 ? '+' : ''}{stock.dayChangePct}%
                      </span>
                    </td>

                    {/* Column 3: 09:15 Baseline PCR */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '13.5px', fontFamily: 'monospace' }}>
                        {stock.basePcr.toFixed(3)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                        09:15 Opening
                      </div>
                    </td>

                    {/* Column 4: 10:15 / Live PCR */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{
                        color: stock.isLocked1015 ? '#c084fc' : '#38bdf8',
                        fontWeight: 900,
                        fontSize: '14.5px',
                        fontFamily: 'monospace'
                      }}>
                        {stock.isLocked1015 ? stock.locked1015Pcr.toFixed(3) : stock.currentPcr.toFixed(3)}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: stock.isLocked1015 ? '#c084fc' : '#38bdf8',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        marginTop: '1px'
                      }}>
                        {stock.isLocked1015 ? '🔒 10:15 Locked' : '⚡ Live Realtime'}
                      </div>
                    </td>

                    {/* Column 5: PCR Velocity Drift (Rule #2D) */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        backgroundColor: isBull ? 'rgba(16, 185, 129, 0.25)' : (isBear ? 'rgba(239, 68, 68, 0.25)' : 'rgba(100, 116, 139, 0.2)'),
                        color: isBull ? '#34d399' : (isBear ? '#f87171' : '#cbd5e1'),
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: 900,
                        fontSize: '13px',
                        display: 'inline-block',
                        border: `1px solid ${isBull ? 'rgba(16, 185, 129, 0.5)' : (isBear ? 'rgba(239, 68, 68, 0.5)' : 'rgba(100, 116, 139, 0.4)')}`,
                        boxShadow: isBull ? '0 2px 8px rgba(16, 185, 129, 0.15)' : (isBear ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'none')
                      }}>
                        {stock.effectiveDriftPct >= 0 ? '+' : ''}{stock.effectiveDriftPct}% ({stock.effectiveDrift >= 0 ? '+' : ''}{stock.effectiveDrift})
                      </span>
                      <div style={{ fontSize: '11px', color: '#fde047', marginTop: '4px', letterSpacing: '1px' }}>
                        {stock.stars}
                      </div>
                    </td>

                    {/* Column 6: Institutional Writing Verdict */}
                    <td style={{ padding: '12px 14px' }}>
                      {isBull && (
                        <div>
                          <span style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '11.5px',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🟢 AGGRESSIVE PUT WRITING
                          </span>
                          <div style={{ fontSize: '10.5px', color: '#a7f3d0', marginTop: '3px', fontWeight: 600 }}>
                            Support Floor Established
                          </div>
                        </div>
                      )}
                      {isBear && (
                        <div>
                          <span style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '11.5px',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🔴 AGGRESSIVE CALL WRITING
                          </span>
                          <div style={{ fontSize: '10.5px', color: '#fecaca', marginTop: '3px', fontWeight: 600 }}>
                            Overhead Resistance (CE Blocked)
                          </div>
                        </div>
                      )}
                      {!isBull && !isBear && (
                        <div>
                          <span style={{
                            backgroundColor: 'rgba(100, 116, 139, 0.2)',
                            color: '#cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            fontSize: '11.5px',
                            border: '1px solid rgba(100, 116, 139, 0.3)'
                          }}>
                            ⚪ NEUTRAL ROTATION
                          </span>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px', fontWeight: 600 }}>
                            Open Auction Consolidation
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Column 7: Put / Call OI Ratio Bar */}
                    <td style={{ padding: '12px 14px', minWidth: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                        <span style={{ color: '#34d399' }}>PE: {(stock.totalPutOi / 1000).toFixed(0)}k</span>
                        <span style={{ color: '#f87171' }}>CE: {(stock.totalCallOi / 1000).toFixed(0)}k</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '7px',
                        backgroundColor: '#ef4444',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid #334155'
                      }}>
                        <div style={{ width: `${putOiPct}%`, height: '100%', backgroundColor: '#10b981' }} />
                      </div>
                    </td>

                    {/* Column 8: Key Wall Strikes */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#34d399', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🛡️ Put Wall:</span>
                        <span style={{ color: '#ffffff' }}>₹{stock.putWallStrike}</span>
                      </div>
                      <div style={{ color: '#f87171', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <span>🧱 Call Wall:</span>
                        <span style={{ color: '#ffffff' }}>₹{stock.callWallStrike}</span>
                      </div>
                    </td>

                    {/* Column 9: Strategic Action */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{
                        backgroundColor: isBull ? 'rgba(16, 185, 129, 0.15)' : (isBear ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)'),
                        color: isBull ? '#34d399' : (isBear ? '#f87171' : '#e2e8f0'),
                        border: `1px solid ${isBull ? 'rgba(16, 185, 129, 0.35)' : (isBear ? 'rgba(239, 68, 68, 0.35)' : 'rgba(100, 116, 139, 0.3)')}`,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '11.5px',
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

      {/* ─────────────────────────────────────────────────────────────
          RULE #2D EDUCATIONAL GUIDE
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderLeft: '4px solid #38bdf8',
        borderRadius: '8px',
        padding: '16px 20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Zap size={18} color="#38bdf8" />
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.4px' }}>
            WHY RULE #2D (FIRST-HOUR PCR VELOCITY) WORKS SO ACCURATELY:
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.7' }}>
          • <strong style={{ color: '#34d399' }}>Bullish PCR Drift (&gt; +3% / &gt; +0.03 at 10:15 AM):</strong> Smart money (institutional option writers) is aggressively selling OTM Puts. Option writers face theoretically unlimited risk on downside cracks, so heavy Put writing indicates absolute institutional conviction that the stock will not crack that floor. Expect a bullish continuation or gap acceptance.
          <br />
          • <strong style={{ color: '#f87171' }}>Bearish PCR Drift (&lt; -3% / &lt; -0.03 at 10:15 AM):</strong> Smart money is aggressively shorting OTM Calls to build a solid ceiling. <em>Trading Rule: Never buy Call Options (CE) on a stock printing negative PCR drift—CE trades are strictly blocked.</em>
          <br />
          • <strong style={{ color: '#94a3b8' }}>Neutral PCR Drift (-3% to +3%):</strong> Institutional option writers have no strong directional bias. Expect rotational, choppy open auctions.
        </div>
      </div>
    </div>
  );
}
