import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  Activity, ArrowLeft, RefreshCw, Layers, TrendingUp, TrendingDown,
  Shield, AlertTriangle, ChevronRight, BarChart2, Eye, Info, Search, X
} from 'lucide-react';

interface FnoStock {
  symbol: string;
  name: string;
  sector: string;
  strikeInterval: number;
  defaultSpot: number;
  lotSize: number;
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
}

interface GexData {
  symbol: string;
  name: string;
  exchange: string;
  lotSize?: number;
  description: string;
  spotPrice: number;
  netGex: number;
  absGex: number;
  regime: string;
  unit: string;
  momentum: {
    m5: number;
    m15: number;
    day: number;
  };
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
  expiryDate: string;
  dte: number;
  strikes: StrikeGex[];
  intradaySeries: Array<{
    time: string;
    netGex: number;
    spot: number;
    flipEst: number;
    belowFlip: boolean;
  }>;
  timeStats: {
    minutesBelowFlip: number;
    minutesAboveFlip: number;
  };
  updatedAt: string;
}

interface HubCard {
  symbol: string;
  name: string;
  exchange: string;
  description: string;
  spotPrice: number;
  netGex: number;
  regime: string;
  unit: string;
  gammaFlip: string;
  callWall: number;
  putWall: number;
}

const ASSET_PILLS = [
  { symbol: 'NIFTY', label: 'NIFTY', exchange: 'NSE' },
  { symbol: 'BANKNIFTY', label: 'BANKNIFTY', exchange: 'NSE' },
  { symbol: 'SENSEX', label: 'SENSEX', exchange: 'BSE' },
  { symbol: 'CRUDEOIL', label: 'CRUDEOIL', exchange: 'MCX' },
  { symbol: 'GOLD', label: 'GOLD', exchange: 'MCX' },
  { symbol: 'NATURALGAS', label: 'NATURALGAS', exchange: 'MCX' },
];

