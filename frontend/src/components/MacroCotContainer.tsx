import React, { useState, useEffect, useMemo } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  Shield, TrendingUp, TrendingDown, Activity, AlertTriangle, 
  RefreshCw, Info, Calendar, PieChart, BarChart3, Layers, HelpCircle, 
  ArrowUpRight, ArrowDownRight, Compass, Zap
} from 'lucide-react';

interface ParticipantData {
  long: number;
  short: number;
  net: number;
  longRatio: number;
  cotIndex: number;
  change1D: number;
  change5D: number;
  options?: {
    callLong: number;
    callShort: number;
    netCalls: number;
    putLong: number;
    putShort: number;
    netPuts: number;
    optionBias: string;
  };
}

interface CotHistoryItem {
  date: string;
  niftyPrice: number;
  totalOi: number;
  fiiNet: number;
  diiNet: number;
  proNet: number;
  clientNet: number;
  cotIndex52: number;
  cotIndex26: number;
}

interface MacroCotResponse {
  success: boolean;
  timestamp: number;
  lookbackWeeks: number;
  niftyLtp: number;
  totalOi: number;
  oi1DChange: number;
  oi1DChangePct: number;
  buildup: 'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'SHORT_COVERING' | 'LONG_LIQUIDATION';
  fii: ParticipantData;
  dii: ParticipantData;
  pro: ParticipantData;
  client: ParticipantData;
  sentiment: {
    status: string;
    cotIndex: number;
    alertLevel: string;
    alertMessage: string;
    isRetailTrapped: boolean;
    retailTrapDescription: string;
  };
  rules: Array<{ title: string; description: string }>;
  history: CotHistoryItem[];
}

