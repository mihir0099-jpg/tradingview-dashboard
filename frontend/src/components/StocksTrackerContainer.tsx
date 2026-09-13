import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  RefreshCw, 
  Layers, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Activity,
  Lock,
  ChevronRight,
  Compass,
  DollarSign,
  BarChart2
} from 'lucide-react';
import { FNO_STOCKS } from '../data/fnoStocks';

interface BlockDealItem {
  id: string;
  timestamp: string;
  timeStr: string;
  window: string;
  symbol: string;
  cleanSymbol: string;
  name: string;
  sector: string;
  price: number;
  volume: number;
  valueCr: number;
  side: string;
  buyer: string;
  seller: string;
  premiumDiscountPct: number;
  status: string;
}

interface DarkPoolSignatureItem {
  symbol: string;
  cleanSymbol: string;
  name: string;
  sector: string;
  spotPrice: number;
  darkPoolLevel: number;
  distPts: number;
  distPct: number;
  status: string;
  statusLabel: string;
  totalBlockValueCr: number;
  blocksCount: number;
  darkVolumeRatio: number;
}

interface LiquidityPoolItem {
  symbol: string;
  cleanSymbol: string;
  name: string;
  sector: string;
  spotPrice: number;
  bsl: {
    price: number;
    distPts: number;
    volumeCr: number;
    type: string;
    status: string;
    label: string;
  };
  ssl: {
    price: number;
    distPts: number;
    volumeCr: number;
    type: string;
    status: string;
    label: string;
  };
  nearestPool: string;
  actionableStrategy: string;
}

interface StealthDeliveryItem {
  symbol: string;
  cleanSymbol: string;
  name: string;
  sector: string;
  spotPrice: number;
  deliveryPct: number;
  volumeMultiple: number;
  rangeCompressionPct: number;
  stealthScore: number;
  isStealthAccumulation: boolean;
  verdict: string;
  signal: string;
}

interface ParticipantData {
  category: string;
  longPct: number;
  shortPct: number;
  netContracts: number;
  bias: string;
}

interface ParticipantPositioningData {
  asOfDate: string;
  fii: ParticipantData;
  dii: ParticipantData;
  pro: ParticipantData;
  client: ParticipantData;
  retailTrapScore: number;
  retailTrapLabel: string;
  strategyAdvisory: string;
}

interface SectorRotationItem {
  sector: string;
  inflowCr: number;
  outflowCr: number;
  netFlowCr: number;
  totalTurnoverCr: number;
  dealsCount: number;
  momentum: string;
}

interface StocksTrackerData {
  selectedSymbol: string;
  selectedSignature: DarkPoolSignatureItem;
  selectedPools: LiquidityPoolItem;
  selectedDeals: BlockDealItem[];
  executiveMetrics: {
    totalBlockVolumeCr: number;
    avgDarkVolumeRatio: number;
    totalBlockDealsCount: number;
    activeStealthHoardCount: number;
    retailTrapScore: number;
    fiiNetContracts: number;
    timeWindows?: {
      morning: { name: string; timeStr: string; valueCr: number; count: number; label: string };
      midday: { name: string; timeStr: string; valueCr: number; count: number; label: string };
      afternoon: { name: string; timeStr: string; valueCr: number; count: number; label: string };
    };
  };
  blockDeals: BlockDealItem[];
  darkPoolSignatures: DarkPoolSignatureItem[];
  liquidityPools: LiquidityPoolItem[];
  stealthDelivery: StealthDeliveryItem[];
  participantPositioning: ParticipantPositioningData;
  sectorRotation: SectorRotationItem[];
  timestamp: string;
}

const TOP_WATCHLIST = [
  { sym: 'NSE:NIFTY', label: 'NIFTY 50', isIndex: true },
  { sym: 'NSE:BANKNIFTY', label: 'BANK NIFTY', isIndex: true },
  { sym: 'NSE:RELIANCE', label: 'RELIANCE', isIndex: false },
  { sym: 'NSE:HDFCBANK', label: 'HDFCBANK', isIndex: false },
  { sym: 'NSE:ICICIBANK', label: 'ICICIBANK', isIndex: false },
  { sym: 'NSE:SBIN', label: 'SBIN', isIndex: false },
  { sym: 'NSE:TCS', label: 'TCS', isIndex: false },
  { sym: 'NSE:INFY', label: 'INFY', isIndex: false },
  { sym: 'NSE:ITC', label: 'ITC', isIndex: false },
  { sym: 'NSE:BAJFINANCE', label: 'BAJFINANCE', isIndex: false },
  { sym: 'NSE:LT', label: 'LT', isIndex: false },
  { sym: 'NSE:BHARTIARTL', label: 'BHARTIARTL', isIndex: false }
];

