import React, { useState, useEffect, useMemo } from 'react';
import { getBackendUrl } from '../utils/config';
import {
  TrendingUp, TrendingDown, Target, RefreshCw, Search,
  CheckCircle2, AlertTriangle, Zap, Activity, Layers,
  ChevronRight, Shield, Compass, ArrowUpRight, ArrowDownRight,
  Sparkles, BarChart2, Sliders, X, ExternalLink, Eye
} from 'lucide-react';

interface SetupItem {
  version: 'V1' | 'V2';
  direction: 'LONG' | 'SHORT';
  triggerDate: string;
  isLatestBar: boolean;
  barsAgo: number;
  penetrationPts: number;
  penetrationAtr: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  rrRatio: number;
  location: {
    label: string;
    zone: string;
    atrOffset: number;
    text: string;
  };
  reclaimedLevels: string[];
  d1Date: string;
  d2Date: string;
  d3Date?: string;
}

interface ValueTraderStock {
  symbol: string;
  cleanSymbol: string;
  name: string;
  sector: string;
  spotPrice: number;
  dayChangePts: number;
  dayChangePct: number;
  atr: number;
  ema: number;
  bands: {
    bandPlus3: number;
    bandPlus2: number;
    bandPlus1: number;
    fairValue: number;
    bandMinus1: number;
    bandMinus2: number;
    bandMinus3: number;
  } | null;
  currentLocation: {
    label: string;
    zone: string;
    atrOffset: number;
    text: string;
  };
  activeSetups: SetupItem[];
  primarySetup: SetupItem | null;
  totalSetupsFound: number;
}

interface ValueTraderOverview {
  updatedAt: string;
  totalScanned: number;
  kpis: {
    totalActiveSetups: number;
    v1Longs: number;
    v1Shorts: number;
    v2Longs: number;
    v2Shorts: number;
    extremeDiscount: number;
    extremePremium: number;
    benchmarkTargetHitRate: string;
  };
  stocks: ValueTraderStock[];
}

interface CandleWithBands {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  atr: number | null;
  ema: number | null;
  bands: {
    bandPlus3: number;
    bandPlus2: number;
    bandPlus1: number;
    fairValue: number;
    bandMinus1: number;
    bandMinus2: number;
    bandMinus3: number;
  } | null;
}

interface StockDetailResponse {
  success: boolean;
  meta: any;
  summary: ValueTraderStock;
  candles: CandleWithBands[];
}

interface ValueTraderContainerProps {
  onSwitchToChart?: (symbol: string) => void;
}