export const MacroCotContainer: React.FC = () => {
  const [data, setData] = useState<MacroCotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookbackWeeks, setLookbackWeeks] = useState<26 | 52>(52);
  const [selectedCategory, setSelectedCategory] = useState<'FUTURES' | 'OPTIONS' | 'COMBINED'>('FUTURES');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const backendUrl = getBackendUrl();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/api/macro-cot?lookback=${lookbackWeeks}&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to load Macro COT data');
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching Macro COT');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lookbackWeeks]);

  const getBuildupColor = (buildup: string) => {
    switch (buildup) {
      case 'LONG_BUILDUP': return { bg: '#064e3b', text: '#34d399', border: '#059669', label: '🟢 Long Buildup (Bullish Accumulation)' };
      case 'SHORT_BUILDUP': return { bg: '#7f1d1d', text: '#f87171', border: '#dc2626', label: '🔴 Short Buildup (Bearish Pressure)' };
      case 'SHORT_COVERING': return { bg: '#78350f', text: '#fbbf24', border: '#d97706', label: '🟡 Short Covering (Fragile Rally)' };
      case 'LONG_LIQUIDATION': return { bg: '#4c1d95', text: '#c084fc', border: '#7c3aed', label: '🟣 Long Liquidation (Profit Booking)' };
      default: return { bg: '#1e293b', text: '#94a3b8', border: '#475569', label: buildup };
    }
  };

  // SVG Chart Metrics
  const chartPoints = useMemo(() => {
    if (!data || !data.history || data.history.length === 0) return [];
    const count = lookbackWeeks === 26 ? 26 : 52;
    return data.history.slice(-count);
  }, [data, lookbackWeeks]);

  const chartBounds = useMemo(() => {
    if (chartPoints.length === 0) return { minPrice: 0, maxPrice: 100, minNet: -100, maxNet: 100 };
    const prices = chartPoints.map(p => p.niftyPrice);
    const nets = chartPoints.map(p => p.fiiNet);
    return {
      minPrice: Math.min(...prices) * 0.98,
      maxPrice: Math.max(...prices) * 1.02,
      minNet: Math.min(...nets, -50000),
      maxNet: Math.max(...nets, 50000)
    };
  }, [chartPoints]);

  const hoveredPoint = hoveredIndex !== null && chartPoints[hoveredIndex] ? chartPoints[hoveredIndex] : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0a0e17',
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowY: 'auto',
      padding: '16px 20px',
      gap: '16px'
    }}>
      {/* 1. Header Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '14px',
        borderBottom: '1px solid #1e293b',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #334155'
          }}>
            <Shield style={{ color: '#38bdf8', width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                Macro COT (Commitment of Traders)
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#0284c7',
                color: '#fff'
              }}>
                GoCharting Framework
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              Institutional Net Positions, 52-Week COT Index Stochastic Oscillator & Multi-Year Extreme Sentiment Reversals
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Lookback Period Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid #334155'
          }}>
            <button
              onClick={() => setLookbackWeeks(26)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '700',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: lookbackWeeks === 26 ? '#38bdf8' : 'transparent',
                color: lookbackWeeks === 26 ? '#000' : '#94a3b8'
              }}
            >
              26 Weeks
            </button>
            <button
              onClick={() => setLookbackWeeks(52)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '700',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: lookbackWeeks === 52 ? '#38bdf8' : 'transparent',
                color: lookbackWeeks === 52 ? '#000' : '#94a3b8'
              }}
            >
              52 Weeks (Standard)
            </button>
          </div>

          {/* Category Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid #334155'
          }}>
            <button
              onClick={() => setSelectedCategory('FUTURES')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '700',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedCategory === 'FUTURES' ? '#0ea5e9' : 'transparent',
                color: selectedCategory === 'FUTURES' ? '#fff' : '#94a3b8'
              }}
            >
              Index Futures
            </button>
            <button
              onClick={() => setSelectedCategory('OPTIONS')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '700',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedCategory === 'OPTIONS' ? '#0ea5e9' : 'transparent',
                color: selectedCategory === 'OPTIONS' ? '#fff' : '#94a3b8'
              }}
            >
              Index Options
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #475569',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw style={{ width: '13px', height: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
          <RefreshCw style={{ width: '28px', height: '28px', animation: 'spin 1s linear infinite', color: '#38bdf8' }} />
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fca5a5'
        }}>
          <AlertTriangle style={{ width: '18px', height: '18px' }} />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* 2. Top Metric Cards Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '12px'
          }}>
            {/* Card 1: FII COT Index Gauge */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                  FII COT Index ({lookbackWeeks}W)
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  backgroundColor: data.fii.cotIndex <= 20 ? '#dc2626' : (data.fii.cotIndex >= 80 ? '#16a34a' : '#0284c7'),
                  color: '#fff'
                }}>
                  {data.fii.cotIndex <= 20 ? 'EXTREME OVERSOLD' : (data.fii.cotIndex >= 80 ? 'EXTREME OVERBOUGHT' : 'NEUTRAL ZONE')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', fontFamily: 'monospace' }}>
                  {data.fii.cotIndex}%
                </span>
                <span style={{ fontSize: '12px', color: data.fii.change1D >= 0 ? '#4ade80' : '#f87171', fontWeight: '700' }}>
                  {data.fii.change1D >= 0 ? '▲' : '▼'} {Math.abs(data.fii.change1D).toLocaleString()} contracts
                </span>
              </div>
              {/* Visual Progress Bar */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, data.fii.cotIndex))}%`,
                  height: '100%',
                  backgroundColor: data.fii.cotIndex <= 20 ? '#ef4444' : (data.fii.cotIndex >= 80 ? '#22c55e' : '#38bdf8'),
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                <span>0% (Bear Trap)</span>
                <span>50% (Equilibrium)</span>
                <span>100% (Bull Top)</span>
              </div>
            </div>

            {/* Card 2: FII Net Contracts & Long Ratio */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                FII Net Position (Smart Money)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  color: data.fii.net >= 0 ? '#4ade80' : '#f87171',
                  fontFamily: 'monospace'
                }}>
                  {data.fii.net >= 0 ? '+' : ''}{data.fii.net.toLocaleString()}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>contracts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8' }}>Long Ratio:</span>
                <span style={{ fontWeight: '800', color: data.fii.longRatio >= 50 ? '#4ade80' : '#f87171' }}>
                  {data.fii.longRatio}% Long ({100 - data.fii.longRatio}% Short)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8' }}>5-Day Drift:</span>
                <span style={{ fontWeight: '700', color: data.fii.change5D >= 0 ? '#4ade80' : '#f87171' }}>
                  {data.fii.change5D >= 0 ? '+' : ''}{data.fii.change5D.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Card 3: Retail (Client) Trap Sentiment */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                Retail Clients (The Crowd)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  color: data.client.net >= 0 ? '#4ade80' : '#f87171',
                  fontFamily: 'monospace'
                }}>
                  {data.client.net >= 0 ? '+' : ''}{data.client.net.toLocaleString()}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>contracts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8' }}>Crowd Sentiment:</span>
                <span style={{
                  fontWeight: '800',
                  color: data.sentiment.isRetailTrapped ? '#fbbf24' : '#94a3b8'
                }}>
                  {data.sentiment.isRetailTrapped ? '⚠️ CROWD TRAPPED' : 'Neutral Position'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8' }}>Retail Long %:</span>
                <span style={{ fontWeight: '700', color: '#cbd5e1' }}>{data.client.longRatio}%</span>
              </div>
            </div>

            {/* Card 4: Open Interest & Buildup Classification */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                Total Open Interest (OI)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', fontFamily: 'monospace' }}>
                  {data.totalOi.toLocaleString()}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: data.oi1DChangePct >= 0 ? '#4ade80' : '#f87171'
                }}>
                  {data.oi1DChangePct >= 0 ? '+' : ''}{data.oi1DChangePct}%
                </span>
              </div>
              <div style={{ marginTop: '10px' }}>
                {(() => {
                  const bInfo = getBuildupColor(data.buildup);
                  return (
                    <div style={{
                      backgroundColor: bInfo.bg,
                      border: `1px solid ${bInfo.border}`,
                      color: bInfo.text,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      textAlign: 'center'
                    }}>
                      {bInfo.label}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 3. Extreme Sentiment Warning Banner */}
          <div style={{
            backgroundColor: data.sentiment.cotIndex <= 20 ? 'rgba(239, 68, 68, 0.12)' : (data.sentiment.cotIndex >= 80 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(56, 189, 248, 0.08)'),
            border: `1px solid ${data.sentiment.cotIndex <= 20 ? '#ef4444' : (data.sentiment.cotIndex >= 80 ? '#22c55e' : '#0284c7')}`,
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap style={{
                  width: '20px',
                  height: '20px',
                  color: data.sentiment.cotIndex <= 20 ? '#f87171' : (data.sentiment.cotIndex >= 80 ? '#4ade80' : '#38bdf8')
                }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                  {data.sentiment.alertMessage}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {data.sentiment.retailTrapDescription}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Spot Price:</span>
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#f8fafc', fontFamily: 'monospace' }}>
                ₹{data.niftyLtp.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 4. Complete Participant Positioning Matrix Table */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                  Participant-Wise Open Interest & COT Breakdown (GoCharting Matrix)
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Source: Exchange Derivatives Clearing Member Data
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Participant Group</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Long Contracts</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Short Contracts</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Net Position (L - S)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Long vs Short %</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>1-Day Drift</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>5-Day Drift</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>COT Index ({lookbackWeeks}W)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Institutional Bias</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'FII (Foreign Institutional)', code: 'FII', p: data.fii, badge: '#38bdf8' },
                    { name: 'DII (Domestic Institutional)', code: 'DII', p: data.dii, badge: '#34d399' },
                    { name: 'PRO (Proprietary Desks)', code: 'PRO', p: data.pro, badge: '#a855f7' },
                    { name: 'CLIENT (Retail Traders)', code: 'CLIENT', p: data.client, badge: '#fbbf24' }
                  ].map((row, idx) => (
                    <tr
                      key={row.code}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: row.badge }} />
                        {row.name}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>
                        {row.p.long.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>
                        {row.p.short.toLocaleString()}
                      </td>
                      <td style={{
                        padding: '12px 14px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: '800',
                        color: row.p.net >= 0 ? '#4ade80' : '#f87171'
                      }}>
                        {row.p.net >= 0 ? '+' : ''}{row.p.net.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '700' }}>{row.p.longRatio}%</span>
                          <div style={{ width: '60px', height: '5px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${row.p.longRatio}%`, height: '100%', backgroundColor: '#4ade80' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#f87171', fontWeight: '700' }}>{100 - row.p.longRatio}%</span>
                        </div>
                      </td>
                      <td style={{
                        padding: '12px 14px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        color: row.p.change1D >= 0 ? '#4ade80' : '#f87171'
                      }}>
                        {row.p.change1D >= 0 ? '+' : ''}{row.p.change1D.toLocaleString()}
                      </td>
                      <td style={{
                        padding: '12px 14px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        color: row.p.change5D >= 0 ? '#4ade80' : '#f87171'
                      }}>
                        {row.p.change5D >= 0 ? '+' : ''}{row.p.change5D.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            color: row.p.cotIndex <= 20 ? '#ef4444' : (row.p.cotIndex >= 80 ? '#22c55e' : '#38bdf8')
                          }}>
                            {row.p.cotIndex}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: row.p.net > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: row.p.net > 0 ? '#4ade80' : '#f87171',
                          border: `1px solid ${row.p.net > 0 ? '#22c55e' : '#ef4444'}`
                        }}>
                          {row.p.net > 0 ? 'NET LONG' : 'NET SHORT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Interactive Dual-Pane Historical Chart (Price vs FII Net & COT Index) */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '16px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 style={{ width: '16px', height: '16px', color: '#eab308' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                  Macro COT Multi-Week Trend Visualizer ({lookbackWeeks} Weeks Lookback)
                </span>
              </div>
              {hoveredPoint && (
                <div style={{
                  fontSize: '11px',
                  backgroundColor: '#1e293b',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                  display: 'flex',
                  gap: '12px'
                }}>
                  <span>Date: <b style={{ color: '#fff' }}>{hoveredPoint.date}</b></span>
                  <span>Nifty: <b style={{ color: '#eab308' }}>{hoveredPoint.niftyPrice}</b></span>
                  <span>FII Net: <b style={{ color: hoveredPoint.fiiNet >= 0 ? '#4ade80' : '#f87171' }}>{hoveredPoint.fiiNet.toLocaleString()}</b></span>
                  <span>COT Index: <b style={{ color: '#38bdf8' }}>{lookbackWeeks === 26 ? hoveredPoint.cotIndex26 : hoveredPoint.cotIndex52}%</b></span>
                </div>
              )}
            </div>

            {/* SVG Dual Pane Chart */}
            <div style={{ width: '100%', height: '360px', position: 'relative' }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1000 360"
                preserveAspectRatio="none"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <linearGradient id="bullNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#15803d" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="bearNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Background horizontal grid lines */}
                {/* Upper Pane: Price & FII Net (0 to 220px) */}
                <rect x="0" y="0" width="1000" height="220" fill="rgba(15, 23, 42, 0.6)" stroke="#1e293b" />
                <line x1="0" y1="110" x2="1000" y2="110" stroke="#334155" strokeDasharray="3,3" strokeOpacity="0.6" />

                {/* Lower Pane: COT Index 0-100% (230px to 350px) */}
                <rect x="0" y="230" width="1000" height="120" fill="rgba(15, 23, 42, 0.8)" stroke="#1e293b" />

                {/* COT Index Reference Bands */}
                {/* 80% Overbought Band */}
                <line x1="0" y1="254" x2="1000" y2="254" stroke="#22c55e" strokeDasharray="4,4" strokeOpacity="0.8" />
                <text x="10" y="250" fill="#22c55e" fontSize="9" fontWeight="700">80% Extreme Overbought (Distribution Zone)</text>

                {/* 50% Median Line */}
                <line x1="0" y1="290" x2="1000" y2="290" stroke="#475569" strokeDasharray="2,2" strokeOpacity="0.6" />

                {/* 20% Oversold Band */}
                <line x1="0" y1="326" x2="1000" y2="326" stroke="#ef4444" strokeDasharray="4,4" strokeOpacity="0.8" />
                <text x="10" y="340" fill="#ef4444" fontSize="9" fontWeight="700">20% Extreme Oversold (Short Squeeze Reversal Trap)</text>

                {/* Render Bars & Curves */}
                {(() => {
                  if (chartPoints.length === 0) return null;
                  const stepX = 1000 / Math.max(1, chartPoints.length - 1);

                  // 1. FII Net Position Bars in Upper Pane
                  const zeroY = 110;
                  const maxNetAbs = Math.max(Math.abs(chartBounds.minNet), Math.abs(chartBounds.maxNet));

                  // 2. Price Path
                  let pricePathD = '';
                  let cotPathD = '';

                  const barWidth = Math.max(4, stepX * 0.55);

                  const bars = chartPoints.map((pt, i) => {
                    const x = i * stepX;
                    const netY = zeroY - (pt.fiiNet / maxNetAbs) * 90;
                    const barHeight = Math.abs(netY - zeroY);
                    const isBull = pt.fiiNet >= 0;

                    // Price coordinate
                    const priceY = 200 - ((pt.niftyPrice - chartBounds.minPrice) / Math.max(1, chartBounds.maxPrice - chartBounds.minPrice)) * 180;
                    if (i === 0) pricePathD += `M ${x} ${priceY}`;
                    else pricePathD += ` L ${x} ${priceY}`;

                    // COT coordinate (in lower pane 230 to 350)
                    const cotVal = lookbackWeeks === 26 ? pt.cotIndex26 : pt.cotIndex52;
                    const cotY = 350 - (cotVal / 100) * 120;
                    if (i === 0) cotPathD += `M ${x} ${cotY}`;
                    else cotPathD += ` L ${x} ${cotY}`;

                    return (
                      <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                        {/* Hover line */}
                        {hoveredIndex === i && (
                          <line x1={x} y1="0" x2={x} y2="350" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2,2" />
                        )}
                        {/* Net Position Bar */}
                        <rect
                          x={x - barWidth / 2}
                          y={isBull ? netY : zeroY}
                          width={barWidth}
                          height={Math.max(2, barHeight)}
                          fill={isBull ? 'url(#bullNetGrad)' : 'url(#bearNetGrad)'}
                          stroke={isBull ? '#4ade80' : '#f87171'}
                          strokeWidth="0.8"
                          opacity="0.85"
                          rx="1"
                        />
                      </g>
                    );
                  });

                  return (
                    <>
                      {bars}
                      {/* Price Line (Gold) */}
                      <path d={pricePathD} fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
                      {/* COT Line (Cyan) */}
                      <path d={cotPathD} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Chart Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              marginTop: '10px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: '#eab308', borderRadius: '1px' }} />
                <span style={{ color: '#eab308', fontWeight: '700' }}>Nifty 50 Spot Price</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '2px' }} />
                <span style={{ color: '#4ade80', fontWeight: '700' }}>FII Net Long Contracts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                <span style={{ color: '#f87171', fontWeight: '700' }}>FII Net Short Contracts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: '#38bdf8', borderRadius: '1px' }} />
                <span style={{ color: '#38bdf8', fontWeight: '700' }}>COT Index (0% - 100% Oscillator)</span>
              </div>
            </div>
          </div>

          {/* 6. Option Sentiment & GoCharting Rules Playbook */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '12px'
          }}>
            {/* Options Open Interest Box */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <PieChart style={{ width: '16px', height: '16px', color: '#a855f7' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                  FII Index Options Delta Breakdown
                </span>
              </div>
              {data.fii.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Calls Positioning:</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: data.fii.options.netCalls >= 0 ? '#4ade80' : '#f87171' }}>
                      {data.fii.options.netCalls >= 0 ? '+' : ''}{data.fii.options.netCalls.toLocaleString()} Net Calls
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Puts Positioning:</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: data.fii.options.netPuts >= 0 ? '#4ade80' : '#f87171' }}>
                      {data.fii.options.netPuts >= 0 ? '+' : ''}{data.fii.options.netPuts.toLocaleString()} Net Puts
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>FII Options Bias:</span>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#38bdf8' }}>
                      {data.fii.options.optionBias}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* GoCharting Macro Rules */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Compass style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                  Institutional COT Trading Playbook
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.rules.map((rule, rIdx) => (
                  <div
                    key={rIdx}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderLeft: '3px solid #38bdf8',
                      borderRadius: '0 4px 4px 0'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#e2e8f0' }}>{rule.title}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.4' }}>{rule.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
