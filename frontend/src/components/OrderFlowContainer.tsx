import React, { useState, useEffect, useRef } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  Waves, Activity, TrendingUp, TrendingDown, RefreshCw, 
  BarChart2, Zap, ArrowUpRight, ArrowDownRight, Radio, Shield
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

interface TickTape {
  id: string;
  timeStr: string;
  price: number;
  qty: number;
  side: 'BUY' | 'SELL';
  delta: number;
}

interface OrderFlowState {
  success: boolean;
  connected: boolean;
  activeSymbol: string;
  activeToken: string;
  timeframe: number;
  lastPrice: number | null;
  runningCvd: number;
  divergence: string;
  candlesCount: number;
  candles: FootprintCandle[];
  recentTicks: TickTape[];
}

export const OrderFlowContainer: React.FC = () => {
  const [state, setState] = useState<OrderFlowState | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [timeframe, setTimeframe] = useState(1);
  const [symbols, setSymbols] = useState<Array<{ symbol: string; token: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const backendUrl = getBackendUrl();
  const tapeContainerRef = useRef<HTMLDivElement>(null);

  // Fetch available symbols
  useEffect(() => {
    fetch(`${backendUrl}/api/orderflow/symbols`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.symbols) setSymbols(d.symbols);
      })
      .catch(() => {});
  }, [backendUrl]);

  // Poll live Order Flow state every 1 second
  useEffect(() => {
    let isMounted = true;

    const fetchState = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/orderflow/state?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setState(data);
          }
        }
      } catch (e) {
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000); // 1-second UI refresh for live Footprint & tape
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [backendUrl, selectedSymbol, timeframe]);

  const handleSymbolChange = async (newSym: string) => {
    setSelectedSymbol(newSym);
    setSwitching(true);
    try {
      await fetch(`${backendUrl}/api/orderflow/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSym, timeframe })
      });
    } catch (e) {
      console.error('Failed to switch symbol:', e);
    } finally {
      setSwitching(false);
    }
  };

  const handleTimeframeChange = async (newTf: number) => {
    setTimeframe(newTf);
    setSwitching(true);
    try {
      await fetch(`${backendUrl}/api/orderflow/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, timeframe: newTf })
      });
    } catch (e) {
      console.error('Failed to switch timeframe:', e);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', color: '#e0e0e0' }}>
      {/* Top Header Controls Strip */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        backgroundColor: '#131722',
        borderRadius: '12px',
        border: '1px solid #2a2e39',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <Waves size={24} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                Order Flow Footprint & Cumulative Volume Delta (CVD)
              </h2>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: state?.connected ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
                color: state?.connected ? '#00e676' : '#ff5252',
                border: `1px solid ${state?.connected ? '#00e67644' : '#ff525244'}`
              }}>
                <Radio size={12} className={state?.connected ? 'animate-pulse' : ''} />
                {state?.connected ? 'WEBSOCKET STREAMING (TICK-BY-TICK)' : 'CONNECTING WS...'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#787b86', marginTop: '2px' }}>
              Sub-second tick-level order matching engine: Bid × Ask Footprint volume, candle Delta, and CVD divergence.
            </div>
          </div>
        </div>

        {/* Controls: Symbol Selector & Timeframe */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Symbol Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#787b86', fontWeight: '600' }}>Stock:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              disabled={switching}
              style={{
                backgroundColor: '#1e222d',
                color: '#fff',
                border: '1px solid #363c4e',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {(symbols.length > 0 ? symbols : [
                { symbol: 'RELIANCE' }, { symbol: 'SBIN' }, { symbol: 'HDFCBANK' }, 
                { symbol: 'ICICIBANK' }, { symbol: 'INFY' }, { symbol: 'TCS' }, { symbol: 'AXISBANK' }
              ]).map(s => (
                <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Select */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1e222d', padding: '3px', borderRadius: '6px' }}>
            {[1, 3, 5].map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                style={{
                  backgroundColor: timeframe === tf ? '#38bdf8' : 'transparent',
                  color: timeframe === tf ? '#000' : '#a0a5b5',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {tf}m
              </button>
            ))}
          </div>

          {/* Last Price & Running CVD Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#181c27',
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid #2a2e39'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#787b86' }}>LTP</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                ₹{state?.lastPrice ? state.lastPrice.toFixed(2) : '--'}
              </div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: '#2a2e39' }} />
            <div>
              <div style={{ fontSize: '10px', color: '#787b86' }}>RUNNING CVD</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: (state?.runningCvd ?? 0) >= 0 ? '#00e676' : '#ff5252'
              }}>
                {(state?.runningCvd ?? 0) >= 0 ? '+' : ''}{(state?.runningCvd ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divergence Alert Bar */}
      {state?.divergence && state.divergence !== 'NONE' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: state.divergence.includes('BULLISH') ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
          borderRadius: '8px',
          border: `1px solid ${state.divergence.includes('BULLISH') ? '#00e67666' : '#ff525266'}`,
          color: state.divergence.includes('BULLISH') ? '#00e676' : '#ff5252',
          fontSize: '13px',
          fontWeight: '700'
        }}>
          <Zap size={16} />
          <span>ORDER FLOW DIVERGENCE ALERT: {state.divergence}</span>
        </div>
      )}

      {/* Main Grid: Footprint Chart (Left) + Live Order Flow Tape (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
        
        {/* Footprint Chart Canvas */}
        <div style={{
          backgroundColor: '#131722',
          borderRadius: '12px',
          border: '1px solid #2a2e39',
          padding: '16px',
          overflowX: 'auto',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                Bid × Ask Footprint Ladder (Traded Volume per Price)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#787b86' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#eab308', borderRadius: '2px' }} />
                  Gold: POC (Highest Vol)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#00e676', borderRadius: '2px' }} />
                  Green: Ask Aggression
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#ff5252', borderRadius: '2px' }} />
                  Red: Bid Aggression
                </span>
              </div>
            </div>

            {/* Footprint Bars Horizontal Scroll */}
            {(!state?.candles || state.candles.length === 0) ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#787b86' }}>
                Waiting for WebSocket ticks to construct the first footprint candle...
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px' }}>
                {state.candles.slice(-10).map((c, idx) => {
                  const isGreenCandle = c.close >= c.open;
                  const candleBorderColor = isGreenCandle ? '#00e676' : '#ff5252';

                  return (
                    <div key={idx} style={{
                      minWidth: '150px',
                      backgroundColor: '#181c27',
                      borderRadius: '8px',
                      border: `1px solid ${candleBorderColor}44`,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}>
                      {/* Candle Header */}
                      <div style={{
                        padding: '6px 8px',
                        backgroundColor: '#1f2430',
                        borderBottom: '1px solid #2a2e39',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        <span style={{ color: '#a0a5b5' }}>{c.timeStr}</span>
                        <span style={{ color: candleBorderColor }}>₹{c.close.toFixed(2)}</span>
                      </div>

                      {/* Price Ladder (Bid x Ask) */}
                      <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '320px', overflowY: 'auto' }}>
                        {c.priceLevels.map((lvl) => {
                          const isPoc = lvl.price === c.pocPrice;
                          const hasBuyImbalance = c.imbalanceLevels.some(imb => imb.price === lvl.price && imb.type === 'BUY_IMBALANCE');
                          const hasSellImbalance = c.imbalanceLevels.some(imb => imb.price === lvl.price && imb.type === 'SELL_IMBALANCE');

                          return (
                            <div key={lvl.price} style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 48px 1fr',
                              fontSize: '10px',
                              alignItems: 'center',
                              backgroundColor: isPoc ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                              border: isPoc ? '1px solid #eab308' : 'none',
                              borderRadius: '3px',
                              padding: '1px 2px'
                            }}>
                              {/* Left: Bid Volume (Sells) */}
                              <div style={{
                                textAlign: 'right',
                                paddingRight: '4px',
                                color: hasSellImbalance ? '#ff5252' : '#f87171',
                                fontWeight: hasSellImbalance ? '800' : '500',
                                backgroundColor: hasSellImbalance ? 'rgba(255, 82, 82, 0.25)' : 'transparent'
                              }}>
                                {lvl.bidVol > 0 ? lvl.bidVol.toLocaleString() : '-'}
                              </div>

                              {/* Center: Price Level */}
                              <div style={{
                                textAlign: 'center',
                                color: isPoc ? '#eab308' : '#787b86',
                                fontWeight: '700',
                                fontSize: '9px'
                              }}>
                                {lvl.price.toFixed(1)}
                              </div>

                              {/* Right: Ask Volume (Buys) */}
                              <div style={{
                                textAlign: 'left',
                                paddingLeft: '4px',
                                color: hasBuyImbalance ? '#00e676' : '#4ade80',
                                fontWeight: hasBuyImbalance ? '800' : '500',
                                backgroundColor: hasBuyImbalance ? 'rgba(0, 230, 118, 0.25)' : 'transparent'
                              }}>
                                {lvl.askVol > 0 ? lvl.askVol.toLocaleString() : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Candle Footer Metrics */}
                      <div style={{
                        padding: '6px 8px',
                        backgroundColor: '#161922',
                        borderTop: '1px solid #2a2e39',
                        fontSize: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#787b86' }}>Vol:</span>
                          <span style={{ fontWeight: '700', color: '#fff' }}>{c.volume.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#787b86' }}>Delta:</span>
                          <span style={{ fontWeight: '700', color: c.delta >= 0 ? '#00e676' : '#ff5252' }}>
                            {c.delta >= 0 ? '+' : ''}{c.delta.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#787b86' }}>CVD:</span>
                          <span style={{ fontWeight: '600', color: c.cvd >= 0 ? '#4ade80' : '#f87171' }}>
                            {c.cvd >= 0 ? '+' : ''}{c.cvd.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CVD Summary Line Bar at bottom */}
          <div style={{
            borderTop: '1px solid #2a2e39',
            paddingTop: '12px',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#38bdf8" />
              <span style={{ fontWeight: '700', color: '#fff' }}>Cumulative Volume Delta (CVD) Status:</span>
              <span style={{
                color: (state?.runningCvd ?? 0) >= 0 ? '#00e676' : '#ff5252',
                fontWeight: '700'
              }}>
                {(state?.runningCvd ?? 0) >= 0 ? 'Aggressive Buyers in Control' : 'Aggressive Sellers in Control'}
              </span>
            </div>
            <div style={{ color: '#787b86', fontSize: '11px' }}>
              Aggregated continuously tick-by-tick from Angel One SmartStream WebSocket.
            </div>
          </div>
        </div>

        {/* Live Execution Tape Panel (Right Column) */}
        <div style={{
          backgroundColor: '#131722',
          borderRadius: '12px',
          border: '1px solid #2a2e39',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: '480px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid #2a2e39'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="#eab308" />
              Live Order Flow Tape
            </div>
            <span style={{ fontSize: '10px', color: '#787b86' }}>SUB-SECOND</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '70px 1fr 50px',
            fontSize: '11px',
            color: '#787b86',
            fontWeight: '700',
            paddingBottom: '6px',
            borderBottom: '1px solid #1f2430'
          }}>
            <span>Time</span>
            <span>Price</span>
            <span style={{ textAlign: 'right' }}>Qty</span>
          </div>

          {/* Scrolling Ticks */}
          <div ref={tapeContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            {(!state?.recentTicks || state.recentTicks.length === 0) ? (
              <div style={{ fontSize: '11px', color: '#787b86', textAlign: 'center', padding: '20px' }}>
                Waiting for executed trades...
              </div>
            ) : (
              state.recentTicks.map((t) => {
                const isBuy = t.side === 'BUY';
                const rowColor = isBuy ? '#00e676' : '#ff5252';

                return (
                  <div key={t.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr 50px',
                    fontSize: '11px',
                    alignItems: 'center',
                    padding: '3px 4px',
                    borderRadius: '4px',
                    backgroundColor: isBuy ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 82, 82, 0.08)',
                    borderLeft: `3px solid ${rowColor}`
                  }}>
                    <span style={{ color: '#787b86', fontSize: '10px' }}>{t.timeStr}</span>
                    <span style={{ color: '#fff', fontWeight: '600' }}>₹{t.price.toFixed(2)}</span>
                    <span style={{ textAlign: 'right', fontWeight: '700', color: rowColor }}>
                      {t.qty.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
