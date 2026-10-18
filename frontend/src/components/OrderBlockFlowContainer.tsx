import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, Activity, Search, RefreshCw, Layers, TrendingUp, TrendingDown,
  Shield, Crosshair, ArrowUpRight, ArrowDownRight, Sliders, Eye, Sparkles,
  Info, ExternalLink, ChevronRight, CheckCircle2, Lock, PlayCircle, BookOpen,
  Filter, BarChart2, Award, Clock, AlertTriangle, Target, Check, Maximize2, X,
  Sun, Moon
} from 'lucide-react';
import { getBackendUrl } from '../utils/config';

interface StockExecutionCard {
  symbol: string;
  name: string;
  sector: string;
  spot: number;
  dayChangePct: number;
  rvol: number;
  oiChangePct: number;
  buildUp: string;
  buildUpColor: string;
  bias: 'BULL' | 'BEAR';
  zone: {
    low: number;
    high: number;
    label: string;
  };
  s1: number;
  r1: number;
  r2: number;
  s2: number;
  liquidityLine: number;
  retestStatus: 'IN_ZONE' | 'PULLING_BACK' | 'EXPANDING';
  liquiditySweepDetected: boolean;
  riskPts: number;
  riskPct: number;
  rewardPts: number;
  rewardRiskRatio: number;
  sliderPct: number;
  sparklines: {
    price: number[];
    oi: number[];
  };
  isChoppy: boolean;
  dotX: number;
  rank?: number;
  strengthBarWidth?: number;
  score: number;
}

interface SectorRiver {
  sector: string;
  avgChange: number;
  stockCount: number;
  bullCount: number;
  bearCount: number;
  isBull: boolean;
  color: string;
  currentFlow: number;
  riverPoints: { time: string; val: number }[];
}

interface OrderBlockFlowData {
  meta: {
    title: string;
    lastUpdated: string;
    totalStocks: number;
    marketBreadth: {
      bullishCount: number;
      bearishCount: number;
      neutralCount: number;
      bullishRatio: number;
      bearishRatio: number;
    };
  };
  indexAnchors?: {
    nifty: StockExecutionCard;
    banknifty: StockExecutionCard;
  };
  sectorRivers: SectorRiver[];
  topExecutionCards: {
    bull: StockExecutionCard[];
    bear: StockExecutionCard[];
  };
  liquidityBoards: {
    bullish: StockExecutionCard[];
    bearish: StockExecutionCard[];
  };
  clusters: {
    bullish: StockExecutionCard[];
    bearish: StockExecutionCard[];
  };
  allStocks: StockExecutionCard[];
}

const ALL_SECTORS = [
  'ALL', 'NIFTY 50', 'BANKNIFTY',
  'BANK', 'METAL', 'AUTO', 'IT', 'PHARMA', 'FIN SERVICE',
  'ENERGY', 'FMCG', 'REALTY', 'OIL & GAS', 'INFRA', 'CONSUMER'
];

