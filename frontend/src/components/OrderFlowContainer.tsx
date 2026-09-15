import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  Waves, Activity, TrendingUp, TrendingDown, RefreshCw, 
  BarChart2, Zap, ArrowUpRight, ArrowDownRight, Radio, Shield, ChevronRight,
  Crosshair, ZoomIn, ZoomOut, Move, RotateCcw, Target, Sliders, ChevronDown,
  Maximize2, Eye, Check, Clock, Layers, Plus, CandlestickChart, AlertCircle
} from 'lucide-react';

interface PriceLevel {
  price: number;
  bidVol: number;
  askVol: number;
  totalVol: number;
  delta: number;
}

interface FootprintCandle {
  timestamp: number;
  timeStr: string;
  period: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  cvd: number;
  pocPrice: number;
  maxDelta: number;
  minDelta: number;
  priceLevels: PriceLevel[];
  imbalanceLevels: Array<{ price: number; type: string; ratio: string }>;
}

interface OrderFlowState {
  success: boolean;
  connected: boolean;
  activeSymbol: string;
  activeToken: string;
  timeframe: number;
  tickSize: number;
  lastPrice: number | null;
  runningCvd: number;
  divergence: string;
  globalMin: number;
  globalMax: number;
  compositePoc: number;
  compositeProfile: Array<{ price: number; volume: number }>;
  candlesCount: number;
  candles: FootprintCandle[];
  recentTicks: Array<{ id: string; timeStr: string; price: number; qty: number; side: 'BUY' | 'SELL'; delta: number }>;
}

const AVAILABLE_INSTRUMENTS = [
  { symbol: 'NIFTY', label: 'NIFTY 50', type: 'INDEX', defaultTick: 5.0, tickOptions: [1.0, 2.5, 5.0, 10.0, 20.0] },
  { symbol: 'BANKNIFTY', label: 'BANK NIFTY', type: 'INDEX', defaultTick: 20.0, tickOptions: [5.0, 10.0, 20.0, 50.0, 100.0] },
  { symbol: 'RELIANCE', label: 'RELIANCE', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'HDFCBANK', label: 'HDFC BANK', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'ICICIBANK', label: 'ICICI BANK', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'SBIN', label: 'SBIN', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'INFY', label: 'INFY', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'TCS', label: 'TCS', type: 'STOCK', defaultTick: 2.0, tickOptions: [1.0, 2.0, 5.0, 10.0] },
  { symbol: 'AXISBANK', label: 'AXIS BANK', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'LT', label: 'L&T', type: 'STOCK', defaultTick: 2.0, tickOptions: [1.0, 2.0, 5.0, 10.0] },
  { symbol: 'BHARTIARTL', label: 'BHARTI AIRTEL', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'KOTAKBANK', label: 'KOTAK BANK', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] }
];

const TIMEFRAMES = [
  { value: 1, label: '1 Minute', short: '1m' },
  { value: 3, label: '3 Minute', short: '3m' },
  { value: 5, label: '5 Minute', short: '5m' },
  { value: 10, label: '10 Minute', short: '10m' },
  { value: 15, label: '15 Minute', short: '15m' },
  { value: 30, label: '30 Minute', short: '30m' },
  { value: 60, label: '60 Minute', short: '60m' }
];

