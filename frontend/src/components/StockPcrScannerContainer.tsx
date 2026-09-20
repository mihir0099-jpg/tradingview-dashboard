import React, { useState, useEffect, useMemo } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  TrendingUp, TrendingDown, RefreshCw, Search, Shield, AlertTriangle, 
  CheckCircle, ArrowUpRight, ArrowDownRight, Layers, Filter, Info, Eye, 
  Zap, BarChart2, Flame, Award, Crosshair
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
    const interval = setInterval(() => fetchData(false), 20000); // 20s auto-refresh
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
      backgroundColor: '#0c0e14',
      color: '#e2e8f0',
      minHeight: '100vh',
      padding: '16px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ─────────────────────────────────────────────────────────────
          HEADER SECTION
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111726',
        borderRadius: '10px',
        padding: '14px 18px',
        border: '1px solid #1e293b',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '8px',
            padding: '8px 10px',
            color: '#38bdf8'
          }}>
            <Crosshair size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                STOCK PCR SCANNER (RULE #2D)
              </h1>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                10:15 AM FIRST-HOUR VELOCITY (±3% FILTER)
              </span>
              <span style={{
                backgroundColor: data?.isPast1015 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                color: data?.isPast1015 ? '#c084fc' : '#facc15',
                fontSize: '10.5px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700,
                border: `1px solid ${data?.isPast1015 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
              }}>
                {data?.isPast1015 ? '🔒 10:15 AM SNAPSHOT LOCKED' : '⏱️ ACCUMULATING LIVE DRIFT'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>
              Scans 100% of the 212 official NSE F&O universe. Identifies institutional put writing floors (&gt; +3%) vs call writing ceilings (&lt; -3%).
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            IST Time: <strong style={{ color: '#cbd5e1' }}>{data?.istTime || '--'}</strong>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={scanning || loading}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: scanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning 212 Stocks...' : 'Scan Now (Live)'}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          KPI SUMMARY METRICS BAR
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '10px',
        marginBottom: '14px'
      }}>
        <div style={{ backgroundColor: '#111726', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>F&O Stocks Scanned</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
            {data?.totalScanned || 212} Stocks
          </div>
          <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>100% Official NSE Universe</div>
        </div>

        <div style={{ backgroundColor: '#111726', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '10px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🟢 Aggressive Put Writing (&gt; +3%)</span>
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
            {data?.summary?.putWritingCount || 0}
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
              ({data?.summary?.putWritingPct || 0}%)
            </span>
          </div>
          <div style={{ fontSize: '9.5px', color: '#34d399', marginTop: '2px' }}>Institutional Support Floor</div>
        </div>

        <div style={{ backgroundColor: '#111726', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ fontSize: '10px', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🔴 Aggressive Call Writing (&lt; -3%)</span>
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
            {data?.summary?.callWritingCount || 0}
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
              ({data?.summary?.callWritingPct || 0}%)
            </span>
          </div>
          <div style={{ fontSize: '9.5px', color: '#f87171', marginTop: '2px' }}>Institutional Overhead Ceiling</div>
        </div>

        <div style={{ backgroundColor: '#111726', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>⚪ Neutral / Rotational</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#cbd5e1', marginTop: '2px' }}>
            {data?.summary?.neutralCount || 0}
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
              ({data?.summary?.neutralPct || 0}%)
            </span>
          </div>
          <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>Inside -3% to +3% Range</div>
        </div>

        <div style={{ backgroundColor: '#111726', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Market Writing Bias</div>
          <div style={{
            fontSize: '17px',
            fontWeight: 800,
            color: (data?.summary?.avgMarketDriftPct || 0) >= 0 ? '#34d399' : '#f87171',
            marginTop: '2px'
          }}>
            {(data?.summary?.avgMarketDriftPct || 0) >= 0 ? '+' : ''}{data?.summary?.avgMarketDriftPct || 0}%
          </div>
          <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
            {data?.summary?.marketBias === 'BULLISH_PUT_WRITING' ? '🟢 Net Put Writing (Bullish)' : (data?.summary?.marketBias === 'BEARISH_CALL_WRITING' ? '🔴 Net Call Writing (Bearish)' : '⚪ Balanced Flow')}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FILTER CONTROLS & SEARCH BAR
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#111726',
        borderRadius: '8px',
        padding: '10px 14px',
        border: '1px solid #1e293b',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCategory('ALL')}
            style={{
              backgroundColor: filterCategory === 'ALL' ? '#0284c7' : '#1e293b',
              color: filterCategory === 'ALL' ? '#ffffff' : '#cbd5e1',
              border: 'none',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            All F&O ({data?.totalScanned || 212})
          </button>

          <button
            onClick={() => setFilterCategory('PUT_WRITTEN')}
            style={{
              backgroundColor: filterCategory === 'PUT_WRITTEN' ? '#059669' : '#1e293b',
              color: filterCategory === 'PUT_WRITTEN' ? '#ffffff' : '#34d399',
              border: 'none',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🟢 Put Writing &gt; +3% ({data?.summary?.putWritingCount || 0})</span>
          </button>

          <button
            onClick={() => setFilterCategory('CALL_WRITTEN')}
            style={{
              backgroundColor: filterCategory === 'CALL_WRITTEN' ? '#dc2626' : '#1e293b',
              color: filterCategory === 'CALL_WRITTEN' ? '#ffffff' : '#f87171',
              border: 'none',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🔴 Call Writing &lt; -3% ({data?.summary?.callWritingCount || 0})</span>
          </button>

          <button
            onClick={() => setFilterCategory('HIGH_VELOCITY')}
            style={{
              backgroundColor: filterCategory === 'HIGH_VELOCITY' ? '#7c3aed' : '#1e293b',
              color: filterCategory === 'HIGH_VELOCITY' ? '#ffffff' : '#c084fc',
              border: 'none',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>⚡ High Velocity (|Drift| ≥ 10%)</span>
          </button>

          <button
            onClick={() => setFilterCategory('NEUTRAL')}
            style={{
              backgroundColor: filterCategory === 'NEUTRAL' ? '#475569' : '#1e293b',
              color: filterCategory === 'NEUTRAL' ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚪ Neutral ({data?.summary?.neutralCount || 0})
          </button>
        </div>

        {/* Dropdowns & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Sector Selector */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            style={{
              backgroundColor: '#161e2e',
              border: '1px solid #263248',
              color: '#cbd5e1',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Sectors</option>
            {sectorList.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            style={{
              backgroundColor: '#161e2e',
              border: '1px solid #263248',
              color: '#cbd5e1',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
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
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '8px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search symbol / sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: '#161e2e',
                border: '1px solid #263248',
                borderRadius: '6px',
                padding: '5px 10px 5px 26px',
                color: '#f8fafc',
                fontSize: '11px',
                outline: 'none',
                width: '170px'
              }}
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN SCANNER TABLE
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#111726',
        borderRadius: '8px',
        border: '1px solid #1e293b',
        overflowX: 'auto',
        marginBottom: '16px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#161e2e', color: '#94a3b8', borderBottom: '1px solid #263248' }}>
              <th style={{ padding: '9px 12px' }}>Symbol & Sector</th>
              <th style={{ padding: '9px 12px' }}>Spot Price & Change</th>
              <th style={{ padding: '9px 12px' }}>09:15 Baseline PCR</th>
              <th style={{ padding: '9px 12px' }}>10:15 / Live PCR</th>
              <th style={{ padding: '9px 12px' }}>PCR Velocity Drift (Rule #2D)</th>
              <th style={{ padding: '9px 12px' }}>Institutional Writing Verdict</th>
              <th style={{ padding: '9px 12px' }}>Put / Call OI Ratio</th>
              <th style={{ padding: '9px 12px' }}>Key Wall Strikes</th>
              <th style={{ padding: '9px 12px' }}>Strategic Action</th>
            </tr>
          </thead>
          <tbody>
            {processedStocks.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  No stocks match the selected filter criteria.
                </td>
              </tr>
            ) : (
              processedStocks.map(stock => {
                const isBull = stock.writingCategory === 'PUT_WRITTEN';
                const isBear = stock.writingCategory === 'CALL_WRITTEN';
                const totalOi = stock.totalCallOi + stock.totalPutOi;
                const putOiPct = totalOi > 0 ? (stock.totalPutOi / totalOi) * 100 : 50;

                return (
                  <tr 
                    key={stock.symbol}
                    style={{ 
                      borderBottom: '1px solid #1a2333',
                      backgroundColor: isBull ? 'rgba(16, 185, 129, 0.02)' : (isBear ? 'rgba(239, 68, 68, 0.02)' : 'transparent')
                    }}
                  >
                    {/* Symbol & Sector */}
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>{stock.symbol}</span>
                        <span style={{ fontSize: '9px', color: '#64748b' }}>({stock.lotSize}L)</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>
                        {stock.sector}
                      </div>
                    </td>

                    {/* Spot & Change */}
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                        ₹{stock.spotPrice.toLocaleString()}
                      </div>
                      <span style={{
                        color: stock.dayChangePct >= 0 ? '#34d399' : '#f87171',
                        fontSize: '10.5px',
                        fontWeight: 700
                      }}>
                        {stock.dayChangePct >= 0 ? '+' : ''}{stock.dayChangePct}%
                      </span>
                    </td>

                    {/* 09:15 Baseline PCR */}
                    <td style={{ padding: '9px 12px', color: '#94a3b8', fontWeight: 600 }}>
                      {stock.basePcr.toFixed(3)}
                    </td>

                    {/* 10:15 / Live PCR */}
                    <td style={{ padding: '9px 12px' }}>
                      <strong style={{ color: '#f8fafc', fontSize: '12px' }}>
                        {stock.isLocked1015 ? stock.locked1015Pcr.toFixed(3) : stock.currentPcr.toFixed(3)}
                      </strong>
                      <div style={{ fontSize: '9px', color: stock.isLocked1015 ? '#c084fc' : '#38bdf8' }}>
                        {stock.isLocked1015 ? '10:15 AM Locked' : 'Live Realtime'}
                      </div>
                    </td>

                    {/* PCR Drift % */}
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        backgroundColor: isBull ? 'rgba(16, 185, 129, 0.2)' : (isBear ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)'),
                        color: isBull ? '#34d399' : (isBear ? '#f87171' : '#94a3b8'),
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontWeight: 800,
                        fontSize: '12px',
                        display: 'inline-block',
                        border: `1px solid ${isBull ? 'rgba(16, 185, 129, 0.35)' : (isBear ? 'rgba(239, 68, 68, 0.35)' : 'rgba(100, 116, 139, 0.35)')}`
                      }}>
                        {stock.effectiveDriftPct >= 0 ? '+' : ''}{stock.effectiveDriftPct}% ({stock.effectiveDrift >= 0 ? '+' : ''}{stock.effectiveDrift})
                      </span>
                      <div style={{ fontSize: '9.5px', color: '#facc15', marginTop: '3px' }}>
                        {stock.stars}
                      </div>
                    </td>

                    {/* Writing Verdict Badge */}
                    <td style={{ padding: '9px 12px' }}>
                      {isBull && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#34d399', fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🟢 AGGRESSIVE PUT WRITING
                          </span>
                          <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                            Support floor established
                          </span>
                        </div>
                      )}
                      {isBear && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#f87171', fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🔴 AGGRESSIVE CALL WRITING
                          </span>
                          <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                            Overhead resistance ceiling
                          </span>
                        </div>
                      )}
                      {!isBull && !isBear && (
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                          ⚪ Neutral Rotation
                        </span>
                      )}
                    </td>

                    {/* Put / Call OI Ratio Bar */}
                    <td style={{ padding: '9px 12px', minWidth: '130px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', marginBottom: '3px' }}>
                        <span style={{ color: '#34d399' }}>Put: {(stock.totalPutOi / 1000).toFixed(0)}k</span>
                        <span style={{ color: '#f87171' }}>Call: {(stock.totalCallOi / 1000).toFixed(0)}k</span>
                      </div>
                      <div style={{ width: '100%', height: '5px', backgroundColor: '#ef4444', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${putOiPct}%`, height: '100%', backgroundColor: '#10b981' }} />
                      </div>
                    </td>

                    {/* Key Wall Strikes */}
                    <td style={{ padding: '9px 12px', fontSize: '10.5px' }}>
                      <div style={{ color: '#34d399' }}>
                        Put Wall: <strong>₹{stock.putWallStrike}</strong>
                      </div>
                      <div style={{ color: '#f87171', marginTop: '1px' }}>
                        Call Wall: <strong>₹{stock.callWallStrike}</strong>
                      </div>
                    </td>

                    {/* Strategic Action */}
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ 
                        color: isBull ? '#34d399' : (isBear ? '#f87171' : '#cbd5e1'), 
                        fontWeight: 700,
                        fontSize: '11px'
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
          RULE #2D EDUCATIONAL BACKTEST & FORENSIC INSIGHT
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#0d131f',
        border: '1px solid #1f2d47',
        borderRadius: '8px',
        padding: '14px 18px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Zap size={16} color="#38bdf8" />
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
            WHY RULE #2D (FIRST-HOUR PCR VELOCITY) WORKS:
          </div>
        </div>
        <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.6' }}>
          • <strong>Bullish PCR Drift (&gt; +3% / &gt; +0.03 at 10:15 AM):</strong> Smart money (institutional option writers) is aggressively taking the risk of selling OTM Puts. Since option writers face theoretically unlimited downside risk, aggressive put writing indicates absolute institutional conviction that the stock will not crack that floor. Expect a bullish continuation or gap acceptance.
          <br />
          • <strong>Bearish PCR Drift (&lt; -3% / &lt; -0.03 at 10:15 AM):</strong> Smart money is aggressively shorting OTM Calls. This creates an impenetrable ceiling that absorbs buying liquidity. <em>Trading Rule: Never buy Call Options (CE) on a stock printing a negative PCR drift—CE trades are strictly blocked.</em>
          <br />
          • <strong>Neutral PCR Drift (-3% to +3%):</strong> Institutional option writers have no strong directional bias. Expect rotational, choppy open auctions.
        </div>
      </div>
    </div>
  );
}