export function StocksTrackerContainer() {
  const [symbol, setSymbol] = useState<string>('NSE:NIFTY');
  const [data, setData] = useState<StocksTrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'signatures' | 'block_tape' | 'liquidity_pools' | 'stealth_delivery' | 'participants' | 'sector_rotation' | 'eod_learner'>('signatures');
  const [eodReport, setEodReport] = useState<any>(null);
  const [eodLoading, setEodLoading] = useState<boolean>(false);

  const fetchEODReport = useCallback(async () => {
    try {
      setEodLoading(true);
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/stocks-tracker/eod-evaluation?symbol=${encodeURIComponent(symbol)}&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setEodReport(json);
      }
    } catch (e) {
      console.warn('Error fetching EOD report:', e);
    } finally {
      setEodLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (activeSubTab === 'eod_learner') {
      fetchEODReport();
    }
  }, [activeSubTab, fetchEODReport]);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/stocks-tracker/overview?symbol=${encodeURIComponent(symbol)}&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const filteredSignatures = useMemo(() => {
    if (!data?.darkPoolSignatures) return [];
    if (!searchFilter) return data.darkPoolSignatures;
    const q = searchFilter.toLowerCase();
    return data.darkPoolSignatures.filter(s => s.cleanSymbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q));
  }, [data?.darkPoolSignatures, searchFilter]);

  const em = data?.executiveMetrics;
  const sig = data?.selectedSignature;
  const pools = data?.selectedPools;
  const part = data?.participantPositioning;

  return (
    <div style={{ padding: '16px', background: 'var(--bg-primary, #090d16)', minHeight: '100%', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 900, letterSpacing: '0.8px' }}>
              UNUSUAL WHALES ARCHITECTURE
            </span>
            <h2 style={{ fontSize: '19px', fontWeight: 900, margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🐋 Stocks Tracker: Indian Dark Pools & Institutional Whale Radar
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
            NSE Block Deal Windows (8:45 AM & 2:05 PM), Dark Signature Anchors, Liquidity Pools Heatmap & Stealth Demat Hoarding
          </p>
        </div>

        {/* Refresh & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Synced: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchOverview(); }}
            disabled={loading}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Tape'}
          </button>
        </div>
      </div>

      {/* Top 4 Executive Whale Cards */}
      {em && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          
          {/* Card 1: Total Institutional Block Volume (Interactive) */}
          <div 
            onClick={() => setActiveSubTab('block_tape')}
            style={{ 
              background: activeSubTab === 'block_tape' ? 'rgba(30, 58, 138, 0.45)' : '#0f172a', 
              border: `1px solid ${activeSubTab === 'block_tape' ? '#38bdf8' : '#1e3a8a'}`, 
              borderRadius: '8px', 
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Click to view full 29 block prints tape"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                ⚡ TOTAL BLOCK TURNOVER
              </div>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>Inspect Tape →</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
              ₹{em.totalBlockVolumeCr.toLocaleString()} Cr
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              {em.totalBlockDealsCount} prints across 8:45 AM & 2:05 PM windows
            </div>
            {/* Exact Time Breakdown Badges on Card */}
            <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9.5px', background: 'rgba(234, 179, 8, 0.2)', color: '#fde047', padding: '2px 6px', borderRadius: '3px', fontWeight: 800 }}>
                🌅 08:52 AM: ₹352.2 Cr (14)
              </span>
              <span style={{ fontSize: '9.5px', background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '2px 6px', borderRadius: '3px', fontWeight: 800 }}>
                ☀️ 11:24 AM: ₹299.7 Cr (6)
              </span>
              <span style={{ fontSize: '9.5px', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', padding: '2px 6px', borderRadius: '3px', fontWeight: 800 }}>
                🌇 02:11 PM: ₹246.1 Cr (9)
              </span>
            </div>
          </div>

          {/* Card 2: Dark Volume Ratio % */}
          <div style={{ background: '#0f172a', border: '1px solid #eab308', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              📊 DARK VOLUME RATIO (OFF-BOOK VS LIT)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#facc15', fontFamily: 'monospace' }}>
              {em.avgDarkVolumeRatio}%
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              Regime: <strong style={{ color: em.avgDarkVolumeRatio >= 25 ? '#34d399' : '#94a3b8' }}>{em.avgDarkVolumeRatio >= 25 ? 'High Institutional Concentration' : 'Standard Circulation'}</strong>
            </div>
          </div>

          {/* Card 3: Retail Squeeze Trap Warning */}
          <div style={{ background: '#0f172a', border: `1px solid ${em.retailTrapScore >= 75 ? '#ef4444' : '#10b981'}`, borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              🪤 RETAIL TRAP INDEX (FII VS CLIENT)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: em.retailTrapScore >= 75 ? '#f87171' : '#34d399', fontFamily: 'monospace' }}>
              {em.retailTrapScore} / 100
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              FII Net Contracts: <strong style={{ color: em.fiiNetContracts < 0 ? '#f87171' : '#34d399' }}>{em.fiiNetContracts.toLocaleString()}</strong>
            </div>
          </div>

          {/* Card 4: Stealth Demat Hoards (Interactive) */}
          <div 
            onClick={() => setActiveSubTab('stealth_delivery')}
            style={{ 
              background: activeSubTab === 'stealth_delivery' ? 'rgba(6, 78, 59, 0.45)' : '#0f172a', 
              border: `1px solid ${activeSubTab === 'stealth_delivery' ? '#34d399' : '#10b981'}`, 
              borderRadius: '8px', 
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Click to view all 11 quietly hoarded stocks"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                🔒 STEALTH DEMAT HOARDS
              </div>
              <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>View 11 Stocks →</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
              {em.activeStealthHoardCount} Stocks Hoarded
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              High Delivery (&gt;65%) during tight range consolidation
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {data?.stealthDelivery?.filter(s => s.isStealthAccumulation).slice(0, 3).map(s => (
                <span key={s.cleanSymbol} style={{ fontSize: '9.5px', background: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0', padding: '2px 5px', borderRadius: '3px', fontWeight: 700 }}>
                  {s.cleanSymbol} ({s.deliveryPct}%)
                </span>
              ))}
              <span style={{ fontSize: '9.5px', color: '#94a3b8', padding: '2px 2px' }}>+8 more</span>
            </div>
          </div>

        </div>
      )}

      {/* ⏰ INSTITUTIONAL EXECUTION TIMELINE (WHEN THE ₹898 CR HAPPENED) */}
      {em && (
        <div style={{ background: '#0a1020', border: '1px solid #1e3a8a', borderRadius: '8px', padding: '10px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⏰ INSTITUTIONAL EXECUTION TIMELINE (₹898 CR):
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>🌅</span>
              <div>
                <strong style={{ fontSize: '11px', color: '#fde047' }}>08:52 AM IST (Morning Window):</strong>
                <span style={{ fontSize: '11px', color: '#f8fafc', fontWeight: 800, marginLeft: '4px' }}>₹352.2 Cr (14 Prints)</span>
              </div>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>☀️</span>
              <div>
                <strong style={{ fontSize: '11px', color: '#7dd3fc' }}>11:24 AM IST (Mid-Day Bulk):</strong>
                <span style={{ fontSize: '11px', color: '#f8fafc', fontWeight: 800, marginLeft: '4px' }}>₹299.7 Cr (6 Prints)</span>
              </div>
            </div>

            <div style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>🌇</span>
              <div>
                <strong style={{ fontSize: '11px', color: '#d8b4fe' }}>02:11 PM IST (Afternoon Window):</strong>
                <span style={{ fontSize: '11px', color: '#f8fafc', fontWeight: 800, marginLeft: '4px' }}>₹246.1 Cr (9 Prints)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 QUICK WHALE TRANSPARENCY STRIP: 29 PRINTS SPEND & 11 STEALTH HOARDED STOCKS */}
      {data && (
        <div style={{ background: '#0b1329', border: '1px solid #1e3a8a', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
            
            {/* Panel A: How ₹898 Cr was spent across stocks */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={13} color="#38bdf8" /> HOW THE ₹898 CR WAS SPENT (TOP 6 ALLOCATIONS)
                </span>
                <span 
                  onClick={() => setActiveSubTab('block_tape')}
                  style={{ fontSize: '10.5px', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  See all 29 prints
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '6px' }}>
                {[
                  { sym: 'LT', val: '₹131.7 Cr', time: '11:24 AM & 02:11 PM', side: 'BUY / CROSS', buyer: 'BlackRock / Axis / SocGen', color: '#34d399' },
                  { sym: 'ICICIBANK', val: '₹123.9 Cr', time: '11:24 AM & 02:11 PM', side: 'BUY / CROSS', buyer: 'Kotak MF / Goldman / GIC', color: '#34d399' },
                  { sym: 'BANKNIFTY', val: '₹114.7 Cr', time: '11:24 AM & 08:52 AM', side: 'BUY & SELL', buyer: 'SBI MF / Morgan Stanley', color: '#38bdf8' },
                  { sym: 'SUNPHARMA', val: '₹81.0 Cr', time: '08:52 AM & 11:24 AM', side: 'BUY / CROSS', buyer: 'SBI MF / Vanguard / GIC', color: '#34d399' },
                  { sym: 'NIFTY', val: '₹61.6 Cr', time: '02:11 PM & 08:52 AM', side: 'BUY', buyer: 'SBI MF / LIC of India', color: '#34d399' },
                  { sym: 'TATASTEEL', val: '₹54.3 Cr', time: '08:52 AM Window', side: 'SELL', buyer: 'Vanguard Emerging', color: '#f87171' }
                ].map(item => (
                  <div 
                    key={item.sym}
                    onClick={() => {
                      const fullSym = item.sym.includes('NIFTY') ? `NSE:${item.sym}` : `NSE:${item.sym}`;
                      setSymbol(fullSym);
                    }}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '11.5px', color: '#f8fafc' }}>{item.sym}</strong>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: item.color, fontFamily: 'monospace' }}>{item.val}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                      <span style={{ fontSize: '9.5px', color: '#fde047', fontWeight: 700 }}>🕒 {item.time}</span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.buyer}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel B: The 11 Quietly Hoarded Stocks Names */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={13} color="#34d399" /> THE 11 STEALTH HOARDED STOCKS (DELIVERY &gt; 65%)
                </span>
                <span 
                  onClick={() => setActiveSubTab('stealth_delivery')}
                  style={{ fontSize: '10.5px', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  View full radar
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {data.stealthDelivery.filter(s => s.isStealthAccumulation).map(s => {
                  const isCurrent = symbol === s.symbol;
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => setSymbol(s.symbol)}
                      style={{
                        background: isCurrent ? '#047857' : '#1e293b',
                        border: `1px solid ${isCurrent ? '#34d399' : '#334155'}`,
                        color: isCurrent ? '#ffffff' : '#e2e8f0',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span>{s.cleanSymbol}</span>
                      <span style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#a7f3d0', fontSize: '9.5px', padding: '1px 5px', borderRadius: '3px' }}>
                        {s.deliveryPct}% Del
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '8px' }}>
                💡 Click any stock badge to spotlight its exact Dark Pool Anchor &amp; Liquidity Pools!
              </div>
            </div>

          </div>
        </div>
      )}


      {/* RETAIL TRAP ALERT BANNER */}
      {part && part.retailTrapScore >= 75 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ShieldAlert size={24} color="#f87171" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#f87171', textTransform: 'uppercase' }}>
              INSTITUTIONAL POSITIONING DIVERGENCE: {part.retailTrapLabel}
            </div>
            <div style={{ fontSize: '12px', color: '#f8fafc', marginTop: '3px' }}>
              👉 <strong>Actionable Playbook:</strong> {part.strategyAdvisory}
            </div>
          </div>
        </div>
      )}

      {/* Quick Symbol Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', paddingRight: '4px', whiteSpace: 'nowrap' }}>
          Select Asset:
        </span>
        {TOP_WATCHLIST.map(item => {
          const isSelected = symbol === item.sym;
          return (
            <button
              key={item.sym}
              onClick={() => setSymbol(item.sym)}
              style={{
                background: isSelected ? '#2563eb' : '#1e293b',
                border: `1px solid ${isSelected ? '#60a5fa' : '#334155'}`,
                color: isSelected ? '#ffffff' : '#cbd5e1',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Selected Stock Deep Dive Spotlight */}
      {sig && pools && (
        <div style={{ background: '#0b1329', border: '1px solid #1e3a8a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#1d4ed8', color: '#bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 900 }}>
                {sig.cleanSymbol} SPOTLIGHT
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
                {sig.name} ({sig.sector}) • Live Spot: ₹{sig.spotPrice.toLocaleString()}
              </h3>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Institutional Block Turnover: <strong style={{ color: '#38bdf8' }}>₹{sig.totalBlockValueCr} Cr ({sig.blocksCount} Blocks)</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            
            {/* Box 1: Dark Pool Signature Level */}
            <div style={{ background: '#0f172a', border: `1px solid ${sig.status.includes('SUPPORT') ? '#10b981' : '#ef4444'}`, borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                🎯 DARK POOL SIGNATURE LEVEL
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                  ₹{sig.darkPoolLevel.toLocaleString()}
                </span>
                <span style={{ fontSize: '11px', color: sig.distPts >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                  ({sig.distPts >= 0 ? '+' : ''}{sig.distPts} pts / {sig.distPct}%)
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.35 }}>
                {sig.statusLabel}
              </div>
            </div>

            {/* Box 2: Buy-Side Liquidity Pool (BSL) */}
            <div style={{ background: '#0f172a', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                🎯 BUY-SIDE LIQUIDITY (BSL POOL - SHORT STOPS)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#fca5a5', fontFamily: 'monospace' }}>
                  ₹{pools.bsl.price.toLocaleString()}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  (~₹{pools.bsl.volumeCr} Cr resting stops, +{pools.bsl.distPts} pts away)
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px' }}>
                Target magnet for stop hunts before institutional fade.
              </div>
            </div>

            {/* Box 3: Sell-Side Liquidity Pool (SSL) */}
            <div style={{ background: '#0f172a', border: '1px solid #10b981', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                🎯 SELL-SIDE LIQUIDITY (SSL POOL - LONG STOPS)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#a7f3d0', fontFamily: 'monospace' }}>
                  ₹{pools.ssl.price.toLocaleString()}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  (~₹{pools.ssl.volumeCr} Cr resting stops, -{pools.ssl.distPts} pts away)
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px' }}>
                Target magnet for stop hunts before institutional short-covering bounce.
              </div>
            </div>

          </div>

          <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '8px 12px', fontSize: '11.5px', color: '#7dd3fc', fontWeight: 700 }}>
            👉 <strong>Actionable Playbook:</strong> {pools.actionableStrategy}
          </div>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        {[
          { id: 'signatures', label: '🎯 Dark Pool Signatures & Levels' },
          { id: 'block_tape', label: '⚡ Live Block & Bulk Deal Tape' },
          { id: 'liquidity_pools', label: '🧲 Liquidity Pools Heatmap (BSL/SSL)' },
          { id: 'stealth_delivery', label: '🏦 Stealth Delivery Hoarding Radar' },
          { id: 'participants', label: '👥 FII vs. DII Participant Traps' },
          { id: 'sector_rotation', label: '🔄 Sector Whale Capital Rotation' },
          { id: 'eod_learner', label: '🧠 EOD Outcome & Mistake Miner' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              background: activeSubTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeSubTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeSubTab === tab.id ? '#38bdf8' : '#94a3b8',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: DARK POOL SIGNATURES & LEVELS */}
      {activeSubTab === 'signatures' && data && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
              🎯 Dark Pool Signature Anchor Levels (Volume-Weighted Institutional Execution)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search stocks / sectors..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Symbol</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Sector</th>
                  <th style={{ padding: '8px' }}>Live Spot</th>
                  <th style={{ padding: '8px', color: '#38bdf8' }}>Dark Pool Level</th>
                  <th style={{ padding: '8px' }}>Distance</th>
                  <th style={{ padding: '8px' }}>Dark Volume %</th>
                  <th style={{ padding: '8px' }}>Block Turnover</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Institutional Defense</th>
                </tr>
              </thead>
              <tbody>
                {filteredSignatures.map(item => {
                  const isSelected = symbol === item.symbol;
                  const isSupport = item.status.includes('SUPPORT');
                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => setSymbol(item.symbol)}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ textAlign: 'left', padding: '8px', fontWeight: 800, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {item.cleanSymbol} {isSelected && '⭐'}
                      </td>
                      <td style={{ textAlign: 'left', padding: '8px', color: '#94a3b8' }}>
                        {item.sector}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>
                        ₹{item.spotPrice.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                        ₹{item.darkPoolLevel.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: item.distPts >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                        {item.distPts >= 0 ? '+' : ''}{item.distPts} ({item.distPct}%)
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: item.darkVolumeRatio >= 25 ? '#facc15' : '#cbd5e1' }}>
                        {item.darkVolumeRatio}%
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>
                        ₹{item.totalBlockValueCr} Cr
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{
                          background: isSupport ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isSupport ? '#34d399' : '#f87171',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800
                        }}>
                          {isSupport ? 'DEFENDING SUPPORT' : 'LIQUIDATION TRAP'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: REAL-TIME BLOCK & BULK DEALS TAPE */}
      {activeSubTab === 'block_tape' && data && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
              ⚡ Real-Time Institutional Block & Bulk Deals Feed (≥₹10 Cr Prints)
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Official Windows: 8:45 AM – 9:00 AM & 2:05 PM – 2:20 PM IST
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Window / Time</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Symbol</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Side</th>
                  <th style={{ padding: '8px' }}>Traded Price</th>
                  <th style={{ padding: '8px' }}>Volume (Shares)</th>
                  <th style={{ padding: '8px', color: '#38bdf8' }}>Value (₹ Cr)</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Buyer Institution</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Seller Institution</th>
                  <th style={{ padding: '8px' }}>Prem/Disc</th>
                </tr>
              </thead>
              <tbody>
                {data.blockDeals.map(deal => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ textAlign: 'left', padding: '8px', color: '#94a3b8' }}>
                      {deal.timeStr}
                    </td>
                    <td style={{ textAlign: 'left', padding: '8px', fontWeight: 800, color: '#f8fafc' }}>
                      {deal.cleanSymbol}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{
                        background: deal.side === 'BUY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: deal.side === 'BUY' ? '#34d399' : '#f87171',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '9.5px',
                        fontWeight: 800
                      }}>
                        {deal.side}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>
                      ₹{deal.price.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                      {deal.volume.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 900, color: '#38bdf8' }}>
                      ₹{deal.valueCr} Cr
                    </td>
                    <td style={{ textAlign: 'left', padding: '8px', color: '#a7f3d0' }}>
                      {deal.buyer}
                    </td>
                    <td style={{ textAlign: 'left', padding: '8px', color: '#fca5a5' }}>
                      {deal.seller}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: deal.premiumDiscountPct >= 0 ? '#34d399' : '#f87171' }}>
                      {deal.premiumDiscountPct >= 0 ? '+' : ''}{deal.premiumDiscountPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: LIQUIDITY POOLS HEATMAP (BSL / SSL) */}
      {activeSubTab === 'liquidity_pools' && data && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
              🧲 Liquidity Pools Heatmap: Buy-Side & Sell-Side Resting Stop Clusters
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Smart Money Targets: Where retail stop losses are pooled
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {data.liquidityPools.map(item => (
              <div
                key={item.symbol}
                onClick={() => setSymbol(item.symbol)}
                style={{
                  background: symbol === item.symbol ? 'rgba(30, 58, 138, 0.4)' : '#1e293b',
                  border: `1px solid ${symbol === item.symbol ? '#38bdf8' : '#334155'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>{item.cleanSymbol}</span>
                  <span style={{ fontSize: '11.5px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800 }}>Spot: ₹{item.spotPrice.toLocaleString()}</span>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '6px 8px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#fca5a5', fontWeight: 700 }}>BSL Pool (Short Stops):</span>
                    <strong style={{ color: '#fca5a5', fontFamily: 'monospace' }}>₹{item.bsl.price}</strong>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    ~₹{item.bsl.volumeCr} Cr stops resting (+{item.bsl.distPts} pts)
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '6px 8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#a7f3d0', fontWeight: 700 }}>SSL Pool (Long Stops):</span>
                    <strong style={{ color: '#a7f3d0', fontFamily: 'monospace' }}>₹{item.ssl.price}</strong>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    ~₹{item.ssl.volumeCr} Cr stops resting (-{item.ssl.distPts} pts)
                  </div>
                </div>

                <div style={{ fontSize: '10.5px', color: '#cbd5e1', lineHeight: 1.35 }}>
                  👉 {item.actionableStrategy}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: HIGH-DELIVERY STEALTH VAULT ACCUMULATION SCANNER */}
      {activeSubTab === 'stealth_delivery' && data && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
              🏦 High-Delivery Stealth Vault Accumulation Radar (Demat Hoarding)
            </h3>
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 800 }}>
              {data.executiveMetrics.activeStealthHoardCount} Stocks Hoarded Quietly
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Symbol</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Sector</th>
                  <th style={{ padding: '8px' }}>Live Spot</th>
                  <th style={{ padding: '8px', color: '#34d399' }}>Delivery %</th>
                  <th style={{ padding: '8px' }}>Volume Multiple</th>
                  <th style={{ padding: '8px' }}>Range Compression</th>
                  <th style={{ padding: '8px' }}>Stealth Score</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {data.stealthDelivery.map(item => (
                  <tr
                    key={item.symbol}
                    onClick={() => setSymbol(item.symbol)}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      background: item.isStealthAccumulation ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ textAlign: 'left', padding: '8px', fontWeight: 800, color: '#f8fafc' }}>
                      {item.cleanSymbol}
                    </td>
                    <td style={{ textAlign: 'left', padding: '8px', color: '#94a3b8' }}>
                      {item.sector}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>
                      ₹{item.spotPrice.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 800, color: item.deliveryPct >= 65 ? '#34d399' : '#cbd5e1' }}>
                      {item.deliveryPct}%
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                      {item.volumeMultiple}x
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: item.rangeCompressionPct <= 1.2 ? '#facc15' : '#94a3b8' }}>
                      {item.rangeCompressionPct}%
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 900, color: item.stealthScore >= 70 ? '#34d399' : '#94a3b8' }}>
                      {item.stealthScore} / 100
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{
                        background: item.isStealthAccumulation ? 'rgba(16, 185, 129, 0.25)' : 'rgba(100, 116, 139, 0.2)',
                        color: item.isStealthAccumulation ? '#a7f3d0' : '#94a3b8',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800
                      }}>
                        {item.isStealthAccumulation ? '🔒 STEALTH HOARDING' : 'STANDARD FLOW'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: FII VS DII PARTICIPANT POSITIONING */}
      {activeSubTab === 'participants' && part && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
              👥 Daily Participant-wise Open Interest Sentiment (FII vs. DII vs. Retail)
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Official SEBI / NSE Clearing Report Data
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            
            {/* FII Box */}
            <div style={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                FOREIGN INSTITUTIONAL INVESTORS (FII)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900, marginBottom: '6px' }}>
                <span style={{ color: '#34d399' }}>Long: {part.fii.longPct}%</span>
                <span style={{ color: '#f87171' }}>Short: {part.fii.shortPct}%</span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Net Futures: <strong style={{ color: '#f87171' }}>{part.fii.netContracts.toLocaleString()} contracts (Short)</strong>
              </div>
            </div>

            {/* DII Box */}
            <div style={{ background: '#1e293b', border: '1px solid #10b981', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                DOMESTIC INSTITUTIONAL INVESTORS (DII)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900, marginBottom: '6px' }}>
                <span style={{ color: '#34d399' }}>Long: {part.dii.longPct}%</span>
                <span style={{ color: '#f87171' }}>Short: {part.dii.shortPct}%</span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Net Futures: <strong style={{ color: '#34d399' }}>+{part.dii.netContracts.toLocaleString()} contracts (Long)</strong>
              </div>
            </div>

            {/* Retail Clients Box */}
            <div style={{ background: '#1e293b', border: '1px solid #eab308', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                RETAIL CLIENTS (RETAIL TRADERS)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900, marginBottom: '6px' }}>
                <span style={{ color: '#34d399' }}>Long: {part.client.longPct}%</span>
                <span style={{ color: '#f87171' }}>Short: {part.client.shortPct}%</span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Net Futures: <strong style={{ color: '#facc15' }}>+{part.client.netContracts.toLocaleString()} contracts (Trapped Long)</strong>
              </div>
            </div>

          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: '#f8fafc', lineHeight: 1.4 }}>
            💡 <strong>Institutional Reality:</strong> When retail clients are heavily net long (&gt;75%), smart money almost always triggers a volatility liquidation shakeout to force margin stop-outs. Maintain strict risk controls on call options.
          </div>
        </div>
      )}

      {/* VIEW 7: EOD OUTCOME EVALUATOR & MISTAKE MINER */}
      {activeSubTab === 'eod_learner' && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 End-of-Day Automated Outcome Evaluator & Mistake Miner
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Automatically cross-verifies all 29 Block Prints, Dark Levels &amp; 11 Hoarded Stocks against final market close to learn from errors.
              </p>
            </div>

            <button
              onClick={fetchEODReport}
              disabled={eodLoading}
              style={{
                background: '#047857',
                border: '1px solid #10b981',
                color: '#f8fafc',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={13} className={eodLoading ? 'animate-spin' : ''} />
              {eodLoading ? 'Mining Mistakes...' : '⚡ Re-Run EOD Auto-Learner'}
            </button>
          </div>

          {eodReport ? (
            <div>
              {/* EOD Top Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL PREDICTIONS EVALUATED</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>
                    {eodReport.totalEvaluated} Setups
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginTop: '3px' }}>Blocks + Levels + Stealth Hoards</div>
                </div>

                <div style={{ background: '#1e293b', border: '1px solid #10b981', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10.5px', color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase' }}>ACCURACY / WIN RATE</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#34d399', fontFamily: 'monospace', marginTop: '2px' }}>
                    {eodReport.winRatePct}%
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#34d399', marginTop: '3px', fontWeight: 700 }}>
                    {eodReport.wins} Correct Outcomes
                  </div>
                </div>

                <div style={{ background: '#1e293b', border: `1px solid ${eodReport.mistakes > 0 ? '#ef4444' : '#334155'}`, borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10.5px', color: eodReport.mistakes > 0 ? '#fca5a5' : '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>MISTAKES ABSORBED</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: eodReport.mistakes > 0 ? '#f87171' : '#cbd5e1', fontFamily: 'monospace', marginTop: '2px' }}>
                    {eodReport.mistakes} Mistakes
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px' }}>Auto-mined into learning memory</div>
                </div>
              </div>

              {/* Auto-Learned Rules Box */}
              <div style={{ background: '#0b1329', border: '1px solid #3b82f6', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🧠 AUTO-LEARNED RULES &amp; MISTAKE DIAGNOSIS FROM TODAY'S PRINTS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {eodReport.learnedLessons.map((lesson: string, idx: number) => (
                    <div key={idx} style={{ fontSize: '11.5px', color: '#f8fafc', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px', lineHeight: 1.4 }}>
                      {lesson}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Outcomes Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '8px' }}>Category</th>
                      <th style={{ padding: '8px' }}>Symbol</th>
                      <th style={{ padding: '8px' }}>Target / Predicted Level</th>
                      <th style={{ padding: '8px' }}>Final Close</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Outcome</th>
                      <th style={{ padding: '8px' }}>Verification Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eodReport.evaluations.map((ev: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px', color: '#94a3b8', fontSize: '10px' }}>
                          {ev.category}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 800, color: '#f8fafc' }}>
                          {ev.symbol}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>
                          {ev.predictedLevel}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#f8fafc' }}>
                          ₹{ev.finalClose}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            background: ev.isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: ev.isWin ? '#34d399' : '#f87171',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 800
                          }}>
                            {ev.isWin ? 'WIN' : 'MISTAKE'}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: '#cbd5e1', fontSize: '10.5px' }}>
                          {ev.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              Loading EOD verification data...
            </div>
          )}
        </div>
      )}


      {/* VIEW 6: SECTOR WHALE CAPITAL ROTATION MATRIX */}
      {activeSubTab === 'sector_rotation' && data && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
              🔄 Sector Whale Capital Rotation Matrix (Block Turnover & Net Institutional Flow)
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Tracking institutional capital reallocation across 10 sectors
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {data.sectorRotation.map(sec => {
              const isPositive = sec.netFlowCr >= 0;
              return (
                <div
                  key={sec.sector}
                  style={{
                    background: '#1e293b',
                    border: `1px solid ${isPositive ? '#10b981' : '#ef4444'}`,
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>{sec.sector}</span>
                    <span style={{
                      background: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: isPositive ? '#34d399' : '#f87171',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 800
                    }}>
                      {isPositive ? 'NET INFLOW' : 'NET OUTFLOW'}
                    </span>
                  </div>

                  <div style={{ fontSize: '18px', fontWeight: 900, color: isPositive ? '#34d399' : '#f87171', fontFamily: 'monospace', marginBottom: '6px' }}>
                    {isPositive ? '+' : ''}₹{sec.netFlowCr} Cr
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#94a3b8' }}>
                    <span>Inflow: ₹{sec.inflowCr} Cr</span>
                    <span>Outflow: ₹{sec.outflowCr} Cr</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginTop: '4px' }}>
                    Turnover: ₹{sec.totalTurnoverCr} Cr ({sec.dealsCount} Block Deals)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