export const GexContainer: React.FC = () => {
  const [viewMode, setViewMode] = useState<'hub' | 'detail'>('detail');
  const [activeSymbol, setActiveSymbol] = useState<string>('NIFTY');
  const [gexData, setGexData] = useState<GexData | null>(null);
  const [hubCards, setHubCards] = useState<HubCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [strikeRange, setStrikeRange] = useState<'auto' | '10' | '20' | '30'>('auto');
  const [strikeView, setStrikeView] = useState<'net' | 'callVsPut' | 'table'>('net');
  const [hoveredStrikeIdx, setHoveredStrikeIdx] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState<number>(1200);

  // F&O Stocks Search State
  const [fnoStocks, setFnoStocks] = useState<FnoStock[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const backendUrl = (getBackendUrl() || 'http://localhost:3002').replace(/\/$/, '');

  // Load 212 F&O universe stocks on mount
  useEffect(() => {
    fetch(`${backendUrl}/api/gex/fno-stocks?_t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.stocks)) {
          setFnoStocks(d.stocks);
        }
      })
      .catch(() => {});
  }, [backendUrl]);

  // Handle clicking outside to dismiss search popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered F&O stocks for search autocomplete
  const filteredStocks = useMemo(() => {
    if (!stockSearchQuery.trim()) {
      return fnoStocks.slice(0, 35);
    }
    const q = stockSearchQuery.toLowerCase().trim();
    return fnoStocks.filter(s => 
      s.symbol.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q) || 
      s.sector.toLowerCase().includes(q)
    ).slice(0, 45);
  }, [fnoStocks, stockSearchQuery]);

  const topFnoPicks = ['RELIANCE', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TCS', 'INFY', 'TATAMOTORS'];

  // Measure container width for 1:1 pixel crisp vector rendering
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const updateWidth = () => {
      if (chartContainerRef.current) {
        const w = chartContainerRef.current.clientWidth;
        if (w > 300) setContainerW(w);
      }
    };
    updateWidth();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 300) {
          setContainerW(Math.round(entry.contentRect.width));
        }
      }
    });
    ro.observe(chartContainerRef.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Fetch Hub Overview
  const fetchHubOverview = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/gex/overview?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.overview) setHubCards(json.overview);
      }
    } catch (e) {}
  };

  // Fetch Symbol Deep-Dive Data
  const fetchGexData = async (sym: string, isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`${backendUrl}/api/gex/data?symbol=${sym}&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setGexData(json.data);
          setLoading(false);
        }
      }
    } catch (e) {
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHubOverview();
    fetchGexData(activeSymbol);
    const interval = setInterval(() => {
      fetchGexData(activeSymbol);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSymbol, backendUrl]);

// Catmull-Rom cubic Bezier spline generator for smooth continuous wave (matching Image 1)
function getSmoothSpline(points: Array<{ x: number; y: number }>, tension = 0.25): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const pPrev = i === 0 ? points[0] : points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];
    const pAfter = i + 2 < points.length ? points[i + 2] : pNext;

    const cp1x = pCurr.x + ((pNext.x - pPrev.x) / 6) * (1 - tension);
    const cp1y = pCurr.y + ((pNext.y - pPrev.y) / 6) * (1 - tension);

    const cp2x = pNext.x - ((pAfter.x - pCurr.x) / 6) * (1 - tension);
    const cp2y = pNext.y - ((pAfter.y - pCurr.y) / 6) * (1 - tension);

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${pNext.x.toFixed(1)} ${pNext.y.toFixed(1)}`;
  }

  return path;
}

function formatYTick(val: number): string {
  if (val === 0) return '0.0';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}${abs.toFixed(0)}`;
}

function formatGexVal(val: number, unit = 'Cr'): string {
  const abs = Math.abs(val);
  let str = '';
  if (abs >= 1000) {
    str = `${(abs / 1000).toFixed(1)}k`;
  } else if (abs >= 100) {
    str = `${Math.round(abs)}`;
  } else {
    str = `${abs.toFixed(0)}`;
  }
  return `${str} ${unit}`;
}

  // Filter strikes based on range selector
  const visibleStrikes = useMemo(() => {
    if (!gexData?.strikes) return [];
    const all = gexData.strikes;
    const atmIdx = all.findIndex(s => s.isAtm);
    if (atmIdx === -1) return all;

    if (strikeRange === '10') {
      return all.slice(Math.max(0, atmIdx - 10), Math.min(all.length, atmIdx + 11)); // 21 strikes
    }
    if (strikeRange === '20') {
      return all.slice(Math.max(0, atmIdx - 15), Math.min(all.length, atmIdx + 16)); // 31 strikes
    }
    if (strikeRange === '30') {
      return all.slice(Math.max(0, atmIdx - 20), Math.min(all.length, atmIdx + 21)); // 41 strikes
    }
    // Auto range: show 27 strikes centered around ATM (covering ±13 strikes)
    // For NIFTY (50pt step): ±650 pts (e.g. 22700 to 24000), capturing all walls, spot, flip and active gamma
    return all.slice(Math.max(0, atmIdx - 13), Math.min(all.length, atmIdx + 14));
  }, [gexData, strikeRange]);

  // Dynamic Y-axis ticks and scale based on genuine data money bounds
  const { yMax, yMin, yTicks } = useMemo(() => {
    if (!visibleStrikes.length) {
      return { yMax: 15000, yMin: -10000, yTicks: [15000, 10000, 5000, 0, -5000, -10000] };
    }

    // Find the true maximum positive and minimum negative data points across visible strikes
    // Include absGex concentration curve, callGex, and netGex
    const maxDataPositive = Math.max(
      10,
      ...visibleStrikes.map(s => Math.max(s.absGex || 0, s.callGex || 0, s.netGex || 0, 0))
    );
    const minDataNegative = Math.min(
      0,
      ...visibleStrikes.map(s => Math.min(s.netGex || 0, -(s.putGex || 0), 0))
    );

    // Provide 12% headroom so curves and bars never clip or touch the bounding box
    const paddedMax = maxDataPositive * 1.12;
    const paddedMin = minDataNegative < 0 ? minDataNegative * 1.15 : -maxDataPositive * 0.2;

    const totalRange = paddedMax - paddedMin;
    const rawStep = totalRange / 5.5;
    const power = Math.pow(10, Math.floor(Math.log10(rawStep || 100)));
    const fraction = rawStep / power;

    let tickStep = power;
    if (fraction <= 1.4) tickStep = 1 * power;
    else if (fraction <= 3.0) tickStep = 2 * power;
    else if (fraction <= 6.5) tickStep = 5 * power;
    else tickStep = 10 * power;

    tickStep = Math.max(tickStep, 1);

    // Compute yMaxVal and yMinVal as exact multiples of tickStep so 0 is ALWAYS an exact tick mark
    const yMaxVal = Math.ceil(paddedMax / tickStep) * tickStep;
    const yMinVal = Math.floor(paddedMin / tickStep) * tickStep;

    const ticks: number[] = [];
    for (let t = yMaxVal; t >= yMinVal - tickStep * 0.01; t -= tickStep) {
      ticks.push(Math.round(t));
    }

    return { yMax: yMaxVal, yMin: yMinVal, yTicks: ticks };
  }, [visibleStrikes]);

  return (
    <div style={{
      backgroundColor: '#0c0e14',
      color: '#e2e8f0',
      minHeight: '100vh',
      padding: '16px 22px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ─────────────────────────────────────────────────────────────
          TOP TOOLBAR / BREADCRUMB
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '16px',
        borderBottom: '1px solid #1e2433',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {viewMode === 'detail' && (
            <button
              onClick={() => setViewMode('hub')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#161c28',
                border: '1px solid #2d3748',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <ArrowLeft size={14} /> Back to Hub
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
              {viewMode === 'hub' ? 'Live Gamma Exposure (GEX) Dashboards' : `${gexData?.name || activeSymbol} — Live Gamma Exposure Chart`}
            </span>
          </div>
        </div>

        {/* Top Asset Pills & F&O Stock Search (Matching User's Red Marking in Image) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* F&O Stocks Search Box (Red Marking in Image) */}
          <div ref={searchContainerRef} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#141a26',
              border: isSearchOpen ? '1px solid #2dd4bf' : '1px solid #263042',
              borderRadius: '6px',
              padding: '4px 10px',
              width: '230px',
              transition: 'all 0.15s ease',
              boxShadow: isSearchOpen ? '0 0 0 2px rgba(45, 212, 191, 0.15)' : 'none'
            }}>
              <Search size={13} color={isSearchOpen ? '#2dd4bf' : '#64748b'} style={{ marginRight: '6px', flexShrink: 0 }} />
              <input
                type="text"
                value={stockSearchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setStockSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Search 200+ F&O stocks..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f1f5f9',
                  fontSize: '11.5px',
                  width: '100%',
                  fontWeight: 500
                }}
              />
              {stockSearchQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStockSearchQuery('');
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#64748b', display: 'flex' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Dropdown Popover */}
            {isSearchOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: '330px',
                maxHeight: '380px',
                backgroundColor: '#0e131f',
                border: '1px solid #263248',
                borderRadius: '8px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                zIndex: 1000,
                overflowY: 'auto',
                padding: '6px'
              }}>
                {/* Popular F&O Chips */}
                <div style={{ padding: '6px 8px 8px 8px', borderBottom: '1px solid #1a2233' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.4px' }}>
                    Popular F&O Stocks
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {topFnoPicks.map(sym => (
                      <button
                        key={sym}
                        onClick={() => {
                          setActiveSymbol(sym);
                          setViewMode('detail');
                          setIsSearchOpen(false);
                          setStockSearchQuery('');
                        }}
                        style={{
                          backgroundColor: activeSymbol === sym ? '#134e4a' : '#161e2e',
                          color: activeSymbol === sym ? '#2dd4bf' : '#cbd5e1',
                          border: activeSymbol === sym ? '1px solid #2dd4bf' : '1px solid #28354b',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock List */}
                <div style={{ paddingTop: '4px' }}>
                  {filteredStocks.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '11.5px' }}>
                      No F&O stocks found matching "{stockSearchQuery}"
                    </div>
                  ) : (
                    filteredStocks.map(stock => {
                      const isSelected = activeSymbol === stock.symbol;
                      return (
                        <div
                          key={stock.symbol}
                          onClick={() => {
                            setActiveSymbol(stock.symbol);
                            setViewMode('detail');
                            setIsSearchOpen(false);
                            setStockSearchQuery('');
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '7px 10px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#161d2d';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ minWidth: 0, paddingRight: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, fontSize: '12px', color: isSelected ? '#2dd4bf' : '#f8fafc' }}>
                                {stock.symbol}
                              </span>
                              <span style={{
                                fontSize: '9px',
                                color: '#94a3b8',
                                backgroundColor: '#182133',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '120px'
                              }}>
                                {stock.sector}
                              </span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {stock.name}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#38bdf8' }}>
                              Step ₹{stock.strikeInterval}
                            </div>
                            <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                              Lot {stock.lotSize}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active F&O stock pill if selected stock is not one of the default 6 */}
          {!ASSET_PILLS.some(p => p.symbol === activeSymbol) && (
            <button
              onClick={() => setViewMode('detail')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: '1px solid #2dd4bf',
                backgroundColor: '#134e4a',
                color: '#2dd4bf',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{activeSymbol}</span>
            </button>
          )}

          {/* Core Flagship Asset Pills */}
          {ASSET_PILLS.map(p => {
            const isSel = activeSymbol === p.symbol;
            return (
              <button
                key={p.symbol}
                onClick={() => {
                  setActiveSymbol(p.symbol);
                  setViewMode('detail');
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: isSel ? '1px solid #2dd4bf' : '1px solid #263042',
                  backgroundColor: isSel ? '#134e4a' : '#141a26',
                  color: isSel ? '#2dd4bf' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            );
          })}
          <button
            onClick={() => fetchGexData(activeSymbol, true)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              backgroundColor: '#141a26',
              border: '1px solid #263042',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Refresh Live GEX Data"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: GEX HUB OVERVIEW (Matching Image 2)
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'hub' ? (
        <div>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '850px', lineHeight: 1.6, marginBottom: '24px' }}>
            Gamma exposure estimates how much delta hedging option dealers must do as the index moves. Positive GEX means dealers sell rallies and buy dips, compressing ranges; negative GEX means they chase price, expanding them. Every dashboard below updates in real time.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {hubCards.map(card => {
              const isShort = card.regime === 'SHORT GAMMA';
              const isFlip = card.regime === 'FLIP ZONE';
              return (
                <div
                  key={card.symbol}
                  onClick={() => {
                    setActiveSymbol(card.symbol);
                    setViewMode('detail');
                  }}
                  style={{
                    backgroundColor: '#111520',
                    border: '1px solid #202738',
                    borderRadius: '10px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2dd4bf';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#202738';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#2dd4bf' }}>{card.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#1e2638', color: '#94a3b8', padding: '1px 6px', borderRadius: '4px' }}>
                          {card.exchange}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                        ₹{card.spotPrice.toLocaleString()}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: isShort ? 'rgba(239, 68, 68, 0.18)' : (isFlip ? 'rgba(234, 179, 8, 0.18)' : 'rgba(34, 197, 94, 0.18)'),
                      color: isShort ? '#f87171' : (isFlip ? '#facc15' : '#4ade80'),
                      border: `1px solid ${isShort ? '#ef4444' : (isFlip ? '#eab308' : '#22c55e')}`
                    }}>
                      {card.regime}
                    </span>
                  </div>

                  <p style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '14px', minHeight: '34px' }}>
                    {card.description}
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    borderTop: '1px solid #1a2233',
                    paddingTop: '12px',
                    fontSize: '11px'
                  }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '10px' }}>GAMMA FLIP</div>
                      <div style={{ color: '#facc15', fontWeight: 700 }}>{card.gammaFlip}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '10px' }}>CALL WALL</div>
                      <div style={{ color: '#4ade80', fontWeight: 700 }}>{card.callWall}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '10px' }}>PUT WALL</div>
                      <div style={{ color: '#f87171', fontWeight: 700 }}>{card.putWall}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            VIEW 2: DEEP DIVE GEX DASHBOARD (Matching Images 3, 4, 5)
        ───────────────────────────────────────────────────────────── */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Live · updated {gexData?.updatedAt || 'just now'}
            </div>
            {gexData?.lotSize && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.08)',
                border: '1px solid rgba(52, 211, 153, 0.25)',
                padding: '3px 9px',
                borderRadius: '5px',
                fontWeight: 700
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Official Lot Size:</span>
                <span style={{ color: '#38bdf8', fontWeight: 900 }}>{gexData.lotSize}</span>
                <span style={{ color: '#64748b', fontSize: '10px' }}>qty/contract</span>
              </div>
            )}
          </div>

          {/* 1. TOP 4 METRIC CARDS (Image 3) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            marginBottom: '14px'
          }}>
            {/* Card 1: NET GEX */}
            <div style={{ backgroundColor: '#111520', border: '1px solid #202738', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                NET GEX
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: gexData && gexData.netGex < 0 ? '#f87171' : '#4ade80' }}>
                  {gexData ? `${gexData.netGex > 0 ? '+' : ''}${(gexData.netGex / 1000).toFixed(1)}k` : '-1.5k'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{gexData?.unit || '₹ Cr'} / 1%</span>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: '#facc15',
                  border: '1px solid rgba(234, 179, 8, 0.4)'
                }}>
                  {gexData?.regime || 'FLIP ZONE'}
                </span>
              </div>
            </div>

            {/* Card 2: ΔGEX MOMENTUM */}
            <div style={{ backgroundColor: '#111520', border: '1px solid #202738', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                ΔGEX MOMENTUM
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: gexData && gexData.momentum.m5 < 0 ? '#f87171' : '#4ade80' }}>
                  {gexData ? `${gexData.momentum.m5 > 0 ? '+' : ''}${gexData.momentum.m5}` : '-8.8'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Cr · 5m</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                15m {gexData?.momentum.m15} · day {gexData?.momentum.day}
              </div>
            </div>

            {/* Card 3: GAMMA FLIP (est.) */}
            <div style={{ backgroundColor: '#111520', border: '1px solid #202738', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  GAMMA FLIP
                </span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>est.</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#f8fafc', marginTop: '6px' }}>
                {gexData?.gammaFlip.band || '23,345 – 23,360'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                spot inside the flip band ({gexData?.spotPrice}) · ±10% IV surface → {gexData?.gammaFlip.spreadPts || 15} pt spread
              </div>
            </div>

            {/* Card 4: WALLS */}
            <div style={{ backgroundColor: '#111520', border: '1px solid #202738', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                WALLS
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#4ade80' }}>
                  {gexData?.walls.callWall.toLocaleString() || '23,400'}
                </span>
                <span style={{ color: '#64748b' }}>/</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#f87171' }}>
                  {gexData?.walls.putWall.toLocaleString() || '23,300'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                call +{gexData?.walls.callDistPts || 54} pts from spot · put -{gexData?.walls.putDistPts || 46} pts from spot
              </div>
            </div>
          </div>


          {/* ─────────────────────────────────────────────────────────────
              2. GEX BY STRIKE BAR CHART (Matching Image 4)
          ───────────────────────────────────────────────────────────── */}
          <div style={{
            backgroundColor: '#111520',
            border: '1px solid #202738',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '18px'
          }}>
            {/* Chart Toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                  GEX by strike — nearest expiry ({gexData?.expiryDate || '2026-09-22'})
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#1e2638', padding: '2px 6px', borderRadius: '4px' }}>
                  {gexData?.dte || 3} DTE
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Range Selector */}
                <select
                  value={strikeRange}
                  onChange={(e) => setStrikeRange(e.target.value as any)}
                  style={{
                    backgroundColor: '#161d2b',
                    border: '1px solid #2d384e',
                    color: '#cbd5e1',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="auto">Auto range</option>
                  <option value="10">ATM ±10</option>
                  <option value="20">ATM ±20</option>
                  <option value="30">ATM ±30</option>
                </select>

                {/* Expiry Pill */}
                <div style={{ display: 'flex', borderRadius: '5px', overflow: 'hidden', border: '1px solid #2d384e' }}>
                  <button style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 10px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Nearest
                  </button>
                  <button style={{ backgroundColor: '#131824', color: '#64748b', padding: '4px 10px', fontSize: '11px', border: 'none', cursor: 'pointer' }}>
                    All expiries
                  </button>
                </div>

                {/* View Toggles */}
                <div style={{ display: 'flex', borderRadius: '5px', overflow: 'hidden', border: '1px solid #2d384e' }}>
                  <button
                    onClick={() => setStrikeView('net')}
                    style={{
                      backgroundColor: strikeView === 'net' ? '#1e293b' : '#131824',
                      color: strikeView === 'net' ? '#2dd4bf' : '#64748b',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Net
                  </button>
                  <button
                    onClick={() => setStrikeView('callVsPut')}
                    style={{
                      backgroundColor: strikeView === 'callVsPut' ? '#1e293b' : '#131824',
                      color: strikeView === 'callVsPut' ? '#2dd4bf' : '#64748b',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Call vs Put
                  </button>
                  <button
                    onClick={() => setStrikeView('table')}
                    style={{
                      backgroundColor: strikeView === 'table' ? '#1e293b' : '#131824',
                      color: strikeView === 'table' ? '#2dd4bf' : '#64748b',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {/* SVG GEX Strike Bar Chart (Matching Image 2) */}
            {strikeView !== 'table' ? (
              <div ref={chartContainerRef} style={{ position: 'relative', width: '100%', height: '500px', overflowX: 'hidden' }}>
                <svg
                  width={containerW}
                  height={490}
                  viewBox={`0 0 ${containerW} 490`}
                  style={{ display: 'block', cursor: 'crosshair', width: '100%', height: '490px' }}
                  onMouseMove={(e) => {
                    if (!visibleStrikes.length) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clientX = e.clientX - rect.left;
                    const svgX = (clientX / rect.width) * containerW;
                    
                    // Find closest strike index
                    let closestIdx = 0;
                    let minDiff = Infinity;
                    visibleStrikes.forEach((s, i) => {
                      const sx = 70 + (i / (visibleStrikes.length - 1 || 1)) * (containerW - 105);
                      const diff = Math.abs(svgX - sx);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closestIdx = i;
                      }
                    });
                    setHoveredStrikeIdx(closestIdx);
                  }}
                  onMouseLeave={() => setHoveredStrikeIdx(null)}
                >
                  <defs>
                    <linearGradient id="curveGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Chart Layout Coordinates */}
                  {(() => {
                    if (!gexData || !visibleStrikes.length) return null;
                    const chartHeight = 490;
                    const chartLeft = 70;
                    const chartRight = containerW - 35;
                    const chartTop = 120;
                    const chartBottom = chartHeight - 48; // 442
                    const plotW = chartRight - chartLeft;
                    const plotH = chartBottom - chartTop; // 322px

                    const getY = (val: number) => {
                      const range = yMax - yMin || 1;
                      const ratio = (yMax - val) / range;
                      const rawY = chartTop + ratio * plotH;
                      return Math.max(chartTop, Math.min(chartBottom, rawY));
                    };
                    const yZero = getY(0);

                    const N = visibleStrikes.length;
                    const getStrikeX = (idx: number) => {
                      if (N <= 1) return chartLeft + plotW / 2;
                      return chartLeft + (idx / (N - 1)) * plotW;
                    };
                    const dx = N > 1 ? plotW / (N - 1) : 25;
                    const barW = Math.max(5, Math.min(10, dx * 0.62));

                    const minK = visibleStrikes[0].strike;
                    const maxK = visibleStrikes[visibleStrikes.length - 1].strike;
                    const getXForPrice = (p: number) => {
                      const clamped = Math.max(minK, Math.min(maxK, p));
                      return chartLeft + ((clamped - minK) / (maxK - minK || 1)) * plotW;
                    };

                    const putX = getXForPrice(gexData.walls.putWall);
                    const spotX = getXForPrice(gexData.spotPrice);
                    const flipX = getXForPrice(gexData.gammaFlip.mid);
                    const callX = getXForPrice(gexData.walls.callWall);

                    // Curve points for continuous cubic Bezier Catmull-Rom spline
                    const curvePoints = visibleStrikes.map((s, idx) => ({
                      x: getStrikeX(idx),
                      y: getY(s.absGex)
                    }));
                    const splineD = getSmoothSpline(curvePoints, 0.22);

                    return (
                      <g>
                        {/* Horizontal Gridlines & Left Y-Axis Ticks */}
                        {yTicks.map(t => {
                          const y = getY(t);
                          const isZero = t === 0;
                          return (
                            <g key={t}>
                              <line
                                x1={chartLeft}
                                y1={y}
                                x2={chartRight}
                                y2={y}
                                stroke={isZero ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)'}
                                strokeWidth={isZero ? 1.2 : 0.8}
                                strokeDasharray={isZero ? undefined : '3 3'}
                              />
                              <text
                                x={chartLeft - 14}
                                y={y + 4}
                                fill="#94a3b8"
                                fontSize="11"
                                fontFamily="monospace"
                                fontWeight="600"
                                textAnchor="end"
                              >
                                {formatYTick(t)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Vertical Indicator Drop Lines */}
                        {/* Put Wall */}
                        <line x1={putX} y1={27} x2={putX} y2={chartBottom} stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65" />
                        {/* Spot */}
                        <line x1={spotX} y1={53} x2={spotX} y2={chartBottom} stroke="#06b6d4" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.85" />
                        {/* Flip */}
                        <line x1={flipX} y1={79} x2={flipX} y2={chartBottom} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.75" />
                        {/* Call Wall */}
                        <line x1={callX} y1={105} x2={callX} y2={chartBottom} stroke="#22c55e" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.75" />

                        {/* Top Staggered Callout Badges (True 1:1 Vector Aspect Ratio) */}
                        {/* 1. Put Wall (Lane 1: Y = 16) */}
                        <g>
                          <rect
                            x={Math.max(chartLeft + 5, Math.min(chartRight - 105, putX - 52))}
                            y="16"
                            width="104"
                            height="22"
                            rx="11"
                            fill="#0d1117"
                            stroke="#ef4444"
                            strokeWidth="1.2"
                          />
                          <text
                            x={Math.max(chartLeft + 57, Math.min(chartRight - 53, putX))}
                            y="31"
                            fill="#f87171"
                            fontSize="10.5"
                            fontWeight="700"
                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                            textAnchor="middle"
                          >
                            PUT WALL {gexData.walls.putWall.toLocaleString()}
                          </text>
                        </g>

                        {/* 2. Spot Price (Lane 2: Y = 42) */}
                        <g>
                          <rect
                            x={Math.max(chartLeft + 5, Math.min(chartRight - 98, spotX - 48))}
                            y="42"
                            width="96"
                            height="22"
                            rx="11"
                            fill="#0d1117"
                            stroke="#06b6d4"
                            strokeWidth="1.2"
                          />
                          <text
                            x={Math.max(chartLeft + 53, Math.min(chartRight - 50, spotX))}
                            y="57"
                            fill="#38bdf8"
                            fontSize="10.5"
                            fontWeight="700"
                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                            textAnchor="middle"
                          >
                            SPOT {gexData.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </text>
                        </g>

                        {/* 3. Flip Level (Lane 3: Y = 68) */}
                        <g>
                          <rect
                            x={Math.max(chartLeft + 5, Math.min(chartRight - 90, flipX - 44))}
                            y="68"
                            width="88"
                            height="22"
                            rx="11"
                            fill="#0d1117"
                            stroke="#f59e0b"
                            strokeWidth="1.2"
                          />
                          <text
                            x={Math.max(chartLeft + 49, Math.min(chartRight - 46, flipX))}
                            y="83"
                            fill="#facc15"
                            fontSize="10.5"
                            fontWeight="700"
                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                            textAnchor="middle"
                          >
                            FLIP {gexData.gammaFlip.mid.toLocaleString()}
                          </text>
                        </g>

                        {/* 4. Call Wall (Lane 4: Y = 94) */}
                        <g>
                          <rect
                            x={Math.max(chartLeft + 5, Math.min(chartRight - 110, callX - 54))}
                            y="94"
                            width="108"
                            height="22"
                            rx="11"
                            fill="#0d1117"
                            stroke="#22c55e"
                            strokeWidth="1.2"
                          />
                          <text
                            x={Math.max(chartLeft + 59, Math.min(chartRight - 56, callX))}
                            y="109"
                            fill="#4ade80"
                            fontSize="10.5"
                            fontWeight="700"
                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                            textAnchor="middle"
                          >
                            CALL WALL {gexData.walls.callWall.toLocaleString()}
                          </text>
                        </g>

                        {/* GEX Vertical Bars */}
                        {visibleStrikes.map((s, idx) => {
                          const x = getStrikeX(idx);
                          const isPositive = s.netGex >= 0;

                          if (strikeView === 'callVsPut') {
                            const halfW = Math.max(2, (barW - 1) / 2);
                            const callY = getY(s.callGex);
                            const callH = Math.max(1, yZero - callY);
                            const putY = yZero;
                            const putH = Math.max(1, getY(-s.putGex) - yZero);

                            return (
                              <g key={s.strike}>
                                <rect
                                  x={x - barW / 2}
                                  y={callY}
                                  width={halfW}
                                  height={callH}
                                  rx="1.5"
                                  fill="#22c55e"
                                  opacity={s.isAtm ? 1.0 : 0.85}
                                />
                                <rect
                                  x={x - barW / 2 + halfW + 1}
                                  y={putY}
                                  width={halfW}
                                  height={putH}
                                  rx="1.5"
                                  fill="#ef4444"
                                  opacity={s.isAtm ? 1.0 : 0.85}
                                />
                              </g>
                            );
                          }

                          // Standard Net Mode (Image 2)
                          const barY = isPositive ? getY(s.netGex) : yZero;
                          const barH = isPositive ? Math.max(2, yZero - getY(s.netGex)) : Math.max(2, getY(s.netGex) - yZero);

                          return (
                            <rect
                              key={s.strike}
                              x={x - barW / 2}
                              y={barY}
                              width={barW}
                              height={barH}
                              rx="2"
                              fill={isPositive ? '#22c55e' : '#ef4444'}
                              opacity={s.isAtm ? 1.0 : 0.88}
                            />
                          );
                        })}

                        {/* Silky Smooth Cyan |GEX| Concentration Curve */}
                        {splineD && (
                          <path
                            d={splineD}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* X-Axis Strike Labels: Consecutive 50-pt strikes (23150, 23200, 23250...) */}
                        {visibleStrikes.map((s, idx) => {
                          const x = getStrikeX(idx);
                          const isAtm = s.isAtm;
                          const isRound100 = s.strike % 100 === 0;
                          const isNarrow = dx < 32;

                          // Stagger label Y position if screen is very narrow (< 28px) so consecutive strikes never collide
                          const labelY = (dx < 28 && idx % 2 !== 0) ? chartBottom + 32 : chartBottom + 20;
                          const fontSize = isAtm ? '11' : (isNarrow ? '8.5' : '9.5');

                          return (
                            <text
                              key={s.strike}
                              x={x}
                              y={labelY}
                              fill={isAtm ? '#ffffff' : (isRound100 ? '#e2e8f0' : '#94a3b8')}
                              fontSize={fontSize}
                              fontWeight={isAtm ? '800' : (isRound100 ? '600' : '500')}
                              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                              textAnchor="middle"
                            >
                              {s.strike}
                            </text>
                          );
                        })}

                        {/* Interactive Hover Highlight Column & Tooltip Card */}
                        {hoveredStrikeIdx !== null && visibleStrikes[hoveredStrikeIdx] && (() => {
                          const s = visibleStrikes[hoveredStrikeIdx];
                          const hX = getStrikeX(hoveredStrikeIdx);
                          const colW = Math.max(16, dx + 2);

                          // Tooltip position & boundary safety
                          const cardW = 128;
                          const cardH = 78;
                          const isRightHalf = hX > chartLeft + plotW * 0.58;
                          const tooltipX = isRightHalf ? hX - colW / 2 - cardW - 8 : hX + colW / 2 + 8;
                          const tooltipY = Math.max(chartTop - 20, 60);

                          return (
                            <g pointerEvents="none">
                              {/* Translucent Highlight Column covering the strike vertically */}
                              <rect
                                x={hX - colW / 2}
                                y={chartTop - 15}
                                width={colW}
                                height={plotH + 20}
                                fill="rgba(255, 255, 255, 0.08)"
                                rx="3"
                              />

                              {/* Floating Tooltip Card */}
                              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                                <rect
                                  x="0"
                                  y="0"
                                  width={cardW}
                                  height={cardH}
                                  rx="6"
                                  fill="#0d1117"
                                  stroke="#263248"
                                  strokeWidth="1"
                                />

                                {/* Title: Strike 23,000 */}
                                <text
                                  x="10"
                                  y="18"
                                  fill="#f8fafc"
                                  fontSize="11.5"
                                  fontWeight="800"
                                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                >
                                  Strike {s.strike.toLocaleString()}
                                </text>

                                {/* Call GEX */}
                                <text
                                  x="10"
                                  y="36"
                                  fill="#94a3b8"
                                  fontSize="10"
                                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                >
                                  Call GEX: <tspan fill="#4ade80" fontWeight="700">+{formatGexVal(s.callGex)}</tspan>
                                </text>

                                {/* Put GEX */}
                                <text
                                  x="10"
                                  y="52"
                                  fill="#94a3b8"
                                  fontSize="10"
                                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                >
                                  Put GEX: <tspan fill="#f87171" fontWeight="700">-{formatGexVal(s.putGex)}</tspan>
                                </text>

                                {/* Net */}
                                <text
                                  x="10"
                                  y="68"
                                  fill="#94a3b8"
                                  fontSize="10"
                                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                >
                                  Net: <tspan fill={s.netGex >= 0 ? '#4ade80' : '#f87171'} fontWeight="800">{s.netGex >= 0 ? '+' : ''}{formatGexVal(s.netGex)}</tspan>
                                </text>
                              </g>
                            </g>
                          );
                        })()}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            ) : (
              /* Expanded High-Legibility Table View of Strikes */
              <div style={{ maxHeight: '560px', overflowY: 'auto', borderRadius: '6px', border: '1px solid #1e2638' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ color: '#94a3b8', backgroundColor: '#0f1420', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 5 }}>
                      <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Strike</th>
                      <th style={{ padding: '11px 16px', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Call OI</th>
                      <th style={{ padding: '11px 16px', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Call GEX</th>
                      <th style={{ padding: '11px 16px', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Net GEX</th>
                      <th style={{ padding: '11px 16px', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Put GEX</th>
                      <th style={{ padding: '11px 16px', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Put OI</th>
                      <th style={{ padding: '11px 16px', fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>IV %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStrikes.map((s, idx) => (
                      <tr 
                        key={s.strike} 
                        style={{ 
                          borderBottom: '1px solid #141b29',
                          backgroundColor: s.isAtm ? 'rgba(56, 189, 248, 0.12)' : (idx % 2 === 0 ? '#111522' : '#0e121c'),
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <td style={{ textAlign: 'left', padding: '11px 16px', fontWeight: s.isAtm ? 800 : 600, color: s.isAtm ? '#38bdf8' : '#e2e8f0' }}>
                          {s.strike} {s.isAtm && <span style={{ fontSize: '11px', backgroundColor: '#0284c7', color: '#fff', padding: '2px 6px', borderRadius: '3px', marginLeft: '6px' }}>ATM</span>}
                        </td>
                        <td style={{ padding: '11px 16px', color: '#cbd5e1' }}>{s.callOi.toLocaleString()}</td>
                        <td style={{ padding: '11px 16px', fontWeight: 600, color: '#4ade80' }}>+{s.callGex}</td>
                        <td style={{ padding: '11px 16px', fontWeight: 800, color: s.netGex >= 0 ? '#4ade80' : '#f87171' }}>
                          {s.netGex >= 0 ? `+${s.netGex}` : s.netGex}
                        </td>
                        <td style={{ padding: '11px 16px', fontWeight: 600, color: '#f87171' }}>-{s.putGex}</td>
                        <td style={{ padding: '11px 16px', color: '#cbd5e1' }}>{s.putOi.toLocaleString()}</td>
                        <td style={{ padding: '11px 16px', fontWeight: 600, color: '#facc15' }}>{s.iv}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Legend (Matching Image 1) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              borderTop: '1px solid #1e2433',
              paddingTop: '12px',
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  dealer-stabilizing
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  dealer-amplifying
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '2px', backgroundColor: '#06b6d4' }} />
                  |GEX| concentration
                </span>
              </div>
              <div>
                Total |GEX| <strong style={{ color: '#f8fafc' }}>
                  {gexData?.absGex ? (gexData.absGex >= 1000 ? `${(gexData.absGex / 1000).toFixed(1)}k Cr` : `${gexData.absGex.toFixed(1)} Cr`) : '112.8k Cr'}
                </strong> · updated {gexData?.updatedAt}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              3. INTRADAY CHARTS (Matching Image 5)
          ───────────────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Chart A: Intraday Net GEX — today */}
            <div style={{
              backgroundColor: '#111520',
              border: '1px solid #202738',
              borderRadius: '8px',
              padding: '16px 20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>Intraday Net GEX — today</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>1-min samples · ₹ Cr per 1% move</span>
              </div>

              {/* Area Chart */}
              <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                <svg width="100%" height="120" viewBox="0 0 800 120" preserveAspectRatio="none">
                  {/* Zero Line */}
                  <line x1="0" y1="20" x2="800" y2="20" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />

                  {(() => {
                    const series = gexData?.intradaySeries || [];
                    if (series.length < 2) return null;
                    const minG = Math.min(...series.map(s => s.netGex), -1500);
                    const maxG = Math.max(...series.map(s => s.netGex), 200);
                    const range = maxG - minG || 1;

                    const getY = (val: number) => 20 + ((maxG - val) / range) * 80;

                    let pathD = `M 0,${getY(series[0].netGex)}`;
                    series.forEach((pt, i) => {
                      const x = (i / (series.length - 1)) * 800;
                      pathD += ` L ${x},${getY(pt.netGex)}`;
                    });

                    const areaD = `${pathD} L 800,20 L 0,20 Z`;

                    return (
                      <g>
                        <path d={areaD} fill="rgba(239, 68, 68, 0.15)" />
                        <path d={pathD} fill="none" stroke="#f87171" strokeWidth="1.8" />
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Chart B: Spot vs Gamma Flip — today */}
            <div style={{
              backgroundColor: '#111520',
              border: '1px solid #202738',
              borderRadius: '8px',
              padding: '16px 20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>Spot vs Gamma Flip — today</span>
                <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>
                  {gexData?.timeStats.minutesBelowFlip || 181} min below flip · {gexData?.timeStats.minutesAboveFlip || 0} min above
                </span>
              </div>

              {/* Spot vs Flip Chart */}
              <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                <svg width="100%" height="140" viewBox="0 0 800 140" preserveAspectRatio="none">
                  {(() => {
                    const series = gexData?.intradaySeries || [];
                    if (series.length < 2) return null;

                    const allVals = series.flatMap(s => [s.spot, s.flipEst]);
                    const minP = Math.min(...allVals) - 8;
                    const maxP = Math.max(...allVals) + 8;
                    const range = maxP - minP || 1;

                    const getY = (val: number) => 120 - ((val - minP) / range) * 100;

                    let spotPath = `M 0,${getY(series[0].spot)}`;
                    let flipPath = `M 0,${getY(series[0].flipEst)}`;

                    series.forEach((pt, i) => {
                      const x = (i / (series.length - 1)) * 800;
                      spotPath += ` L ${x},${getY(pt.spot)}`;
                      flipPath += ` L ${x},${getY(pt.flipEst)}`;
                    });

                    return (
                      <g>
                        {/* Shaded area between Spot and Flip */}
                        {series.map((pt, i) => {
                          if (i === 0) return null;
                          const prev = series[i - 1];
                          const x1 = ((i - 1) / (series.length - 1)) * 800;
                          const x2 = (i / (series.length - 1)) * 800;
                          const y1Spot = getY(prev.spot);
                          const y1Flip = getY(prev.flipEst);
                          const y2Spot = getY(pt.spot);
                          const y2Flip = getY(pt.flipEst);

                          if (pt.belowFlip) {
                            return (
                              <polygon
                                key={i}
                                points={`${x1},${y1Spot} ${x2},${y2Spot} ${x2},${y2Flip} ${x1},${y1Flip}`}
                                fill="rgba(239, 68, 68, 0.22)"
                              />
                            );
                          }
                          return null;
                        })}

                        {/* Spot Line (White) */}
                        <path d={spotPath} fill="none" stroke="#f8fafc" strokeWidth="1.6" />

                        {/* Flip Line (Yellow dashed) */}
                        <path d={flipPath} fill="none" stroke="#facc15" strokeWidth="1.4" strokeDasharray="4 3" />
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* Chart Legend */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #1e2433',
                paddingTop: '10px',
                marginTop: '6px',
                fontSize: '11px',
                color: '#94a3b8'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '2px', backgroundColor: '#f8fafc' }} />
                    spot
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '2px', backgroundColor: '#facc15' }} />
                    gamma flip (est.)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(239, 68, 68, 0.4)' }} />
                    spot below flip
                  </span>
                </div>
                <div style={{ color: '#64748b' }}>
                  The flip moves all session — it is not one level.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
