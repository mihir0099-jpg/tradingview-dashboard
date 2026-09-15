import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  Waves, Activity, TrendingUp, TrendingDown, RefreshCw, 
  BarChart2, Zap, ArrowUpRight, ArrowDownRight, Radio, Shield, ChevronRight,
  Crosshair, ZoomIn, ZoomOut, Move, RotateCcw, Target
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

export const OrderFlowContainer: React.FC = () => {
  const [state, setState] = useState<OrderFlowState | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [timeframe, setTimeframe] = useState(5);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Layout & Interactive Zoom/Scale states
  const [rungHeight, setRungHeight] = useState(22); // Height per price level in px (12px to 60px)
  const [candleWidth, setCandleWidth] = useState(130); // Width per candle in px (80px to 220px)
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
    initialCenteredRef.current = false; // Trigger recenter on new symbol
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

  // Build the global continuous price scale with headroom & footroom padding
  const step = state?.tickSize || (selectedSymbol === 'NIFTY' ? 5 : (selectedSymbol === 'BANKNIFTY' ? 20 : 1));
  const paddingSteps = 20; // 20 rungs above and below to give room for dragging/scrolling
  const rawMin = state?.globalMin ? Math.floor(state.globalMin / step) * step : 0;
  const rawMax = state?.globalMax ? Math.ceil(state.globalMax / step) * step : 100;

  const minPrice = rawMin > 0 ? Math.max(0, rawMin - (paddingSteps * step)) : 0;
  const maxPrice = rawMax + (paddingSteps * step);

  const priceRungs: number[] = [];
  if (maxPrice > minPrice && step > 0) {
    for (let p = maxPrice; p >= minPrice; p = parseFloat((p - step).toFixed(2))) {
      priceRungs.push(p);
      if (priceRungs.length > 350) break; // Generous limit of 350 price rows
    }
  }

  // Max volume across composite profile for bar scaling
  const maxCompVol = Math.max(1, ...(state?.compositeProfile?.map(cp => cp.volume) || [1]));

  // Synchronize scrolling across Left Profile, Center Candles, Right Price Scale, and Bottom Matrix
  const handleGridScroll = useCallback(() => {
    if (!gridRef.current) return;
    const { scrollTop, scrollLeft } = gridRef.current;
    if (profileRef.current) profileRef.current.scrollTop = scrollTop;
    if (priceScaleRef.current) priceScaleRef.current.scrollTop = scrollTop;
    if (bottomMatrixRef.current) bottomMatrixRef.current.scrollLeft = scrollLeft;
  }, []);

  // Recenter on Current LTP (Last Traded Price)
  const recenterChart = useCallback(() => {
    if (!gridRef.current || !state?.lastPrice || priceRungs.length === 0) return;
    const ltpIdx = priceRungs.findIndex(p => Math.abs(p - state.lastPrice!) < step / 2);
    if (ltpIdx >= 0) {
      const targetY = (ltpIdx * rungHeight) - (gridRef.current.clientHeight / 2) + (rungHeight / 2);
      gridRef.current.scrollTop = Math.max(0, targetY);
    }
    // Scroll to latest (rightmost) candle
    gridRef.current.scrollLeft = gridRef.current.scrollWidth;
  }, [state?.lastPrice, priceRungs, rungHeight, step]);

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

  // Handle Grid Pan (2D Dragging: Left, Right, Up, Down)
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

  // Handle Price Scale Drag (Click & drag right column up/down to zoom vertical price scale)
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

  // Global mousemove and mouseup listeners for smooth dragging outside element bounds
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Chart 2D Pan Drag
      if (panStartRef.current && gridRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        gridRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
        gridRef.current.scrollTop = panStartRef.current.scrollTop - dy;
      }

      // 2. Price Scale Zoom Drag
      if (scaleDragRef.current && gridRef.current) {
        const dy = e.clientY - scaleDragRef.current.y;
        // Dragging UP (-dy) increases rungHeight (expands scale)
        // Dragging DOWN (+dy) decreases rungHeight (compresses scale)
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

  // Mouse wheel handler for smooth Ctrl+Wheel Price Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!gridRef.current) return;
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      setRungHeight(prev => Math.max(12, Math.min(60, prev + delta)));
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        padding: '14px', 
        color: '#e0e0e0', 
        backgroundColor: '#0b0e14', 
        minHeight: '100vh',
        userSelect: isPanning || isDraggingScale ? 'none' : 'auto'
      }}
    >
      {/* Top Header Control Strip */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: '#121620',
        borderRadius: '10px',
        border: '1px solid #232a3b',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        gap: '10px'
      }}>
        {/* Left: Brand & Instrument Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#1a2234',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #2d3748'
          }}>
            <Waves size={20} color="#38bdf8" />
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#fff', letterSpacing: '0.5px' }}>
              BELL-TPO ORDER FLOW FOOTPRINT
            </span>
          </div>

          {/* Quick Select Instrument Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: 'NIFTY 50', val: 'NIFTY', badge: 'INDEX' },
              { label: 'BANK NIFTY', val: 'BANKNIFTY', badge: 'INDEX' },
              { label: 'RELIANCE', val: 'RELIANCE' },
              { label: 'SBIN', val: 'SBIN' },
              { label: 'HDFC BANK', val: 'HDFCBANK' },
              { label: 'ICICI BANK', val: 'ICICIBANK' }
            ].map((inst) => (
              <button
                key={inst.val}
                onClick={() => handleSymbolChange(inst.val)}
                disabled={switching}
                style={{
                  backgroundColor: selectedSymbol === inst.val ? '#38bdf8' : '#1a2234',
                  color: selectedSymbol === inst.val ? '#000' : '#cbd5e1',
                  border: `1px solid ${selectedSymbol === inst.val ? '#38bdf8' : '#2d3748'}`,
                  padding: '5px 12px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {inst.label}
                {inst.badge && (
                  <span style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    backgroundColor: selectedSymbol === inst.val ? '#0284c7' : '#334155',
                    color: '#fff'
                  }}>
                    {inst.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Timeframe, Live WS Badge, LTP, CVD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Timeframe selector */}
          <div style={{ display: 'flex', gap: '3px', backgroundColor: '#1a2234', padding: '3px', borderRadius: '6px', border: '1px solid #2d3748' }}>
            {[1, 3, 5, 15].map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                style={{
                  backgroundColor: timeframe === tf ? '#38bdf8' : 'transparent',
                  color: timeframe === tf ? '#000' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 9px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {tf}m
              </button>
            ))}
          </div>

          {/* WebSocket Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: state?.connected ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
            color: state?.connected ? '#00e676' : '#ff5252',
            border: `1px solid ${state?.connected ? '#00e67644' : '#ff525244'}`
          }}>
            <Radio size={12} className={state?.connected ? 'animate-pulse' : ''} />
            {state?.connected ? 'WS LIVE' : 'WS RECONNECTING'}
          </div>

          {/* Current Spot & Running CVD */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#1a2234',
            padding: '4px 14px',
            borderRadius: '6px',
            border: '1px solid #2d3748'
          }}>
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600' }}>{selectedSymbol} SPOT</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>
                ₹{state?.lastPrice ? state.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
              </div>
            </div>
            <div style={{ width: '1px', height: '22px', backgroundColor: '#334155' }} />
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600' }}>SESSION CVD</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '800',
                color: (state?.runningCvd ?? 0) >= 0 ? '#00e676' : '#ff5252'
              }}>
                {(state?.runningCvd ?? 0) >= 0 ? '+' : ''}{(state?.runningCvd ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divergence Alert if active */}
      {state?.divergence && state.divergence !== 'NONE' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          backgroundColor: state.divergence.includes('BULLISH') ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
          borderRadius: '6px',
          border: `1px solid ${state.divergence.includes('BULLISH') ? '#00e67666' : '#ff525266'}`,
          color: state.divergence.includes('BULLISH') ? '#00e676' : '#ff5252',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          <Zap size={14} />
          <span>ORDER FLOW DIVERGENCE: {state.divergence}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRUE BELL-TPO / NINJATRADER ORDER FLOW CANVAS                             */}
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
        {/* Interactive Chart Toolbar Bar */}
        <div style={{
          padding: '8px 14px',
          backgroundColor: '#181e2b',
          borderBottom: '1px solid #232a3b',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#94a3b8',
          gap: '8px'
        }}>
          {/* Left: Info & Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', color: '#fff' }}>
              {selectedSymbol} — {timeframe}m Continuous Footprint (Step: {step} pts)
            </span>
            <span style={{ color: '#ef4444', fontWeight: '700' }}>■ Red Box = POC</span>
            <span style={{ color: '#00e676', fontWeight: '600' }}>■ Green = Ask Buys</span>
            <span style={{ color: '#ff5252', fontWeight: '600' }}>■ Red = Bid Sells</span>
          </div>

          {/* Right: Interactive Drag / Zoom Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Navigation Instructions Hint */}
            <span style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Move size={12} color="#38bdf8" />
              <span>Drag chart to Pan (2D) | Drag Price Scale ↕ to Zoom</span>
            </span>

            {/* Recenter LTP Button */}
            <button
              onClick={recenterChart}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: '1px solid #38bdf8',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
              }}
              title="Recenter view on current market price"
            >
              <Target size={13} />
              Recenter LTP
            </button>

            {/* Price Scale (Vertical) Zoom Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#10141d', padding: '2px 4px', borderRadius: '5px', border: '1px solid #232a3b' }}>
              <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>Y-SCALE:</span>
              <button
                onClick={() => setRungHeight(prev => Math.max(12, prev - 3))}
                style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', fontWeight: '800' }}
                title="Compress Price Scale (Zoom Out Y)"
              >
                -
              </button>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700', minWidth: '32px', textAlign: 'center' }}>
                {rungHeight}px
              </span>
              <button
                onClick={() => setRungHeight(prev => Math.min(60, prev + 3))}
                style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', fontWeight: '800' }}
                title="Expand Price Scale (Zoom In Y)"
              >
                +
              </button>
            </div>

            {/* Candle Width (Horizontal) Zoom Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#10141d', padding: '2px 4px', borderRadius: '5px', border: '1px solid #232a3b' }}>
              <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>X-TIME:</span>
              <button
                onClick={() => setCandleWidth(prev => Math.max(80, prev - 15))}
                style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', fontWeight: '800' }}
                title="Compress Time (Zoom Out X)"
              >
                -
              </button>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700', minWidth: '36px', textAlign: 'center' }}>
                {candleWidth}px
              </span>
              <button
                onClick={() => setCandleWidth(prev => Math.min(220, prev + 15))}
                style={{ backgroundColor: '#1a2234', color: '#cbd5e1', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', fontWeight: '800' }}
                title="Expand Time (Zoom In X)"
              >
                +
              </button>
            </div>

            {/* Reset Scale */}
            <button
              onClick={() => {
                setRungHeight(22);
                setCandleWidth(130);
                setTimeout(recenterChart, 50);
              }}
              style={{
                backgroundColor: '#1a2234',
                color: '#94a3b8',
                border: '1px solid #2d3748',
                padding: '4px 8px',
                borderRadius: '5px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title="Reset Zoom to 100%"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Main Chart Area: Composite Profile (Left) + Candles Grid (Center) + Price Axis (Right) */}
        {/* ========================================================================= */}
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
          <div 
            ref={profileRef}
            style={{
              width: '120px',
              backgroundColor: '#0f131a',
              borderRight: '1px solid #232a3b',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden', // Synchronized with gridRef
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
                    {/* Volume Bar Fill */}
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
                const candleMap = new Map(candle.priceLevels.map(pl => [pl.price, pl]));

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

                        // Check for stacked diagonal imbalances
                        const hasBuyImbalance = candle.imbalanceLevels?.some(imb => Math.abs(imb.price - p) < step / 2 && imb.type === 'BUY_IMBALANCE');
                        const hasSellImbalance = candle.imbalanceLevels?.some(imb => Math.abs(imb.price - p) < step / 2 && imb.type === 'SELL_IMBALANCE');

                        // Background widths
                        const maxLevelVol = Math.max(1, ...(candle.priceLevels.map(pl => pl.totalVol) || [1]));
                        const bidWidthPct = levelData ? Math.min(100, (levelData.bidVol / maxLevelVol) * 100) : 0;
                        const askWidthPct = levelData ? Math.min(100, (levelData.askVol / maxLevelVol) * 100) : 0;

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
                              backgroundColor: isPoc ? 'rgba(234, 179, 8, 0.12)' : (inCandleRange ? 'rgba(255, 255, 255, 0.015)' : 'transparent'),
                              // Exact Red Outline Box for POC
                              border: isPoc ? '2px solid #ef4444' : 'none',
                              boxSizing: 'border-box'
                            }}
                          >
                            {/* Thin vertical wick indicator when in candle range */}
                            {inCandleRange && (
                              <div style={{
                                position: 'absolute',
                                left: '50%',
                                top: 0,
                                bottom: 0,
                                width: '1px',
                                backgroundColor: isBull ? '#00e67633' : '#ff525233',
                                transform: 'translateX(-50%)',
                                zIndex: 0
                              }} />
                            )}

                            {levelData ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
                                {/* Left: Bid Volume (Sells) */}
                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  paddingRight: '4px',
                                  borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                  <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${bidWidthPct}%`,
                                    backgroundColor: hasSellImbalance ? '#ef4444' : '#f87171',
                                    opacity: hasSellImbalance ? 0.7 : 0.35,
                                    zIndex: -1
                                  }} />
                                  <span style={{
                                    fontSize: rungHeight < 18 ? '8px' : '9px',
                                    fontWeight: hasSellImbalance ? '900' : '600',
                                    color: hasSellImbalance ? '#fff' : '#fca5a5'
                                  }}>
                                    {levelData.bidVol}
                                  </span>
                                </div>

                                {/* Right: Ask Volume (Buys) */}
                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  paddingLeft: '4px'
                                }}>
                                  <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${askWidthPct}%`,
                                    backgroundColor: hasBuyImbalance ? '#10b981' : '#34d399',
                                    opacity: hasBuyImbalance ? 0.7 : 0.35,
                                    zIndex: -1
                                  }} />
                                  <span style={{
                                    fontSize: rungHeight < 18 ? '8px' : '9px',
                                    fontWeight: hasBuyImbalance ? '900' : '600',
                                    color: hasBuyImbalance ? '#fff' : '#86efac'
                                  }}>
                                    {levelData.askVol}
                                  </span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Right Column: Shared Continuous Price Ladder (Y-Axis) with Interactive Drag Zoom */}
          <div 
            ref={priceScaleRef}
            onMouseDown={handlePriceScaleMouseDown}
            style={{
              width: '94px',
              backgroundColor: '#0f131a',
              borderLeft: '1px solid #232a3b',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden', // Synchronized with gridRef
              overflowX: 'hidden',
              flexShrink: 0,
              cursor: 'ns-resize', // North-South drag resize cursor just like TradingView!
              userSelect: 'none'
            }}
            title="Click and drag up/down to compress or expand price scale"
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
              color: '#38bdf8', 
              borderBottom: '1px solid #1e2533',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <span>PRICE ↕</span>
            </div>
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
        {/* BOTTOM METRICS MATRIX (SYNCHRONIZED HORIZONTALLY WITH CANDLES)            */}
        {/* ========================================================================= */}
        <div style={{
          display: 'flex',
          backgroundColor: '#121620',
          borderTop: '2px solid #232a3b',
          height: '140px'
        }}>
          {/* Left Label Column */}
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
            <div>Session Letter</div>
            <div>Bar Delta</div>
            <div>Max Delta</div>
            <div>Min Delta</div>
            <div>Cumulative (CVD)</div>
          </div>

          {/* Metrics for Each Candle Column */}
          <div 
            ref={bottomMatrixRef}
            style={{
              flex: 1,
              overflowX: 'hidden', // Synchronized with gridRef
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
                  {/* 1. Mini Candlestick */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '18px' }}>
                    <div style={{
                      width: '8px',
                      height: '14px',
                      backgroundColor: isBull ? '#00e676' : '#ff5252',
                      borderRadius: '1px'
                    }} />
                  </div>

                  {/* 2. Session Letter */}
                  <div style={{
                    backgroundColor: '#eab308',
                    color: '#000',
                    fontWeight: '800',
                    fontSize: '10px',
                    borderRadius: '2px',
                    margin: '0 15px'
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

          {/* Right Price axis alignment blank */}
          <div style={{ width: '94px', backgroundColor: '#0f131a', borderLeft: '1px solid #232a3b', flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
};