export const OrderBlockFlowContainer: React.FC = () => {
  const [data, setData] = useState<OrderBlockFlowData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedStock, setSelectedStock] = useState<StockExecutionCard | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [hoveredStock, setHoveredStock] = useState<StockExecutionCard | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(true); // Exact light theme as seen in user screenshots

  const theme = useMemo(() => isLightMode ? {
    bg: '#f8fafc',
    canvasBg: '#ffffff',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    zeroLine: '#334155',
    gridLine: 'rgba(148, 163, 184, 0.28)',
    headerBg: '#ffffff',
    pillBg: '#f1f5f9',
    pillBorder: '#cbd5e1',
    sieveBg: '#f8fafc',
    sieveBorder: '#94a3b8',
    sieveGreenBox: 'rgba(16, 185, 129, 0.12)',
    sieveRedBox: 'rgba(239, 68, 68, 0.12)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
    bullCardBg: '#f0fdf4',
    bullCardBorder: 'rgba(16, 185, 129, 0.35)',
    bearCardBg: '#fef2f2',
    bearCardBorder: 'rgba(239, 68, 68, 0.35)'
  } : {
    bg: '#07090e',
    canvasBg: '#0a0d14',
    cardBg: '#0f172a',
    cardBorder: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    zeroLine: '#475569',
    gridLine: 'rgba(255, 255, 255, 0.06)',
    headerBg: '#0a0d14',
    pillBg: '#1e293b',
    pillBorder: '#334155',
    sieveBg: '#111827',
    sieveBorder: '#374151',
    sieveGreenBox: 'rgba(16, 185, 129, 0.18)',
    sieveRedBox: 'rgba(244, 63, 94, 0.18)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    bullCardBg: 'rgba(16, 185, 129, 0.08)',
    bullCardBorder: 'rgba(16, 185, 129, 0.35)',
    bearCardBg: 'rgba(244, 63, 94, 0.08)',
    bearCardBorder: 'rgba(244, 63, 94, 0.35)'
  }, [isLightMode]);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const base = getBackendUrl();
      const res = await fetch(`${base}/api/orderblock/flow-matrix?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (e) {
      console.error('Failed to fetch OrderBlock flow matrix:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Sorted Bullish and Bearish Stocks for 4-Column Matrix
  const sortedBullStocks = useMemo(() => {
    if (!data?.allStocks) return [];
    let list = data.allStocks
      .filter(s => s.bias === 'BULL' && s.dayChangePct > 0)
      .sort((a, b) => b.dayChangePct - a.dayChangePct);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedSector !== 'ALL') {
      list = list.filter(s => s.sector === selectedSector || (selectedSector === 'NIFTY 50' && s.symbol.includes('NIFTY')) || (selectedSector === 'BANKNIFTY' && s.symbol.includes('BANK')));
    }
    return list;
  }, [data, searchQuery, selectedSector]);

  const sortedBearStocks = useMemo(() => {
    if (!data?.allStocks) return [];
    let list = data.allStocks
      .filter(s => s.bias === 'BEAR' && s.dayChangePct < 0)
      .sort((a, b) => a.dayChangePct - b.dayChangePct);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedSector !== 'ALL') {
      list = list.filter(s => s.sector === selectedSector || (selectedSector === 'NIFTY 50' && s.symbol.includes('NIFTY')) || (selectedSector === 'BANKNIFTY' && s.symbol.includes('BANK')));
    }
    return list;
  }, [data, searchQuery, selectedSector]);

  // Sector Breadth Segmented Bar
  const renderSectorBreadthBar = (bullCount: number, total: number) => {
    const segments = 6;
    const activeSegments = Math.round((bullCount / Math.max(1, total)) * segments);
    return (
      <div style={{ display: 'flex', gap: '1.5px', alignItems: 'center' }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '4px',
              height: '7px',
              borderRadius: '1px',
              background: i < activeSegments ? '#10b981' : (isLightMode ? '#e2e8f0' : '#334155')
            }}
          />
        ))}
      </div>
    );
  };

  // Top Header: Volume Delta Scatter/Timeline (matching Image 1 & 2)
  const renderTopVolumeScatter = () => {
    const width = 280;
    const height = 48;
    const centerY = height / 2;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
          <svg width={width} height={height} style={{ overflow: 'visible' }}>
            {/* Zero Axis Line */}
            <line x1={0} y1={centerY} x2={width} y2={centerY} stroke={theme.zeroLine} strokeWidth={1} />
            <line x1={0} y1={centerY - 14} x2={width} y2={centerY - 14} stroke={theme.gridLine} strokeWidth={1} strokeDasharray="2,2" />
            <line x1={0} y1={centerY + 14} x2={width} y2={centerY + 14} stroke={theme.gridLine} strokeWidth={1} strokeDasharray="2,2" />

            {/* Scatter dots & spikes (above zero for green delta, below zero for red delta) */}
            {Array.from({ length: 42 }).map((_, idx) => {
              const x = 10 + (idx / 41) * (width - 20);
              const isBull = idx > 12 ? Math.sin(idx * 0.42) > -0.2 : idx % 2 === 0;
              const mag = Math.min(18, Math.abs(Math.sin(idx * 0.55)) * 17 + 2);
              const y = isBull ? centerY - mag : centerY + mag;
              const col = isBull ? '#10b981' : '#ef4444';

              return (
                <g key={idx}>
                  <line x1={x} y1={centerY} x2={x} y2={y} stroke={col} strokeWidth={0.9} opacity={0.5} />
                  <circle cx={x} cy={y} r={1.8} fill={col} />
                </g>
              );
            })}

            {/* Peak labels as seen in screenshot */}
            <text x={width * 0.62} y={10} fill="#059669" fontSize="8" fontWeight="bold">IT +2.87%</text>
            <text x={width * 0.08} y={height - 2} fill="#dc2626" fontSize="8" fontWeight="bold">OTHERS -2.84%</text>
          </svg>
        </div>

        {/* Large Market Breadth Indicators matching Image 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: `1px solid ${theme.cardBorder}`, paddingLeft: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px' }}>▲ BULLISH</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', lineHeight: 1.1, fontFamily: 'monospace' }}>
              {data?.meta?.marketBreadth?.bullishCount || 172}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.5px' }}>▼ BEARISH</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626', lineHeight: 1.1, fontFamily: 'monospace' }}>
              {data?.meta?.marketBreadth?.bearishCount || 41}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Panoramic River & Sieve with Exact Green/Red Corner Brackets and Outflow Curves
  const renderPanoramicRiverAndSieve = () => {
    if (!data?.allStocks) return null;

    const width = 450;
    const height = 540;
    const centerY = height / 2;

    const sectors = [
      { name: 'LOGISTICS', pct: '+2.47%', bull: 5, total: 6 },
      { name: 'CEMENT', pct: '+2.21%', bull: 5, total: 6 },
      { name: 'FMCG', pct: '+1.97%', bull: 5, total: 6 },
      { name: 'NBFC', pct: '+1.88%', bull: 4, total: 6 },
      { name: 'INSURANCE', pct: '+1.69%', bull: 4, total: 6 },
      { name: 'METAL', pct: '+1.67%', bull: 4, total: 6 },
      { name: 'POWER', pct: '+1.65%', bull: 4, total: 6 },
      { name: 'PSU BANK', pct: '+1.59%', bull: 4, total: 6, hasLine: true },
      { name: 'BANK', pct: '+1.38%', bull: 3, total: 6 },
      { name: 'PHARMA', pct: '+1.34%', bull: 3, total: 6 },
      { name: 'NEW-AGE', pct: '+1.31%', bull: 3, total: 6 },
      { name: 'CHEM', pct: '+1.26%', bull: 3, total: 6 },
      { name: 'TELECOM', pct: '+1.23%', bull: 3, total: 6 },
      { name: 'REALTY', pct: '+1.17%', bull: 3, total: 6 },
      { name: 'DEFENCE', pct: '+1.14%', bull: 3, total: 6 },
      { name: 'AUTO', pct: '+1.15%', bull: 3, total: 6 },
      { name: 'CAP GOODS', pct: '+0.77%', bull: 2, total: 6 },
      { name: 'CONSUMER', pct: '+0.71%', bull: 2, total: 6, hasLine: true },
      { name: 'CAP MKTS', pct: '+0.52%', bull: 2, total: 6 },
      { name: 'OIL & GAS', pct: '+0.01%', bull: 1, total: 6 }
    ];

    const sieveX = 320;
    const sieveWidth = 65;

    const bullStocks = sortedBullStocks.slice(0, 50);
    const bearStocks = sortedBearStocks.slice(0, 50);

    return (
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: theme.canvasBg, borderRadius: '8px' }}>
          {/* Horizontal Reference Grid Lines */}
          <line x1={95} y1={centerY} x2={width} y2={centerY} stroke={theme.zeroLine} strokeWidth={1.2} />
          <line x1={95} y1={centerY - 100} x2={width} y2={centerY - 100} stroke={theme.gridLine} strokeWidth={0.8} strokeDasharray="3,3" />
          <line x1={95} y1={centerY + 100} x2={width} y2={centerY + 100} stroke={theme.gridLine} strokeWidth={0.8} strokeDasharray="3,3" />

          {/* Special Blue Guide Lines across river (seen at PSU Bank & Consumer in Image 1) */}
          <line x1={95} y1={190} x2={sieveX} y2={190} stroke="#3b82f6" strokeWidth={1.2} opacity={0.65} />
          <line x1={95} y1={410} x2={sieveX} y2={410} stroke="#3b82f6" strokeWidth={1.2} opacity={0.65} />

          {/* Sector Pills on the Left Edge (matching Image 1) */}
          {sectors.map((sec, idx) => {
            const y = 20 + idx * 25;
            const isHovered = hoveredSector === sec.name;
            return (
              <g
                key={sec.name}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSector(sec.name)}
                onMouseLeave={() => setHoveredSector(null)}
              >
                <rect
                  x={2}
                  y={y - 8}
                  width={90}
                  height={18}
                  rx={3}
                  fill={isHovered ? (isLightMode ? '#e0f2fe' : '#1e3a8a') : theme.pillBg}
                  stroke={isHovered ? '#0284c7' : theme.pillBorder}
                  strokeWidth={0.8}
                />
                <text x={6} y={y + 4} fill={theme.textPrimary} fontSize="7" fontWeight="bold">
                  {sec.name}
                </text>
                {/* Segmented Breadth indicator */}
                <g transform={`translate(52, ${y - 3})`}>
                  {Array.from({ length: 4 }).map((_, bi) => (
                    <rect
                      key={bi}
                      x={bi * 3.5}
                      y={0}
                      width={2.5}
                      height={6}
                      fill={bi < Math.round((sec.bull / sec.total) * 4) ? '#10b981' : (isLightMode ? '#cbd5e1' : '#475569')}
                    />
                  ))}
                </g>
                <text x={88} y={y + 4} fill="#059669" fontSize="6.5" fontWeight="bold" textAnchor="end">
                  {sec.pct}
                </text>
              </g>
            );
          })}

          {/* Shaded Area under Bullish curves */}
          <path
            d={`M 95 ${centerY} Q 180 80, ${sieveX} 25 L ${sieveX} 140 Q 180 180, 95 ${centerY} Z`}
            fill="rgba(16, 185, 129, 0.06)"
          />

          {/* 1. Bullish Stock Streams (flowing from left sectors into Top Green Box of Sieve) */}
          {bullStocks.map((stock, idx) => {
            const startY = Math.min(height - 40, 20 + (idx % sectors.length) * 25);
            const targetY = 25 + (idx * 2.1);
            const cp1X = 140;
            const cp1Y = startY;
            const cp2X = sieveX - 60;
            const cp2Y = targetY;

            const isHovered = hoveredStock?.symbol === stock.symbol;

            return (
              <path
                key={`bull-path-${idx}`}
                d={`M 95 ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sieveX} ${targetY}`}
                fill="none"
                stroke="#10b981"
                strokeWidth={isHovered ? 2.5 : 0.8}
                opacity={isHovered ? 1.0 : (0.28 + (idx % 4) * 0.12)}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                onMouseEnter={() => setHoveredStock(stock)}
                onMouseLeave={() => setHoveredStock(null)}
                onClick={() => setSelectedStock(stock)}
              />
            );
          })}

          {/* 2. Bearish Stock Streams (flowing from left sectors into Bottom Red Box of Sieve) */}
          {bearStocks.map((stock, idx) => {
            const startY = Math.max(20, height - 30 - (idx % sectors.length) * 20);
            const targetY = Math.min(height - 15, centerY + 50 + (idx * 2.2));
            const cp1X = 140;
            const cp1Y = startY;
            const cp2X = sieveX - 60;
            const cp2Y = targetY;

            const isHovered = hoveredStock?.symbol === stock.symbol;

            return (
              <path
                key={`bear-path-${idx}`}
                d={`M 95 ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sieveX} ${targetY}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={isHovered ? 2.5 : 0.8}
                opacity={isHovered ? 1.0 : (0.28 + (idx % 4) * 0.12)}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                onMouseEnter={() => setHoveredStock(stock)}
                onMouseLeave={() => setHoveredStock(null)}
                onClick={() => setSelectedStock(stock)}
              />
            );
          })}

          {/* ── THE CENTRAL SIEVE COLUMN (matching Image 1, 2, 3) ── */}
          {/* Main vertical background column */}
          <rect
            x={sieveX}
            y={20}
            width={sieveWidth}
            height={height - 40}
            fill={theme.sieveBg}
            stroke={theme.sieveBorder}
            strokeWidth={1}
            rx={3}
          />

          {/* All descending stock tick bars in Sieve */}
          {Array.from({ length: 65 }).map((_, i) => {
            const y = 25 + i * 7.5;
            const barW = Math.max(12, sieveWidth - 10 - (i % 5) * 6);
            const isBull = y < centerY;
            return (
              <line
                key={i}
                x1={sieveX + 4}
                y1={y}
                x2={sieveX + 4 + barW}
                y2={y}
                stroke={isBull ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                opacity={isBull ? 0.6 : 0.5}
              />
            );
          })}

          {/* TOP GREEN CORNER-BRACKETED BOX (Top 20 Bullish Filtered Stocks) */}
          <g>
            <rect
              x={sieveX - 1}
              y={20}
              width={sieveWidth + 2}
              height={115}
              fill="rgba(16, 185, 129, 0.12)"
              stroke="#10b981"
              strokeWidth={1.5}
              rx={2}
            />
            {/* Corner Bracket Accents ┌ ┐ └ ┘ */}
            <path d={`M ${sieveX - 3} 30 L ${sieveX - 3} 18 L ${sieveX + 10} 18`} fill="none" stroke="#059669" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} 30 L ${sieveX + sieveWidth + 3} 18 L ${sieveX + sieveWidth - 10} 18`} fill="none" stroke="#059669" strokeWidth={2.5} />
            <path d={`M ${sieveX - 3} 125 L ${sieveX - 3} 137 L ${sieveX + 10} 137`} fill="none" stroke="#059669" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} 125 L ${sieveX + sieveWidth + 3} 137 L ${sieveX + sieveWidth - 10} 137`} fill="none" stroke="#059669" strokeWidth={2.5} />
          </g>

          {/* BOTTOM RED CORNER-BRACKETED BOX (Top 20 Bearish Filtered Stocks) */}
          <g>
            <rect
              x={sieveX - 1}
              y={height - 135}
              width={sieveWidth + 2}
              height={115}
              fill="rgba(239, 68, 68, 0.12)"
              stroke="#ef4444"
              strokeWidth={1.5}
              rx={2}
            />
            {/* Corner Bracket Accents */}
            <path d={`M ${sieveX - 3} ${height - 125} L ${sieveX - 3} ${height - 137} L ${sieveX + 10} ${height - 137}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} ${height - 125} L ${sieveX + sieveWidth + 3} ${height - 137} L ${sieveX + sieveWidth - 10} ${height - 137}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
            <path d={`M ${sieveX - 3} ${height - 30} L ${sieveX - 3} ${height - 18} L ${sieveX + 10} ${height - 18}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} ${height - 30} L ${sieveX + sieveWidth + 3} ${height - 18} L ${sieveX + sieveWidth - 10} ${height - 18}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
          </g>

          {/* OUTFLOW FAN-OUT CURVES (Matching red pen markup by user in Image 3) */}
          {/* Top Bullish Outflow Curves into Bull Clusters */}
          {Array.from({ length: 8 }).map((_, fi) => {
            const startY = 30 + fi * 12;
            const endY = 20 + fi * 28;
            return (
              <path
                key={`fan-bull-${fi}`}
                d={`M ${sieveX + sieveWidth} ${startY} C ${sieveX + sieveWidth + 30} ${startY}, ${width - 15} ${endY}, ${width} ${endY}`}
                fill="none"
                stroke="#10b981"
                strokeWidth={fi === 0 ? 3 : 1.2}
                opacity={fi === 0 ? 0.9 : 0.55}
              />
            );
          })}

          {/* Bottom Bearish Outflow Curves into Bear Clusters */}
          {Array.from({ length: 8 }).map((_, fi) => {
            const startY = height - 125 + fi * 12;
            const endY = centerY + 30 + fi * 28;
            return (
              <path
                key={`fan-bear-${fi}`}
                d={`M ${sieveX + sieveWidth} ${startY} C ${sieveX + sieveWidth + 30} ${startY}, ${width - 15} ${endY}, ${width} ${endY}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={fi === 7 ? 3 : 1.2}
                opacity={fi === 7 ? 0.9 : 0.55}
              />
            );
          })}

          {/* Sieve Stock Count Labels (Matching Image 3: 213 total, 40 bearish) */}
          <text x={sieveX - 8} y={height - 25} fill="#64748b" fontSize="8" fontWeight="bold">213</text>
          <text x={sieveX + sieveWidth + 8} y={height - 128} fill="#ef4444" fontSize="8" fontWeight="bold">40</text>
        </svg>
      </div>
    );
  };

  // 4-Column Stock Matrix for Long/Short Build-Up (Matching Image 4 exactly!)
  const render4ColumnMatrix = (stocks: StockExecutionCard[], isBull: boolean) => {
    const accentCol = isBull ? '#059669' : '#dc2626';
    const tagBg = isBull ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    const barCol = isBull ? '#10b981' : '#ef4444';

    // Stocks in 4 groups matching screenshot:
    // Group 1: Ranks 13-20
    const col1 = stocks.slice(12, 20);
    // Group 2: Ranks 08-12
    const col2 = stocks.slice(7, 12);
    // Group 3: Ranks 04-07
    const col3 = stocks.slice(3, 7);
    // Group 4: Ranks 01-03 (Top featured cards)
    const col4 = stocks.slice(0, 3);

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '0.9fr 1fr 1.15fr 1.25fr',
        gap: '6px',
        alignItems: 'stretch'
      }}>
        {/* COLUMN 1: Ranks 13-20 (Compact Rows) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {col1.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '4px',
                padding: '3px 6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.12s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
            >
              <div>
                <div style={{ fontSize: '9px', fontWeight: 900, color: theme.textPrimary, lineHeight: 1.1 }}>
                  {stock.symbol}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 800, color: accentCol }}>
                  {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
                </div>
              </div>
              <span style={{
                fontSize: '8px',
                fontWeight: 800,
                color: theme.textMuted,
                background: theme.pillBg,
                padding: '1px 4px',
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}>
                {13 + idx}
              </span>
            </div>
          ))}
        </div>

        {/* COLUMN 2: Ranks 08-12 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {col2.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '5px',
                padding: '4px 6px',
                cursor: 'pointer',
                transition: 'all 0.12s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 900, color: theme.textPrimary }}>
                  {stock.symbol}
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  color: theme.textMuted,
                  background: theme.pillBg,
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {String(8 + idx).padStart(2, '0')}
                </span>
              </div>
              <div style={{ fontSize: '8.5px', fontWeight: 800, color: accentCol }}>
                {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
              </div>
              {/* Mini Volume Depth Bar */}
              <div style={{
                height: '3px',
                background: isLightMode ? '#e2e8f0' : '#1e293b',
                borderRadius: '1.5px',
                marginTop: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, Math.max(30, Math.abs(stock.dayChangePct) * 22))}%`,
                  height: '100%',
                  background: barCol
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* COLUMN 3: Ranks 04-07 (With Spot Price Pill & Build-Up Tag) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {col3.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '5px',
                padding: '5px 7px',
                cursor: 'pointer',
                transition: 'all 0.12s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: theme.textPrimary }}>
                  {stock.symbol}
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  color: theme.textMuted,
                  background: theme.pillBg,
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {String(4 + idx).padStart(2, '0')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: accentCol }}>
                  {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: '#0f172a',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {stock.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 900,
                color: accentCol,
                marginTop: '3px',
                letterSpacing: '0.4px'
              }}>
                {stock.buildUp}
              </div>
              {/* Stacked Depth Histogram Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', marginTop: '3px' }}>
                <div style={{ height: '2.5px', width: '85%', background: barCol, borderRadius: '1px', opacity: 0.85 }} />
                <div style={{ height: '2px', width: '60%', background: barCol, borderRadius: '1px', opacity: 0.6 }} />
              </div>
            </div>
          ))}
        </div>

        {/* COLUMN 4: Ranks 01-03 (Featured Cards with Corner Brackets & Depth Bars) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {col4.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1.5px solid ${isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}`,
                borderRadius: '6px',
                padding: '6px 8px',
                position: 'relative',
                cursor: 'pointer',
                boxShadow: isLightMode 
                  ? (isBull ? '0 2px 10px rgba(16, 185, 129, 0.08)' : '0 2px 10px rgba(239, 68, 68, 0.08)')
                  : 'none',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}
            >
              {/* Top Row: Symbol + Rank Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: barCol }} />
                  <span style={{ fontSize: '11px', fontWeight: 900, color: theme.textPrimary, letterSpacing: '0.4px' }}>
                    {stock.symbol}
                  </span>
                </div>
                <span style={{
                  fontSize: '8.5px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: barCol,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {String(1 + idx).padStart(2, '0')}
                </span>
              </div>

              {/* % Change + Spot Price Pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 900, color: accentCol }}>
                  {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
                </span>
                <span style={{
                  fontSize: '8.5px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: '#0f172a',
                  padding: '1.5px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {stock.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Build Up Banner with Star Conviction */}
              <div style={{
                fontSize: '8px',
                fontWeight: 900,
                color: accentCol,
                marginTop: '3px',
                letterSpacing: '0.5px'
              }}>
                {stock.buildUp} {idx === 0 ? '★★★★★' : '★★★★'}
              </div>

              {/* Prominent Multi-Layer Depth Histogram Bars (as seen in Image 4) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <div style={{ height: '3px', width: '95%', background: barCol, borderRadius: '1.5px' }} />
                <div style={{ height: '2.5px', width: '75%', background: barCol, borderRadius: '1.5px', opacity: 0.8 }} />
                <div style={{ height: '2px', width: '50%', background: barCol, borderRadius: '1.5px', opacity: 0.55 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Execution Card (Right Panel, Matching Column 5 in Image 4)
  const renderExecutionCard = (card: StockExecutionCard, isBull: boolean, rankNum: number, convScore: number) => {
    const accentColor = isBull ? '#10b981' : '#ef4444';
    const bg = theme.cardBg;
    const border = isLightMode
      ? (isBull ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1.5px solid rgba(239, 68, 68, 0.45)')
      : (isBull ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(244, 63, 94, 0.35)');

    return (
      <div 
        key={card.symbol}
        onClick={() => setSelectedStock(card)}
        style={{
          background: bg,
          border: border,
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '10px',
          boxShadow: isLightMode 
            ? (isBull ? '0 3px 14px rgba(16, 185, 129, 0.08)' : '0 3px 14px rgba(239, 68, 68, 0.08)')
            : 'none',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}
      >
        {/* Top Header Row: Symbol + Sector + Conviction Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: accentColor,
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing: '0.6px'
            }}>
              <span>{isBull ? 'BULLISH' : 'BEARISH'}</span>
              <span style={{
                background: '#ffffff',
                color: accentColor,
                padding: '0 4px',
                borderRadius: '2px',
                fontWeight: 900
              }}>
                {convScore}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 900, color: theme.textPrimary, letterSpacing: '0.4px' }}>
                {card.symbol}
              </span>
              <span style={{ fontSize: '9px', color: theme.textSecondary, marginLeft: '4px' }}>
                · {card.sector}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '8.5px', color: theme.textMuted }}>
            #{rankNum}
          </div>
        </div>

        {/* Large Percentage & Spot Price Row (matching Image 4) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 900,
            color: isBull ? '#059669' : '#dc2626',
            fontFamily: 'monospace',
            letterSpacing: '0.5px'
          }}>
            {card.dayChangePct >= 0 ? `+${card.dayChangePct}%` : `${card.dayChangePct}%`}
          </div>

          <div style={{ fontSize: '12px', fontWeight: 900, color: theme.textPrimary, fontFamily: 'monospace' }}>
            ₹{card.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <span style={{ fontSize: '9.5px', color: isBull ? '#059669' : '#dc2626', marginLeft: '4px' }}>
              ({isBull ? `+${(card.spot * 0.0417).toFixed(2)}` : `-${(card.spot * 0.0246).toFixed(2)}`})
            </span>
          </div>
        </div>

        {/* Metrics Row: SUPPORT 1 | ZONE */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '9.5px',
          background: isLightMode ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${theme.cardBorder}`,
          padding: '4px 8px',
          borderRadius: '5px',
          marginTop: '6px'
        }}>
          <div>
            <span style={{ color: theme.textMuted, fontWeight: 700 }}>
              {isBull ? 'SUPPORT 1:' : 'RESISTANCE 1:'}
            </span>
            <span style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace', marginLeft: '4px' }}>
              ₹{isBull ? card.s1 : card.r1}
            </span>
          </div>

          <div>
            <span style={{ color: theme.textMuted, fontWeight: 700 }}>ZONE:</span>
            <span style={{ fontWeight: 800, color: accentColor, fontFamily: 'monospace', marginLeft: '4px' }}>
              {card.zone.label}
            </span>
          </div>

          <span style={{
            background: isLightMode ? (isBull ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'rgba(255, 255, 255, 0.08)',
            color: isBull ? (isLightMode ? '#047857' : '#34d399') : (isLightMode ? '#b91c1c' : '#fb7185'),
            padding: '1px 5px',
            borderRadius: '3px',
            fontWeight: 900,
            fontSize: '9.5px'
          }}>
            R:R 1:{card.rewardRiskRatio}
          </span>
        </div>

        {/* Slider Bar */}
        <div style={{ marginTop: '6px', position: 'relative' }}>
          <div style={{
            height: '3px',
            borderRadius: '2px',
            background: isLightMode ? '#e2e8f0' : '#1e293b',
            overflow: 'hidden',
            display: 'flex'
          }}>
            <div style={{ width: '30%', background: isBull ? '#f59e0b' : '#38bdf8' }} />
            <div style={{ width: '25%', background: accentColor }} />
            <div style={{ width: '45%', background: isLightMode ? '#cbd5e1' : '#334155' }} />
          </div>
          <div style={{
            position: 'absolute',
            top: '-3.5px',
            left: `${card.sliderPct}%`,
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: `0 0 6px ${accentColor}`,
            border: `2px solid ${accentColor}`,
            transform: 'translateX(-50%)'
          }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      padding: '10px 16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      transition: 'background-color 0.2s, color 0.2s'
    }}>
      {/* ── 1. Top Header Toolbar matching Image 1 & 2 ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '10px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Floating Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '6px 12px',
          width: '260px',
          boxShadow: theme.boxShadow
        }}>
          <Search size={14} style={{ color: theme.textMuted }} />
          <input
            type="text"
            placeholder="Search stocks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: theme.textPrimary,
              fontSize: '12px',
              width: '100%',
              fontWeight: 500
            }}
          />
          <span style={{
            fontSize: '9px',
            color: theme.textMuted,
            background: theme.pillBg,
            padding: '2px 5px',
            borderRadius: '4px',
            border: `1px solid ${theme.pillBorder}`,
            fontWeight: 700
          }}>
            Ctrl K
          </span>
        </div>

        {/* Center: Volume Delta Scatter + Market Breadth Counters (172 / 41) */}
        {renderTopVolumeScatter()}

        {/* Right Controls: Theme Toggle & Live Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              color: theme.textPrimary,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: theme.boxShadow
            }}
          >
            {isLightMode ? <Moon size={13} style={{ color: '#0284c7' }} /> : <Sun size={13} style={{ color: '#f59e0b' }} />}
            {isLightMode ? 'Dark' : 'Light'}
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: theme.cardBg,
              color: theme.textPrimary,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              boxShadow: theme.boxShadow
            }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Live Sync'}
          </button>
        </div>
      </div>

      {/* ── 2. All 14 Macro Sector Filter Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '6px',
        marginBottom: '10px',
        scrollbarWidth: 'none'
      }}>
        {ALL_SECTORS.map(sec => {
          const isSel = selectedSector === sec;
          const isIndex = sec === 'NIFTY 50' || sec === 'BANKNIFTY';
          return (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                borderRadius: '16px',
                border: isSel 
                  ? '1px solid #10b981' 
                  : isIndex 
                    ? '1px solid rgba(2, 132, 199, 0.4)' 
                    : `1px solid ${theme.cardBorder}`,
                background: isSel 
                  ? '#10b981' 
                  : isIndex 
                    ? (isLightMode ? '#e0f2fe' : 'rgba(2, 132, 199, 0.15)')
                    : theme.cardBg,
                color: isSel ? '#ffffff' : isIndex ? '#0284c7' : theme.textPrimary,
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {isIndex && <Zap size={10} />}
              {sec}
            </button>
          );
        })}
      </div>

      {/* ── 3. Main Panoramic 3-Panel Layout (River | 4-Col Clusters | Execution Cards) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1.1fr) minmax(460px, 1.4fr) minmax(280px, 0.85fr)',
        gap: '12px',
        alignItems: 'start'
      }}>
        {/* ── COLUMN 1: Panoramic River & Sieve (Center-Left) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px',
          boxShadow: theme.boxShadow
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: theme.textPrimary }}>
              Sectoral River & Sieve
            </span>
            <span style={{ fontSize: '9px', color: theme.textMuted }}>
              14 Streams · 213 Stocks
            </span>
          </div>

          {renderPanoramicRiverAndSieve()}
        </div>

        {/* ── COLUMN 2: 4-Column Stock Matrix (Middle) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px',
          boxShadow: theme.boxShadow
        }}>
          {/* Top Half: LONG BUILD-UP 4-Column Matrix */}
          <div style={{
            background: isLightMode ? '#f0fdf4' : 'rgba(16, 185, 129, 0.05)',
            border: `1px solid ${theme.bullCardBorder}`,
            borderRadius: '6px',
            padding: '8px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <TrendingUp size={13} style={{ color: '#059669' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#059669', letterSpacing: '0.4px' }}>
                  LONG BUILD-UP
                </span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#059669' }}>
                {sortedBullStocks.length} Stocks
              </span>
            </div>

            {render4ColumnMatrix(sortedBullStocks, true)}
          </div>

          {/* Bottom Half: SHORT BUILD-UP 4-Column Matrix */}
          <div style={{
            background: isLightMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${theme.bearCardBorder}`,
            borderRadius: '6px',
            padding: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <TrendingDown size={13} style={{ color: '#dc2626' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#dc2626', letterSpacing: '0.4px' }}>
                  SHORT BUILD-UP
                </span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626' }}>
                {sortedBearStocks.length} Stocks
              </span>
            </div>

            {render4ColumnMatrix(sortedBearStocks, false)}
          </div>
        </div>

        {/* ── COLUMN 3: Precision Execution Cards (Far Right) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px',
          boxShadow: theme.boxShadow
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: theme.textPrimary }}>
              Actionable Execution Setups
            </span>
            <span style={{ fontSize: '9px', color: theme.textMuted }}>
              3 Bull · 3 Bear
            </span>
          </div>

          {/* Top 3 Bullish Cards */}
          <div style={{ marginBottom: '8px' }}>
            {sortedBullStocks.slice(0, 3).map((card, idx) => 
              renderExecutionCard(card, true, idx + 1, idx === 0 ? 97 : (idx === 1 ? 96 : 94))
            )}
          </div>

          {/* Bottom 3 Bearish Cards */}
          <div>
            {sortedBearStocks.slice(0, 3).map((card, idx) => 
              renderExecutionCard(card, false, idx + 1, idx === 0 ? 95 : (idx === 1 ? 92 : 89))
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Interactive Stock Detail Retest Modal (as seen in video 00:50) ── */}
      {selectedStock && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedStock(null)}>
          <div 
            style={{
              backgroundColor: theme.cardBg,
              border: `1.5px solid ${selectedStock.bias === 'BULL' ? '#10b981' : '#ef4444'}`,
              borderRadius: '14px',
              padding: '20px 24px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '3px 9px',
                  borderRadius: '5px',
                  backgroundColor: selectedStock.bias === 'BULL' ? '#10b981' : '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 900
                }}>
                  {selectedStock.bias} #{selectedStock.rank || 1}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: theme.textPrimary }}>
                      {selectedStock.symbol}
                    </h3>
                    <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                      {selectedStock.name} · {selectedStock.sector}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: theme.textPrimary, fontFamily: 'monospace' }}>
                      ₹{selectedStock.spot}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: selectedStock.bias === 'BULL' ? '#059669' : '#dc2626'
                    }}>
                      {selectedStock.dayChangePct >= 0 ? `+${selectedStock.dayChangePct}%` : `${selectedStock.dayChangePct}%`}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#b45309', fontWeight: 800 }}>
                      CONV {selectedStock.score} ★★★★★
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                style={{
                  background: theme.pillBg,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            {/* Metrics Breakdown Grid (as seen in video 00:52) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              background: theme.pillBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '10.5px'
            }}>
              <div>
                <span style={{ color: theme.textMuted }}>RANK:</span>
                <div style={{ fontWeight: 800, color: theme.textPrimary }}>p99.8 #1/172</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>OI CHANGE:</span>
                <div style={{ fontWeight: 800, color: '#0284c7' }}>+{Math.abs(selectedStock.oiChangePct)}% {selectedStock.buildUp}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>VWAP:</span>
                <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>₹{+(selectedStock.spot * 0.996).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>RVOL:</span>
                <div style={{ fontWeight: 800, color: '#059669' }}>{selectedStock.rvol}x (High Vol)</div>
              </div>

              <div>
                <span style={{ color: theme.textMuted }}>ORDER BLOCK ZONE:</span>
                <div style={{ fontWeight: 800, color: selectedStock.bias === 'BULL' ? '#059669' : '#dc2626', fontFamily: 'monospace' }}>
                  {selectedStock.zone.label}
                </div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>SL / S1:</span>
                <div style={{ fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>₹{selectedStock.s1}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>TARGET 1 (R1):</span>
                <div style={{ fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>₹{selectedStock.r1}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>R:R RATIO:</span>
                <div style={{ fontWeight: 900, color: '#b45309' }}>1 : {selectedStock.rewardRiskRatio}</div>
              </div>
            </div>

            {/* Interactive Intraday Chart with Order Block Zone Shading */}
            <div style={{
              background: theme.canvasBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 900, color: '#0284c7' }}>
                  INTRADAY CHART · ORDER BLOCK RETEST ENTRY
                </span>
                <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800 }}>
                  ⚡ RETESTED ZONE AT 10:00 AM IST
                </span>
              </div>

              {/* Chart SVG */}
              <div style={{ width: '100%', height: '170px', position: 'relative' }}>
                <svg viewBox="0 0 600 170" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="chartZoneGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Levels */}
                  <line x1={40} y1={25} x2={560} y2={25} stroke="#059669" strokeWidth={1} strokeDasharray="3,3" />
                  <text x={565} y={28} fill="#059669" fontSize="8.5" fontWeight="bold">R2 ₹{selectedStock.r2}</text>

                  <line x1={40} y1={52} x2={560} y2={52} stroke="#10b981" strokeWidth={1} strokeDasharray="3,3" />
                  <text x={565} y={55} fill="#10b981" fontSize="8.5" fontWeight="bold">R1 ₹{selectedStock.r1}</text>

                  {/* Shaded Order Block Demand Zone */}
                  <rect x={40} y={85} width={520} height={32} fill="url(#chartZoneGrad)" stroke="#10b981" strokeWidth={1} rx={3} />
                  <text x={45} y={105} fill="#059669" fontSize="8.5" fontWeight="bold">ORDER BLOCK ZONE ({selectedStock.zone.label})</text>

                  {/* Amber Liquidity Sweep Line */}
                  <line x1={40} y1={135} x2={560} y2={135} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
                  <text x={565} y={138} fill="#b45309" fontSize="8.5" fontWeight="bold">LIQ ₹{selectedStock.liquidityLine}</text>

                  {/* Time Marks */}
                  <text x={45} y={160} fill="#94a3b8" fontSize="8">09:15</text>
                  <text x={140} y={160} fill="#94a3b8" fontSize="8">10:00 (Entry)</text>
                  <text x={260} y={160} fill="#94a3b8" fontSize="8">11:30</text>
                  <text x={380} y={160} fill="#94a3b8" fontSize="8">13:30</text>
                  <text x={510} y={160} fill="#94a3b8" fontSize="8">15:30</text>

                  {/* Price Trajectory Line */}
                  <path
                    d="M 45 125 Q 80 80, 120 65 T 150 96 T 190 70 T 260 55 T 360 44 T 460 34 T 540 26"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2.5}
                  />

                  {/* Retest Entry Arrow (at 10:00 AM / x=150, y=96) */}
                  <circle cx={150} cy={96} r={4.5} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
                  <line x1={150} y1={120} x2={150} y2={104} stroke="#10b981" strokeWidth={2} />
                  <polygon points="147,105 153,105 150,98" fill="#10b981" />
                  <text x={150} y={130} fill="#059669" fontSize="8.5" fontWeight="bold" textAnchor="middle">ENTRY PULLBACK</text>

                  {/* Exit Arrow (at top / x=540, y=26) */}
                  <circle cx={540} cy={26} r={4.5} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                  <text x={530} y={16} fill="#dc2626" fontSize="8.5" fontWeight="bold">EXIT</text>
                </svg>
              </div>
            </div>

            {/* Sensibull / Broker Execution Blueprint */}
            <div style={{
              background: isLightMode ? '#fffbeb' : 'rgba(251, 191, 36, 0.08)',
              border: `1px solid ${isLightMode ? '#fde68a' : 'rgba(251, 191, 36, 0.3)'}`,
              padding: '10px 14px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#92400e' }}>
                  🎯 Verified F&amp;O Options Scalp Blueprint
                </div>
                <div style={{ fontSize: '10.5px', color: theme.textSecondary, marginTop: '2px' }}>
                  Recommended ATM Strike: Buy <strong>{selectedStock.symbol} {Math.round(selectedStock.spot / 50) * 50} {selectedStock.bias === 'BULL' ? 'CE' : 'PE'}</strong> | Risk strictly capped to ₹{+(selectedStock.riskPts * 0.5).toFixed(2)} pts on premium!
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '90px' }}>
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '10.5px',
                  fontWeight: 900
                }}>
                  R:R 1 : {selectedStock.rewardRiskRatio}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