export const ValueTraderContainer: React.FC<ValueTraderContainerProps> = ({ onSwitchToChart }) => {
  const [overview, setOverview] = useState<ValueTraderOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timeframe state: 5m, 30m, 1d
  const [timeframe, setTimeframe] = useState<'5m' | '30m' | '1d'>('1d');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'V1_LONG' | 'V1_SHORT' | 'V2_LONG' | 'V2_SHORT' | 'EXTREME_DISCOUNT' | 'EXTREME_PREMIUM'>('ALL');
  const [sortBy, setSortBy] = useState<'RR' | 'PENETRATION' | 'CHANGE' | 'NAME'>('RR');

  // Selected Stock for Interactive Chart Drawer — initialized to null so it automatically selects the #1 active setup
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [stockDetail, setStockDetail] = useState<StockDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hoveredCandle, setHoveredCandle] = useState<CandleWithBands | null>(null);

  const fetchOverview = async (force = false, tf = timeframe) => {
    try {
      if (force) setRefreshing(true);
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/value-trader/overview?timeframe=${tf}&refresh=${force}&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOverview(json.data);
        setError(null);
        // Automatically select the highest R:R active setup if nothing selected yet or forced refresh
        if (json.data.stocks?.length > 0) {
          const withSetups = json.data.stocks
            .filter((s: ValueTraderStock) => s.primarySetup)
            .sort((a: ValueTraderStock, b: ValueTraderStock) => (b.primarySetup?.rrRatio || 0) - (a.primarySetup?.rrRatio || 0));
          const topPick = withSetups[0] || json.data.stocks[0];
          if (!selectedSymbol || force) {
            setSelectedSymbol(topPick.cleanSymbol);
          }
        }
      }
    } catch (err: any) {
      console.error('[ValueTrader] Fetch error:', err);
      setError(err.message || 'Failed to connect to Value Trader engine');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStockDetail = async (symbol: string, tf = timeframe) => {
    try {
      setDetailLoading(true);
      const backendUrl = getBackendUrl();
      const clean = symbol.replace('NSE:', '');
      const res = await fetch(`${backendUrl}/api/value-trader/stock/${clean}?timeframe=${tf}&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStockDetail(json);
        }
      }
    } catch (err) {
      console.error('[ValueTrader] Detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Fetch overview on timeframe change
  useEffect(() => {
    fetchOverview(false, timeframe);
  }, [timeframe]);

  // Periodic refresh
  useEffect(() => {
    const timer = setInterval(() => fetchOverview(false, timeframe), 60000);
    return () => clearInterval(timer);
  }, [timeframe]);

  // Fetch individual stock detail whenever selected stock or timeframe changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchStockDetail(selectedSymbol, timeframe);
    }
  }, [selectedSymbol, timeframe]);

  // Filtered & Sorted Stocks List
  const filteredStocks = useMemo(() => {
    if (!overview || !overview.stocks) return [];
    let list = overview.stocks.slice();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.cleanSymbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'V1_LONG') {
      list = list.filter(s => s.primarySetup?.version === 'V1' && s.primarySetup?.direction === 'LONG');
    } else if (activeFilter === 'V1_SHORT') {
      list = list.filter(s => s.primarySetup?.version === 'V1' && s.primarySetup?.direction === 'SHORT');
    } else if (activeFilter === 'V2_LONG') {
      list = list.filter(s => s.primarySetup?.version === 'V2' && s.primarySetup?.direction === 'LONG');
    } else if (activeFilter === 'V2_SHORT') {
      list = list.filter(s => s.primarySetup?.version === 'V2' && s.primarySetup?.direction === 'SHORT');
    } else if (activeFilter === 'EXTREME_DISCOUNT') {
      list = list.filter(s => s.currentLocation.label === 'EXTREME_DISCOUNT');
    } else if (activeFilter === 'EXTREME_PREMIUM') {
      list = list.filter(s => s.currentLocation.label === 'EXTREME_PREMIUM');
    }

    list.sort((a, b) => {
      if (sortBy === 'RR') {
        const rrA = a.primarySetup?.rrRatio || 0;
        const rrB = b.primarySetup?.rrRatio || 0;
        return rrB - rrA;
      } else if (sortBy === 'PENETRATION') {
        const penA = a.primarySetup?.penetrationAtr || 0;
        const penB = b.primarySetup?.penetrationAtr || 0;
        return penB - penA;
      } else if (sortBy === 'CHANGE') {
        return Math.abs(b.dayChangePct) - Math.abs(a.dayChangePct);
      } else {
        return a.cleanSymbol.localeCompare(b.cleanSymbol);
      }
    });

    return list;
  }, [overview, searchQuery, activeFilter, sortBy]);

  // Chart Scaling Helpers
  const chartData = stockDetail?.candles || [];
  const svgWidth = 840;
  const svgHeight = 360;
  const padTop = 25;
  const padBottom = 40;
  const padLeft = 15;
  const padRight = 75;
  const drawWidth = svgWidth - padLeft - padRight;
  const drawHeight = svgHeight - padTop - padBottom;

  const { minPrice, maxPrice, getY, getX } = useMemo(() => {
    if (chartData.length === 0) {
      return { minPrice: 0, maxPrice: 100, getY: () => 0, getX: () => 0 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const c of chartData) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.bands) {
        if (c.bands.bandMinus2 < min) min = c.bands.bandMinus2;
        if (c.bands.bandPlus2 > max) max = c.bands.bandPlus2;
      }
    }

    const span = max - min || 10;
    const paddedMin = min - span * 0.04;
    const paddedMax = max + span * 0.04;

    const getYCoord = (price: number) => {
      const pct = (price - paddedMin) / (paddedMax - paddedMin);
      return padTop + drawHeight - pct * drawHeight;
    };

    const getXCoord = (idx: number) => {
      if (chartData.length <= 1) return padLeft;
      return padLeft + (idx / (chartData.length - 1)) * drawWidth;
    };

    return { minPrice: paddedMin, maxPrice: paddedMax, getY: getYCoord, getX: getXCoord };
  }, [chartData]);

  const handleStockClick = (cleanSym: string) => {
    setSelectedSymbol(cleanSym);
    // Scroll window smoothly to chart on smaller screens
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ padding: '20px', background: '#0a0e17', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ── HEADER TITLE & CONTROLS ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💎</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              The Value Trader
            </h1>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              ATR(21) & EMA(22) Value Bands
            </span>
            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              78.4% Target Hit Rate
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Click any stock on the right list to instantly load its Value Bands chart & active trade setup on the left.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Timeframe Selector Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px'
          }}>
            {[
              { id: '5m', label: '⚡ 5m' },
              { id: '30m', label: '🕒 30m' },
              { id: '1d', label: '📅 1 Day' }
            ].map(t => {
              const isSel = timeframe === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: isSel ? '800' : '600',
                    cursor: 'pointer',
                    border: 'none',
                    background: isSel ? '#38bdf8' : 'transparent',
                    color: isSel ? '#0f172a' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {overview && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Updated: {overview.updatedAt}
            </span>
          )}
          <button
            onClick={() => fetchOverview(true, timeframe)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f1f5f9',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Scanning...' : 'Refresh Scans'}
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      {overview?.kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div 
            onClick={() => setActiveFilter('ALL')}
            style={{ 
              background: activeFilter === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : '#111827', 
              border: activeFilter === 'ALL' ? '1px solid #38bdf8' : '1px solid #1f2937', 
              borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              Active Setups <Target size={14} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
              {overview.kpis.totalActiveSetups} <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>/ {overview.totalScanned}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>Across F&O Universe</div>
          </div>

          <div 
            onClick={() => setActiveFilter('V1_LONG')}
            style={{ 
              background: activeFilter === 'V1_LONG' ? 'rgba(34, 197, 94, 0.15)' : '#111827', 
              border: activeFilter === 'V1_LONG' ? '1px solid #22c55e' : '1px solid #1f2937', 
              borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#4ade80', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              V1 Long Sweeps <ArrowUpRight size={14} color="#4ade80" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80', marginTop: '6px' }}>
              {overview.kpis.v1Longs}
            </div>
            <div style={{ fontSize: '11px', color: '#86efac', marginTop: '4px' }}>2-Bar Low Sweep & Reclaim</div>
          </div>

          <div 
            onClick={() => setActiveFilter('V1_SHORT')}
            style={{ 
              background: activeFilter === 'V1_SHORT' ? 'rgba(244, 63, 94, 0.15)' : '#111827', 
              border: activeFilter === 'V1_SHORT' ? '1px solid #f43f5e' : '1px solid #1f2937', 
              borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fb7185', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              V1 Short Rejects <ArrowDownRight size={14} color="#fb7185" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#fb7185', marginTop: '6px' }}>
              {overview.kpis.v1Shorts}
            </div>
            <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>2-Bar High Sweep & Reject</div>
          </div>

          <div 
            onClick={() => setActiveFilter('V2_LONG')}
            style={{ 
              background: activeFilter === 'V2_LONG' ? 'rgba(56, 189, 248, 0.15)' : '#111827', 
              border: activeFilter === 'V2_LONG' ? '1px solid #38bdf8' : '1px solid #1f2937', 
              borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#38bdf8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              V2 Long Reclaims <Zap size={14} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>
              {overview.kpis.v2Longs}
            </div>
            <div style={{ fontSize: '11px', color: '#7dd3fc', marginTop: '4px' }}>3-Bar Inside Confirmation</div>
          </div>

          <div 
            onClick={() => setActiveFilter('V2_SHORT')}
            style={{ 
              background: activeFilter === 'V2_SHORT' ? 'rgba(251, 146, 60, 0.15)' : '#111827', 
              border: activeFilter === 'V2_SHORT' ? '1px solid #fb923c' : '1px solid #1f2937', 
              borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fb923c', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              V2 Short Reclaims <Shield size={14} color="#fb923c" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#fb923c', marginTop: '6px' }}>
              {overview.kpis.v2Shorts}
            </div>
            <div style={{ fontSize: '11px', color: '#fed7aa', marginTop: '4px' }}>3-Bar Supply Absorption</div>
          </div>

          <div 
            onClick={() => setActiveFilter('EXTREME_DISCOUNT')}
            style={{ 
              background: activeFilter === 'EXTREME_DISCOUNT' ? 'rgba(16, 185, 129, 0.15)' : '#111827', 
              border: activeFilter === 'EXTREME_DISCOUNT' ? '1px solid #10b981' : '1px solid #1f2937', 
              borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#34d399', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              Deep Discount <Sparkles size={14} color="#34d399" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>
              {overview.kpis.extremeDiscount}
            </div>
            <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '4px' }}>Below -2.0 ATR Band</div>
          </div>
        </div>
      )}

      {/* ── FILTER CHIPS & SEARCH ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', background: '#111827', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '4px' }}>Filters:</span>
          {[
            { id: 'ALL', label: 'All Setups' },
            { id: 'V1_LONG', label: '🟢 V1 Long Sweeps' },
            { id: 'V1_SHORT', label: '🔴 V1 Short Rejects' },
            { id: 'V2_LONG', label: '⚡ V2 Long Reclaims' },
            { id: 'V2_SHORT', label: '🛡️ V2 Short Reclaims' },
            { id: 'EXTREME_DISCOUNT', label: '💎 Deep Discount (<-2 ATR)' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              style={{
                background: activeFilter === f.id ? '#38bdf8' : '#1e293b',
                color: activeFilter === f.id ? '#0f172a' : '#cbd5e1',
                border: activeFilter === f.id ? '1px solid #38bdf8' : '1px solid #334155',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search stock / sector..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 12px 6px 32px',
                fontSize: '12px',
                color: '#f8fafc',
                outline: 'none',
                width: '180px'
              }}
            />
            {searchQuery && (
              <X size={12} color="#94a3b8" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#f8fafc',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="RR">Highest R:R Ratio</option>
              <option value="PENETRATION">Sweep Depth (ATR)</option>
              <option value="CHANGE">Top Day Movers</option>
              <option value="NAME">Stock Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN WORKSPACE: CHART & SCANNER GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* ── LEFT PANEL: INTERACTIVE VALUE BANDS CHART ── */}
        <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                  {stockDetail?.summary?.cleanSymbol || selectedSymbol || 'Loading...'}
                </span>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {stockDetail?.summary?.name}
                </span>
                <span style={{ fontSize: '11px', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px' }}>
                  {stockDetail?.summary?.sector}
                </span>
                <span style={{
                  fontSize: '11px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  {timeframe === '5m' ? '⚡ 5 Min' : (timeframe === '30m' ? '🕒 30 Min' : '📅 1 Day')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc' }}>
                  ₹{stockDetail?.summary?.spotPrice?.toLocaleString('en-IN') || '--'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: (stockDetail?.summary?.dayChangePts || 0) >= 0 ? '#4ade80' : '#fb7185' }}>
                  {(stockDetail?.summary?.dayChangePts || 0) >= 0 ? '+' : ''}{stockDetail?.summary?.dayChangePts} ({stockDetail?.summary?.dayChangePct}%)
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  ATR(21): <strong style={{ color: '#e2e8f0' }}>₹{stockDetail?.summary?.atr}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Fair Value EMA(22): <strong style={{ color: '#06b6d4' }}>₹{stockDetail?.summary?.ema}</strong>
                </span>
              </div>
            </div>

            {/* Value Location Badge & Chart Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onSwitchToChart && stockDetail?.summary?.cleanSymbol && (
                <button
                  onClick={() => onSwitchToChart(stockDetail.summary.symbol || `NSE:${stockDetail.summary.cleanSymbol}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#38bdf8',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Open full interactive TradingView candle chart in Chart tab"
                >
                  <BarChart2 size={13} /> Main Chart
                </button>
              )}

              {stockDetail?.summary?.currentLocation && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: stockDetail.summary.currentLocation.label.includes('DISCOUNT')
                    ? 'rgba(16, 185, 129, 0.15)'
                    : (stockDetail.summary.currentLocation.label.includes('PREMIUM') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(6, 182, 212, 0.15)'),
                  color: stockDetail.summary.currentLocation.label.includes('DISCOUNT')
                    ? '#34d399'
                    : (stockDetail.summary.currentLocation.label.includes('PREMIUM') ? '#fb7185' : '#22d3ee'),
                  border: `1px solid ${stockDetail.summary.currentLocation.label.includes('DISCOUNT') ? '#10b981' : (stockDetail.summary.currentLocation.label.includes('PREMIUM') ? '#f43f5e' : '#06b6d4')}`
                }}>
                  <Compass size={14} />
                  {stockDetail.summary.currentLocation.text}
                </div>
              )}
            </div>
          </div>

          {/* ── BANDS LEGEND ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '8px 12px', background: '#0f172a', borderRadius: '6px', marginBottom: '12px', fontSize: '11px' }}>
            <span style={{ color: '#64748b', fontWeight: '600' }}>Value Bands:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
              <span style={{ width: '10px', height: '2px', background: '#ef4444', display: 'inline-block' }} /> +2 ATR (Supply)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fb923c' }}>
              <span style={{ width: '10px', height: '2px', background: '#f97316', display: 'inline-block' }} /> +1 ATR (Premium)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22d3ee', fontWeight: '700' }}>
              <span style={{ width: '12px', height: '3px', background: '#06b6d4', display: 'inline-block' }} /> EMA(22) Fair Value
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2dd4bf' }}>
              <span style={{ width: '10px', height: '2px', background: '#14b8a6', display: 'inline-block' }} /> -1 ATR (Discount)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
              <span style={{ width: '10px', height: '2px', background: '#10b981', display: 'inline-block' }} /> -2 ATR (Demand)
            </span>
          </div>

          {/* ── SVG CANDLESTICK & VALUE BANDS CHART ── */}
          <div style={{ position: 'relative', width: '100%', height: '360px', background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            {detailLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '8px' }}>
                <RefreshCw size={18} className="animate-spin" /> Loading daily candles & value bands for {selectedSymbol}...
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                No daily candle data available
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{ width: '100%', height: '100%', display: 'block' }}
                onMouseLeave={() => setHoveredCandle(null)}
              >
                {/* Horizontal Gridlines & Price Labels */}
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((pct, idx) => {
                  const price = minPrice + (maxPrice - minPrice) * (1 - pct);
                  const y = padTop + drawHeight * pct;
                  return (
                    <g key={idx}>
                      <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x={svgWidth - padRight + 6} y={y + 4} fill="#64748b" fontSize="10" fontFamily="monospace">
                        ₹{price.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* 5 VALUE BANDS (Paths across 60 days) */}
                {/* Band +2 ATR */}
                <path
                  d={chartData.map((c, i) => c.bands ? `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.bands.bandPlus2)}` : '').filter(Boolean).join(' ')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.75"
                />
                {/* Band +1 ATR */}
                <path
                  d={chartData.map((c, i) => c.bands ? `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.bands.bandPlus1)}` : '').filter(Boolean).join(' ')}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.75"
                />
                {/* Center Fair Value EMA(22) */}
                <path
                  d={chartData.map((c, i) => c.ema ? `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.ema)}` : '').filter(Boolean).join(' ')}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.2"
                  opacity="0.95"
                />
                {/* Band -1 ATR */}
                <path
                  d={chartData.map((c, i) => c.bands ? `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.bands.bandMinus1)}` : '').filter(Boolean).join(' ')}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.75"
                />
                {/* Band -2 ATR */}
                <path
                  d={chartData.map((c, i) => c.bands ? `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(c.bands.bandMinus2)}` : '').filter(Boolean).join(' ')}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.75"
                />

                {/* Candlesticks */}
                {chartData.map((c, idx) => {
                  const x = getX(idx);
                  const yOpen = getY(c.open);
                  const yClose = getY(c.close);
                  const yHigh = getY(c.high);
                  const yLow = getY(c.low);
                  const isBull = c.close >= c.open;
                  const candleColor = isBull ? '#22c55e' : '#ef4444';
                  const candleWidth = Math.max(3, (drawWidth / chartData.length) * 0.7);

                  return (
                    <g
                      key={idx}
                      style={{ cursor: 'crosshair' }}
                      onMouseEnter={() => setHoveredCandle(c)}
                    >
                      <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1" />
                      <rect
                        x={x - candleWidth / 2}
                        y={Math.min(yOpen, yClose)}
                        width={candleWidth}
                        height={Math.max(1.5, Math.abs(yOpen - yClose))}
                        fill={isBull ? '#22c55e' : '#ef4444'}
                        rx="1"
                      />
                    </g>
                  );
                })}

                {/* Active Setup Trade Levels Overlays */}
                {stockDetail?.summary?.primarySetup && (
                  <g>
                    {/* Entry Line */}
                    <line
                      x1={padLeft}
                      y1={getY(stockDetail.summary.primarySetup.entry)}
                      x2={svgWidth - padRight}
                      y2={getY(stockDetail.summary.primarySetup.entry)}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <text x={svgWidth - padRight + 6} y={getY(stockDetail.summary.primarySetup.entry) + 3} fill="#38bdf8" fontSize="10" fontWeight="bold">
                      Entry ₹{stockDetail.summary.primarySetup.entry}
                    </text>

                    {/* Target 1 Line */}
                    <line
                      x1={padLeft}
                      y1={getY(stockDetail.summary.primarySetup.target1)}
                      x2={svgWidth - padRight}
                      y2={getY(stockDetail.summary.primarySetup.target1)}
                      stroke="#22c55e"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <text x={svgWidth - padRight + 6} y={getY(stockDetail.summary.primarySetup.target1) + 3} fill="#22c55e" fontSize="10" fontWeight="bold">
                      Tgt(1ATR) ₹{stockDetail.summary.primarySetup.target1}
                    </text>

                    {/* Stop Loss Line */}
                    <line
                      x1={padLeft}
                      y1={getY(stockDetail.summary.primarySetup.stopLoss)}
                      x2={svgWidth - padRight}
                      y2={getY(stockDetail.summary.primarySetup.stopLoss)}
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <text x={svgWidth - padRight + 6} y={getY(stockDetail.summary.primarySetup.stopLoss) + 3} fill="#f43f5e" fontSize="10" fontWeight="bold">
                      SL ₹{stockDetail.summary.primarySetup.stopLoss}
                    </text>
                  </g>
                )}
              </svg>
            )}

            {/* Hover Tooltip Overlay */}
            {hoveredCandle && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '14px',
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid #334155',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                display: 'flex',
                gap: '14px',
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)'
              }}>
                <span>Date: <strong style={{ color: '#f8fafc' }}>{hoveredCandle.date}</strong></span>
                <span>O: <strong style={{ color: '#cbd5e1' }}>{hoveredCandle.open}</strong></span>
                <span>H: <strong style={{ color: '#cbd5e1' }}>{hoveredCandle.high}</strong></span>
                <span>L: <strong style={{ color: '#cbd5e1' }}>{hoveredCandle.low}</strong></span>
                <span>C: <strong style={{ color: hoveredCandle.close >= hoveredCandle.open ? '#4ade80' : '#fb7185' }}>{hoveredCandle.close}</strong></span>
                <span>EMA(22): <strong style={{ color: '#06b6d4' }}>{hoveredCandle.ema}</strong></span>
                <span>ATR(21): <strong style={{ color: '#f59e0b' }}>{hoveredCandle.atr}</strong></span>
              </div>
            )}
          </div>

          {/* ── ACTIVE SETUP ACTION PLAN CARD ── */}
          {stockDetail?.summary?.primarySetup ? (
            <div style={{ marginTop: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: stockDetail.summary.primarySetup.direction === 'LONG' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                    color: stockDetail.summary.primarySetup.direction === 'LONG' ? '#4ade80' : '#fb7185',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: '800',
                    fontSize: '12px',
                    border: `1px solid ${stockDetail.summary.primarySetup.direction === 'LONG' ? '#22c55e' : '#f43f5e'}`
                  }}>
                    {stockDetail.summary.primarySetup.version} {stockDetail.summary.primarySetup.direction} SETUP
                  </span>
                  <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: '600' }}>
                    {stockDetail.summary.primarySetup.version === 'V1' ? '2-Bar Liquidity Sweep & Reclaim' : '3-Bar Absorption & Delayed Confirmation'}
                  </span>
                </div>

                <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: '800' }}>
                  Risk/Reward: 1 : {stockDetail.summary.primarySetup.rrRatio}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Sweep Depth</div>
                  <div style={{ color: '#f8fafc', fontWeight: '700', marginTop: '2px' }}>
                    {stockDetail.summary.primarySetup.penetrationAtr} ATR <span style={{ fontSize: '11px', color: '#94a3b8' }}>({stockDetail.summary.primarySetup.penetrationPts} pts)</span>
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Entry Price</div>
                  <div style={{ color: '#38bdf8', fontWeight: '700', marginTop: '2px' }}>
                    ₹{stockDetail.summary.primarySetup.entry}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Stop Loss (Extreme)</div>
                  <div style={{ color: '#fb7185', fontWeight: '700', marginTop: '2px' }}>
                    ₹{stockDetail.summary.primarySetup.stopLoss}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Target 1 (+1.0 ATR)</div>
                  <div style={{ color: '#4ade80', fontWeight: '700', marginTop: '2px' }}>
                    ₹{stockDetail.summary.primarySetup.target1}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Target 2 (Fair Value EMA)</div>
                  <div style={{ color: '#06b6d4', fontWeight: '700', marginTop: '2px' }}>
                    ₹{stockDetail.summary.primarySetup.target2}
                  </div>
                </div>
              </div>

              {stockDetail.summary.primarySetup.reclaimedLevels?.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
                  <span style={{ color: '#64748b' }}>Reclaimed Value Boundaries:</span>{' '}
                  {stockDetail.summary.primarySetup.reclaimedLevels.map((lvl, i) => (
                    <span key={i} style={{ display: 'inline-block', background: '#1e293b', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', margin: '0 4px 4px 0' }}>
                      ✓ {lvl}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No active V1 or V2 liquidity sweep trigger on the latest bar for <strong style={{ color: '#f8fafc' }}>{stockDetail?.summary?.cleanSymbol}</strong>. Stock is currently trading at <strong style={{ color: '#38bdf8' }}>{stockDetail?.summary?.currentLocation?.text}</strong>. Click any stock with a green or red badge on the right to view active trades!
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: SCANNED STOCKS LIST & SIGNALS ── */}
        <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '18px', maxHeight: '720px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
              Scanned Opportunities ({filteredStocks.length})
            </h2>
            <span style={{ fontSize: '11px', color: '#38bdf8' }}>
              👉 Click any stock to load chart
            </span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {filteredStocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                No stocks match the selected filter or search.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredStocks.map((stock) => {
                  const isSelected = selectedSymbol === stock.cleanSymbol;
                  const setup = stock.primarySetup;
                  const isLong = setup?.direction === 'LONG';
                  const isShort = setup?.direction === 'SHORT';

                  return (
                    <div
                      key={stock.cleanSymbol}
                      onClick={() => handleStockClick(stock.cleanSymbol)}
                      style={{
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#0f172a',
                        border: isSelected ? '2px solid #38bdf8' : '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '800', fontSize: '14px', color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                              {stock.cleanSymbol}
                            </span>
                            {isSelected && (
                              <span style={{ background: '#38bdf8', color: '#0f172a', fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px' }}>
                                VIEWING
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {stock.sector}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>
                              ₹{stock.spotPrice?.toLocaleString('en-IN')}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: stock.dayChangePts >= 0 ? '#4ade80' : '#fb7185' }}>
                              {stock.dayChangePts >= 0 ? '+' : ''}{stock.dayChangePct}%
                            </span>
                          </div>
                        </div>

                        {/* Setup Badge */}
                        <div style={{ textAlign: 'right' }}>
                          {setup ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              background: isLong ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                              color: isLong ? '#4ade80' : '#fb7185',
                              border: `1px solid ${isLong ? '#22c55e' : '#f43f5e'}`
                            }}>
                              {isLong ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {setup.version} {setup.direction}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748b', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                              {stock.currentLocation.text}
                            </span>
                          )}

                          {setup && (
                            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', marginTop: '4px' }}>
                              R:R 1 : {setup.rrRatio}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Setup Details Row */}
                      {setup ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e293b', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Sweep: <strong style={{ color: '#e2e8f0' }}>{setup.penetrationAtr} ATR</strong></span>
                          <span>Tgt: <strong style={{ color: '#4ade80' }}>₹{setup.target1}</strong></span>
                          <span>SL: <strong style={{ color: '#fb7185' }}>₹{setup.stopLoss}</strong></span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e293b', fontSize: '11px', color: '#64748b' }}>
                          <span>Location: {stock.currentLocation.text}</span>
                          <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Eye size={12} /> Inspect
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
