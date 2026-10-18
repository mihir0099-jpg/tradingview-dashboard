import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, Activity, Search, RefreshCw, Layers, TrendingUp, TrendingDown,
  Shield, Crosshair, ArrowUpRight, ArrowDownRight, Sliders, Eye, Sparkles,
  Info, ExternalLink, ChevronRight, CheckCircle2, Lock, PlayCircle, BookOpen,
  Filter, BarChart2, Award, Clock, AlertTriangle, Target, Check, Maximize2, X
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
  const [activeTab, setActiveTab] = useState<'FLOW' | 'XRAY' | 'BOARDS' | 'COACHING'>('FLOW');
  const [selectedVideo, setSelectedVideo] = useState<number>(0);

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

  // Video modules metadata from Shubham Trading Coach
  const videoModules = [
    {
      id: 0,
      title: 'Order Block Power',
      subtitle: 'Where Big Money Started the Move',
      desc: "Most traders aren't missing a strategy. They're missing the right zones to trade! Learn how institutional players leave footprint order blocks before major expansions.",
      keyRules: [
        'An Order Block is the last opposing candle before an institutional impulse move.',
        'Never buy green breakout candles chasing highs. 90% of breakout buyers get trapped.',
        'Wait patiently for price to pull back and retest the Order Block zone before entering.',
        'Invalidation is sharp and binary: 1 tick past the Order Block boundary means exit immediately.'
      ],
      setup: 'Wait for Demand Zone pullback (Green Box). SL 1 tick below S1. Target R1/R2.'
    },
    {
      id: 1,
      title: 'Liquidity Power & The Amber Line',
      subtitle: 'Find Liquidity Traps Early',
      desc: 'Liquidity is the core fuel that powers institutional market orders. Discover where retail stop losses rest and how smart money sweeps them before generating vertical trends.',
      keyRules: [
        "Retail stop-loss orders concentrate directly beneath yesterday's low and the day's swing low.",
        'The Amber Liquidity Line marks the exact pool of stop liquidity.',
        'When price wicks below the Liquidity Line and immediately snaps back into the Order Block, a Liquidity Sweep has occurred.',
        'This trap provides the highest velocity move of the day because trapped breakout sellers are forced to cover.'
      ],
      setup: 'Enter on the sweep rejection candle. Tight stop loss at the wick extreme.'
    },
    {
      id: 2,
      title: 'The Perfect 1-Minute Entry',
      subtitle: 'Better Risk-Reward = Consistent Profits',
      desc: 'Most traders know WHEN to buy or sell, but struggle with WHERE to enter. This 4-step execution algorithm ensures you enter at the exact institutional fulcrum.',
      keyRules: [
        'Step 1: Check Sectoral River. Macro sector must be green (bullish) or red (bearish).',
        'Step 2: Confirm stock is ranked in Top 5 of the Liquidity Board.',
        'Step 3: Wait for price to touch the Order Block Zone on the 1-min chart.',
        'Step 4: Place Stop Loss strictly below S1 (risk 0.5% - 0.8% of stock spot price).'
      ],
      setup: 'Minimum Risk:Reward must be 1:2.5. If R:R is below 1:2, skip the trade.'
    },
    {
      id: 3,
      title: 'Small Capital, No Problem',
      subtitle: 'Options Scalping with Razor-Thin Risk',
      desc: 'You do not need lakhs to trade effectively. By combining Order Block zones with ATM options, you can risk just 5-8% on option premiums while capturing 25-50% expansions.',
      keyRules: [
        'Always pick the At-The-Money (ATM) strike closest to the stock spot price.',
        'Calculate Option SL dynamically: Option SL = Premium - (Spot Risk × 0.5).',
        'Because Spot SL is tight (0.6%), Option risk is only ₹3 - ₹6 per lot.',
        'Take 70% profit off the table at R1 (Target 1), move SL to cost, and let 30% run to R2.'
      ],
      setup: 'Small capital accounts grow through asymmetric R:R (1:3+), not through high leverage.'
    },
    {
      id: 4,
      title: 'Consistency & The Scalper Playbook',
      subtitle: 'Less Emotional Trading, Systematic Execution',
      desc: "Consistency isn't about winning every trade. It's about taking high-quality, repeatable setups day after day without deviating from your rules.",
      keyRules: [
        'Maximum 2 to 3 trades per day. If both trigger wins, stop trading and protect capital.',
        'Never trade in the choppy grey zone (stocks moving between -0.4% and +0.4%).',
        'Only trade single-directional strength. If Nifty is falling, focus on the Bearish Board.',
        'Review your trade entries in the journal: did you enter in the Zone or did you chase?'
      ],
      setup: 'Discipline = Freedom. Let the OrderBlock algorithm filter out the noise.'
    }
  ];

  // Top Volume Delta Timeline Histogram (seen at top of video)
  const renderTopVolumeDeltaTimeline = () => {
    const bars = 45;
    return (
      <div style={{
        background: '#07090e',
        border: '1px solid #1e2638',
        borderRadius: '8px',
        padding: '6px 14px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.5px' }}>
            INTRA-DAY FLOW
          </span>
          <span style={{ fontSize: '9px', color: '#64748b' }}>09:15 – 15:30</span>
        </div>

        {/* Multi-Bar Net Delta Histogram */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '26px', gap: '3px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '13px', left: 0, right: 0, height: '1px', background: '#334155', opacity: 0.5 }} />
          {Array.from({ length: bars }).map((_, idx) => {
            const isBull = idx > 12 ? Math.sin(idx * 0.4) > -0.2 : idx % 2 === 0;
            const heightPct = Math.min(100, Math.max(20, Math.abs(Math.sin(idx * 0.5)) * 90));
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
                  opacity: 0.85
                }} />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '110px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 900, color: '#10b981' }}>+2.87% NET DELTA</span>
        </div>
      </div>
    );
  };

  // Dual Sparkline SVG
  const renderDualSparkline = (priceData: number[], oiData: number[], isBull: boolean) => {
    const width = 210;
    const height = 46;
    const padding = 6;

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
    const oiColor = isBull ? '#38bdf8' : '#fbbf24';

    return (
      <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#1e293b" strokeDasharray="3,3" />
          <polyline
            fill="none"
            stroke={oiColor}
            strokeWidth="1.5"
            strokeDasharray="2,2"
            points={oiPoints}
            opacity={0.85}
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pPoints}
            style={{ filter: `drop-shadow(0 0 4px ${strokeColor}80)` }}
          />
          {priceData.length > 0 && (() => {
            const lastVal = priceData[priceData.length - 1];
            const endY = height - padding - ((lastVal - minP) / rangeP) * (height - 2 * padding);
            return (
              <circle
                cx={width - padding}
                cy={endY}
                r={3}
                fill={strokeColor}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
            );
          })()}
        </svg>
        <div style={{
          position: 'absolute',
          top: '2px',
          left: '4px',
          display: 'flex',
          gap: '8px',
          fontSize: '9px',
          fontWeight: 800,
          fontFamily: 'monospace'
        }}>
          <span style={{ color: strokeColor }}>● PRICE</span>
          <span style={{ color: oiColor }}>--- OI</span>
        </div>
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
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: `1.5px solid ${accentColor}60`,
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: `0 4px 20px ${accentColor}20`,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = `${accentColor}60`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: accentColor,
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 900
            }}>
              BENCHMARK
            </span>
            <span style={{ fontSize: '15px', fontWeight: 900, color: '#f8fafc' }}>
              {card.symbol}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
              ₹{card.spot}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: accentColor }}>
              {card.dayChangePct >= 0 ? `+${card.dayChangePct}%` : `${card.dayChangePct}%`}
            </span>
          </div>

          <div style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#fbbf24',
            background: 'rgba(251, 191, 36, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}>
            🛡️ LIQ SWEEP: ₹{card.liquidityLine}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '8px', alignItems: 'center', fontSize: '10.5px' }}>
          <div>
            <span style={{ color: '#94a3b8' }}>ZONE:</span>
            <div style={{ fontWeight: 800, color: accentColor, fontFamily: 'monospace' }}>{card.zone.label}</div>
          </div>
          <div>
            <span style={{ color: '#f43f5e' }}>SL (S1):</span>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>₹{card.s1}</div>
          </div>
          <div>
            <span style={{ color: '#10b981' }}>TARGET (R1):</span>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>₹{card.r1}</div>
          </div>
          <div>
            <span style={{ color: '#38bdf8' }}>RUNNER (R2):</span>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>₹{card.r2}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
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
    const accentColor = isBull ? '#10b981' : '#f43f5e';
    const bgGradient = isBull 
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.03) 100%)'
      : 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(136, 19, 55, 0.03) 100%)';
    const borderColor = isBull ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)';

    const isRetestZone = card.retestStatus === 'IN_ZONE';

    return (
      <div 
        key={card.symbol}
        onClick={() => setSelectedStock(card)}
        style={{
          background: bgGradient,
          border: `1px solid ${isRetestZone ? accentColor : borderColor}`,
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '14px',
          boxShadow: isRetestZone 
            ? `0 0 20px ${accentColor}40` 
            : `0 4px 20px ${isBull ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.06)'}`,
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = accentColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.borderColor = isRetestZone ? accentColor : borderColor;
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: isBull ? '#10b981' : '#f43f5e',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.8px',
              boxShadow: `0 0 10px ${accentColor}80`
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
              {card.bias} {card.score}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.5px' }}>
                  {card.symbol}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: isBull ? '#34d399' : '#fb7185'
                }}>
                  {card.dayChangePct >= 0 ? `+${card.dayChangePct}%` : `${card.dayChangePct}%`}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {card.sector} · Spot ₹{card.spot}
              </div>
            </div>
          </div>

          {/* Retest Status Badge */}
          <div style={{ textAlign: 'right' }}>
            {isRetestZone ? (
              <span style={{
                fontSize: '10px',
                fontWeight: 900,
                color: '#ffffff',
                background: accentColor,
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: `0 0 12px ${accentColor}`
              }}>
                ⚡ IN ORDER BLOCK ZONE
              </span>
            ) : (
              <span style={{
                fontSize: '10px',
                fontWeight: 900,
                color: accentColor,
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}40`,
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}>
                {card.buildUp}
              </span>
            )}
            <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '3px' }}>
              RVOL: <strong style={{ color: '#f8fafc' }}>{card.rvol}x</strong> | OI: <strong style={{ color: isBull ? '#38bdf8' : '#fbbf24' }}>+{Math.abs(card.oiChangePct)}%</strong>
            </div>
          </div>
        </div>

        {/* Middle Row: Sparkline + Zone Box */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          marginBottom: '10px'
        }}>
          {renderDualSparkline(card.sparklines.price, card.sparklines.oi, isBull)}

          <div style={{
            background: isBull ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${accentColor}50`,
            borderRadius: '6px',
            padding: '6px 10px',
            textAlign: 'center',
            minWidth: '135px'
          }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>
              {isBull ? 'DEMAND ORDER BLOCK' : 'SUPPLY ORDER BLOCK'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: accentColor, fontFamily: 'monospace' }}>
              {card.zone.label}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>
              {isBull ? 'Support Accumulation Base' : 'Resistance Rejection Shelf'}
            </div>
          </div>
        </div>

        {/* Levels & Amber Liquidity Line */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr) 1.2fr',
          gap: '8px',
          fontSize: '10.5px',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '8px'
        }}>
          <div>
            <span style={{ color: isBull ? '#f59e0b' : '#f43f5e', fontWeight: 800 }}>
              {isBull ? 'S1 (SL):' : 'R1 (SL):'}
            </span>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
              ₹{isBull ? card.s1 : card.r1}
            </div>
          </div>

          <div>
            <span style={{ color: '#fbbf24', fontWeight: 800 }}>LIQUIDITY:</span>
            <div style={{ fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>
              ₹{card.liquidityLine}
            </div>
          </div>

          <div>
            <span style={{ color: isBull ? '#10b981' : '#38bdf8', fontWeight: 800 }}>
              {isBull ? 'R1 (T1):' : 'S1 (T1):'}
            </span>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
              ₹{isBull ? card.r1 : card.s1}
            </div>
          </div>

          <div>
            <span style={{ color: isBull ? '#34d399' : '#60a5fa', fontWeight: 800 }}>
              {isBull ? 'R2 (T2):' : 'S2 (T2):'}
            </span>
            <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
              ₹{isBull ? card.r2 : card.s2}
            </div>
          </div>

          <div style={{
            textAlign: 'right',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #1e293b'
          }}>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>
              RISK: <span style={{ color: '#f43f5e', fontWeight: 800 }}>₹{card.riskPts}</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#fbbf24' }}>
              R:R 1 : {card.rewardRiskRatio}
            </div>
          </div>
        </div>

        {/* Visual Slider Bar */}
        <div style={{ marginTop: '8px', position: 'relative' }}>
          <div style={{
            height: '4px',
            borderRadius: '2px',
            background: '#1e293b',
            overflow: 'hidden',
            display: 'flex'
          }}>
            <div style={{ width: '30%', background: isBull ? '#f59e0b' : '#38bdf8' }} />
            <div style={{ width: '25%', background: accentColor }} />
            <div style={{ width: '45%', background: '#334155' }} />
          </div>
          <div style={{
            position: 'absolute',
            top: '-3px',
            left: `${card.sliderPct}%`,
            width: '10px',
            height: '10px',
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

  // Sankey River
  const renderSankeyRiver = () => {
    if (!data?.sectorRivers) return null;
    const width = 420;
    const height = 520;
    const centerY = height / 2;

    return (
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: '#070a12', borderRadius: '10px' }}>
          <line x1={80} y1={centerY} x2={width - 40} y2={centerY} stroke="#334155" strokeWidth={1} strokeDasharray="3,3" />
          <line x1={80} y1={centerY - 100} x2={width - 40} y2={centerY - 100} stroke="#1e3a8a" strokeWidth={1} strokeDasharray="2,2" opacity={0.5} />
          <line x1={80} y1={centerY + 100} x2={width - 40} y2={centerY + 100} stroke="#1e3a8a" strokeWidth={1} strokeDasharray="2,2" opacity={0.5} />

          <text x={85} y={centerY - 105} fill="#60a5fa" fontSize="8" fontWeight="bold">+50%</text>
          <text x={85} y={centerY - 4} fill="#64748b" fontSize="8" fontWeight="bold">0% (Open)</text>
          <text x={85} y={centerY + 115} fill="#60a5fa" fontSize="8" fontWeight="bold">-50%</text>

          <text x={90} y={height - 10} fill="#475569" fontSize="8">09:15</text>
          <text x={180} y={height - 10} fill="#475569" fontSize="8">11:30</text>
          <text x={270} y={height - 10} fill="#475569" fontSize="8">13:30</text>
          <text x={350} y={height - 10} fill="#475569" fontSize="8">15:30</text>

          {data.sectorRivers.map((sec, idx) => {
            const startX = 90;
            const endX = width - 50;
            const isBull = sec.isBull;
            const targetY = isBull 
              ? (centerY - 30 - (idx * 12)) 
              : (centerY + 30 + ((idx - 6) * 12));

            const pathD = `
              M ${startX} ${centerY}
              C ${startX + 80} ${centerY},
                ${endX - 90} ${targetY},
                ${endX} ${targetY}
            `;
            const isHovered = hoveredSector === sec.sector;

            return (
              <g key={sec.sector} onMouseEnter={() => setHoveredSector(sec.sector)} onMouseLeave={() => setHoveredSector(null)}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={sec.color}
                  strokeWidth={isHovered ? 4.5 : 2.0}
                  opacity={isHovered ? 1.0 : (isBull ? 0.6 : 0.55)}
                  strokeLinecap="round"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    filter: isHovered ? `drop-shadow(0 0 8px ${sec.color})` : 'none'
                  }}
                />
              </g>
            );
          })}

          {/* Sieve Brackets */}
          <rect x={width - 48} y={60} width={12} height={170} rx={3} fill="#064e3b" stroke="#10b981" strokeWidth={1.5} opacity={0.8} />
          <line x1={width - 42} y1={70} x2={width - 42} y2={220} stroke="#10b981" strokeWidth={2} strokeDasharray="2,3" />

          <rect x={width - 48} y={270} width={12} height={170} rx={3} fill="#881337" stroke="#f43f5e" strokeWidth={1.5} opacity={0.8} />
          <line x1={width - 42} y1={280} x2={width - 42} y2={430} stroke="#f43f5e" strokeWidth={2} strokeDasharray="2,3" />

          <circle cx={width - 42} cy={145} r={4} fill="#10b981" />
          <circle cx={width - 42} cy={355} r={4} fill="#f43f5e" />

          <path d={`M ${width - 42} 145 C ${width - 20} 145, ${width - 15} 120, ${width} 120`} fill="none" stroke="#10b981" strokeWidth={2} />
          <path d={`M ${width - 42} 355 C ${width - 20} 355, ${width - 15} 380, ${width} 380`} fill="none" stroke="#f43f5e" strokeWidth={2} />
        </svg>

        {/* Left Sector List Overlaid (All 14 streams) */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          zIndex: 2,
          maxHeight: '490px',
          overflowY: 'auto'
        }}>
          {data.sectorRivers.map((sec) => (
            <div
              key={sec.sector}
              onClick={() => setSelectedSector(selectedSector === sec.sector ? 'ALL' : sec.sector)}
              onMouseEnter={() => setHoveredSector(sec.sector)}
              onMouseLeave={() => setHoveredSector(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 5px',
                borderRadius: '4px',
                background: selectedSector === sec.sector ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.75)',
                border: `1px solid ${selectedSector === sec.sector ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                fontSize: '9px',
                fontWeight: 800,
                color: sec.isBull ? '#34d399' : '#fb7185',
                width: '78px',
                backdropFilter: 'blur(4px)'
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: sec.color }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sec.sector}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Market X-Ray Dot Scatter Plot
  const renderMarketXRay = () => {
    if (!data?.allStocks) return null;

    const width = 880;
    const height = 480;
    const centerY = height / 2;
    const centerX = width / 2;

    const topBull = data.topExecutionCards.bull.map(s => s.symbol);
    const topBear = data.topExecutionCards.bear.map(s => s.symbol);

    return (
      <div style={{
        background: '#0a0d14',
        border: '1px solid #1e2638',
        borderRadius: '12px',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#f8fafc' }}>
                Market X-Ray (Every F&amp;O Stock Placed by Move)
              </span>
              <span style={{
                fontSize: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 800
              }}>
                212 STOCKS MAPPED
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Bullish stack above the line to the right · Bearish below to the left · Choppy cluster in grey at center
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 800 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              Bullish ({data.meta.marketBreadth.bullishCount})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontWeight: 800 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} />
              Choppy ({data.allStocks.filter(s => s.isChoppy).length})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f43f5e', fontWeight: 800 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />
              Bearish ({data.meta.marketBreadth.bearishCount})
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: '#05070c', borderRadius: '8px' }}>
          {/* Grid and Zero Line */}
          <line x1={40} y1={centerY} x2={width - 40} y2={centerY} stroke="#334155" strokeWidth={1.5} />
          <line x1={centerX} y1={20} x2={centerX} y2={height - 20} stroke="#1e293b" strokeWidth={1} strokeDasharray="3,3" />

          {/* Scale labels */}
          <text x={centerX} y={centerY - 10} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">0.0% (Open)</text>
          <text x={width - 60} y={centerY - 10} fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">+8.0%</text>
          <text x={60} y={centerY + 18} fill="#f43f5e" fontSize="10" textAnchor="middle" fontWeight="bold">-8.0%</text>

          {/* Center Choppy Box */}
          <rect x={centerX - 55} y={centerY - 60} width={110} height={120} fill="rgba(255, 255, 255, 0.02)" stroke="#334155" strokeDasharray="2,2" rx={4} />
          <text x={centerX} y={centerY + 50} fill="#475569" fontSize="8" textAnchor="middle">CHOPPY NOISE ZONE</text>

          {/* Dots */}
          {data.allStocks.map((stock, idx) => {
            const isBull = stock.dayChangePct > 0;
            const isRinged = topBull.includes(stock.symbol) || topBear.includes(stock.symbol);
            
            const clampedChange = Math.max(-8, Math.min(8, stock.dayChangePct));
            const cx = centerX + (clampedChange / 8) * (centerX - 60);

            const stackIndex = (idx % 8);
            const cy = isBull
              ? centerY - 20 - (stackIndex * 18) - (Math.abs(stock.dayChangePct) * 12)
              : centerY + 20 + (stackIndex * 18) + (Math.abs(stock.dayChangePct) * 12);

            const dotColor = stock.isChoppy 
              ? '#64748b' 
              : (isBull ? '#10b981' : '#f43f5e');

            return (
              <g 
                key={stock.symbol}
                onClick={() => setSelectedStock(stock)}
                style={{ cursor: 'pointer' }}
              >
                {isRinged && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={9}
                    fill="none"
                    stroke={dotColor}
                    strokeWidth={1.5}
                    opacity={0.8}
                    style={{ animation: 'pulse 1.5s infinite' }}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isRinged ? 5 : 3.5}
                  fill={dotColor}
                  opacity={stock.isChoppy ? 0.45 : 0.9}
                />
                {isRinged && (
                  <text
                    x={cx}
                    y={isBull ? cy - 12 : cy + 18}
                    fill={dotColor}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {stock.symbol}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>💡 Tip: Click any ringed circle to inspect the institutional Order Block and Liquidity levels.</span>
          <span>Leading Sector: <strong style={{ color: '#10b981' }}>{data.sectorRivers[0]?.sector}</strong> | Lagging Sector: <strong style={{ color: '#f43f5e' }}>{data.sectorRivers[data.sectorRivers.length - 1]?.sector}</strong></span>
        </div>
      </div>
    );
  };

  // Liquidity Boards (#1 to #10) View
  const renderLiquidityBoards = () => {
    if (!data?.liquidityBoards) return null;

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        {/* BULLISH BOARD */}
        <div style={{
          background: '#0d111a',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpRight size={18} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#10b981' }}>
                BULLISH LIQUIDITY BOARD (TOP 10)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: '#10b981', fontWeight: 800 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              LIVE 1-MIN REFRESH
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.liquidityBoards.bullish.map(stock => (
              <div
                key={stock.symbol}
                onClick={() => setSelectedStock(stock)}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)'}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${stock.strengthBarWidth || 50}%`,
                  background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.02) 100%)',
                  zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', fontFamily: 'monospace' }}>
                      {String(stock.rank).padStart(2, '0')}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc' }}>
                          {stock.symbol}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>
                          +{stock.dayChangePct}%
                        </span>
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                        {stock.sector} · Spot ₹{stock.spot} · RVOL {stock.rvol}x
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                      ZONE: {stock.zone.label}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#fbbf24', fontWeight: 700 }}>
                      LIQ: ₹{stock.liquidityLine} | R:R 1:{stock.rewardRiskRatio}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BEARISH BOARD */}
        <div style={{
          background: '#0d111a',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowDownRight size={18} style={{ color: '#f43f5e' }} />
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#f43f5e' }}>
                BEARISH LIQUIDITY BOARD (TOP 10)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: '#f43f5e', fontWeight: 800 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e' }} />
              LIVE 1-MIN REFRESH
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.liquidityBoards.bearish.map(stock => (
              <div
                key={stock.symbol}
                onClick={() => setSelectedStock(stock)}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f43f5e'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.2)'}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${stock.strengthBarWidth || 50}%`,
                  background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.02) 100%)',
                  zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', fontFamily: 'monospace' }}>
                      {String(stock.rank).padStart(2, '0')}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc' }}>
                          {stock.symbol}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#f43f5e' }}>
                          {stock.dayChangePct}%
                        </span>
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                        {stock.sector} · Spot ₹{stock.spot} · RVOL {stock.rvol}x
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#fb7185', fontFamily: 'monospace' }}>
                      ZONE: {stock.zone.label}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#fbbf24', fontWeight: 700 }}>
                      LIQ: ₹{stock.liquidityLine} | R:R 1:{stock.rewardRiskRatio}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Scalper Coaching & Minute Rules (Shubham Trading Coach Video Library)
  const renderCoachingModule = () => {
    const cur = videoModules[selectedVideo];

    return (
      <div style={{
        background: '#0d111a',
        border: '1px solid #1e2638',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 900
              }}>
                SHUBHAM TRADING COACH · FULL MASTERCLASS
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Minute-by-Minute Institutional Scalping Rules
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#f8fafc', margin: '6px 0 0 0' }}>
              {cur.title}: <span style={{ color: '#38bdf8' }}>{cur.subtitle}</span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {videoModules.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => setSelectedVideo(idx)}
                style={{
                  background: selectedVideo === idx ? '#38bdf8' : '#1e293b',
                  color: selectedVideo === idx ? '#0f172a' : '#cbd5e1',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Lesson {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px'
        }}>
          <p style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>
            {cur.desc}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981' }} />
              Executive Scalping Rules (1-Minute Execution)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cur.keyRules.map((rule, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: '10px',
                    background: '#111827',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #1e293b'
                  }}
                >
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 900,
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: '#070a12',
            border: '1px solid #1e2638',
            borderRadius: '10px',
            padding: '18px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#fbbf24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={16} style={{ color: '#fbbf24' }} />
              Live Setup Blueprint
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.5 }}>
              {cur.setup}
            </div>

            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px' }}>
                INSTITUTIONAL FOOTPRINT VISUALIZER
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '110px', gap: '14px', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '2px', height: '16px', background: '#10b981' }} />
                  <div style={{ width: '16px', height: '55px', background: '#10b981', borderRadius: '2px' }} />
                  <div style={{ width: '2px', height: '14px', background: '#10b981' }} />
                  <span style={{ fontSize: '8.5px', color: '#10b981', marginTop: '4px' }}>Impulse</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '2px', height: '10px', background: '#f43f5e' }} />
                  <div style={{ width: '16px', height: '35px', background: '#f43f5e', borderRadius: '2px' }} />
                  <div style={{ width: '2px', height: '24px', background: '#fbbf24' }} />
                  <span style={{ fontSize: '8.5px', color: '#fbbf24', marginTop: '4px' }}>Sweep Wick</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '2px', height: '14px', background: '#10b981' }} />
                  <div style={{ width: '16px', height: '65px', background: '#10b981', borderRadius: '2px', boxShadow: '0 0 10px #10b981' }} />
                  <div style={{ width: '2px', height: '8px', background: '#10b981' }} />
                  <span style={{ fontSize: '8.5px', color: '#10b981', marginTop: '4px' }}>Target Expansion</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #334155', paddingTop: '8px', display: 'flex', justifyContent: 'space-around', fontSize: '10px' }}>
                <span style={{ color: '#10b981' }}>R1 (Call Wall)</span>
                <span style={{ color: '#38bdf8' }}>Order Block Zone</span>
                <span style={{ color: '#fbbf24' }}>Liquidity Pool</span>
                <span style={{ color: '#f43f5e' }}>S1 Stop Loss</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#07090D',
      color: '#f8fafc',
      minHeight: '100vh',
      padding: '16px 20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* ── 1. Top Navigation & Market Breadth Bar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0d111a',
        border: '1px solid #1e2638',
        borderRadius: '12px',
        padding: '12px 20px',
        marginBottom: '10px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5px',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ width: '16px', height: '3px', backgroundColor: '#10b981', borderRadius: '1px' }} />
            <div style={{ width: '22px', height: '3px', backgroundColor: '#f43f5e', borderRadius: '1px' }} />
            <div style={{ width: '18px', height: '3px', backgroundColor: '#38bdf8', borderRadius: '1px' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.5px' }}>
                OrderBlock
              </span>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 800
              }}>
                LIVE LIQUIDITY &amp; FLOW
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              NIFTY 50, BANKNIFTY &amp; All 12 Macro Sectors · Options Oracle &amp; Shubham Trading Coach Engine
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: '#07090e',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #1e2638'
        }}>
          <button
            onClick={() => setActiveTab('FLOW')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'FLOW' ? '#10b981' : 'transparent',
              color: activeTab === 'FLOW' ? '#ffffff' : '#94a3b8'
            }}
          >
            <Layers size={13} />
            Flow &amp; Sieve
          </button>

          <button
            onClick={() => setActiveTab('XRAY')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'XRAY' ? '#38bdf8' : 'transparent',
              color: activeTab === 'XRAY' ? '#0f172a' : '#94a3b8'
            }}
          >
            <Activity size={13} />
            Market X-Ray
          </button>

          <button
            onClick={() => setActiveTab('BOARDS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'BOARDS' ? '#f59e0b' : 'transparent',
              color: activeTab === 'BOARDS' ? '#0f172a' : '#94a3b8'
            }}
          >
            <BarChart2 size={13} />
            Liquidity Boards
          </button>

          <button
            onClick={() => setActiveTab('COACHING')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'COACHING' ? '#8b5cf6' : 'transparent',
              color: activeTab === 'COACHING' ? '#ffffff' : '#94a3b8'
            }}
          >
            <BookOpen size={13} />
            Scalper Coaching
          </button>
        </div>

        {/* Large Market Breadth (as seen in video: 172 BULLISH / 41 BEARISH) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {data?.meta?.marketBreadth && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', letterSpacing: '0.5px' }}>BULLISH</span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                  {data.meta.marketBreadth.bullishCount}
                </div>
              </div>
              <div style={{ width: '1px', height: '24px', background: '#334155' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#f43f5e', letterSpacing: '0.5px' }}>BEARISH</span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#f43f5e', lineHeight: 1 }}>
                  {data.meta.marketBreadth.bearishCount}
                </div>
              </div>
            </div>
          )}

          <div style={{ position: 'relative', width: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0a0d14',
                border: '1px solid #1e2638',
                borderRadius: '8px',
                padding: '6px 10px 6px 30px',
                fontSize: '11px',
                color: '#f8fafc',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* ── 2. Top Net Volume Delta Timeline (as seen in video top) ── */}
      {renderTopVolumeDeltaTimeline()}

      {/* ── 3. All 14 Macro Sector & Benchmark Index Streams Filter Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '14px',
        scrollbarWidth: 'none'
      }}>
        <span style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', whiteSpace: 'nowrap', marginRight: '4px' }}>
          MACRO SECTORS:
        </span>
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
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '20px',
                border: isSel 
                  ? '1px solid #10b981' 
                  : isIndex 
                    ? '1px solid rgba(56, 189, 248, 0.4)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSel 
                  ? '#10b981' 
                  : isIndex 
                    ? 'rgba(56, 189, 248, 0.1)' 
                    : '#0d111a',
                color: isSel ? '#ffffff' : isIndex ? '#38bdf8' : '#cbd5e1',
                fontSize: '11px',
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

      {/* ── 4. Content Views ── */}
      {activeTab === 'XRAY' && renderMarketXRay()}
      {activeTab === 'BOARDS' && renderLiquidityBoards()}
      {activeTab === 'COACHING' && renderCoachingModule()}

      {activeTab === 'FLOW' && (
        <div>
          {/* Institutional Index Benchmark Anchors (NIFTY & BANKNIFTY) */}
          {data?.indexAnchors && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginBottom: '16px'
            }}>
              {data.indexAnchors.nifty && renderIndexAnchorCard(data.indexAnchors.nifty)}
              {data.indexAnchors.banknifty && renderIndexAnchorCard(data.indexAnchors.banknifty)}
            </div>
          )}

          {/* Main 3-Column Layout Matching order-block.com Video */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(330px, 1.15fr) minmax(290px, 1fr) minmax(370px, 1.25fr)',
            gap: '16px',
            alignItems: 'start'
          }}>
            {/* ── COLUMN 1: Macro Money-Flow River (Left) ── */}
            <div style={{
              background: '#0d111a',
              border: '1px solid #1e2638',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '520px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} style={{ color: '#38bdf8' }} />
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>
                    Macro Sectoral River
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  14 Streams (Indices + 12 Sectors)
                </span>
              </div>

              {renderSankeyRiver()}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginTop: '12px',
                border: '1px solid #1e293b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                  <Filter size={12} style={{ color: '#10b981' }} />
                  <span><strong>Institutional Sieve:</strong> 80% choppy stocks eliminated</span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981' }}>
                  Top 20 Funneled
                </span>
              </div>
            </div>

            {/* ── COLUMN 2: Sectoral Stock Clusters (Middle) ── */}
            <div style={{
              background: '#0d111a',
              border: '1px solid #1e2638',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '520px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={15} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#10b981' }}>
                    LONG BUILD-UP CLUSTERS (TOP 20)
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {filteredBullClusters.length} Stocks
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '18px'
              }}>
                {filteredBullClusters.slice(0, 12).map(stock => (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      padding: '7px 8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#f8fafc' }}>
                        {stock.symbol}
                      </span>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#10b981' }}>
                        +{stock.dayChangePct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '2px' }}>
                      {stock.sector} · ₹{stock.spot}
                    </div>
                    <div style={{
                      fontSize: '8px',
                      fontWeight: 900,
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      marginTop: '4px',
                      display: 'inline-block'
                    }}>
                      LONG BUILD-UP
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: '#1e293b', margin: '14px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingDown size={15} style={{ color: '#f43f5e' }} />
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#f43f5e' }}>
                    SHORT BUILD-UP CLUSTERS (TOP 20)
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {filteredBearClusters.length} Stocks
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
              }}>
                {filteredBearClusters.slice(0, 12).map(stock => (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    style={{
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      borderRadius: '6px',
                      padding: '7px 8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f43f5e'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.25)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#f8fafc' }}>
                        {stock.symbol}
                      </span>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#f43f5e' }}>
                        {stock.dayChangePct}%
                      </span>
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '2px' }}>
                      {stock.sector} · ₹{stock.spot}
                    </div>
                    <div style={{
                      fontSize: '8px',
                      fontWeight: 900,
                      color: '#f43f5e',
                      background: 'rgba(244, 63, 94, 0.15)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      marginTop: '4px',
                      display: 'inline-block'
                    }}>
                      SHORT BUILD-UP
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── COLUMN 3: Precision Execution Cards (Right) ── */}
            <div style={{
              background: '#0d111a',
              border: '1px solid #1e2638',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '520px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crosshair size={16} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>
                    Actionable Execution Setups
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Retest ZONE · Amber Liquidity Line
                </span>
              </div>

              {(data?.topExecutionCards.bull || []).map(card => renderExecutionCard(card, true))}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '16px 0',
                color: '#475569',
                fontSize: '10px',
                fontWeight: 800
              }}>
                <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
                <span>BEARISH SUPPLY ZONES</span>
                <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
              </div>

              {(data?.topExecutionCards.bear || []).map(card => renderExecutionCard(card, false))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Detail Stock Drawer / Modal (Matching 00:50 in video) ── */}
      {selectedStock && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedStock(null)}>
          <div 
            style={{
              backgroundColor: '#0a0d14',
              border: `1.5px solid ${selectedStock.bias === 'BULL' ? '#10b981' : '#f43f5e'}`,
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: selectedStock.bias === 'BULL' ? '#10b981' : '#f43f5e',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 900
                }}>
                  {selectedStock.bias} #{selectedStock.rank || 1}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#f8fafc' }}>
                      {selectedStock.symbol}
                    </h3>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                      {selectedStock.name} · {selectedStock.sector}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
                      ₹{selectedStock.spot}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: selectedStock.bias === 'BULL' ? '#10b981' : '#f43f5e'
                    }}>
                      {selectedStock.dayChangePct >= 0 ? `+${selectedStock.dayChangePct}%` : `${selectedStock.dayChangePct}%`}
                    </span>
                    <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 800 }}>
                      CONV {selectedStock.score} ★★★★★
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                style={{
                  background: '#1e293b',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
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
              background: '#0d111a',
              border: '1px solid #1e2638',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '11px'
            }}>
              <div>
                <span style={{ color: '#64748b' }}>RANK:</span>
                <div style={{ fontWeight: 800, color: '#f8fafc' }}>p99.8 #1/172</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>OI CHANGE:</span>
                <div style={{ fontWeight: 800, color: '#38bdf8' }}>+{Math.abs(selectedStock.oiChangePct)}% {selectedStock.buildUp}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>VWAP:</span>
                <div style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>₹{+(selectedStock.spot * 0.996).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>RVOL:</span>
                <div style={{ fontWeight: 800, color: '#10b981' }}>{selectedStock.rvol}x (High Vol)</div>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>ORDER BLOCK ZONE:</span>
                <div style={{ fontWeight: 800, color: selectedStock.bias === 'BULL' ? '#10b981' : '#f43f5e', fontFamily: 'monospace' }}>
                  {selectedStock.zone.label}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>SL / S1:</span>
                <div style={{ fontWeight: 800, color: '#f43f5e', fontFamily: 'monospace' }}>₹{selectedStock.s1}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>TARGET 1 (R1):</span>
                <div style={{ fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>₹{selectedStock.r1}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>R:R RATIO:</span>
                <div style={{ fontWeight: 900, color: '#fbbf24' }}>1 : {selectedStock.rewardRiskRatio}</div>
              </div>
            </div>

            {/* Interactive Intraday Chart with Order Block Zone Shading */}
            <div style={{
              background: '#070a12',
              border: '1px solid #1e2638',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8' }}>
                  INTRADAY CHART · ORDER BLOCK RETEST ENTRY
                </span>
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 800 }}>
                  ⚡ RETESTED ZONE AT 10:00 AM IST
                </span>
              </div>

              {/* Chart SVG */}
              <div style={{ width: '100%', height: '180px', position: 'relative' }}>
                <svg viewBox="0 0 600 180" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="chartZoneGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Levels */}
                  <line x1={40} y1={25} x2={560} y2={25} stroke="#10b981" strokeWidth={1} strokeDasharray="3,3" />
                  <text x={565} y={28} fill="#10b981" fontSize="9" fontWeight="bold">R2 ₹{selectedStock.r2}</text>

                  <line x1={40} y1={55} x2={560} y2={55} stroke="#34d399" strokeWidth={1} strokeDasharray="3,3" />
                  <text x={565} y={58} fill="#34d399" fontSize="9" fontWeight="bold">R1 ₹{selectedStock.r1}</text>

                  {/* Shaded Order Block Demand Zone (70 to 105 Y) */}
                  <rect x={40} y={90} width={520} height={35} fill="url(#chartZoneGrad)" stroke="#10b981" strokeWidth={1} rx={3} />
                  <text x={45} y={112} fill="#10b981" fontSize="9" fontWeight="bold">ORDER BLOCK ZONE ({selectedStock.zone.label})</text>

                  {/* Amber Liquidity Sweep Line */}
                  <line x1={40} y1={145} x2={560} y2={145} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4,3" />
                  <text x={565} y={148} fill="#fbbf24" fontSize="9" fontWeight="bold">LIQ ₹{selectedStock.liquidityLine}</text>

                  {/* Time Marks */}
                  <text x={45} y={170} fill="#475569" fontSize="8">09:15</text>
                  <text x={140} y={170} fill="#475569" fontSize="8">10:00 (Entry)</text>
                  <text x={260} y={170} fill="#475569" fontSize="8">11:30</text>
                  <text x={380} y={170} fill="#475569" fontSize="8">13:30</text>
                  <text x={510} y={170} fill="#475569" fontSize="8">15:30</text>

                  {/* Price Trajectory Line */}
                  <path
                    d="M 45 130 Q 80 85, 120 70 T 150 102 T 190 75 T 260 60 T 360 48 T 460 38 T 540 30"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    style={{ filter: 'drop-shadow(0 0 6px #10b981)' }}
                  />

                  {/* Retest Entry Arrow (at 10:00 AM / x=150, y=102) */}
                  <circle cx={150} cy={102} r={5} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
                  <path d="M 150 128 L 150 110" stroke="#10b981" strokeWidth={2} markerEnd="url(#arrow)" />
                  <text x={150} y={140} fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">ENTRY PULLBACK</text>

                  {/* Exit Arrow (at top / x=540, y=30) */}
                  <circle cx={540} cy={30} r={5} fill="#f43f5e" stroke="#ffffff" strokeWidth={2} />
                  <text x={530} y={18} fill="#f43f5e" fontSize="9" fontWeight="bold">EXIT</text>
                </svg>
              </div>
            </div>

            {/* Sensibull / Broker Execution Blueprint */}
            <div style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#fef08a' }}>
                  🎯 Verified F&amp;O Options Scalp Blueprint
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                  Recommended ATM Strike: Buy <strong>{selectedStock.symbol} {Math.round(selectedStock.spot / 50) * 50} {selectedStock.bias === 'BULL' ? 'CE' : 'PE'}</strong> | Risk strictly capped to ₹{+(selectedStock.riskPts * 0.5).toFixed(2)} pts on premium!
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '100px' }}>
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
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