export const OrderFlowContainer: React.FC = () => {
  const [state, setState] = useState<OrderFlowState | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [timeframe, setTimeframe] = useState(5);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // User Configured Tick Size (Cluster / Block Size as in GoCharting Image 2)
  const [customTickSize, setCustomTickSize] = useState<number | null>(null);

  // Layout & Settings
  const [layoutStyle, setLayoutStyle] = useState<'CANDLE_ORDERS' | 'CLASSIC_SPLIT'>('CANDLE_ORDERS');
  const [viewMode, setViewMode] = useState<'IMBALANCE' | 'DELTA' | 'VOLUME'>('IMBALANCE');
  const [imbalanceRatio, setImbalanceRatio] = useState<number>(3.0); // 2.5x, 3.0x, 4.0x
  const [showSteppedPoc, setShowSteppedPoc] = useState(true);
  const [showCotBadges, setShowCotBadges] = useState(true); // COT on candle top & bottom
  const [showCrCaps, setShowCrCaps] = useState(true);
  const [showProfile, setShowProfile] = useState(true);

  // Dropdown UI states
  const [isTfDropdownOpen, setIsTfDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isImbDropdownOpen, setIsImbDropdownOpen] = useState(false);
  const [isInstDropdownOpen, setIsInstDropdownOpen] = useState(false);
  const [isTickDropdownOpen, setIsTickDropdownOpen] = useState(false);

  // Zoom & Pan states
  const [rungHeight, setRungHeight] = useState(22); // Height per price level in px (12px to 60px)
  const [candleWidth, setCandleWidth] = useState(140); // Width per candle in px (90px to 240px)
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingScale, setIsDraggingScale] = useState(false);

  const backendUrl = getBackendUrl();

  // Scroll synchronization refs
  const gridRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const priceScaleRef = useRef<HTMLDivElement>(null);
  const bottomMatrixRef = useRef<HTMLDivElement>(null);

  // Interaction tracking refs
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const scaleDragRef = useRef<{ y: number; initialRungHeight: number; initialScrollTop: number } | null>(null);
  const initialCenteredRef = useRef(false);

  const activeInstMeta = AVAILABLE_INSTRUMENTS.find(i => i.symbol === selectedSymbol) || AVAILABLE_INSTRUMENTS[0];
  const step = customTickSize || activeInstMeta.defaultTick || state?.tickSize || 5;

  const fetchState = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/orderflow/state?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setState(data);
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const handleSymbolChange = async (newSym: string) => {
    setSelectedSymbol(newSym);
    setSwitching(true);
    setCustomTickSize(null); // Reset tick size to instrument default
    initialCenteredRef.current = false;
    setIsInstDropdownOpen(false);
    try {
      await fetch(`${backendUrl}/api/orderflow/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSym, timeframe })
      });
      await fetchState();
    } catch (e) {
      console.error('Failed to switch symbol:', e);
    } finally {
      setSwitching(false);
    }
  };

  const handleTimeframeChange = async (newTf: number) => {
    setTimeframe(newTf);
    setSwitching(true);
    initialCenteredRef.current = false;
    setIsTfDropdownOpen(false);
    try {
      await fetch(`${backendUrl}/api/orderflow/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, timeframe: newTf })
      });
      await fetchState();
    } catch (e) {
      console.error('Failed to switch timeframe:', e);
    } finally {
      setSwitching(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsTfDropdownOpen(false);
      setIsModeDropdownOpen(false);
      setIsImbDropdownOpen(false);
      setIsInstDropdownOpen(false);
      setIsTickDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Build the global continuous price scale with headroom & footroom padding using current step
  const paddingSteps = 20;
  const rawMin = state?.globalMin ? Math.floor(state.globalMin / step) * step : 0;
  const rawMax = state?.globalMax ? Math.ceil(state.globalMax / step) * step : 100;

  const minPrice = rawMin > 0 ? Math.max(0, rawMin - (paddingSteps * step)) : 0;
  const maxPrice = rawMax + (paddingSteps * step);

  const priceRungs: number[] = [];
  if (maxPrice > minPrice && step > 0) {
    for (let p = maxPrice; p >= minPrice; p = parseFloat((p - step).toFixed(2))) {
      priceRungs.push(p);
      if (priceRungs.length > 350) break;
    }
  }

  // Max volume across composite profile for bar scaling
  const maxCompVol = Math.max(1, ...(state?.compositeProfile?.map(cp => cp.volume) || [1]));

  // Synchronize scrolling
  const handleGridScroll = useCallback(() => {
    if (!gridRef.current) return;
    const { scrollTop, scrollLeft } = gridRef.current;
    if (profileRef.current) profileRef.current.scrollTop = scrollTop;
    if (priceScaleRef.current) priceScaleRef.current.scrollTop = scrollTop;
    if (bottomMatrixRef.current) bottomMatrixRef.current.scrollLeft = scrollLeft;
  }, []);

  // Recenter on Current LTP
  const recenterChart = useCallback(() => {
    if (!gridRef.current || !state?.lastPrice || priceRungs.length === 0) return;
    const ltpIdx = priceRungs.findIndex(p => Math.abs(p - state.lastPrice!) < step / 2);
    if (ltpIdx >= 0) {
      const targetY = (ltpIdx * rungHeight) - (gridRef.current.clientHeight / 2) + (rungHeight / 2);
      gridRef.current.scrollTop = Math.max(0, targetY);
    }
    gridRef.current.scrollLeft = gridRef.current.scrollWidth;
  }, [state?.lastPrice, priceRungs, rungHeight, step]);

  // Auto-Fit (F) button
  const autoFitChart = useCallback(() => {
    if (!gridRef.current || !state?.candles || state.candles.length === 0) return;
    const candleHighs = state.candles.map(c => c.high);
    const candleLows = state.candles.map(c => c.low);
    const highest = Math.max(...candleHighs);
    const lowest = Math.min(...candleLows);
    const totalRungs = Math.max(10, Math.ceil((highest - lowest) / step) + 6);

    const availableHeight = gridRef.current.clientHeight || 620;
    const optimalRungHeight = Math.max(12, Math.min(38, Math.floor(availableHeight / totalRungs)));
    setRungHeight(optimalRungHeight);

    setTimeout(() => {
      recenterChart();
    }, 50);
  }, [state?.candles, step, recenterChart]);

  // Initial auto-centering on price load
  useEffect(() => {
    if (state?.lastPrice && !initialCenteredRef.current && priceRungs.length > 0) {
      const timer = setTimeout(() => {
        recenterChart();
        initialCenteredRef.current = true;
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [state?.lastPrice, priceRungs.length, recenterChart]);

  // 2D Pan Drag
  const handleGridMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !gridRef.current) return;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: gridRef.current.scrollLeft,
      scrollTop: gridRef.current.scrollTop
    };
    setIsPanning(true);
  };

  // Price Scale Drag (Y-Axis Zoom)
  const handlePriceScaleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !gridRef.current) return;
    scaleDragRef.current = {
      y: e.clientY,
      initialRungHeight: rungHeight,
      initialScrollTop: gridRef.current.scrollTop
    };
    setIsDraggingScale(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (panStartRef.current && gridRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        gridRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
        gridRef.current.scrollTop = panStartRef.current.scrollTop - dy;
      }

      if (scaleDragRef.current && gridRef.current) {
        const dy = e.clientY - scaleDragRef.current.y;
        const newRungHeight = Math.max(12, Math.min(60, Math.round(scaleDragRef.current.initialRungHeight - dy * 0.25)));

        if (newRungHeight !== rungHeight) {
          const oldCenterRung = (scaleDragRef.current.initialScrollTop + gridRef.current.clientHeight / 2) / scaleDragRef.current.initialRungHeight;
          setRungHeight(newRungHeight);
          gridRef.current.scrollTop = (oldCenterRung * newRungHeight) - (gridRef.current.clientHeight / 2);
        }
      }
    };

    const handleMouseUp = () => {
      panStartRef.current = null;
      scaleDragRef.current = null;
      setIsPanning(false);
      setIsDraggingScale(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rungHeight]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!gridRef.current) return;
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      setRungHeight(prev => Math.max(12, Math.min(60, prev + delta)));
    }
  };

  const activeTfObj = TIMEFRAMES.find(t => t.value === timeframe) || TIMEFRAMES[2];

  // Helper to dynamically aggregate candle levels into user selected step size
  const getAggregatedCandleMap = (candle: FootprintCandle) => {
    const map = new Map<number, PriceLevel>();
    candle.priceLevels.forEach(pl => {
      const bucketPrice = parseFloat((Math.round(pl.price / step) * step).toFixed(2));
      const existing = map.get(bucketPrice);
      if (existing) {
        existing.bidVol += pl.bidVol;
        existing.askVol += pl.askVol;
        existing.totalVol += pl.totalVol;
        existing.delta = existing.askVol - existing.bidVol;
      } else {
        map.set(bucketPrice, {
          price: bucketPrice,
          bidVol: pl.bidVol,
          askVol: pl.askVol,
          totalVol: pl.totalVol,
          delta: pl.askVol - pl.bidVol
        });
      }
    });
    return map;
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        padding: '12px', 
        color: '#e0e0e0', 
        backgroundColor: '#0b0e14', 
        minHeight: '100vh',
        userSelect: isPanning || isDraggingScale ? 'none' : 'auto'
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR: Controls, Timeframe, Layout, Tick Size (Circled in Image 1)*/}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        backgroundColor: '#121620',
        borderRadius: '8px',
        border: '1px solid #232a3b',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        gap: '10px'
      }}>
        {/* Left: Chart Brand, Instrument Dropdown, Timeframe Dropdown, Layout Mode, Imbalance Ratio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* NinjaTrader "Chart" Menu Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1a2234',
            padding: '5px 10px',
            borderRadius: '5px',
            border: '1px solid #2d3748',
            fontSize: '12px',
            fontWeight: '800',
            color: '#38bdf8'
          }}>
            <Waves size={16} color="#38bdf8" />
            <span>Chart</span>
          </div>

          {/* Instrument Dropdown (e.g. NIFTY, BANKNIFTY, RELIANCE) */}
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsInstDropdownOpen(!isInstDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#1a2234',
                color: '#fff',
                border: '1px solid #38bdf8',
                padding: '5px 12px',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              <span>{selectedSymbol}</span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>({step} pts)</span>
              <ChevronDown size={14} color="#38bdf8" />
            </button>

            {isInstDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#161b26',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                zIndex: 100,
                width: '180px',
                maxHeight: '260px',
                overflowY: 'auto'
              }}>
                {AVAILABLE_INSTRUMENTS.map((inst) => (
                  <div
                    key={inst.symbol}
                    onClick={() => handleSymbolChange(inst.symbol)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: selectedSymbol === inst.symbol ? '800' : '500',
                      color: selectedSymbol === inst.symbol ? '#38bdf8' : '#e0e0e0',
                      backgroundColor: selectedSymbol === inst.symbol ? '#1e2638' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #1e2533'
                    }}
                  >
                    <span>{inst.label}</span>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>{inst.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe Dropdown (1 Min, 3 Min, 5 Min, 10 Min, 15 Min, 30 Min, 60 Min) */}
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsTfDropdownOpen(!isTfDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#1a2234',
                color: '#fff',
                border: '1px solid #2d3748',
                padding: '5px 12px',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Clock size={13} color="#eab308" />
              <span>{activeTfObj.label}</span>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            {isTfDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#161b26',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                zIndex: 100,
                width: '140px'
              }}>
                {TIMEFRAMES.map((tf) => (
                  <div
                    key={tf.value}
                    onClick={() => handleTimeframeChange(tf.value)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: timeframe === tf.value ? '800' : '500',
                      color: timeframe === tf.value ? '#eab308' : '#e0e0e0',
                      backgroundColor: timeframe === tf.value ? '#1e2638' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #1e2533'
                    }}
                  >
                    <span>{tf.label}</span>
                    {timeframe === tf.value && <Check size={13} color="#eab308" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Candle + Orders Layout Toggle */}
          <div style={{ display: 'flex', gap: '3px', backgroundColor: '#10141d', padding: '2px', borderRadius: '5px', border: '1px solid #232a3b' }}>
            <button
              onClick={() => setLayoutStyle('CANDLE_ORDERS')}
              style={{
                backgroundColor: layoutStyle === 'CANDLE_ORDERS' ? '#0284c7' : 'transparent',
                color: layoutStyle === 'CANDLE_ORDERS' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Candlestick in center with Bid orders on left and Ask orders on right"
            >
              <CandlestickChart size={13} />
              <span>Candle + Orders (L/R)</span>
            </button>
            <button
              onClick={() => setLayoutStyle('CLASSIC_SPLIT')}
              style={{
                backgroundColor: layoutStyle === 'CLASSIC_SPLIT' ? '#0284c7' : 'transparent',
                color: layoutStyle === 'CLASSIC_SPLIT' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="Classic Footprint split grid"
            >
              Split Grid
            </button>
          </div>

          {/* Imbalance Multiplier Selector (2.5x, 3.0x, 4.0x) */}
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsImbDropdownOpen(!isImbDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#1a2234',
                color: '#ef4444',
                border: '1px solid #ef444466',
                padding: '5px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="Diagonal Imbalance Ratio Multiplier"
            >
              <Sliders size={12} color="#ef4444" />
              <span>Imbalance: {imbalanceRatio.toFixed(1)}x</span>
              <ChevronDown size={12} color="#ef4444" />
            </button>

            {isImbDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#161b26',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                zIndex: 100,
                width: '130px'
              }}>
                {[2.0, 2.5, 3.0, 3.5, 4.0, 5.0].map((ratio) => (
                  <div
                    key={ratio}
                    onClick={() => { setImbalanceRatio(ratio); setIsImbDropdownOpen(false); }}
                    style={{
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: imbalanceRatio === ratio ? '800' : '500',
                      color: imbalanceRatio === ratio ? '#ef4444' : '#e0e0e0',
                      backgroundColor: imbalanceRatio === ratio ? '#1e2638' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #1e2533'
                    }}
                  >
                    <span>{ratio.toFixed(1)}x Ratio</span>
                    {imbalanceRatio === ratio && <Check size={13} color="#ef4444" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Features: POC Line, COT Badges, CR Caps, Profile */}
          <div style={{ display: 'flex', gap: '3px', backgroundColor: '#10141d', padding: '2px', borderRadius: '5px', border: '1px solid #232a3b' }}>
            <button
              onClick={() => setShowSteppedPoc(!showSteppedPoc)}
              style={{
                backgroundColor: showSteppedPoc ? '#1e293b' : 'transparent',
                color: showSteppedPoc ? '#38bdf8' : '#64748b',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Toggle Stepped POC support/resistance staircase line"
            >
              POC Line
            </button>
            <button
              onClick={() => setShowCotBadges(!showCotBadges)}
              style={{
                backgroundColor: showCotBadges ? '#1e293b' : 'transparent',
                color: showCotBadges ? '#f59e0b' : '#64748b',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="Toggle COT (Commitment of Traders / Trapped Volume) at Candle Top & Bottom"
            >
              COT
            </button>
            <button
              onClick={() => setShowCrCaps(!showCrCaps)}
              style={{
                backgroundColor: showCrCaps ? '#1e293b' : 'transparent',
                color: showCrCaps ? '#10b981' : '#64748b',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Toggle Candle Range (CR) volume caps"
            >
              CR Caps
            </button>
            <button
              onClick={() => setShowProfile(!showProfile)}
              style={{
                backgroundColor: showProfile ? '#1e293b' : 'transparent',
                color: showProfile ? '#eab308' : '#64748b',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Toggle Left Session Profile"
            >
              Profile
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TICK SIZE / CLUSTER MANAGER (CIRCLED IN RED IN IMAGE 1 & AS IN IMAGE 2)   */}
          {/* ========================================================================= */}
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsTickDropdownOpen(!isTickDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#1a2234',
                color: '#38bdf8',
                border: '1px solid #38bdf8',
                padding: '5px 12px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(56, 189, 248, 0.25)'
              }}
              title="Tick Manager / Block Size (GoCharting Style Cluster Height)"
            >
              <Sliders size={12} color="#38bdf8" />
              <span>Tick: {step} pts</span>
              <ChevronDown size={12} color="#38bdf8" />
            </button>

            {isTickDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#161b26',
                border: '1px solid #38bdf8',
                borderRadius: '6px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
                zIndex: 100,
                width: '200px',
                padding: '6px'
              }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', padding: '4px 6px', borderBottom: '1px solid #232a3b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>TICK MANAGER (BLOCK)</span>
                  <span style={{ color: '#64748b' }}>CLUSTER</span>
                </div>

                <div style={{ padding: '6px 4px', fontSize: '9px', color: '#94a3b8' }}>
                  Select price cluster grouping height for {selectedSymbol}:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {activeInstMeta.tickOptions.map((opt) => (
                    <div
                      key={opt}
                      onClick={() => { setCustomTickSize(opt); setIsTickDropdownOpen(false); }}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: step === opt ? '800' : '600',
                        color: step === opt ? '#38bdf8' : '#e0e0e0',
                        backgroundColor: step === opt ? '#1e2638' : 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{opt} pts {opt === activeInstMeta.defaultTick ? '(Default)' : ''}</span>
                      {step === opt && <Check size={12} color="#38bdf8" />}
                    </div>
                  ))}
                </div>

                {/* Reset to Default */}
                <div 
                  onClick={() => { setCustomTickSize(null); setIsTickDropdownOpen(false); }}
                  style={{
                    marginTop: '6px',
                    padding: '5px',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#94a3b8',
                    borderTop: '1px solid #232a3b',
                    cursor: 'pointer'
                  }}
                >
                  Reset to Exchange Default ({activeInstMeta.defaultTick} pts)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: WebSocket Status, LTP, CVD, and Viewport Fit/Recenter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* WebSocket Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: state?.connected ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
            color: state?.connected ? '#00e676' : '#ff5252',
            border: `1px solid ${state?.connected ? '#00e67644' : '#ff525244'}`
          }}>
            <Radio size={11} className={state?.connected ? 'animate-pulse' : ''} />
            {state?.connected ? 'LIVE WS' : 'RECONNECTING'}
          </div>

          {/* Current Spot & Running CVD */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#1a2234',
            padding: '3px 10px',
            borderRadius: '5px',
            border: '1px solid #2d3748'
          }}>
            <div>
              <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600' }}>SPOT</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                ₹{state?.lastPrice ? state.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 }) : '--'}
              </div>
            </div>
            <div style={{ width: '1px', height: '18px', backgroundColor: '#334155' }} />
            <div>
              <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600' }}>CVD</div>
              <div style={{
                fontSize: '13px',
                fontWeight: '800',
                color: (state?.runningCvd ?? 0) >= 0 ? '#00e676' : '#ff5252'
              }}>
                {(state?.runningCvd ?? 0) >= 0 ? '+' : ''}{(state?.runningCvd ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Recenter LTP Button */}
          <button
            onClick={recenterChart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: '1px solid #38bdf8',
              padding: '4px 9px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
            }}
            title="Recenter view on current market price"
          >
            <Target size={12} />
            Recenter
          </button>

          {/* Auto-Fit "F" Button */}
          <button
            onClick={autoFitChart}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #38bdf8',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: '900',
              cursor: 'pointer'
            }}
            title="Auto-Fit Price Scale to Screen (F)"
          >
            F
          </button>

          {/* Price Scale (Vertical) Zoom Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#10141d', padding: '2px 4px', borderRadius: '5px', border: '1px solid #232a3b' }}>
            <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginRight: '2px' }}>Y:</span>
            <button
              onClick={() => setRungHeight(prev => Math.max(12, prev - 3))}
              style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 5px', cursor: 'pointer', fontWeight: '800', fontSize: '11px' }}
              title="Compress Price Scale"
            >
              -
            </button>
            <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700', minWidth: '28px', textAlign: 'center' }}>
              {rungHeight}
            </span>
            <button
              onClick={() => setRungHeight(prev => Math.min(60, prev + 3))}
              style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 5px', cursor: 'pointer', fontWeight: '800', fontSize: '11px' }}
              title="Expand Price Scale"
            >
              +
            </button>
          </div>

          {/* Candle Width (Horizontal) Zoom Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#10141d', padding: '2px 4px', borderRadius: '5px', border: '1px solid #232a3b' }}>
            <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginRight: '2px' }}>X:</span>
            <button
              onClick={() => setCandleWidth(prev => Math.max(90, prev - 15))}
              style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 5px', cursor: 'pointer', fontWeight: '800', fontSize: '11px' }}
              title="Compress Time"
            >
              -
            </button>
            <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700', minWidth: '32px', textAlign: 'center' }}>
              {candleWidth}
            </span>
            <button
              onClick={() => setCandleWidth(prev => Math.min(240, prev + 15))}
              style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 5px', cursor: 'pointer', fontWeight: '800', fontSize: '11px' }}
              title="Expand Time"
            >
              +
            </button>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={() => {
              setRungHeight(22);
              setCandleWidth(140);
              setTimeout(recenterChart, 50);
            }}
            style={{
              backgroundColor: '#1a2234',
              color: '#94a3b8',
              border: '1px solid #2d3748',
              padding: '4px 6px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
            title="Reset Zoom to 100%"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TRUE BELL-TPO / NINJATRADER ORDER FLOW CANVAS                          */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#121620',
        borderRadius: '10px',
        border: '1px solid #232a3b',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Main Chart Area: Composite Profile (Left) + Candles Grid (Center) + Price Axis (Right) */}
        <div 
          style={{ 
            display: 'flex', 
            height: '620px', 
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#0c0f17'
          }}
          onWheel={handleWheel}
        >
          {/* 1. Left Column: Session Composite Volume Profile */}
          {showProfile && (
            <div 
              ref={profileRef}
              style={{
                width: '120px',
                backgroundColor: '#0f131a',
                borderRight: '1px solid #232a3b',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'hidden',
                overflowX: 'hidden',
                flexShrink: 0
              }}
            >
              <div style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 10, 
                backgroundColor: '#0f131a', 
                padding: '4px', 
                textAlign: 'center', 
                fontSize: '9px', 
                fontWeight: '700', 
                color: '#64748b', 
                borderBottom: '1px solid #1e2533' 
              }}>
                SESSION PROFILE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {priceRungs.map((p) => {
                  const isPoc = Math.abs(p - (state?.compositePoc || 0)) < step / 2;
                  const volObj = state?.compositeProfile?.find(cp => Math.abs(cp.price - p) < step / 2);
                  const vol = volObj?.volume || 0;
                  const pct = (vol / maxCompVol) * 100;

                  return (
                    <div 
                      key={p} 
                      style={{
                        height: `${rungHeight}px`,
                        minHeight: `${rungHeight}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 4px',
                        position: 'relative',
                        backgroundColor: isPoc ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${pct}%`,
                        backgroundColor: isPoc ? '#eab308' : '#f97316',
                        opacity: isPoc ? 0.6 : 0.35,
                        zIndex: 1
                      }} />
                      <span style={{ fontSize: '9px', color: isPoc ? '#eab308' : '#94a3b8', zIndex: 2, fontWeight: isPoc ? '800' : '500' }}>
                        {vol > 0 ? (vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : vol) : ''}
                      </span>
                      <span style={{ fontSize: '9px', color: isPoc ? '#eab308' : '#64748b', zIndex: 2, fontWeight: '700' }}>
                        {isPoc ? 'POC' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Middle Grid: 2D Interactive Footprint Candles Grid */}
          <div
            ref={gridRef}
            onScroll={handleGridScroll}
            onMouseDown={handleGridMouseDown}
            style={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'auto',
              display: 'flex',
              position: 'relative',
              backgroundColor: '#0c0f17',
              cursor: isPanning ? 'grabbing' : 'grab',
              scrollbarWidth: 'thin',
              scrollbarColor: '#232a3b #0c0f17'
            }}
          >
            {(!state?.candles || state.candles.length === 0) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#64748b' }}>
                Connecting to Angel One SmartStream WebSocket & rendering footprint candles...
              </div>
            ) : (
              state.candles.map((candle, cIdx) => {
                const isBull = candle.close >= candle.open;
                const candleMap = getAggregatedCandleMap(candle);
                const prevCandle = cIdx > 0 ? state.candles[cIdx - 1] : null;

                // Exact Candle Body Bounds (from Open to Close)
                const bodyTop = Math.max(candle.open, candle.close);
                const bodyBtm = Math.min(candle.open, candle.close);

                // Extreme rungs in candle
                const candleRungKeys = Array.from(candleMap.keys());
                const topRung = candleRungKeys.length > 0 ? Math.max(...candleRungKeys) : candle.high;
                const btmRung = candleRungKeys.length > 0 ? Math.min(...candleRungKeys) : candle.low;

                const topLevelData = candleMap.get(topRung);
                const btmLevelData = candleMap.get(btmRung);

                // 1. COT (Commitment of Traders) calculation at extreme top and bottom
                const cotTopDelta = topLevelData ? (topLevelData.askVol - topLevelData.bidVol) : 0;
                const cotBtmDelta = btmLevelData ? (btmLevelData.askVol - btmLevelData.bidVol) : 0;

                const isTrappedBuyers = cotTopDelta > 0 && candle.close < candle.high;
                const isTrappedSellers = cotBtmDelta < 0 && candle.close > candle.low;

                // 2. DELTA DIVERGENCE ON THE CHART ONLY (User Request!)
                // Bearish Divergence: Candle closed Green or made higher high, but net Delta is NEGATIVE (selling absorption)
                const isBearDivergence = (candle.close > candle.open && candle.delta < 0) || 
                                         (prevCandle && candle.high > prevCandle.high && candle.delta < 0 && candle.close < candle.high);
                
                // Bullish Divergence: Candle closed Red or made lower low, but net Delta is POSITIVE (buying absorption)
                const isBullDivergence = (candle.close < candle.open && candle.delta > 0) || 
                                         (prevCandle && candle.low < prevCandle.low && candle.delta > 0 && candle.close > candle.low);

                return (
                  <div
                    key={candle.timestamp || cIdx}
                    style={{
                      width: `${candleWidth}px`,
                      minWidth: `${candleWidth}px`,
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      borderRight: '1px solid #1e2533',
                      position: 'relative'
                    }}
                  >
                    {/* Footprint Price Rungs Stacked Vertically */}
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {priceRungs.map((p) => {
                        const levelData = candleMap.get(p);
                        const isPoc = levelData && Math.abs(levelData.price - candle.pocPrice) < step / 2;
                        const inCandleRange = p >= candle.low && p <= candle.high;
                        
                        const inBody = p <= (bodyTop + step / 4) && p >= (bodyBtm - step / 4);
                        const isBodyTop = Math.abs(p - bodyTop) < step / 2;
                        const isBodyBtm = Math.abs(p - bodyBtm) < step / 2;

                        // Diagonal imbalance check
                        let hasBuyImbalance = false;
                        let hasSellImbalance = false;

                        if (levelData) {
                          const lowerLevel = candleMap.get(parseFloat((p - step).toFixed(2)));
                          if (lowerLevel && lowerLevel.bidVol > 0 && levelData.askVol >= lowerLevel.bidVol * imbalanceRatio && levelData.askVol >= 40) {
                            hasBuyImbalance = true;
                          }
                          const upperLevel = candleMap.get(parseFloat((p + step).toFixed(2)));
                          if (upperLevel && upperLevel.askVol > 0 && levelData.bidVol >= upperLevel.askVol * imbalanceRatio && levelData.bidVol >= 40) {
                            hasSellImbalance = true;
                          }
                        }

                        const maxLevelVol = Math.max(1, ...(Array.from(candleMap.values()).map(pl => pl.totalVol) || [1]));
                        const bidWidthPct = levelData ? Math.min(100, (levelData.bidVol / maxLevelVol) * 100) : 0;
                        const askWidthPct = levelData ? Math.min(100, (levelData.askVol / maxLevelVol) * 100) : 0;

                        const isExtremeHigh = Math.abs(p - topRung) < step / 2;
                        const isExtremeLow = Math.abs(p - btmRung) < step / 2;

                        return (
                          <div
                            key={p}
                            style={{
                              height: `${rungHeight}px`,
                              minHeight: `${rungHeight}px`,
                              display: 'flex',
                              alignItems: 'center',
                              position: 'relative',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                              backgroundColor: isPoc ? 'rgba(234, 179, 8, 0.14)' : (inCandleRange ? 'rgba(255, 255, 255, 0.012)' : 'transparent'),
                              border: isPoc ? '2px solid #ef4444' : 'none',
                              boxSizing: 'border-box'
                            }}
                          >
                            {/* Stepped POC Line Spanning Across Candles */}
                            {showSteppedPoc && isPoc && (
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '50%',
                                height: '2px',
                                backgroundColor: '#38bdf8',
                                opacity: 0.65,
                                zIndex: 1,
                                boxShadow: '0 0 6px #38bdf8'
                              }} />
                            )}

                            {/* ================================================================= */}
                            {/* DELTA DIVERGENCE SYMBOLS ON THE CHART ONLY                        */}
                            {/* ================================================================= */}
                            {isExtremeHigh && isBearDivergence && (
                              <div style={{
                                position: 'absolute',
                                top: '-38px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#dc2626',
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: '900',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                boxShadow: '0 0 12px rgba(220, 38, 38, 0.9)',
                                zIndex: 15,
                                whiteSpace: 'nowrap',
                                border: '1px solid #fca5a5',
                                animation: 'pulse 2s infinite'
                              }}>
                                <span>▼ BEAR DIV</span>
                                <span style={{ fontSize: '8px', opacity: 0.9 }}>({candle.delta})</span>
                              </div>
                            )}

                            {isExtremeLow && isBullDivergence && (
                              <div style={{
                                position: 'absolute',
                                bottom: '-38px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#059669',
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: '900',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                boxShadow: '0 0 12px rgba(5, 150, 105, 0.9)',
                                zIndex: 15,
                                whiteSpace: 'nowrap',
                                border: '1px solid #86efac',
                                animation: 'pulse 2s infinite'
                              }}>
                                <span>▲ BULL DIV</span>
                                <span style={{ fontSize: '8px', opacity: 0.9 }}>(+{candle.delta})</span>
                              </div>
                            )}

                            {/* ================================================================= */}
                            {/* COT (COMMITMENT OF TRADERS) ON CANDLE TOP & BOTTOM                */}
                            {/* ================================================================= */}
                            {showCotBadges && isExtremeHigh && (
                              <div style={{
                                position: 'absolute',
                                top: isBearDivergence ? '-18px' : '-14px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: isTrappedBuyers ? '#f59e0b' : '#ef4444',
                                color: '#000',
                                fontSize: '8px',
                                fontWeight: '900',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                zIndex: 8,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 1px 6px rgba(0, 0, 0, 0.7)',
                                border: isTrappedBuyers ? '1px solid #fde047' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                <span>COT:</span>
                                <span>{cotTopDelta > 0 ? '+' : ''}{cotTopDelta}</span>
                                {isTrappedBuyers && <span style={{ fontSize: '7px' }}>⚠️TRAP</span>}
                              </div>
                            )}

                            {showCotBadges && isExtremeLow && (
                              <div style={{
                                position: 'absolute',
                                bottom: isBullDivergence ? '-18px' : '-14px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: isTrappedSellers ? '#10b981' : '#059669',
                                color: '#000',
                                fontSize: '8px',
                                fontWeight: '900',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                zIndex: 8,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 1px 6px rgba(0, 0, 0, 0.7)',
                                border: isTrappedSellers ? '1px solid #86efac' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                <span>COT:</span>
                                <span>{cotBtmDelta > 0 ? '+' : ''}{cotBtmDelta}</span>
                                {isTrappedSellers && <span style={{ fontSize: '7px' }}>⚠️TRAP</span>}
                              </div>
                            )}

                            {/* Candle Range (CR) Caps */}
                            {showCrCaps && isExtremeHigh && !showCotBadges && (
                              <div style={{
                                position: 'absolute',
                                top: '-13px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                fontSize: '8px',
                                fontWeight: '800',
                                padding: '1px 5px',
                                borderRadius: '2px',
                                zIndex: 6,
                                whiteSpace: 'nowrap'
                              }}>
                                CR {topLevelData?.totalVol || 0}
                              </div>
                            )}

                            {showCrCaps && isExtremeLow && !showCotBadges && (
                              <div style={{
                                position: 'absolute',
                                bottom: '-13px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#10b981',
                                color: '#fff',
                                fontSize: '8px',
                                fontWeight: '800',
                                padding: '1px 5px',
                                borderRadius: '2px',
                                zIndex: 6,
                                whiteSpace: 'nowrap'
                              }}>
                                CR {btmLevelData?.totalVol || 0}
                              </div>
                            )}

                            {/* ================================================================= */}
                            {/* CANDLESTICK IN CENTER + BID ORDERS ON LEFT + ASK ORDERS ON RIGHT  */}
                            {/* ================================================================= */}
                            {layoutStyle === 'CANDLE_ORDERS' ? (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 18px 1fr',
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                zIndex: 2
                              }}>
                                {/* 1. LEFT COLUMN: BID ORDERS (SELLING AGGRESSION) */}
                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  paddingRight: '5px',
                                  borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                  {levelData && (
                                    <div style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: `${bidWidthPct}%`,
                                      backgroundColor: hasSellImbalance ? '#ef4444' : 'rgba(239, 68, 68, 0.22)',
                                      opacity: hasSellImbalance ? 0.85 : 0.45,
                                      zIndex: -1,
                                      borderRadius: '2px 0 0 2px'
                                    }} />
                                  )}
                                  <span style={{
                                    fontSize: rungHeight < 18 ? '8px' : '9px',
                                    fontWeight: hasSellImbalance ? '900' : '600',
                                    color: hasSellImbalance ? '#fff' : (levelData ? '#fca5a5' : 'transparent'),
                                    fontFamily: 'monospace'
                                  }}>
                                    {levelData ? levelData.bidVol : ''}
                                  </span>
                                </div>

                                {/* 2. CENTER COLUMN: THE REAL CANDLESTICK (Body & Wick) */}
                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {/* Central Candlestick Wick (High to Low) */}
                                  {inCandleRange && (
                                    <div style={{
                                      position: 'absolute',
                                      top: 0,
                                      bottom: 0,
                                      width: '2px',
                                      backgroundColor: isBull ? '#00e676' : '#ff5252',
                                      opacity: 0.75,
                                      zIndex: 1
                                    }} />
                                  )}

                                  {/* Candlestick Solid Body (Open to Close) */}
                                  {inBody && (
                                    <div style={{
                                      position: 'absolute',
                                      top: 0,
                                      bottom: 0,
                                      left: '2px',
                                      right: '2px',
                                      backgroundColor: isBull ? '#00e676' : '#ff5252',
                                      borderLeft: `1px solid ${isBull ? '#4ade80' : '#f87171'}`,
                                      borderRight: `1px solid ${isBull ? '#4ade80' : '#f87171'}`,
                                      borderRadius: (isBodyTop ? '2px 2px 0 0' : '') + (isBodyBtm ? ' 0 0 2px 2px' : ''),
                                      zIndex: 3,
                                      boxShadow: isBull ? '0 0 4px rgba(0, 230, 118, 0.5)' : '0 0 4px rgba(255, 82, 82, 0.5)'
                                    }} />
                                  )}
                                </div>

                                {/* 3. RIGHT COLUMN: ASK ORDERS (BUYING AGGRESSION) */}
                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  paddingLeft: '5px',
                                  borderLeft: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                  {levelData && (
                                    <div style={{
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: `${askWidthPct}%`,
                                      backgroundColor: hasBuyImbalance ? '#10b981' : 'rgba(16, 185, 129, 0.22)',
                                      opacity: hasBuyImbalance ? 0.85 : 0.45,
                                      zIndex: -1,
                                      borderRadius: '0 2px 2px 0'
                                    }} />
                                  )}
                                  <span style={{
                                    fontSize: rungHeight < 18 ? '8px' : '9px',
                                    fontWeight: hasBuyImbalance ? '900' : '600',
                                    color: hasBuyImbalance ? '#fff' : (levelData ? '#86efac' : 'transparent'),
                                    fontFamily: 'monospace'
                                  }}>
                                    {levelData ? levelData.askVol : ''}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* Classic split grid view */
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  paddingRight: '4px',
                                  borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                  {levelData && (
                                    <div style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: `${bidWidthPct}%`,
                                      backgroundColor: hasSellImbalance ? '#ef4444' : '#f87171',
                                      opacity: hasSellImbalance ? 0.75 : 0.35,
                                      zIndex: -1
                                    }} />
                                  )}
                                  <span style={{
                                    fontSize: rungHeight < 18 ? '8px' : '9px',
                                    fontWeight: hasSellImbalance ? '900' : '600',
                                    color: hasSellImbalance ? '#fff' : '#fca5a5'
                                  }}>
                                    {levelData ? levelData.bidVol : ''}
                                  </span>
                                </div>

                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  paddingLeft: '4px'
                                }}>
                                  {levelData && (
                                    <div style={{
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: `${askWidthPct}%`,
                                      backgroundColor: hasBuyImbalance ? '#10b981' : '#34d399',
                                      opacity: hasBuyImbalance ? 0.75 : 0.35,
                                      zIndex: -1
                                    }} />
                                  )}
                                  <span style={{
                                    fontSize: rungHeight < 18 ? '8px' : '9px',
                                    fontWeight: hasBuyImbalance ? '900' : '600',
                                    color: hasBuyImbalance ? '#fff' : '#86efac'
                                  }}>
                                    {levelData ? levelData.askVol : ''}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Right Column: Shared Continuous Price Ladder (Y-Axis) */}
          <div 
            ref={priceScaleRef}
            onMouseDown={handlePriceScaleMouseDown}
            style={{
              width: '94px',
              backgroundColor: '#0f131a',
              borderLeft: '1px solid #232a3b',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden',
              overflowX: 'hidden',
              flexShrink: 0,
              cursor: 'ns-resize',
              userSelect: 'none'
            }}
            title="Click and drag up/down to compress or expand price scale"
          >
            {/* Top Right "F" Button Header */}
            <div style={{ 
              position: 'sticky', 
              top: 0, 
              zIndex: 10, 
              backgroundColor: '#0f131a', 
              padding: '3px 4px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e2533'
            }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: '#38bdf8' }}>PRICE ↕</span>
              <button
                onClick={(e) => { e.stopPropagation(); autoFitChart(); }}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #38bdf8',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontSize: '9px',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
                title="Auto-Fit Price Scale (F)"
              >
                F
              </button>
            </div>

            {/* Price Rungs */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {priceRungs.map((p) => {
                const isCurrentPrice = state?.lastPrice && Math.abs(p - state.lastPrice) < step / 2;
                return (
                  <div 
                    key={p} 
                    style={{
                      height: `${rungHeight}px`,
                      minHeight: `${rungHeight}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: rungHeight < 18 ? '9px' : '10px',
                      fontWeight: isCurrentPrice ? '900' : '600',
                      color: isCurrentPrice ? '#000' : '#cbd5e1',
                      backgroundColor: isCurrentPrice ? '#38bdf8' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                      boxSizing: 'border-box'
                    }}
                  >
                    {p.toFixed(selectedSymbol.includes('NIFTY') ? 1 : 2)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM METRICS MATRIX (SYNCHRONIZED HORIZONTALLY WITH CANDLES)         */}
        {/* ========================================================================= */}
        <div style={{
          display: 'flex',
          backgroundColor: '#121620',
          borderTop: '2px solid #232a3b',
          height: '140px'
        }}>
          {showProfile && (
            <div style={{
              width: '120px',
              backgroundColor: '#0f131a',
              borderRight: '1px solid #232a3b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              padding: '6px 8px',
              fontSize: '10px',
              fontWeight: '700',
              color: '#94a3b8',
              flexShrink: 0
            }}>
              <div>Mini Candle</div>
              <div>Session Period</div>
              <div>Bar Delta</div>
              <div>Max Delta</div>
              <div>Min Delta</div>
              <div>Cumulative (CVD)</div>
            </div>
          )}

          <div 
            ref={bottomMatrixRef}
            style={{
              flex: 1,
              overflowX: 'hidden',
              display: 'flex'
            }}
          >
            {state?.candles?.map((candle, cIdx) => {
              const isBull = candle.close >= candle.open;
              const deltaColor = candle.delta >= 0 ? '#10b981' : '#ef4444';
              const cvdColor = candle.cvd >= 0 ? '#34d399' : '#f87171';

              return (
                <div key={candle.timestamp || cIdx} style={{
                  width: `${candleWidth}px`,
                  minWidth: `${candleWidth}px`,
                  flexShrink: 0,
                  borderRight: '1px solid #1e2533',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontSize: '10px',
                  backgroundColor: '#151a24'
                }}>
                  {/* 1. Mini Candlestick Preview */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '18px' }}>
                    <div style={{
                      width: '8px',
                      height: '14px',
                      backgroundColor: isBull ? '#00e676' : '#ff5252',
                      borderRadius: '1px',
                      boxShadow: isBull ? '0 0 3px #00e676' : '0 0 3px #ff5252'
                    }} />
                  </div>

                  {/* 2. Session Letter & Time */}
                  <div style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '10px',
                    borderRadius: '3px',
                    margin: '0 10px',
                    padding: '1px 0'
                  }}>
                    {candle.period} ({candle.timeStr})
                  </div>

                  {/* 3. Bar Delta */}
                  <div style={{
                    backgroundColor: candle.delta >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                    color: deltaColor,
                    fontWeight: '800',
                    borderRadius: '2px',
                    margin: '0 8px'
                  }}>
                    {candle.delta >= 0 ? '+' : ''}{candle.delta}
                  </div>

                  {/* 4. Max Delta */}
                  <div style={{ color: '#34d399', fontWeight: '700' }}>
                    +{candle.maxDelta}
                  </div>

                  {/* 5. Min Delta */}
                  <div style={{ color: '#f87171', fontWeight: '700' }}>
                    {candle.minDelta}
                  </div>

                  {/* 6. Cumulative Delta (CVD) */}
                  <div style={{
                    color: cvdColor,
                    fontWeight: '800',
                    borderTop: '1px solid #232a3b',
                    paddingTop: '2px'
                  }}>
                    {candle.cvd >= 0 ? '+' : ''}{candle.cvd}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ width: '94px', backgroundColor: '#0f131a', borderLeft: '1px solid #232a3b', flexShrink: 0 }} />
        </div>

        {/* ========================================================================= */}
        {/* 4. BOTTOM INSTRUMENT TABS                                                 */}
        {/* ========================================================================= */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0c0f17',
          borderTop: '1px solid #1e2533',
          padding: '4px 10px'
        }}>
          <div style={{ display: 'flex', gap: '3px', overflowX: 'auto' }}>
            {AVAILABLE_INSTRUMENTS.slice(0, 8).map((inst) => {
              const isActive = selectedSymbol === inst.symbol;
              return (
                <button
                  key={inst.symbol}
                  onClick={() => handleSymbolChange(inst.symbol)}
                  disabled={switching}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#fff' : '#94a3b8',
                    backgroundColor: isActive ? '#1e293b' : '#121620',
                    border: `1px solid ${isActive ? '#38bdf8' : '#232a3b'}`,
                    borderBottom: isActive ? '2px solid #38bdf8' : '1px solid #232a3b',
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{inst.label}</span>
                  {isActive && <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />}
                </button>
              );
            })}
            
            <button
              onClick={(e) => { e.stopPropagation(); setIsInstDropdownOpen(!isInstDropdownOpen); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: '800',
                color: '#38bdf8',
                backgroundColor: '#121620',
                border: '1px solid #232a3b',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title="Select more instruments"
            >
              <Plus size={13} />
            </button>
          </div>

          <button
            onClick={() => {
              if (gridRef.current) gridRef.current.scrollLeft = gridRef.current.scrollWidth;
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#1a2234',
              color: '#38bdf8',
              border: '1px solid #2d3748',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Scroll to latest live candle"
          >
            <span>Live Candles</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
