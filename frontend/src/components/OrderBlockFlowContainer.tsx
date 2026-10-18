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
  const [isLightMode, setIsLightMode] = useState<boolean>(true); // Default to clean light mode seen in screenshot
  const [activeTab, setActiveTab] = useState<'FLOW' | 'XRAY' | 'BOARDS' | 'COACHING'>('FLOW');
  const [selectedVideo, setSelectedVideo] = useState<number>(0);

  // Modern Theme Definition matching order-block.com
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
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    bullCardBg: '#f0fdf4',
    bullCardBorder: 'rgba(16, 185, 129, 0.35)',
    bullGlow: '0 4px 16px rgba(16, 185, 129, 0.1)',
    bearCardBg: '#fef2f2',
    bearCardBorder: 'rgba(239, 68, 68, 0.35)',
    bearGlow: '0 4px 16px rgba(239, 68, 68, 0.1)'
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
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    bullCardBg: 'rgba(16, 185, 129, 0.08)',
    bullCardBorder: 'rgba(16, 185, 129, 0.35)',
    bullGlow: '0 4px 20px rgba(16, 185, 129, 0.15)',
    bearCardBg: 'rgba(244, 63, 94, 0.08)',
    bearCardBorder: 'rgba(244, 63, 94, 0.35)',
    bearGlow: '0 4px 20px rgba(244, 63, 94, 0.15)'
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

  // Filtered stocks for clusters
  const filteredBullClusters = useMemo(() => {
    if (!data) return [];
    let list = [...data.topExecutionCards.bull, ...data.clusters.bullish];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedSector !== 'ALL') {
      list = list.filter(s => s.sector === selectedSector || (selectedSector === 'NIFTY 50' && s.symbol.includes('NIFTY')) || (selectedSector === 'BANKNIFTY' && s.symbol.includes('BANK')));
    }
    return list;
  }, [data, searchQuery, selectedSector]);

  const filteredBearClusters = useMemo(() => {
    if (!data) return [];
    let list = [...data.topExecutionCards.bear, ...data.clusters.bearish];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedSector !== 'ALL') {
      list = list.filter(s => s.sector === selectedSector || (selectedSector === 'NIFTY 50' && s.symbol.includes('NIFTY')) || (selectedSector === 'BANKNIFTY' && s.symbol.includes('BANK')));
    }
    return list;
  }, [data, searchQuery, selectedSector]);

  // Top Volume Delta Timeline Histogram (seen at top of video)
  const renderTopVolumeDeltaTimeline = () => {
    const bars = 38;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '24px',
        padding: '2px 8px',
        background: isLightMode ? '#f1f5f9' : '#070a12',
        borderRadius: '6px',
        border: `1px solid ${theme.cardBorder}`
      }}>
        <span style={{ fontSize: '9px', fontWeight: 900, color: '#0284c7', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
          INTRA-DAY FLOW
        </span>
        <div style={{ display: 'flex', alignItems: 'center', height: '18px', gap: '2px', width: '130px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '9px', left: 0, right: 0, height: '1px', background: isLightMode ? '#cbd5e1' : '#334155' }} />
          {Array.from({ length: bars }).map((_, idx) => {
            const isBull = idx > 10 ? Math.sin(idx * 0.45) > -0.15 : idx % 2 === 0;
            const heightPct = Math.min(100, Math.max(25, Math.abs(Math.sin(idx * 0.55)) * 85));
            const col = isBull ? '#10b981' : '#f43f5e';
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: isBull ? 'flex-end' : 'flex-start',
                  height: '100%',
                  zIndex: 1
                }}
              >
                <div style={{
                  width: '100%',
                  height: `${heightPct / 2}%`,
                  background: col,
                  borderRadius: '1px',
                  opacity: 0.9
                }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Dual Sparkline SVG
  const renderDualSparkline = (priceData: number[], oiData: number[], isBull: boolean) => {
    const width = 140;
    const height = 36;
    const padding = 4;

    const minP = Math.min(...priceData);
    const maxP = Math.max(...priceData);
    const rangeP = Math.max(0.1, maxP - minP);

    const minOi = Math.min(...oiData);
    const maxOi = Math.max(...oiData);
    const rangeOi = Math.max(0.1, maxOi - minOi);

    const pPoints = priceData.map((val, idx) => {
      const x = padding + (idx / (priceData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - minP) / rangeP) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const oiPoints = oiData.map((val, idx) => {
      const x = padding + (idx / (oiData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - minOi) / rangeOi) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = isBull ? '#10b981' : '#f43f5e';
    const oiColor = isBull ? '#0284c7' : '#d97706';

    return (
      <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={isLightMode ? '#e2e8f0' : '#1e293b'} strokeDasharray="2,2" />
          <polyline
            fill="none"
            stroke={oiColor}
            strokeWidth="1.2"
            strokeDasharray="2,2"
            points={oiPoints}
            opacity={0.7}
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.0"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pPoints}
          />
          {priceData.length > 0 && (() => {
            const lastVal = priceData[priceData.length - 1];
            const endY = height - padding - ((lastVal - minP) / rangeP) * (height - 2 * padding);
            return (
              <circle
                cx={width - padding}
                cy={endY}
                r={2.5}
                fill={strokeColor}
                stroke={isLightMode ? '#ffffff' : '#0f172a'}
                strokeWidth={1.5}
              />
            );
          })()}
        </svg>
      </div>
    );
  };

  // Benchmark Index Anchor Card (NIFTY & BANKNIFTY)
  const renderIndexAnchorCard = (card: StockExecutionCard) => {
    const isBull = card.dayChangePct >= 0;
    const accentColor = isBull ? '#10b981' : '#f43f5e';

    return (
      <div
        key={card.symbol}
        onClick={() => setSelectedStock(card)}
        style={{
          background: isLightMode 
            ? (isBull ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' : 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)')
            : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: `1.5px solid ${accentColor}60`,
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: isLightMode ? `0 2px 12px ${accentColor}15` : `0 4px 20px ${accentColor}20`,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = `${accentColor}60`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: accentColor,
              color: '#ffffff',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 900
            }}>
              BENCHMARK
            </span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: theme.textPrimary }}>
              {card.symbol}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: theme.textPrimary, fontFamily: 'monospace' }}>
              ₹{card.spot}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: accentColor }}>
              {card.dayChangePct >= 0 ? `+${card.dayChangePct}%` : `${card.dayChangePct}%`}
            </span>
          </div>

          <div style={{
            fontSize: '10px',
            fontWeight: 800,
            color: isLightMode ? '#b45309' : '#fbbf24',
            background: isLightMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(251, 191, 36, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: `1px solid ${isLightMode ? '#f59e0b' : 'rgba(251, 191, 36, 0.3)'}`
          }}>
            🛡️ LIQ SWEEP: ₹{card.liquidityLine}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '8px', alignItems: 'center', fontSize: '10.5px' }}>
          <div>
            <span style={{ color: theme.textMuted }}>ZONE:</span>
            <div style={{ fontWeight: 800, color: accentColor, fontFamily: 'monospace' }}>{card.zone.label}</div>
          </div>
          <div>
            <span style={{ color: '#f43f5e' }}>SL (S1):</span>
            <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>₹{card.s1}</div>
          </div>
          <div>
            <span style={{ color: '#10b981' }}>TARGET (R1):</span>
            <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>₹{card.r1}</div>
          </div>
          <div>
            <span style={{ color: '#0284c7' }}>RUNNER (R2):</span>
            <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>₹{card.r2}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: isLightMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.2)',
              color: isLightMode ? '#047857' : '#34d399',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 900,
              fontSize: '11px'
            }}>
              R:R 1 : {card.rewardRiskRatio}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Execution Card (3 BULL, 3 BEAR exactly as in video 00:42)
  const renderExecutionCard = (card: StockExecutionCard, isBull: boolean) => {
    const accentColor = isBull ? '#10b981' : '#ef4444';
    const bg = isLightMode 
      ? (isBull ? '#ffffff' : '#ffffff')
      : (isBull ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)');
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
            ? (isBull ? '0 4px 16px rgba(16, 185, 129, 0.08)' : '0 4px 16px rgba(239, 68, 68, 0.08)')
            : (isBull ? '0 4px 20px rgba(16, 185, 129, 0.06)' : '0 4px 20px rgba(244, 63, 94, 0.06)'),
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.borderColor = accentColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.borderColor = isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: accentColor,
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.8px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
              {card.bias}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 900, color: theme.textPrimary, letterSpacing: '0.5px' }}>
                  {card.symbol}
                </span>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: isBull ? '#059669' : '#dc2626'
                }}>
                  {card.dayChangePct >= 0 ? `+${card.dayChangePct}%` : `${card.dayChangePct}%`}
                </span>
              </div>
              <div style={{ fontSize: '9.5px', color: theme.textSecondary }}>
                {card.sector} · ₹{card.spot}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {renderDualSparkline(card.sparklines.price, card.sparklines.oi, isBull)}
          </div>
        </div>

        {/* Metrics Row: ZONE | S1 | R1 | R2 | RISK | R:R */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.9fr 0.9fr 0.9fr 1fr',
          gap: '6px',
          fontSize: '9.5px',
          alignItems: 'center',
          background: isLightMode ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${theme.cardBorder}`,
          padding: '5px 8px',
          borderRadius: '6px',
          marginTop: '6px'
        }}>
          <div>
            <span style={{ color: theme.textMuted, fontWeight: 700 }}>ZONE:</span>
            <div style={{ fontWeight: 800, color: accentColor, fontFamily: 'monospace' }}>
              {card.zone.label}
            </div>
          </div>

          <div>
            <span style={{ color: isBull ? '#b45309' : '#dc2626', fontWeight: 700 }}>
              {isBull ? 'S1 (SL):' : 'R1 (SL):'}
            </span>
            <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>
              ₹{isBull ? card.s1 : card.r1}
            </div>
          </div>

          <div>
            <span style={{ color: isBull ? '#059669' : '#0284c7', fontWeight: 700 }}>
              {isBull ? 'R1 (T1):' : 'S1 (T1):'}
            </span>
            <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>
              ₹{isBull ? card.r1 : card.s1}
            </div>
          </div>

          <div>
            <span style={{ color: isBull ? '#047857' : '#0369a1', fontWeight: 700 }}>
              {isBull ? 'R2 (T2):' : 'S2 (T2):'}
            </span>
            <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>
              ₹{isBull ? card.r2 : card.s2}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: isLightMode ? (isBull ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'rgba(255, 255, 255, 0.08)',
              color: isBull ? (isLightMode ? '#047857' : '#34d399') : (isLightMode ? '#b91c1c' : '#fb7185'),
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '10px'
            }}>
              R:R 1 : {card.rewardRiskRatio}
            </span>
          </div>
        </div>

        {/* Visual Slider Bar matching video */}
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

  // Full Panoramic Sankey River & Sieve Canvas (as seen in screenshot media_1792292364506_890d91f2.png)
  const renderPanoramicRiverAndSieve = () => {
    if (!data?.allStocks) return null;

    const width = 520;
    const height = 480;
    const centerY = height / 2; // zero axis (0.0%)

    // Grid levels from +3% down to -3%
    const gridLevels = [
      { pct: 3.0, y: centerY - 150, label: '+3.0%' },
      { pct: 2.0, y: centerY - 100, label: '+2.0%' },
      { pct: 1.0, y: centerY - 50, label: '+1.0%' },
      { pct: 0.0, y: centerY, label: '0.0%', isZero: true },
      { pct: -1.0, y: centerY + 50, label: '-1.0%' },
      { pct: -2.0, y: centerY + 100, label: '-2.0%' },
      { pct: -3.0, y: centerY + 150, label: '-3.0%' }
    ];

    const sectors = [
      'BANK', 'METAL', 'AUTO', 'IT', 'PHARMA', 'FIN SERVICE',
      'ENERGY', 'FMCG', 'REALTY', 'OIL & GAS', 'INFRA', 'CONSUMER'
    ];

    const sieveX = 390;
    const sieveWidth = 24;

    // Separate stocks into bull and bear
    const bullStocks = data.allStocks.filter(s => s.dayChangePct >= 0).slice(0, 50);
    const bearStocks = data.allStocks.filter(s => s.dayChangePct < 0).slice(0, 50);

    return (
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: theme.canvasBg, borderRadius: '8px' }}>
          {/* Horizontal Grid lines */}
          {gridLevels.map((lvl, idx) => (
            <g key={idx}>
              <line
                x1={80}
                y1={lvl.y}
                x2={width - 10}
                y2={lvl.y}
                stroke={lvl.isZero ? theme.zeroLine : theme.gridLine}
                strokeWidth={lvl.isZero ? 1.5 : 1}
                strokeDasharray={lvl.isZero ? 'none' : '3,3'}
              />
              <text
                x={75}
                y={lvl.y + 3}
                fill={lvl.isZero ? theme.textPrimary : theme.textMuted}
                fontSize="8"
                fontWeight={lvl.isZero ? 'bold' : 'normal'}
                textAnchor="end"
              >
                {lvl.label}
              </text>
            </g>
          ))}

          {/* Vertical Sieve Frame in the center */}
          <g>
            <rect
              x={sieveX}
              y={30}
              width={sieveWidth}
              height={height - 60}
              fill={theme.sieveBg}
              stroke={theme.sieveBorder}
              strokeWidth={1.5}
              rx={3}
            />
            {/* Top Sieve Bracket (Bullish funnel) */}
            <path
              d={`M ${sieveX} 30 L ${sieveX + sieveWidth} 30 L ${sieveX + sieveWidth + 30} 80 L ${sieveX} 140 Z`}
              fill="rgba(16, 185, 129, 0.08)"
              stroke="rgba(16, 185, 129, 0.4)"
              strokeWidth={1}
            />
            {/* Bottom Sieve Bracket (Bearish funnel) */}
            <path
              d={`M ${sieveX} ${height - 30} L ${sieveX + sieveWidth} ${height - 30} L ${sieveX + sieveWidth + 30} ${height - 80} L ${sieveX} ${centerY + 20} Z`}
              fill="rgba(239, 68, 68, 0.08)"
              stroke="rgba(239, 68, 68, 0.4)"
              strokeWidth={1}
            />
          </g>

          {/* Sector Anchors on the left */}
          {sectors.map((sec, idx) => {
            const secY = 45 + idx * 34;
            const isHovered = hoveredSector === sec;
            return (
              <g
                key={sec}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSector(sec)}
                onMouseLeave={() => setHoveredSector(null)}
              >
                <rect
                  x={8}
                  y={secY - 9}
                  width={62}
                  height={18}
                  rx={4}
                  fill={isHovered ? '#10b981' : theme.pillBg}
                  stroke={isHovered ? '#059669' : theme.pillBorder}
                  strokeWidth={1}
                />
                <text
                  x={39}
                  y={secY + 3}
                  fill={isHovered ? '#ffffff' : theme.textPrimary}
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {sec}
                </text>
              </g>
            );
          })}

          {/* Bezier River Flow Lines (Hundreds of delicate stock stream lines) */}
          {/* 1. Bullish Stock Streams (curving UP into the top of the Sieve) */}
          {bullStocks.map((stock, idx) => {
            const secIdx = sectors.indexOf(stock.sector);
            const startY = secIdx >= 0 ? (45 + secIdx * 34) : centerY;
            const startX = 72;

            // Target in Sieve (sorted by % change)
            const targetY = Math.max(35, centerY - 15 - (stock.dayChangePct * 26) - (idx * 1.8));

            const cp1X = startX + 90;
            const cp1Y = startY;
            const cp2X = sieveX - 80;
            const cp2Y = targetY;

            const isHovered = hoveredStock?.symbol === stock.symbol || hoveredSector === stock.sector;

            return (
              <g key={`bull-${stock.symbol}-${idx}`}>
                <path
                  d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sieveX} ${targetY}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={isHovered ? 2.5 : 0.85}
                  opacity={isHovered ? 1.0 : (0.28 + (idx % 3) * 0.1)}
                  strokeLinecap="round"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    filter: isHovered ? 'drop-shadow(0 0 4px #10b981)' : 'none'
                  }}
                  onMouseEnter={() => setHoveredStock(stock)}
                  onMouseLeave={() => setHoveredStock(null)}
                  onClick={() => setSelectedStock(stock)}
                />
                {/* Horizontal tick in Sieve */}
                <line
                  x1={sieveX}
                  y1={targetY}
                  x2={sieveX + sieveWidth}
                  y2={targetY}
                  stroke="#10b981"
                  strokeWidth={1.2}
                  opacity={0.7}
                />
              </g>
            );
          })}

          {/* 2. Bearish Stock Streams (curving DOWN into the bottom of the Sieve) */}
          {bearStocks.map((stock, idx) => {
            const secIdx = sectors.indexOf(stock.sector);
            const startY = secIdx >= 0 ? (45 + secIdx * 34) : centerY;
            const startX = 72;

            // Target in Sieve (sorted by % change negative)
            const targetY = Math.min(height - 35, centerY + 15 + (Math.abs(stock.dayChangePct) * 26) + (idx * 1.8));

            const cp1X = startX + 90;
            const cp1Y = startY;
            const cp2X = sieveX - 80;
            const cp2Y = targetY;

            const isHovered = hoveredStock?.symbol === stock.symbol || hoveredSector === stock.sector;

            return (
              <g key={`bear-${stock.symbol}-${idx}`}>
                <path
                  d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sieveX} ${targetY}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={isHovered ? 2.5 : 0.85}
                  opacity={isHovered ? 1.0 : (0.28 + (idx % 3) * 0.1)}
                  strokeLinecap="round"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    filter: isHovered ? 'drop-shadow(0 0 4px #ef4444)' : 'none'
                  }}
                  onMouseEnter={() => setHoveredStock(stock)}
                  onMouseLeave={() => setHoveredStock(null)}
                  onClick={() => setSelectedStock(stock)}
                />
                {/* Horizontal tick in Sieve */}
                <line
                  x1={sieveX}
                  y1={targetY}
                  x2={sieveX + sieveWidth}
                  y2={targetY}
                  stroke="#ef4444"
                  strokeWidth={1.2}
                  opacity={0.7}
                />
              </g>
            );
          })}

          {/* Outflow ribbons fanning out from Sieve to right edge (toward Clusters) */}
          {/* Bullish outflow */}
          <path
            d={`M ${sieveX + sieveWidth} 75 C ${sieveX + sieveWidth + 40} 75, ${width - 30} 50, ${width} 50`}
            fill="none"
            stroke="#10b981"
            strokeWidth={3}
            opacity={0.7}
          />
          <path
            d={`M ${sieveX + sieveWidth} 110 C ${sieveX + sieveWidth + 40} 110, ${width - 30} 120, ${width} 120`}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            opacity={0.5}
          />

          {/* Bearish outflow */}
          <path
            d={`M ${sieveX + sieveWidth} ${height - 75} C ${sieveX + sieveWidth + 40} ${height - 75}, ${width - 30} ${height - 50}, ${width} ${height - 50}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth={3}
            opacity={0.7}
          />
          <path
            d={`M ${sieveX + sieveWidth} ${height - 110} C ${sieveX + sieveWidth + 40} ${height - 110}, ${width - 30} ${height - 120}, ${width} ${height - 120}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
            opacity={0.5}
          />
        </svg>

        {/* Hover Tooltip */}
        {hoveredStock && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '80px',
            background: isLightMode ? '#0f172a' : '#1e293b',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <span>{hoveredStock.symbol}</span>
            <span style={{ color: hoveredStock.dayChangePct >= 0 ? '#34d399' : '#fb7185' }}>
              {hoveredStock.dayChangePct >= 0 ? `+${hoveredStock.dayChangePct}%` : `${hoveredStock.dayChangePct}%`}
            </span>
            <span style={{ color: '#94a3b8' }}>{hoveredStock.sector}</span>
            <span style={{ color: '#fbbf24' }}>₹{hoveredStock.spot}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      padding: '12px 18px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      transition: 'background-color 0.2s, color 0.2s'
    }}>
      {/* ── 1. Top Header Toolbar matching order-block.com ── */}
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
          width: '280px',
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
            fontSize: '9.5px',
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

        {/* Center: Volume Delta Timeline + Market Breadth Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {renderTopVolumeDeltaTimeline()}

          {/* Market Breadth Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: isLightMode ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 900,
              color: '#059669'
            }}>
              <span>▲ BULLISH</span>
              <span>{data?.meta?.marketBreadth?.bullishCount || 172}</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: isLightMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 900,
              color: '#dc2626'
            }}>
              <span>▼ BEARISH</span>
              <span>{data?.meta?.marketBreadth?.bearishCount || 41}</span>
            </div>
          </div>
        </div>

        {/* Right Controls: Theme Toggle & Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Light / Dark Mode Switcher */}
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

      {/* ── 2. All 14 Macro Sector & Benchmark Index Streams Filter Bar ── */}
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
                fontSize: '10.5px',
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

      {/* ── 3. Benchmark Index Anchors (NIFTY 50 & BANKNIFTY) ── */}
      {data?.indexAnchors && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '12px'
        }}>
          {data.indexAnchors.nifty && renderIndexAnchorCard(data.indexAnchors.nifty)}
          {data.indexAnchors.banknifty && renderIndexAnchorCard(data.indexAnchors.banknifty)}
        </div>
      )}

      {/* ── 4. Main Panoramic Layout matching the screenshot (media_1792292364506_890d91f2.png) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(400px, 1.25fr) minmax(360px, 1.15fr) minmax(340px, 1.05fr)',
        gap: '14px',
        alignItems: 'start'
      }}>
        {/* ── COLUMN 1: Macro Money-Flow River & Sieve (Left) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '10px',
          padding: '12px',
          boxShadow: theme.boxShadow
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '12px', fontWeight: 900, color: theme.textPrimary }}>
                Sectoral River & Sieve
              </span>
            </div>
            <span style={{ fontSize: '10px', color: theme.textMuted }}>
              14 Streams · 222 F&O Stocks
            </span>
          </div>

          {renderPanoramicRiverAndSieve()}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.pillBg,
            padding: '6px 10px',
            borderRadius: '6px',
            marginTop: '8px',
            border: `1px solid ${theme.cardBorder}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', color: theme.textSecondary }}>
              <Filter size={11} style={{ color: '#10b981' }} />
              <span><strong>Institutional Sieve:</strong> 80% choppy stocks eliminated</span>
            </div>
            <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#059669' }}>
              Top 20 Funneled
            </span>
          </div>
        </div>

        {/* ── COLUMN 2: Sectoral Stock Clusters (Middle) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '10px',
          padding: '12px',
          boxShadow: theme.boxShadow
        }}>
          {/* Top Half: LONG BUILD-UP */}
          <div style={{
            background: isLightMode ? '#f0fdf4' : 'rgba(16, 185, 129, 0.05)',
            border: `1px solid ${theme.bullCardBorder}`,
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} style={{ color: '#059669' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#059669', letterSpacing: '0.5px' }}>
                  LONG BUILD-UP CLUSTERS
                </span>
              </div>
              <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#059669' }}>
                {filteredBullClusters.length} Stocks
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr) 1fr',
              gap: '6px'
            }}>
              {/* Mini cards column 1 & 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredBullClusters.slice(0, 4).map(stock => (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: '6px',
                      padding: '5px 7px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 900, color: theme.textPrimary }}>
                        {stock.symbol}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669' }}>
                        +{stock.dayChangePct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '8px', color: theme.textMuted, marginTop: '1px' }}>
                      {stock.sector} · ₹{stock.spot}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredBullClusters.slice(4, 8).map(stock => (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: '6px',
                      padding: '5px 7px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 900, color: theme.textPrimary }}>
                        {stock.symbol}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669' }}>
                        +{stock.dayChangePct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '8px', color: theme.textMuted, marginTop: '1px' }}>
                      {stock.sector} · ₹{stock.spot}
                    </div>
                  </div>
                ))}
              </div>

              {/* Column 3: OI Build-up Momentum List */}
              <div style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '6px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>
                  OI ACCUMULATION
                </div>
                {filteredBullClusters.slice(0, 4).map(stock => (
                  <div key={stock.symbol} style={{ fontSize: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: theme.textPrimary, fontWeight: 700 }}>{stock.symbol}</span>
                    <span style={{ color: '#0284c7', fontWeight: 800 }}>+{Math.abs(stock.oiChangePct)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Half: SHORT BUILD-UP */}
          <div style={{
            background: isLightMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${theme.bearCardBorder}`,
            borderRadius: '8px',
            padding: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingDown size={14} style={{ color: '#dc2626' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#dc2626', letterSpacing: '0.5px' }}>
                  SHORT BUILD-UP CLUSTERS
                </span>
              </div>
              <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#dc2626' }}>
                {filteredBearClusters.length} Stocks
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr) 1fr',
              gap: '6px'
            }}>
              {/* Mini cards column 1 & 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredBearClusters.slice(0, 4).map(stock => (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: '6px',
                      padding: '5px 7px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 900, color: theme.textPrimary }}>
                        {stock.symbol}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626' }}>
                        {stock.dayChangePct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '8px', color: theme.textMuted, marginTop: '1px' }}>
                      {stock.sector} · ₹{stock.spot}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredBearClusters.slice(4, 8).map(stock => (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: '6px',
                      padding: '5px 7px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 900, color: theme.textPrimary }}>
                        {stock.symbol}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626' }}>
                        {stock.dayChangePct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '8px', color: theme.textMuted, marginTop: '1px' }}>
                      {stock.sector} · ₹{stock.spot}
                    </div>
                  </div>
                ))}
              </div>

              {/* Column 3: OI Short Build-up Momentum List */}
              <div style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '6px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#dc2626', marginBottom: '4px' }}>
                  OI SHORT LIQUIDATION
                </div>
                {filteredBearClusters.slice(0, 4).map(stock => (
                  <div key={stock.symbol} style={{ fontSize: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: theme.textPrimary, fontWeight: 700 }}>{stock.symbol}</span>
                    <span style={{ color: '#d97706', fontWeight: 800 }}>+{Math.abs(stock.oiChangePct)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMN 3: Precision Execution Cards (Right) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '10px',
          padding: '12px',
          boxShadow: theme.boxShadow
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Crosshair size={15} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '12px', fontWeight: 900, color: theme.textPrimary }}>
                Actionable Execution Setups
              </span>
            </div>
            <span style={{ fontSize: '9.5px', color: theme.textMuted }}>
              3 Bullish · 3 Bearish
            </span>
          </div>

          {/* Top 3 Bullish Cards */}
          <div style={{ marginBottom: '10px' }}>
            {(data?.topExecutionCards.bull || []).map(card => renderExecutionCard(card, true))}
          </div>

          {/* Bottom 3 Bearish Cards */}
          <div>
            {(data?.topExecutionCards.bear || []).map(card => renderExecutionCard(card, false))}
          </div>
        </div>
      </div>

      {/* ── 5. Interactive Stock Detail Retest Modal (as seen in video 00:50) ── */}
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
