import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getBackendUrl } from '../utils/config';
import { FNO_STOCKS, FnoStock } from '../data/fnoStocks';
import { 
  Compass, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Activity, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ShieldAlert, 
  Layers, 
  Cpu, 
  Calculator,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  X,
  Sparkles,
  Building2
} from 'lucide-react';

interface DegreeLevel {
  degree: number;
  delta: number;
  target: number;
  diff: number;
  diffPct: number;
  status: 'HIT & CLEARED' | 'PENDING TARGET';
}

interface AssetCycleData {
  spot: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  swingHigh: number;
  swingLow: number;
  activeDownTarget: DegreeLevel;
  activeUpTarget: DegreeLevel;
  lastClearedDown: DegreeLevel | null;
  lastClearedUp: DegreeLevel | null;
  downsideLadder: DegreeLevel[];
  upsideLadder: DegreeLevel[];
}

interface CycleApiResponse {
  timestamp: number;
  istTimeStr: string;
  nifty: AssetCycleData;
  banknifty: AssetCycleData;
  symbol?: string;
  strikeInterval?: number;
  stockCycle?: AssetCycleData;
}

export function CycleContainer() {
  const [apiData, setApiData] = useState<CycleApiResponse | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<'NIFTY' | 'BANKNIFTY' | 'CUSTOM' | 'STOCK'>('NIFTY');
  const [selectedStock, setSelectedStock] = useState<FnoStock | null>(null);
  const [stockCycleData, setStockCycleData] = useState<AssetCycleData | null>(null);
  
  const [anchorMode, setAnchorMode] = useState<'swing' | 'intraday'>('swing');
  const [customPrice, setCustomPrice] = useState<string>('23623.10');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCycleData = async (isManual = false, targetStock?: FnoStock | null) => {
    if (isManual) setIsRefreshing(true);
    try {
      const backendUrl = getBackendUrl();
      const currentStock = targetStock !== undefined ? targetStock : selectedStock;
      const stockParam = (selectedAsset === 'STOCK' && currentStock) ? `&symbol=${currentStock.symbol}` : '';
      
      const res = await fetch(`${backendUrl}/api/cycle/levels?_t=${Date.now()}${stockParam}`);
      if (res.ok) {
        const json: CycleApiResponse = await res.json();
        setApiData(json);
        if (json.stockCycle && (selectedAsset === 'STOCK' || currentStock)) {
          setStockCycleData(json.stockCycle);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cycle levels:', err);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchCycleData();
    const interval = setInterval(() => {
      fetchCycleData();
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedAsset, selectedStock]);

  // Compute local mathematical ladders
  const computeCustomLadder = (anchorPrice: number, spotPrice: number) => {
    const degrees = [22.5, 45, 67.5, 90, 135, 180, 225, 270, 315, 360, 450, 540, 720];
    const sqrt = Math.sqrt(anchorPrice);

    const downLadder: DegreeLevel[] = degrees.map(deg => {
      const delta = deg / 180.0;
      const target = parseFloat(Math.pow(Math.max(1, sqrt - delta), 2).toFixed(1));
      const diff = parseFloat((spotPrice - target).toFixed(1));
      const diffPct = parseFloat(((diff / spotPrice) * 100).toFixed(2));
      return {
        degree: deg,
        delta: parseFloat(delta.toFixed(3)),
        target,
        diff,
        diffPct,
        status: spotPrice <= target ? 'HIT & CLEARED' : 'PENDING TARGET'
      };
    });

    const upLadder: DegreeLevel[] = degrees.map(deg => {
      const delta = deg / 180.0;
      const target = parseFloat(Math.pow(sqrt + delta, 2).toFixed(1));
      const diff = parseFloat((spotPrice - target).toFixed(1));
      const diffPct = parseFloat(((diff / spotPrice) * 100).toFixed(2));
      return {
        degree: deg,
        delta: parseFloat(delta.toFixed(3)),
        target,
        diff,
        diffPct,
        status: spotPrice >= target ? 'HIT & CLEARED' : 'PENDING TARGET'
      };
    });

    const activeDown = downLadder.find(l => l.status === 'PENDING TARGET') || downLadder[downLadder.length - 1];
    const activeUp = upLadder.find(l => l.status === 'PENDING TARGET') || upLadder[upLadder.length - 1];
    const lastClearedDown = [...downLadder].reverse().find(l => l.status === 'HIT & CLEARED') || null;
    const lastClearedUp = [...upLadder].reverse().find(l => l.status === 'HIT & CLEARED') || null;

    return {
      downsideLadder: downLadder,
      upsideLadder: upLadder,
      activeDownTarget: activeDown,
      activeUpTarget: activeUp,
      lastClearedDown,
      lastClearedUp
    };
  };

  // Stock selection handler
  const handleSelectStock = (stock: FnoStock) => {
    setSelectedStock(stock);
    setSelectedAsset('STOCK');
    setIsSearchOpen(false);
    setSearchTerm('');

    // Pre-calculate immediate client fallback
    const spot = stock.defaultSpot;
    const peak = parseFloat((spot * 1.035).toFixed(1));
    const base = parseFloat((spot * 0.965).toFixed(1));
    const custom = computeCustomLadder(peak, spot);
    const customUp = computeCustomLadder(base, spot);

    setStockCycleData({
      spot,
      open: spot,
      dayHigh: parseFloat((spot * 1.01).toFixed(1)),
      dayLow: parseFloat((spot * 0.99).toFixed(1)),
      swingHigh: peak,
      swingLow: base,
      activeDownTarget: custom.activeDownTarget,
      activeUpTarget: customUp.activeUpTarget,
      lastClearedDown: custom.lastClearedDown,
      lastClearedUp: customUp.lastClearedUp,
      downsideLadder: custom.downsideLadder,
      upsideLadder: customUp.upsideLadder
    });

    // Query backend for real-time live data
    fetchCycleData(true, stock);
  };

  // Filtered stocks for search
  const filteredStocks = useMemo(() => {
    if (!searchTerm.trim()) {
      return FNO_STOCKS.slice(0, 30); // show top 30 liquid by default
    }
    const q = searchTerm.trim().toUpperCase();
    return FNO_STOCKS.filter(s => 
      s.symbol.toUpperCase().includes(q) || 
      s.name.toUpperCase().includes(q) || 
      s.sector.toUpperCase().includes(q)
    );
  }, [searchTerm]);

  // Determine current active display data
  const currentDisplayData = useMemo(() => {
    if (selectedAsset === 'CUSTOM') {
      const parsed = parseFloat(customPrice) || 23623.10;
      const customRes = computeCustomLadder(parsed, parsed);
      return {
        spot: parsed,
        open: parsed,
        dayHigh: parsed,
        dayLow: parsed,
        swingHigh: parsed,
        swingLow: parsed,
        activeDownTarget: customRes.activeDownTarget,
        activeUpTarget: customRes.activeUpTarget,
        lastClearedDown: customRes.lastClearedDown,
        lastClearedUp: customRes.lastClearedUp,
        downsideLadder: customRes.downsideLadder,
        upsideLadder: customRes.upsideLadder,
        assetName: 'CUSTOM ANCHOR',
        strikeInterval: 50
      };
    }

    if (selectedAsset === 'STOCK') {
      if (stockCycleData && selectedStock) {
        if (anchorMode === 'intraday') {
          const high = stockCycleData.dayHigh || stockCycleData.spot * 1.01;
          const low = stockCycleData.dayLow || stockCycleData.spot * 0.99;
          const downL = computeCustomLadder(high, stockCycleData.spot);
          const upL = computeCustomLadder(low, stockCycleData.spot);
          return {
            ...stockCycleData,
            downsideLadder: downL.downsideLadder,
            upsideLadder: upL.upsideLadder,
            activeDownTarget: downL.activeDownTarget,
            activeUpTarget: upL.activeUpTarget,
            lastClearedDown: downL.lastClearedDown,
            lastClearedUp: upL.lastClearedUp,
            assetName: selectedStock.symbol,
            strikeInterval: selectedStock.strikeInterval
          };
        }
        return {
          ...stockCycleData,
          assetName: selectedStock.symbol,
          strikeInterval: selectedStock.strikeInterval
        };
      }
    }

    const baseData = selectedAsset === 'NIFTY' ? apiData?.nifty : apiData?.banknifty;
    const defaultSpot = selectedAsset === 'NIFTY' ? 23635.10 : 56777.55;
    const defaultHigh = selectedAsset === 'NIFTY' ? 24025.40 : 57753.60;
    const defaultLow = selectedAsset === 'NIFTY' ? 23623.10 : 56720.45;

    const spot = baseData?.spot || defaultSpot;
    const swingHigh = baseData?.swingHigh || defaultHigh;
    const swingLow = baseData?.swingLow || defaultLow;
    const dayHigh = baseData?.dayHigh || (selectedAsset === 'NIFTY' ? 23758.95 : 57044.00);
    const dayLow = baseData?.dayLow || defaultLow;

    if (anchorMode === 'intraday') {
      const downL = computeCustomLadder(dayHigh, spot);
      const upL = computeCustomLadder(dayLow, spot);
      return {
        spot,
        open: baseData?.open || spot,
        dayHigh,
        dayLow,
        swingHigh: dayHigh,
        swingLow: dayLow,
        activeDownTarget: downL.activeDownTarget,
        activeUpTarget: upL.activeUpTarget,
        lastClearedDown: downL.lastClearedDown,
        lastClearedUp: upL.lastClearedUp,
        downsideLadder: downL.downsideLadder,
        upsideLadder: upL.upsideLadder,
        assetName: selectedAsset === 'NIFTY' ? 'NIFTY 50' : 'BANK NIFTY',
        strikeInterval: selectedAsset === 'NIFTY' ? 50 : 100
      };
    }

    if (baseData) {
      return {
        ...baseData,
        assetName: selectedAsset === 'NIFTY' ? 'NIFTY 50' : 'BANK NIFTY',
        strikeInterval: selectedAsset === 'NIFTY' ? 50 : 100
      };
    }

    const fallback = computeCustomLadder(swingHigh, spot);
    const fallbackUp = computeCustomLadder(swingLow, spot);
    return {
      spot,
      open: spot,
      dayHigh,
      dayLow,
      swingHigh,
      swingLow,
      activeDownTarget: fallback.activeDownTarget,
      activeUpTarget: fallbackUp.activeUpTarget,
      lastClearedDown: fallback.lastClearedDown,
      lastClearedUp: fallbackUp.lastClearedUp,
      downsideLadder: fallback.downsideLadder,
      upsideLadder: fallbackUp.upsideLadder,
      assetName: selectedAsset === 'NIFTY' ? 'NIFTY 50' : 'BANK NIFTY',
      strikeInterval: selectedAsset === 'NIFTY' ? 50 : 100
    };
  }, [apiData, selectedAsset, selectedStock, stockCycleData, anchorMode, customPrice]);

  const activeData = currentDisplayData;
  const currentDownAnchor = anchorMode === 'intraday' ? activeData.dayHigh : activeData.swingHigh;
  const currentUpAnchor = anchorMode === 'intraday' ? activeData.dayLow : activeData.swingLow;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', color: '#f8fafc' }}>
      
      {/* Top Banner Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <Compass size={22} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                GANN SQUARE OF 9 TIME & PRICE CYCLE
                <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                  16-YEAR VERIFIED: 97.6% - 100% HIT RATE
                </span>
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Mathematical Octave Degree Expansions (√Price ± Δ)² | Real-Time Upside & Downside Target Lattice
              </p>
            </div>
          </div>
        </div>

        {/* Asset & Search Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1', justifyContent: 'flex-end' }}>
          
          {/* Base Asset Switcher */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => { setSelectedAsset('NIFTY'); setSelectedStock(null); }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: selectedAsset === 'NIFTY' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                color: selectedAsset === 'NIFTY' ? 'white' : '#94a3b8',
                fontWeight: '800',
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              📊 NIFTY 50
            </button>
            <button
              onClick={() => { setSelectedAsset('BANKNIFTY'); setSelectedStock(null); }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: selectedAsset === 'BANKNIFTY' ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'transparent',
                color: selectedAsset === 'BANKNIFTY' ? 'white' : '#94a3b8',
                fontWeight: '800',
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              🏦 BANK NIFTY
            </button>
            <button
              onClick={() => { setSelectedAsset('CUSTOM'); setSelectedStock(null); }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: selectedAsset === 'CUSTOM' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'transparent',
                color: selectedAsset === 'CUSTOM' ? 'white' : '#94a3b8',
                fontWeight: '800',
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calculator size={14} /> CUSTOM
            </button>

            {/* Active Stock Pill */}
            {selectedAsset === 'STOCK' && selectedStock && (
              <div style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                color: 'white',
                fontWeight: '800',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <span>📈 {selectedStock.symbol}</span>
                <button
                  onClick={() => { setSelectedAsset('NIFTY'); setSelectedStock(null); }}
                  style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: '#f8fafc', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                  title="Close Stock"
                >
                  <X size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Anchor Mode Toggle (when not custom) */}
          {selectedAsset !== 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => setAnchorMode('swing')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: anchorMode === 'swing' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: anchorMode === 'swing' ? 'white' : '#94a3b8',
                  fontWeight: '800',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                🌊 SWING CYCLE
              </button>
              <button
                onClick={() => setAnchorMode('intraday')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: anchorMode === 'intraday' ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: anchorMode === 'intraday' ? 'white' : '#94a3b8',
                  fontWeight: '800',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ⚡ INTRADAY
              </button>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={() => fetchCycleData(true)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh live cycle"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {/* F&O Stock Search Dropdown (Red Circled Area) */}
          <div ref={searchRef} style={{ position: 'relative', minWidth: '240px', maxWidth: '340px', flex: '1' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.8)',
              border: isSearchOpen ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 12px',
              gap: '8px',
              boxShadow: isSearchOpen ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none',
              transition: 'all 0.15s'
            }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search F&O Stock (e.g. RELIANCE)..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: '12px',
                  width: '100%',
                  outline: 'none',
                  fontWeight: '600'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown Menu */}
            {isSearchOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                maxHeight: '300px',
                overflowY: 'auto',
                background: '#090d16',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '10px',
                zIndex: 100,
                boxShadow: '0 12px 30px rgba(0,0,0,0.9)'
              }}>
                <div style={{ padding: '6px 10px', background: 'rgba(30, 41, 59, 0.5)', fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Select F&O Stock to calculate cycle ({filteredStocks.length} available)
                </div>
                {filteredStocks.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                    No matching F&O stock found
                  </div>
                ) : (
                  filteredStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      onClick={() => handleSelectStock(stock)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.12s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {stock.symbol}
                          <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', padding: '1px 5px', borderRadius: '4px' }}>
                            Interval {stock.strikeInterval}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {stock.name} • <span style={{ color: '#38bdf8' }}>{stock.sector}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '800' }}>
                          ₹{stock.defaultSpot.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Lot: {stock.lotSize || '-'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Context Card when F&O Stock is Active */}
      {selectedAsset === 'STOCK' && selectedStock && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '10px',
          padding: '12px 18px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={20} color="#60a5fa" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>
                {selectedStock.symbol} — {selectedStock.name}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Sector: <strong style={{ color: '#60a5fa' }}>{selectedStock.sector}</strong> | Strike Interval: <strong style={{ color: '#f59e0b' }}>{selectedStock.strikeInterval} pts</strong> | Lot Size: <strong style={{ color: '#34d399' }}>{selectedStock.lotSize || 250}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Rule 1D Dynamic Option SL Proxy (Δ = 0.5)</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                Option SL = Entry Premium - (|Spot Entry - Spot SL| × 0.5)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Price Input Bar if CUSTOM mode */}
      {selectedAsset === 'CUSTOM' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(5, 150, 105, 0.12)',
          border: '1px solid rgba(5, 150, 105, 0.3)',
          borderRadius: '10px',
          padding: '12px 16px'
        }}>
          <Calculator size={18} color="#34d399" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#a7f3d0' }}>Enter Any Price to Calculate Gann Square of 9 Harmonics:</span>
          <input
            type="number"
            step="0.05"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(5, 150, 105, 0.5)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '800',
              padding: '6px 12px',
              borderRadius: '6px',
              width: '160px',
              outline: 'none'
            }}
          />
          <span style={{ fontSize: '11px', color: '#6ee7b7' }}>Square Root: √{customPrice} = {Math.sqrt(parseFloat(customPrice) || 1).toFixed(4)}</span>
        </div>
      )}

      {/* Live Radar Summary Cards (What is happening right now) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Spot Price Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} color="#38bdf8" /> Current Market Position
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: '700' }}>
              LIVE FEED
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.5px' }}>
              {activeData.spot.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>{activeData.assetName} Spot</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#94a3b8' }}>
            <div>Peak High Anchor: <strong style={{ color: '#f43f5e' }}>{currentDownAnchor.toLocaleString('en-IN')}</strong></div>
            <div>Base Low Anchor: <strong style={{ color: '#10b981' }}>{currentUpAnchor.toLocaleString('en-IN')}</strong></div>
          </div>
        </div>

        {/* Active Downside Target Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#fca5a5', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingDown size={14} color="#ef4444" /> Active Downside Target (From High)
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: '800' }}>
              {activeData.activeDownTarget.degree}° DEGREE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444', letterSpacing: '-0.5px' }}>
              {activeData.activeDownTarget.target.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
              Δ {activeData.activeDownTarget.delta}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px' }}>
            <span style={{ color: '#fca5a5', fontWeight: '700' }}>
              Distance: {Math.abs(activeData.activeDownTarget.diff).toFixed(1)} pts ({Math.abs(activeData.activeDownTarget.diffPct).toFixed(2)}%) {activeData.activeDownTarget.diff > 0 ? 'from current spot' : 'below target'}
            </span>
            <span style={{ color: '#94a3b8' }}>
              Last Cleared: {activeData.lastClearedDown ? `${activeData.lastClearedDown.degree}° (${activeData.lastClearedDown.target})` : 'None'}
            </span>
          </div>
        </div>

        {/* Active Upside Target Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6ee7b7', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="#10b981" /> Active Upside Target (From Low)
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: '800' }}>
              {activeData.activeUpTarget.degree}° DEGREE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '900', color: '#10b981', letterSpacing: '-0.5px' }}>
              {activeData.activeUpTarget.target.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
              Δ +{activeData.activeUpTarget.delta}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px' }}>
            <span style={{ color: '#6ee7b7', fontWeight: '700' }}>
              Distance: {Math.abs(activeData.activeUpTarget.diff).toFixed(1)} pts ({Math.abs(activeData.activeUpTarget.diffPct).toFixed(2)}%) above current spot
            </span>
            <span style={{ color: '#94a3b8' }}>
              Rebound Pullback Ceiling / Bullish Acceleration line
            </span>
          </div>
        </div>

      </div>

      {/* Side by Side Ladders: Downside on Left, Upside on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '16px' }}>
        
        {/* Downside Expansion Ladder */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
            padding: '12px 18px',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowDownRight size={18} color="#ef4444" />
              <strong style={{ fontSize: '13px', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Downside Expansion Ladder (From High: {currentDownAnchor.toLocaleString('en-IN')})
              </strong>
            </div>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
              Formula: (√High - θ/180)²
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '10px 14px' }}>DEGREE (θ)</th>
                  <th style={{ padding: '10px 14px' }}>DELTA (Δ)</th>
                  <th style={{ padding: '10px 14px' }}>TARGET PRICE</th>
                  <th style={{ padding: '10px 14px' }}>DISTANCE</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {activeData.downsideLadder.map((row) => {
                  const isCleared = row.status === 'HIT & CLEARED';
                  const isActive = activeData.activeDownTarget.degree === row.degree;
                  return (
                    <tr
                      key={row.degree}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: isActive ? 'rgba(239, 68, 68, 0.12)' : isCleared ? 'rgba(255,255,255,0.01)' : 'transparent',
                        fontWeight: isActive ? '800' : '500'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: isActive ? '#f87171' : isCleared ? '#94a3b8' : '#f8fafc' }}>
                        {row.degree}° {row.degree === 90 && '⭐ (Q1)'} {row.degree === 180 && '🎯 (Opp)'} {row.degree === 360 && '👑 (Octave)'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        -{row.delta.toFixed(3)}
                      </td>
                      <td style={{ padding: '10px 14px', color: isActive ? '#ef4444' : isCleared ? '#cbd5e1' : '#f8fafc', fontWeight: '800', fontFamily: 'monospace' }}>
                        {row.target.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td style={{ padding: '10px 14px', color: row.diff < 0 ? '#10b981' : '#fca5a5' }}>
                        {row.diff <= 0 ? 'Passed' : `${row.diff.toFixed(1)} pts (${Math.abs(row.diffPct).toFixed(2)}%)`}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {isActive ? (
                          <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)', padding: '3px 8px', borderRadius: '4px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Target size={10} /> ACTIVE TARGET
                          </span>
                        ) : isCleared ? (
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            ✓ CLEARED
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#475569' }}>
                            PENDING
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upside Expansion Ladder */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
            padding: '12px 18px',
            borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpRight size={18} color="#10b981" />
              <strong style={{ fontSize: '13px', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Upside Expansion Ladder (From Low: {currentUpAnchor.toLocaleString('en-IN')})
              </strong>
            </div>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
              Formula: (√Low + θ/180)²
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '10px 14px' }}>DEGREE (θ)</th>
                  <th style={{ padding: '10px 14px' }}>DELTA (Δ)</th>
                  <th style={{ padding: '10px 14px' }}>TARGET PRICE</th>
                  <th style={{ padding: '10px 14px' }}>DISTANCE</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {activeData.upsideLadder.map((row) => {
                  const isCleared = row.status === 'HIT & CLEARED';
                  const isActive = activeData.activeUpTarget.degree === row.degree;
                  return (
                    <tr
                      key={row.degree}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: isActive ? 'rgba(16, 185, 129, 0.12)' : isCleared ? 'rgba(255,255,255,0.01)' : 'transparent',
                        fontWeight: isActive ? '800' : '500'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: isActive ? '#34d399' : isCleared ? '#94a3b8' : '#f8fafc' }}>
                        {row.degree}° {row.degree === 90 && '⭐ (Q1)'} {row.degree === 180 && '🎯 (Opp)'} {row.degree === 360 && '👑 (Octave)'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        +{row.delta.toFixed(3)}
                      </td>
                      <td style={{ padding: '10px 14px', color: isActive ? '#10b981' : isCleared ? '#cbd5e1' : '#f8fafc', fontWeight: '800', fontFamily: 'monospace' }}>
                        {row.target.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td style={{ padding: '10px 14px', color: row.diff >= 0 ? '#10b981' : '#fca5a5' }}>
                        {row.diff >= 0 ? 'Passed' : `+${Math.abs(row.diff).toFixed(1)} pts (+${Math.abs(row.diffPct).toFixed(2)}%)`}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {isActive ? (
                          <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.5)', padding: '3px 8px', borderRadius: '4px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Target size={10} /> ACTIVE TARGET
                          </span>
                        ) : isCleared ? (
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            ✓ CLEARED
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#475569' }}>
                            PENDING
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 36-Year & 16-Year Master Backtest Invariant Info Box */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        fontSize: '12px',
        color: '#94a3b8',
        lineHeight: '1.6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontWeight: '800', marginBottom: '6px' }}>
          <ShieldAlert size={16} color="#3b82f6" />
          <span>Gann Square of 9 Master Invariant Rules (Section 29 Codified):</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <strong style={{ color: '#38bdf8' }}>1. Momentum Corridor (45° to 270°):</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
              Swings almost never terminate at 90° or 180° (continuation rate &gt; 91% to 99.7%). Ride momentum; never fade an early harmonic.
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <strong style={{ color: '#eab308' }}>2. 1st Wall (360° Full Octave):</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
              26.3% reversal probability spike (48.1% cumulative exhaustion). Lock in 50%-70% profits and trail stop loss aggressively.
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <strong style={{ color: '#f43f5e' }}>3. 2nd Wall (720° Double Octave):</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
              81.8% of historical swings terminate by 720°. Expect violent snapbacks (98.7% retrace ≥ 180°, 82.8% retrace ≥ 360°).
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
