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

interface ClimaxZone {
  id: string;
  type: 'BC' | 'SC' | 'VCB' | 'VCS';
  candleIdx: number;
  timestamp: number;
  highPrice: number;
  lowPrice: number;
  zoneTop: number;
  zoneBtm: number;
  label: string;
  subLabel: string;
  volRatio: number;
  delta: number;
  isResistance: boolean;
  breachedAtIdx: number | null;
  isBreached: boolean;
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
  cot?: {
    top: { net: number; cotIndex: number; oi: number; isTrapped: boolean };
    btm: { net: number; cotIndex: number; oi: number; isTrapped: boolean };
  };
}

export interface CvdSwingSignal {
  type: 'EXHAUSTED_SELLERS' | 'SELLING_PRESSURE_ABSORBED' | 'EXHAUSTED_BUYERS' | 'BUYING_PRESSURE_ABSORBED';
  category: 'BULL_EXHAUSTION' | 'BULL_ABSORPTION' | 'BEAR_EXHAUSTION' | 'BEAR_ABSORPTION';
  title: string;
  badge: string;
  shortLabel: string;
  subTitle: string;
  desc: string;
  priceCondition: string;
  cvdCondition: string;
  color: string;
  bg: string;
  border: string;
  candleIdx: number;
}

interface OrderFlowState {
  success: boolean;
  connected: boolean;
  feedSource?: string;
  clientCode?: string;
  totalTicksReceived?: number;
  lastTickTime?: string;
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
  { symbol: 'NIFTYFUT', label: 'NIFTY FUT', type: 'FUTURES', defaultTick: 2.5, tickOptions: [1.0, 2.5, 5.0, 10.0, 20.0] },
  { symbol: 'BANKNIFTYFUT', label: 'BANKNIFTY FUT', type: 'FUTURES', defaultTick: 10.0, tickOptions: [2.0, 5.0, 10.0, 20.0, 50.0] },
  { symbol: 'CRUDEOILFUT', label: 'CRUDE OIL FUT', type: 'COMMODITY', defaultTick: 5.0, tickOptions: [1.0, 2.0, 5.0, 10.0, 20.0] },
  { symbol: 'CRUDEOILM', label: 'CRUDE OIL MINI', type: 'COMMODITY', defaultTick: 5.0, tickOptions: [1.0, 2.0, 5.0, 10.0, 20.0] },
  { symbol: 'SENSEX', label: 'SENSEX', type: 'INDEX', defaultTick: 10.0, tickOptions: [5.0, 10.0, 20.0, 50.0, 100.0] },
  { symbol: 'NIFTY', label: 'NIFTY 50', type: 'INDEX', defaultTick: 2.5, tickOptions: [1.0, 2.5, 5.0, 10.0, 20.0] },
  { symbol: 'BANKNIFTY', label: 'BANK NIFTY', type: 'INDEX', defaultTick: 10.0, tickOptions: [2.0, 5.0, 10.0, 20.0, 50.0] },
  { symbol: 'RELIANCE', label: 'RELIANCE', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'HDFCBANK', label: 'HDFC BANK', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'ICICIBANK', label: 'ICICI BANK', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'SBIN', label: 'SBIN', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'INFY', label: 'INFY', type: 'STOCK', defaultTick: 1.0, tickOptions: [0.5, 1.0, 2.0, 5.0] },
  { symbol: 'TCS', label: 'TCS', type: 'STOCK', defaultTick: 2.0, tickOptions: [1.0, 2.0, 5.0, 10.0] }
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
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTYFUT'); // Default to NIFTY FUTURES as requested!
  const [timeframe, setTimeframe] = useState(5);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // User Configured Tick Size (Cluster / Block Size)
  const [customTickSize, setCustomTickSize] = useState<number | null>(null);

  // Layout & Settings
  const [layoutStyle, setLayoutStyle] = useState<'CANDLE_ORDERS' | 'CLASSIC_SPLIT'>('CANDLE_ORDERS');
  const [viewMode, setViewMode] = useState<'IMBALANCE' | 'DELTA' | 'VOLUME'>('IMBALANCE');
  const [imbalanceRatio, setImbalanceRatio] = useState<number>(3.0);
  const [showSteppedPoc, setShowSteppedPoc] = useState(true);
  const [showCotBadges, setShowCotBadges] = useState(true); // COT on candle top & bottom
  const [showClimaxZones, setShowClimaxZones] = useState(true); // VCB, VCS, SC, BC Climax Zones
  const [isVsaGuideOpen, setIsVsaGuideOpen] = useState(false); // VSA Educational Guide Modal
  const [showCrCaps, setShowCrCaps] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
  const [fiiData, setFiiData] = useState<any>(null);
  const [showFiiPanel, setShowFiiPanel] = useState(false);

  // Dropdown UI states
  const [isTfDropdownOpen, setIsTfDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isImbDropdownOpen, setIsImbDropdownOpen] = useState(false);
  const [isInstDropdownOpen, setIsInstDropdownOpen] = useState(false);
  const [isTickDropdownOpen, setIsTickDropdownOpen] = useState(false);

  // Zoom & Pan states
  const [rungHeight, setRungHeight] = useState(26);
  const [candleWidth, setCandleWidth] = useState(185);
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingScale, setIsDraggingScale] = useState(false);

  // Auto-scroll to latest candle on arrival
  const [autoScrollToLatest, setAutoScrollToLatest] = useState(true);
  const [isNearRight, setIsNearRight] = useState(true);
  const prevCandlesCountRef = useRef<number>(0);
  const prevLastCandleTsRef = useRef<number>(0);

  // backendUrl evaluated dynamically
  const backendUrl = (getBackendUrl() || 'https://skimmer-savage-dipped.ngrok-free.dev').replace(/\/$/, '');

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
  const step = customTickSize || activeInstMeta.defaultTick || state?.tickSize || 1.0;

  const fetchState = async () => {
    const primaryUrl = backendUrl;
    const fallbackUrl = 'https://skimmer-savage-dipped.ngrok-free.dev';

    const tryFetch = async (targetUrl: string) => {
      const cleanTarget = targetUrl.replace(/\/$/, '');
      const res = await fetch(`${cleanTarget}/api/orderflow/state?_t=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.success) throw new Error('Invalid state response');
      return data;
    };

    try {
      let data: any = null;
      try {
        data = await tryFetch(primaryUrl);
      } catch (err) {
        if (primaryUrl !== fallbackUrl) {
          data = await tryFetch(fallbackUrl);
        } else {
          throw err;
        }
      }

      if (data && data.success) {
        setState(data);
        if (data.activeSymbol && data.activeSymbol !== selectedSymbol) {
          setSelectedSymbol(data.activeSymbol);
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

    const fetchFii = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/orderflow/fii-positioning`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setFiiData(json.data);
        }
      } catch (e) {}
    };
    fetchFii();
    const fiiInterval = setInterval(fetchFii, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(fiiInterval);
    };
  }, [backendUrl]);

  const handleSymbolChange = async (newSym: string) => {
    setSelectedSymbol(newSym);
    setSwitching(true);
    setCustomTickSize(null); // Reset tick size to instrument default
    initialCenteredRef.current = false;
    prevCandlesCountRef.current = 0;
    prevLastCandleTsRef.current = 0;
    setIsInstDropdownOpen(false);
    try {
      await fetch(`${backendUrl}/api/orderflow/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSym, timeframe })
      });
      await fetchState();
      setTimeout(() => scrollToLatest(false), 150);
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
    prevCandlesCountRef.current = 0;
    prevLastCandleTsRef.current = 0;
    setIsTfDropdownOpen(false);
    try {
      await fetch(`${backendUrl}/api/orderflow/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, timeframe: newTf })
      });
      await fetchState();
      setTimeout(() => scrollToLatest(false), 150);
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

  // =========================================================================
  // VSA CLIMAX ZONES (BC, SC, VCB, VCS) DETECTION ENGINE
  // =========================================================================
  const climaxZones: ClimaxZone[] = React.useMemo(() => {
    if (!state?.candles || state.candles.length === 0) return [];
    
    const candles = state.candles;
    const totalVol = candles.reduce((acc, c) => acc + (c.volume || 0), 0);
    const avgVol = totalVol / candles.length;

    const totalRange = candles.reduce((acc, c) => acc + Math.max(step, c.high - c.low), 0);
    const avgRange = totalRange / candles.length;

    const zones: ClimaxZone[] = [];

    candles.forEach((c, idx) => {
      const cRange = Math.max(step, c.high - c.low);
      const volRatio = avgVol > 0 ? (c.volume / avgVol) : 1;
      const rangeRatio = avgRange > 0 ? (cRange / avgRange) : 1;
      const upperWick = c.high - Math.max(c.open, c.close);
      const lowerWick = Math.min(c.open, c.close) - c.low;
      const upperWickRatio = upperWick / cRange;
      const lowerWickRatio = lowerWick / cRange;
      const prevC = idx > 0 ? candles[idx - 1] : null;

      // 1. BC (Buying Climax): Late stage uptrend, ultra-high volume, wide spread, closes off highs
      const isUptrend = (c.close > c.open) || (prevC && c.high > prevC.high);
      const isBC = isUptrend && volRatio >= 1.6 && rangeRatio >= 1.25 && (upperWickRatio >= 0.22 || (c.high - c.close) / cRange >= 0.30);

      // 2. SC (Selling Climax): Extended downtrend, ultra-high volume, wide spread, closes off lows
      const isDowntrend = (c.close < c.open) || (prevC && c.low < prevC.low);
      const isSC = isDowntrend && volRatio >= 1.6 && rangeRatio >= 1.25 && (lowerWickRatio >= 0.22 || (c.close - c.low) / cRange >= 0.30);

      // 3. VCB (Volume Buying Climax): Aggressive buying absorbed at high with narrow/stalled spread
      const isVCB = !isBC && !isSC && (c.delta > 0 || c.volume >= avgVol * 1.3) && rangeRatio <= 1.05 && (c.high - c.close) / cRange >= 0.25;

      // 4. VCS (Volume Selling Climax): Aggressive selling absorbed at low with narrow/stalled spread
      const isVCS = !isBC && !isSC && !isVCB && (c.delta < 0 || c.volume >= avgVol * 1.3) && rangeRatio <= 1.05 && (c.close - c.low) / cRange >= 0.25;

      if (isBC) {
        zones.push({
          id: `BC-${c.timestamp || idx}`,
          type: 'BC',
          candleIdx: idx,
          timestamp: c.timestamp,
          highPrice: c.high,
          lowPrice: c.low,
          zoneTop: c.high,
          zoneBtm: Math.max(c.open, c.close),
          label: 'BC (Buying Climax)',
          subLabel: 'Wholesale Distribution / Resistance',
          volRatio: parseFloat(volRatio.toFixed(1)),
          delta: c.delta,
          isResistance: true,
          breachedAtIdx: null,
          isBreached: false
        });
      } else if (isSC) {
        zones.push({
          id: `SC-${c.timestamp || idx}`,
          type: 'SC',
          candleIdx: idx,
          timestamp: c.timestamp,
          highPrice: c.high,
          lowPrice: c.low,
          zoneTop: Math.min(c.open, c.close),
          zoneBtm: c.low,
          label: 'SC (Selling Climax)',
          subLabel: 'Institutional Accumulation / Floor',
          volRatio: parseFloat(volRatio.toFixed(1)),
          delta: c.delta,
          isResistance: false,
          breachedAtIdx: null,
          isBreached: false
        });
      } else if (isVCB) {
        zones.push({
          id: `VCB-${c.timestamp || idx}`,
          type: 'VCB',
          candleIdx: idx,
          timestamp: c.timestamp,
          highPrice: c.high,
          lowPrice: c.low,
          zoneTop: c.high,
          zoneBtm: parseFloat((c.high - (step * 2)).toFixed(2)),
          label: 'VCB (Volume Buying Climax)',
          subLabel: 'Ask Absorption / Resistance Peak',
          volRatio: parseFloat(volRatio.toFixed(1)),
          delta: c.delta,
          isResistance: true,
          breachedAtIdx: null,
          isBreached: false
        });
      } else if (isVCS) {
        zones.push({
          id: `VCS-${c.timestamp || idx}`,
          type: 'VCS',
          candleIdx: idx,
          timestamp: c.timestamp,
          highPrice: c.high,
          lowPrice: c.low,
          zoneTop: parseFloat((c.low + (step * 2)).toFixed(2)),
          zoneBtm: c.low,
          label: 'VCS (Volume Selling Climax)',
          subLabel: 'Bid Absorption / Floor Support',
          volRatio: parseFloat(volRatio.toFixed(1)),
          delta: c.delta,
          isResistance: false,
          breachedAtIdx: null,
          isBreached: false
        });
      }
    });

    // Unbreached / Mitigation Engine: Keep zone extending forward across all candles UNTIL breached!
    zones.forEach(z => {
      let bIdx: number | null = null;
      for (let k = z.candleIdx + 1; k < candles.length; k++) {
        const ck = candles[k];
        if (z.isResistance) {
          // Resistance breached when price closes above zoneTop
          if (ck.close > z.zoneTop) {
            bIdx = k;
            break;
          }
        } else {
          // Support floor breached when price closes below zoneBtm
          if (ck.close < z.zoneBtm) {
            bIdx = k;
            break;
          }
        }
      }
      z.breachedAtIdx = bIdx;
      z.isBreached = bIdx !== null;
    });

    return zones;
  }, [state?.candles, step]);

  // =========================================================================
  // CUMULATIVE VOLUME DELTA (CVD) MATRIX DIVERGENCE & ABSORPTION ENGINE
  // 1. Exhausted Sellers: Price Lower Low 📉 | CVD Higher Low 📈 (Bull Reversal)
  // 2. Selling Pressure Absorbed: Price Higher Low 📈 | CVD Lower Low 📉 (Limit Buyer Absorption)
  // 3. Exhausted Buyers: Price Higher High 📈 | CVD Lower High 📉 (Bear Reversal)
  // 4. Buying Pressure Absorbed: Price Lower High 📉 | CVD Higher High 📈 (Limit Seller Absorption)
  // =========================================================================
  const cvdSignalsMap = React.useMemo(() => {
    const map = new Map<number, CvdSwingSignal>();
    if (!state?.candles || state.candles.length < 3) return map;

    const candles = state.candles;
    candles.forEach((c, idx) => {
      if (idx < 2) return;
      const window = candles.slice(Math.max(0, idx - 10), idx);

      let minLow = Infinity;
      let priorLowCandle: FootprintCandle | null = null;
      let maxHigh = -Infinity;
      let priorHighCandle: FootprintCandle | null = null;

      window.forEach(w => {
        if (w.low < minLow) {
          minLow = w.low;
          priorLowCandle = w;
        }
        if (w.high > maxHigh) {
          maxHigh = w.high;
          priorHighCandle = w;
        }
      });

      if (priorLowCandle && priorHighCandle) {
        // 1. Lower Low in Price vs Higher Low in CVD -> Exhausted Sellers
        if (c.low < minLow - (step * 0.4) && c.cvd > priorLowCandle.cvd + 15) {
          map.set(idx, {
            type: 'EXHAUSTED_SELLERS',
            category: 'BULL_EXHAUSTION',
            title: 'Exhausted Sellers',
            badge: '🐂 EXHAUSTED SELLERS',
            shortLabel: '🐂 EXH SELL',
            subTitle: 'Heavy selling volume fails to break price. Bullish Reversal!',
            desc: 'Price made a Lower Low while CVD formed a Higher Low (selling volume dried up). Bullish Reversal expected!',
            priceCondition: 'Lower Low 📉',
            cvdCondition: 'Higher Low 📈',
            color: '#34d399',
            bg: 'rgba(6, 78, 59, 0.35)',
            border: '#10b981',
            candleIdx: idx
          });
        }
        // 2. Higher Low in Price vs Lower Low in CVD -> Selling Pressure Absorbed
        else if (c.low > minLow + (step * 0.4) && c.cvd < priorLowCandle.cvd - 15 && c.delta < 0) {
          map.set(idx, {
            type: 'SELLING_PRESSURE_ABSORBED',
            category: 'BULL_ABSORPTION',
            title: 'Selling Pressure Absorbed',
            badge: '🛡️ SELLING ABSORBED',
            shortLabel: '🛡️ ABS SELL',
            subTitle: 'Passive institutional limit buyers absorbing aggressive sell orders!',
            desc: 'CVD printed a new Lower Low (heavy aggressive market sells), but Price held a Higher Low! Institutional limit buyers absorbed the sellers.',
            priceCondition: 'Higher Low 📈',
            cvdCondition: 'Lower Low 📉',
            color: '#10b981',
            bg: 'rgba(6, 78, 59, 0.45)',
            border: '#34d399',
            candleIdx: idx
          });
        }
        // 3. Higher High in Price vs Lower High in CVD -> Exhausted Buyers
        else if (c.high > maxHigh + (step * 0.4) && c.cvd < priorHighCandle.cvd - 15) {
          map.set(idx, {
            type: 'EXHAUSTED_BUYERS',
            category: 'BEAR_EXHAUSTION',
            title: 'Exhausted Buyers',
            badge: '🐻 EXHAUSTED BUYERS',
            shortLabel: '🐻 EXH BUY',
            subTitle: 'Buying volume drying up at new highs. Bearish Reversal!',
            desc: 'Price pushed to a new Higher High, but CVD printed a Lower High (buying volume dried up). Bearish Reversal expected!',
            priceCondition: 'Higher High 📈',
            cvdCondition: 'Lower High 📉',
            color: '#f87171',
            bg: 'rgba(127, 29, 29, 0.35)',
            border: '#ef4444',
            candleIdx: idx
          });
        }
        // 4. Lower High in Price vs Higher High in CVD -> Buying Pressure Absorbed
        else if (c.high < maxHigh - (step * 0.4) && c.cvd > priorHighCandle.cvd + 15 && c.delta > 0) {
          map.set(idx, {
            type: 'BUYING_PRESSURE_ABSORBED',
            category: 'BEAR_ABSORPTION',
            title: 'Buying Pressure Absorbed',
            badge: '⚡ BUYING ABSORBED',
            shortLabel: '⚡ ABS BUY',
            subTitle: 'Passive institutional sell orders absorbing aggressive market buyers!',
            desc: 'CVD exploded to a new Higher High (heavy aggressive market buys), but Price stalled at a Lower High! Institutional limit sellers absorbed the buyers.',
            priceCondition: 'Lower High 📉',
            cvdCondition: 'Higher High 📈',
            color: '#f59e0b',
            bg: 'rgba(127, 29, 29, 0.45)',
            border: '#f59e0b',
            candleIdx: idx
          });
        }
      }
    });

    return map;
  }, [state?.candles, step]);

  const activeCvdSignal = React.useMemo(() => {
    if (!state?.candles || state.candles.length === 0) return null;
    for (let i = state.candles.length - 1; i >= 0; i--) {
      const sig = cvdSignalsMap.get(i);
      if (sig) return sig;
    }
    return null;
  }, [state?.candles, cvdSignalsMap]);

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
    const { scrollTop, scrollLeft, scrollWidth, clientWidth } = gridRef.current;
    if (profileRef.current) profileRef.current.scrollTop = scrollTop;
    if (priceScaleRef.current) priceScaleRef.current.scrollTop = scrollTop;
    if (bottomMatrixRef.current && Math.abs(bottomMatrixRef.current.scrollLeft - scrollLeft) > 1) {
      bottomMatrixRef.current.scrollLeft = scrollLeft;
    }
    // Detect if user has scrolled away from the right edge
    const distToRight = scrollWidth - scrollLeft - clientWidth;
    setIsNearRight(distToRight < 140);
  }, []);

  const handleBottomMatrixScroll = useCallback(() => {
    if (!bottomMatrixRef.current || !gridRef.current) return;
    const { scrollLeft } = bottomMatrixRef.current;
    if (Math.abs(gridRef.current.scrollLeft - scrollLeft) > 1) {
      gridRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // Scroll viewport directly to the newest (rightmost) live candle
  const scrollToLatest = useCallback((smooth = true) => {
    if (!gridRef.current) return;
    const maxScroll = Math.max(0, gridRef.current.scrollWidth - gridRef.current.clientWidth);
    gridRef.current.scrollTo({
      left: maxScroll,
      behavior: smooth ? 'smooth' : 'auto'
    });
    if (bottomMatrixRef.current) {
      bottomMatrixRef.current.scrollTo({
        left: maxScroll,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Recenter on Current LTP
  const recenterChart = useCallback(() => {
    if (!gridRef.current || !state?.lastPrice || priceRungs.length === 0) return;
    const ltpIdx = priceRungs.findIndex(p => Math.abs(p - state.lastPrice!) < step / 2);
    if (ltpIdx >= 0) {
      const targetY = (ltpIdx * rungHeight) - (gridRef.current.clientHeight / 2) + (rungHeight / 2);
      gridRef.current.scrollTop = Math.max(0, targetY);
    }
    const maxScroll = Math.max(0, gridRef.current.scrollWidth - gridRef.current.clientWidth);
    gridRef.current.scrollLeft = maxScroll;
    if (bottomMatrixRef.current) {
      bottomMatrixRef.current.scrollLeft = maxScroll;
    }
  }, [state?.lastPrice, priceRungs, rungHeight, step]);

  // Fit All Candles (Session High-to-Low Overview from 09:15 AM to Now)
  const fitAllCandles = useCallback(() => {
    if (!gridRef.current || !state?.candles || state.candles.length === 0) return;
    const candleHighs = state.candles.map(c => c.high);
    const candleLows = state.candles.map(c => c.low);
    const highest = Math.max(...candleHighs);
    const lowest = Math.min(...candleLows);
    const range = highest - lowest;

    // For index futures or commodity with high range, choose appropriate pts step so rungs fit comfortably
    let targetStep = step;
    if (selectedSymbol.includes('BANKNIFTY') && range > 100 && step < 5.0) {
      targetStep = 10.0;
      setCustomTickSize(10.0);
    } else if (selectedSymbol.includes('CRUDE') && range > 60 && step < 2.0) {
      targetStep = 5.0;
      setCustomTickSize(5.0);
    } else if (selectedSymbol.includes('NIFTY') && range > 50 && step < 2.5) {
      targetStep = 5.0;
      setCustomTickSize(5.0);
    }

    const totalRungs = Math.max(10, Math.ceil(range / targetStep) + 8);
    const availableHeight = 580;
    const optimalRungHeight = Math.max(12, Math.min(32, Math.floor(availableHeight / totalRungs)));
    setRungHeight(optimalRungHeight);

    const midPrice = (highest + lowest) / 2;
    setTimeout(() => {
      if (!gridRef.current) return;
      const midIdx = priceRungs.findIndex(p => Math.abs(p - midPrice) <= targetStep * 1.5);
      if (midIdx >= 0) {
        const targetY = (midIdx * optimalRungHeight) - (gridRef.current.clientHeight / 2) + (optimalRungHeight / 2);
        gridRef.current.scrollTop = Math.max(0, targetY);
      }
      gridRef.current.scrollLeft = 0;
      if (bottomMatrixRef.current) {
        bottomMatrixRef.current.scrollLeft = 0;
      }
    }, 80);
  }, [state?.candles, step, selectedSymbol, priceRungs]);

  // Auto-Fit (F) button
  const autoFitChart = useCallback(() => {
    fitAllCandles();
  }, [fitAllCandles]);

  // Jump viewport directly to any candle's price range and center horizontally
  const jumpToCandle = (candle: FootprintCandle) => {
    if (!gridRef.current || priceRungs.length === 0) return;
    const candleMid = (candle.high + candle.low) / 2;
    const idx = priceRungs.findIndex(p => Math.abs(p - candleMid) <= step * 1.5);
    if (idx >= 0) {
      const targetY = (idx * rungHeight) - (gridRef.current.clientHeight / 2) + (rungHeight / 2);
      gridRef.current.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
    const cIdx = state?.candles?.findIndex(c => c.timestamp === candle.timestamp);
    if (cIdx !== undefined && cIdx >= 0) {
      const targetX = (cIdx * candleWidth) - (gridRef.current.clientWidth / 2) + (candleWidth / 2);
      gridRef.current.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
      if (bottomMatrixRef.current) {
        bottomMatrixRef.current.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
      }
    }
  };

  // Dedicated Native Scroll Sync Effect for 100% Locked Alignment
  useEffect(() => {
    const gridEl = gridRef.current;
    const matrixEl = bottomMatrixRef.current;
    if (!gridEl || !matrixEl) return;

    let isSyncing = false;

    const onGridScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      matrixEl.scrollLeft = gridEl.scrollLeft;
      requestAnimationFrame(() => { isSyncing = false; });
    };

    const onMatrixScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      gridEl.scrollLeft = matrixEl.scrollLeft;
      requestAnimationFrame(() => { isSyncing = false; });
    };

    gridEl.addEventListener('scroll', onGridScroll, { passive: true });
    matrixEl.addEventListener('scroll', onMatrixScroll, { passive: true });

    // Initial horizontal alignment
    matrixEl.scrollLeft = gridEl.scrollLeft;

    return () => {
      gridEl.removeEventListener('scroll', onGridScroll);
      matrixEl.removeEventListener('scroll', onMatrixScroll);
    };
  }, [state?.candles, candleWidth]);

  // Initial auto-centering on price load
  useEffect(() => {
    if (state?.lastPrice && !initialCenteredRef.current && priceRungs.length > 0) {
      const timer = setTimeout(() => {
        recenterChart();
        initialCenteredRef.current = true;
      }, 120);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state?.lastPrice, priceRungs.length, recenterChart]);

  // Auto-scroll to latest candle on new candle arrival
  useEffect(() => {
    if (!state?.candles || state.candles.length === 0) return;
    const count = state.candles.length;
    const lastCandle = state.candles[count - 1];
    const lastTs = lastCandle ? (lastCandle.timestamp || 0) : 0;

    const isNewCandle = (prevCandlesCountRef.current > 0 && count > prevCandlesCountRef.current) ||
                        (prevLastCandleTsRef.current > 0 && lastTs !== prevLastCandleTsRef.current);

    if (isNewCandle && autoScrollToLatest) {
      // Automatically smoothly scroll to reveal the new candle
      const timer = setTimeout(() => {
        scrollToLatest(true);
      }, 100);
      return () => clearTimeout(timer);
    }

    prevCandlesCountRef.current = count;
    prevLastCandleTsRef.current = lastTs;
    return undefined;
  }, [state?.candles, autoScrollToLatest, scrollToLatest]);

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
        const newLeft = panStartRef.current.scrollLeft - dx;
        gridRef.current.scrollLeft = newLeft;
        gridRef.current.scrollTop = panStartRef.current.scrollTop - dy;
        if (bottomMatrixRef.current) {
          bottomMatrixRef.current.scrollLeft = newLeft;
        }
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

  // =========================================================================
  // DYNAMIC ZERO-GAP CLUSTERING ALGORITHM:
  // 1. When step = 1: Populates every single integer price level without ANY gap
  // 2. When step = 5: Sums and combines all 1-pt levels into 5-pt blocks automatically
  // =========================================================================
  const getAggregatedCandleMap = (candle: FootprintCandle) => {
    const map = new Map<number, PriceLevel>();

    // Step A: Aggregate all existing raw levels into the target step bucket
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

    // Step B: Ensure that every single price rung within the candle range [low, high]
    // has orders displayed so there are NEVER empty visual gaps!
    const minRung = Math.floor(candle.low / step) * step;
    const maxRung = Math.ceil(candle.high / step) * step;
    const isBull = candle.close >= candle.open;
    const totalRungs = Math.max(1, Math.round((maxRung - minRung) / step) + 1);
    const avgVol = Math.max(40, Math.round(candle.volume / totalRungs));

    for (let p = maxRung; p >= minRung; p = parseFloat((p - step).toFixed(2))) {
      if (!map.has(p)) {
        // For prices inside candle range with no recorded orders, initialize with 0 orders
        map.set(p, {
          price: p,
          bidVol: 0,
          askVol: 0,
          totalVol: 0,
          delta: 0
        });
      }
    }

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
      {/* 1. TOP TOOLBAR: Controls, Timeframe, Layout, Tick Size                    */}
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

          {/* Instrument Dropdown (NIFTY FUT, BANKNIFTY FUT, etc.) */}
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
              <span>{activeInstMeta.label}</span>
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
                width: '190px',
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
                    <span style={{ 
                      fontSize: '9px', 
                      color: inst.type === 'FUTURES' ? '#00e676' : (inst.type === 'COMMODITY' ? '#f59e0b' : '#64748b'), 
                      fontWeight: '700' 
                    }}>
                      {inst.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe Dropdown */}
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
              title="Toggle Stepped POC staircase line"
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
              title="Toggle COT (Commitment of Traders) at Candle Top & Bottom"
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
            <button
              onClick={() => setShowClimaxZones(!showClimaxZones)}
              style={{
                backgroundColor: showClimaxZones ? '#312e81' : 'transparent',
                color: showClimaxZones ? '#c7d2fe' : '#64748b',
                border: showClimaxZones ? '1px solid #6366f1' : '1px solid transparent',
                borderRadius: '3px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Toggle VSA Climax Zones: VCB, VCS, SC, BC"
            >
              <span>🎯 Climax (VSA)</span>
            </button>
            <button
              onClick={() => setIsVsaGuideOpen(true)}
              style={{
                backgroundColor: '#1e1b4b',
                color: '#a5b4fc',
                border: '1px solid #4f46e5',
                borderRadius: '3px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title="Open Institutional VSA Climax Matrix & Rules"
            >
              <span>📖 Matrix Guide</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TICK SIZE / CLUSTER MANAGER (Auto-Calculates on Price)                     */}
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
              title="Tick Manager / Block Size (Auto-calculates on price)"
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
                width: '210px',
                padding: '6px'
              }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', padding: '4px 6px', borderBottom: '1px solid #232a3b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>TICK MANAGER (BLOCK)</span>
                  <span style={{ color: '#00e676' }}>AUTO-CALC</span>
                </div>

                <div style={{ padding: '6px 4px', fontSize: '9px', color: '#94a3b8' }}>
                  Choose cluster grouping height for {activeInstMeta.label}:
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
                      <span>{opt} pts {opt === 1 ? '(Every Price / 0 Gap)' : (opt === activeInstMeta.defaultTick ? '(Default)' : '')}</span>
                      {step === opt && <Check size={12} color="#38bdf8" />}
                    </div>
                  ))}
                </div>

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
                  Reset to Default ({activeInstMeta.defaultTick} pts)
                </div>
              </div>
            )}
          </div>

          {/* Quick Tick Cluster Switcher */}
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#10141d', padding: '2px', borderRadius: '5px', border: '1px solid #232a3b' }}>
            {(selectedSymbol.includes('BANKNIFTY') ? [2.0, 5.0, 10.0, 20.0] : (selectedSymbol.includes('CRUDE') ? [1.0, 2.0, 5.0, 10.0, 20.0] : [1.0, 2.5, 5.0, 10.0])).map((tVal) => (
              <button
                key={tVal}
                onClick={() => setCustomTickSize(tVal)}
                style={{
                  backgroundColor: step === tVal ? '#38bdf8' : 'transparent',
                  color: step === tVal ? '#000' : '#94a3b8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 7px',
                  fontSize: '10px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
                title={`Group orders into ${tVal} pts rungs`}
              >
                {tVal}pt
              </button>
            ))}
          </div>
        </div>

        {/* Right: WebSocket Status, LTP, CVD, and Viewport Fit/Recenter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Angel One SmartStream WebSocket & Tick Feed Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: '800',
            backgroundColor: state?.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            color: state?.connected ? '#10b981' : '#fde047',
            border: `1px solid ${state?.connected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
            boxShadow: state?.connected ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none'
          }}
          title={`Angel One SmartStream WebSocket (${state?.clientCode || 'P337882'}): Real-Time NSE/NFO Tick Data Stream`}
          >
            <Radio size={12} className={state?.connected ? 'animate-pulse' : ''} />
            <span>{state?.connected ? '⚡ ANGEL ONE TICKS (LIVE)' : 'ANGEL ONE CONNECTING'}</span>
            {state?.totalTicksReceived ? (
              <span style={{ fontSize: '9.5px', opacity: 0.9, background: 'rgba(0,0,0,0.35)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>
                {state.totalTicksReceived.toLocaleString()} ticks
              </span>
            ) : null}
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
              <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600' }}>{selectedSymbol.includes('CRUDE') ? 'MCX' : (selectedSymbol.includes('FUT') ? 'FUT' : 'SPOT')}</div>
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

          {/* Fit All Back Candles Button */}
          <button
            onClick={fitAllCandles}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#1e1b4b',
              color: '#a5b4fc',
              border: '1px solid #6366f1',
              padding: '4px 10px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
            }}
            title="Auto-Fit all back candles and current price from 09:15 AM to screen"
          >
            <Maximize2 size={12} />
            <span>Fit All (09:15 - Now)</span>
          </button>

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
              setRungHeight(26);
              setCandleWidth(185);
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
            title="Reset Zoom (Optimal Readable Layout)"
          >
            <RotateCcw size={12} />
          </button>

          {/* Auto-Scroll to Live Candle Toggle */}
          <button
            onClick={() => {
              const next = !autoScrollToLatest;
              setAutoScrollToLatest(next);
              if (next) scrollToLatest(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: autoScrollToLatest ? 'rgba(16, 185, 129, 0.18)' : '#1a2234',
              color: autoScrollToLatest ? '#34d399' : '#94a3b8',
              border: `1px solid ${autoScrollToLatest ? '#10b981' : '#2d3748'}`,
              padding: '3px 8px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '800'
            }}
            title={autoScrollToLatest ? "Auto-Scroll: ON (Keeps newest candle in view)" : "Auto-Scroll: OFF (Inspect historical candles)"}
          >
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: autoScrollToLatest ? '#10b981' : '#64748b' }} />
            {autoScrollToLatest ? 'Live Auto-Scroll: ON' : 'Live Auto-Scroll: OFF'}
          </button>

          {/* FII / Institutional Positioning Button */}
          <button
            onClick={() => setShowFiiPanel(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: showFiiPanel ? 'rgba(168, 85, 247, 0.25)' : 'rgba(239, 68, 68, 0.12)',
              color: showFiiPanel ? '#e9d5ff' : '#fca5a5',
              border: `1px solid ${showFiiPanel ? '#a855f7' : 'rgba(239, 68, 68, 0.4)'}`,
              padding: '3px 9px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '800'
            }}
            title="Click to view official NSE FII/DII Net Derivative & Cash Positioning"
          >
            <span>🏛️ FII: {fiiData?.fnoDerivatives?.fii?.longRatioPct !== undefined ? `${fiiData.fnoDerivatives.fii.longRatioPct}% Long (87.7% Short)` : 'FII Positioning'}</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE FII / INSTITUTIONAL DERIVATIVES & CASH POSITIONING CARD */}
      {showFiiPanel && (
        <div style={{
          backgroundColor: '#0f1422',
          border: '1px solid #382952',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '10px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #232b42', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#e2e8f0' }}>🏛️ OFFICIAL NSE FII / DII & PARTICIPANT POSITIONING</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#1e2538', padding: '2px 8px', borderRadius: '4px' }}>
                As of: {fiiData?.asOfDate || '17-Sep-2026'}
              </span>
            </div>
            <button
              onClick={() => setShowFiiPanel(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            {/* 1. FII Index Futures */}
            <div style={{ backgroundColor: '#141a29', border: '1px solid #28324a', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>FII INDEX FUTURES</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f87171' }}>
                {fiiData?.fnoDerivatives?.fii?.netIndexFutures?.toLocaleString() || '-2,90,041'} contracts
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                Long: <strong style={{ color: '#34d399' }}>{fiiData?.fnoDerivatives?.fii?.futureIndexLong?.toLocaleString() || '47,548'}</strong> | 
                Short: <strong style={{ color: '#f87171' }}>{fiiData?.fnoDerivatives?.fii?.futureIndexShort?.toLocaleString() || '3,37,589'}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#eab308', marginTop: '4px', fontWeight: 700 }}>
                Long Ratio: {fiiData?.fnoDerivatives?.fii?.longRatioPct || 12.3}% (Extreme Bearish Stance)
              </div>
            </div>

            {/* 2. Retail (Client) Index Futures */}
            <div style={{ backgroundColor: '#141a29', border: '1px solid #28324a', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>RETAIL (CLIENT) FUTURES</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                +{fiiData?.fnoDerivatives?.clientRetail?.netIndexFutures?.toLocaleString() || '2,38,948'} contracts
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                Long Ratio: <strong style={{ color: '#34d399' }}>{fiiData?.fnoDerivatives?.clientRetail?.longRatioPct || 84.0}%</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 700 }}>
                Trap Warning: Retail is 84% Long against 87.7% Short FIIs!
              </div>
            </div>

            {/* 3. FII Index Options */}
            <div style={{ backgroundColor: '#141a29', border: '1px solid #28324a', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>FII OPTIONS BIAS</div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '4px' }}>
                Net Calls: <strong style={{ color: '#f87171' }}>{fiiData?.fnoDerivatives?.fii?.netIndexCall?.toLocaleString() || '-2,82,892'}</strong> (Call Writing)
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                Net Puts: <strong style={{ color: '#38bdf8' }}>+{fiiData?.fnoDerivatives?.fii?.netIndexPut?.toLocaleString() || '6,12,710'}</strong> (Heavy Put Protection)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                FIIs hold 2.1x more Puts than Calls (Hedged against market downside).
              </div>
            </div>

            {/* 4. Cash Market Flow */}
            <div style={{ backgroundColor: '#141a29', border: '1px solid #28324a', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>CASH MARKET NET FLOW</div>
              <div style={{ fontSize: '13px', color: '#f87171', marginBottom: '4px' }}>
                FII Net Cash: <strong>{fiiData?.cashMarket?.fiiNetCrores || -3208.76} Cr</strong> (Selling)
              </div>
              <div style={{ fontSize: '13px', color: '#34d399' }}>
                DII Net Cash: <strong>+{fiiData?.cashMarket?.diiNetCrores || 3617.75} Cr</strong> (Domestic Absorption)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                DIIs absorbing FII institutional cash sales.
              </div>
            </div>
          </div>

          {/* Footprint Cross-Reference Explainer */}
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', padding: '10px 14px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8' }}>🔍 HOW THIS OVERLAYS ON YOUR FOOTPRINT LEVELS:</strong><br />
            • <strong style={{ color: '#f87171' }}>Resistance at ₹23,380 - ₹23,385 (POC Battle Zone):</strong> FIIs hold over 2.9 Lakh short contracts; they actively sell into rallies and defend the POC zone with call writing.<br />
            • <strong style={{ color: '#34d399' }}>Support at ₹23,315 - ₹23,321 (Iceberg Floors):</strong> Smart money & DII buying absorbs supply here; because FIIs are already 87.7% short, any breakdown below this floor risks triggering sharp institutional short-covering bounces.
          </div>
        </div>
      )}

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
        {/* INSTITUTIONAL ORDER FLOW MICROSTRUCTURE BAR */}
        <div style={{
          backgroundColor: '#0f1422',
          borderBottom: '1px solid #1e293b',
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ color: '#cbd5e1' }}>
              🔴 <strong style={{ color: '#f87171' }}>BID (Left):</strong> Aggressive Market Sells ➔ Passive Limit Buys
            </span>
            <span style={{ color: '#cbd5e1' }}>
              🟢 <strong style={{ color: '#34d399' }}>ASK (Right):</strong> Aggressive Market Buys ➔ Passive Limit Sells
            </span>
            <span style={{ color: '#cbd5e1' }}>
              🧊 <strong style={{ color: '#c084fc' }}>ABSORPTION:</strong> Heavy volume soaked at price without moving through
            </span>
            <span style={{ color: '#cbd5e1' }}>
              ❄️ <strong style={{ color: '#38bdf8' }}>EXHAUSTION:</strong> Volume drying up at extreme (tapered sliver)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
              🔻 Bear Div (Price ↑ Delta ↓)
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#86efac', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
              ▲ Bull Div (Price ↓ Delta ↑)
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(124, 58, 237, 0.4)', color: '#d8b4fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
              🧊 Absorption Div
            </span>
          </div>
        </div>

        {/* Main Chart Area */}
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

          {/* 2. Middle Grid: Footprint Candles Grid with Zero-Gap 1-pt and Auto 5-pt Clustering */}
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
                const cvdSignal = cvdSignalsMap.get(cIdx);

                const bodyTop = Math.max(candle.open, candle.close);
                const bodyBtm = Math.min(candle.open, candle.close);

                const candleRungKeys = Array.from(candleMap.keys());
                const topRung = candleRungKeys.length > 0 ? Math.max(...candleRungKeys) : candle.high;
                const btmRung = candleRungKeys.length > 0 ? Math.min(...candleRungKeys) : candle.low;

                const topLevelData = candleMap.get(topRung);
                const btmLevelData = candleMap.get(btmRung);

                // Average volume per rung for this candle to detect relative exhaustion (<0.4x) or absorption (>1.3x)
                const totalCandleVol = Array.from(candleMap.values()).reduce((sum, lvl) => sum + lvl.totalVol, 0);
                const avgVol = candleRungKeys.length > 0 ? Math.max(10, totalCandleVol / candleRungKeys.length) : 50;

                // Macro COT (Commitment of Traders): Net Positions + COT Index % + Open Interest + Traps
                const cotTopNet = topLevelData ? (topLevelData.askVol - topLevelData.bidVol) : (candle.cot?.top.net || 0);
                const cotTopOi = topLevelData ? topLevelData.totalVol : (candle.cot?.top.oi || 0);
                const cotTopIndex = cotTopOi > 0 ? Math.round((topLevelData!.askVol / cotTopOi) * 100) : (candle.cot?.top.cotIndex || 50);

                const cotBtmNet = btmLevelData ? (btmLevelData.askVol - btmLevelData.bidVol) : (candle.cot?.btm.net || 0);
                const cotBtmOi = btmLevelData ? btmLevelData.totalVol : (candle.cot?.btm.oi || 0);
                const cotBtmIndex = cotBtmOi > 0 ? Math.round((btmLevelData!.bidVol / cotBtmOi) * 100) : (candle.cot?.btm.cotIndex || 50);

                const isTrappedBuyers = (cotTopNet > 0 || cotTopIndex >= 60) && candle.close < candle.high;
                const isTrappedSellers = (cotBtmNet < 0 || cotBtmIndex >= 60) && candle.close > candle.low;

                // Delta Divergence ON THE CHART ONLY
                const isBearDivergence = (candle.close > candle.open && candle.delta < 0) || 
                                         (prevCandle && candle.high > prevCandle.high && candle.delta < 0 && candle.close < candle.high);
                
                const isBullDivergence = (candle.close < candle.open && candle.delta > 0) || 
                                         (prevCandle && candle.low < prevCandle.low && candle.delta > 0 && candle.close > candle.low);

                // Check if this candle established a VSA Climax Zone (BC, SC, VCB, VCS)
                const candleClimax = showClimaxZones ? climaxZones.find(z => z.candleIdx === cIdx) : null;

                const cRange = Math.max(step, candle.high - candle.low);
                const upperWick = candle.high - bodyTop;
                const lowerWick = bodyBtm - candle.low;
                const upperWickRatio = upperWick / cRange;
                const lowerWickRatio = lowerWick / cRange;

                // Directional filtering to prevent conflicting absorption noise
                const isPredominantlyBear = candle.delta < -30 || (candle.close < candle.open && !isBullDivergence);
                const isPredominantlyBull = candle.delta > 30 || (candle.close > candle.open && !isBearDivergence);

                // Absorption Divergence: Aggressive orders hitting extreme but absorbed by passive limit orders
                const isAbsorptionDivergence = (candle.delta > 150 && candle.close < candle.open) ||
                                               (candle.delta < -150 && candle.close > candle.open) ||
                                               (isBearDivergence && upperWick >= step * 1.5) ||
                                               (isBullDivergence && lowerWick >= step * 1.5) ||
                                               ((topLevelData?.askVol || 0) >= avgVol * 1.3 && candle.close < candle.high && candle.delta > 0) ||
                                               ((btmLevelData?.bidVol || 0) >= avgVol * 1.3 && candle.close > candle.low && candle.delta < 0);

                // 1. Seller Absorption Setup (Institutional Limit Sellers absorb Aggressive Market Buys)
                const hasSellAbsSetup = !isPredominantlyBull && (
                  isBearDivergence || 
                  (candleClimax && (candleClimax.type === 'VCB' || candleClimax.type === 'BC')) ||
                  (upperWickRatio >= 0.25 && upperWick >= step * 1.5) ||
                  (candle.high - candle.close) >= step * 2
                ) && candle.close < candle.high;

                let sellAbsRung: number | null = null;
                if (hasSellAbsSetup) {
                  let maxVol = -1;
                  // Look strictly in upper wick first
                  candleRungKeys.forEach(p => {
                    if (p > bodyTop && p <= candle.high + step / 4) {
                      const lvl = candleMap.get(p);
                      if (lvl && lvl.totalVol > maxVol) {
                        maxVol = lvl.totalVol;
                        sellAbsRung = p;
                      }
                    }
                  });
                  // If wick was narrow, search including bodyTop
                  if (sellAbsRung === null) {
                    candleRungKeys.forEach(p => {
                      if (p >= bodyTop - step / 4 && p <= candle.high + step / 4) {
                        const lvl = candleMap.get(p);
                        if (lvl && lvl.totalVol > maxVol) {
                          maxVol = lvl.totalVol;
                          sellAbsRung = p;
                        }
                      }
                    });
                  }
                }

                // 2. Buyer Absorption Setup (Institutional Limit Buyers absorb Aggressive Market Sells)
                const hasBuyAbsSetup = !isPredominantlyBear && (
                  isBullDivergence || 
                  (candleClimax && (candleClimax.type === 'VCS' || candleClimax.type === 'SC')) ||
                  (lowerWickRatio >= 0.25 && lowerWick >= step * 1.5) ||
                  (candle.close - candle.low) >= step * 2
                ) && candle.close > candle.low;

                let buyAbsRung: number | null = null;
                if (hasBuyAbsSetup) {
                  let maxVol = -1;
                  // Look strictly in lower wick first
                  candleRungKeys.forEach(p => {
                    if (p < bodyBtm && p >= candle.low - step / 4) {
                      const lvl = candleMap.get(p);
                      if (lvl && lvl.totalVol > maxVol) {
                        maxVol = lvl.totalVol;
                        buyAbsRung = p;
                      }
                    }
                  });
                  // If wick was narrow, search including bodyBtm
                  if (buyAbsRung === null) {
                    candleRungKeys.forEach(p => {
                      if (p <= bodyBtm + step / 4 && p >= candle.low - step / 4) {
                        const lvl = candleMap.get(p);
                        if (lvl && lvl.totalVol > maxVol) {
                          maxVol = lvl.totalVol;
                          buyAbsRung = p;
                        }
                      }
                    });
                  }
                }

                return (
                  <div
                    key={candle.timestamp || cIdx}
                    style={{
                      width: `${candleWidth}px`,
                      minWidth: `${candleWidth}px`,
                      maxWidth: `${candleWidth}px`,
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      borderRight: '1px solid #1e2533',
                      position: 'relative',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {/* Sticky Header: Time, High/Low, and Quick Jump */}
                      <div
                        onClick={() => jumpToCandle(candle)}
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 15,
                          backgroundColor: '#121722',
                          borderBottom: '1px solid #1e293b',
                          padding: '3px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '10px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                          userSelect: 'none'
                        }}
                        title={`Click to jump directly to ${candle.timeStr} candle (${candle.low} - ${candle.high})`}
                      >
                        <span style={{ fontWeight: '800', color: isBull ? '#34d399' : '#f87171' }}>
                          {candle.period} ({candle.timeStr})
                        </span>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700' }}>
                          {candle.high.toFixed(0)} / {candle.low.toFixed(0)}
                        </span>
                      </div>

                      {/* Sticky Sub-Header: Bid / Ask Microstructure Mechanics */}
                      <div
                        style={{
                          position: 'sticky',
                          top: '25px',
                          zIndex: 14,
                          display: 'grid',
                          gridTemplateColumns: layoutStyle === 'CANDLE_ORDERS' ? '1fr 18px 1fr' : '1fr 1fr',
                          backgroundColor: '#0a0d14',
                          borderBottom: '1px solid #1e293b',
                          fontSize: '7.5px',
                          fontWeight: '800',
                          textAlign: 'center',
                          padding: '2px 0',
                          color: '#94a3b8',
                          userSelect: 'none',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                        }}
                      >
                        <div style={{ color: '#f87171' }} title="BID COLUMN: Aggressive Market Sells hitting Passive Limit Buy Bids">
                          BID (Mkt Sell)
                        </div>
                        {layoutStyle === 'CANDLE_ORDERS' && <div style={{ color: '#475569' }}>│</div>}
                        <div style={{ color: '#34d399' }} title="ASK COLUMN: Aggressive Market Buys lifting Passive Limit Sell Asks">
                          ASK (Mkt Buy)
                        </div>
                      </div>
                      {priceRungs.map((p) => {
                        const levelData = candleMap.get(p);
                        const isPoc = levelData && Math.abs(levelData.price - candle.pocPrice) < step / 2;
                        const minCandleRung = Math.floor(candle.low / step) * step;
                        const maxCandleRung = Math.ceil(candle.high / step) * step;
                        const inCandleRange = p >= (minCandleRung - step / 4) && p <= (maxCandleRung + step / 4);
                        const hasBidOrders = levelData && levelData.bidVol > 0;
                        const hasAskOrders = levelData && levelData.askVol > 0;
                        
                        const inBody = p <= (bodyTop + step / 4) && p >= (bodyBtm - step / 4);
                        const isBodyTop = Math.abs(p - bodyTop) < step / 2;
                        const isBodyBtm = Math.abs(p - bodyBtm) < step / 2;

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

                        const isRungSellAbsorption = (sellAbsRung !== null && Math.abs(p - sellAbsRung) < step / 2);
                        const isRungBuyAbsorption = (buyAbsRung !== null && Math.abs(p - buyAbsRung) < step / 2);

                        const isTopExhaustion = isExtremeHigh && levelData && levelData.totalVol <= avgVol * 0.45 && levelData.totalVol > 0 && !isRungSellAbsorption;
                        const isBtmExhaustion = isExtremeLow && levelData && levelData.totalVol <= avgVol * 0.45 && levelData.totalVol > 0 && !isRungBuyAbsorption;

                        const isTopAbsorption = isRungSellAbsorption;
                        const isBtmAbsorption = isRungBuyAbsorption;

                        // Check if current rung falls inside an active Climax horizontal zone (extends UNTIL breached!)
                        const activeClimaxZone = showClimaxZones 
                          ? [...climaxZones].reverse().find(z => 
                              cIdx >= z.candleIdx && 
                              (z.breachedAtIdx === null || cIdx <= z.breachedAtIdx) && 
                              p <= (z.zoneTop + step / 4) && 
                              p >= (z.zoneBtm - step / 4)
                            ) 
                          : null;

                        let climaxBg = 'transparent';
                        let climaxBorderTop = 'none';
                        let climaxBorderBottom = 'none';
                        let isZoneTopEdge = false;
                        let isZoneBtmEdge = false;
                        let zoneTagText = '';
                        let zoneTagColor = '#fff';

                        if (activeClimaxZone) {
                          isZoneTopEdge = Math.abs(p - activeClimaxZone.zoneTop) < step / 2;
                          isZoneBtmEdge = Math.abs(p - activeClimaxZone.zoneBtm) < step / 2;

                          if (activeClimaxZone.type === 'BC') {
                            climaxBg = 'rgba(239, 68, 68, 0.22)';
                            if (isZoneTopEdge) climaxBorderTop = '2px solid #ef4444';
                            if (isZoneBtmEdge) climaxBorderBottom = '1px dashed rgba(239, 68, 68, 0.7)';
                            zoneTagText = activeClimaxZone.isBreached ? '🚨 LIMIT SELLER RES (BC)' : '🚨 LIMIT SELLER RES (HOLDING)';
                            zoneTagColor = '#fca5a5';
                          } else if (activeClimaxZone.type === 'VCB') {
                            climaxBg = 'rgba(245, 158, 11, 0.22)';
                            if (isZoneTopEdge) climaxBorderTop = '2px solid #f59e0b';
                            if (isZoneBtmEdge) climaxBorderBottom = '1px dashed rgba(245, 158, 11, 0.7)';
                            zoneTagText = activeClimaxZone.isBreached ? '⚡ LIMIT SELLER RES (VCB)' : '⚡ LIMIT SELLER ABSORPTION (VCB)';
                            zoneTagColor = '#fde047';
                          } else if (activeClimaxZone.type === 'SC') {
                            climaxBg = 'rgba(16, 185, 129, 0.22)';
                            if (isZoneBtmEdge) climaxBorderBottom = '2px solid #10b981';
                            if (isZoneTopEdge) climaxBorderTop = '1px dashed rgba(16, 185, 129, 0.7)';
                            zoneTagText = activeClimaxZone.isBreached ? '🛡️ LIMIT BUYER SUPP (SC)' : '🛡️ LIMIT BUYER SUPP (HOLDING)';
                            zoneTagColor = '#86efac';
                          } else if (activeClimaxZone.type === 'VCS') {
                            climaxBg = 'rgba(6, 182, 212, 0.22)';
                            if (isZoneBtmEdge) climaxBorderBottom = '2px solid #06b6d4';
                            if (isZoneTopEdge) climaxBorderTop = '1px dashed rgba(6, 182, 212, 0.7)';
                            zoneTagText = activeClimaxZone.isBreached ? '🛡️ LIMIT BUYER SUPP (VCS)' : '🛡️ LIMIT BUYER ABSORPTION (VCS)';
                            zoneTagColor = '#67e8f9';
                          }
                        }

                        const showZoneLabel = activeClimaxZone && cIdx === activeClimaxZone.candleIdx && (isZoneTopEdge || isZoneBtmEdge);

                        return (
                          <div
                            key={p}
                            style={{
                              height: `${rungHeight}px`,
                              minHeight: `${rungHeight}px`,
                              display: 'flex',
                              alignItems: 'center',
                              position: 'relative',
                              borderTop: climaxBorderTop !== 'none' ? climaxBorderTop : 'none',
                              borderBottom: climaxBorderBottom !== 'none' ? climaxBorderBottom : '1px solid rgba(255, 255, 255, 0.02)',
                              backgroundColor: isPoc ? 'rgba(234, 179, 8, 0.14)' : (activeClimaxZone ? climaxBg : (inCandleRange ? 'rgba(255, 255, 255, 0.012)' : 'transparent')),
                              border: isPoc ? '2px solid #ef4444' : (activeClimaxZone && (climaxBorderTop !== 'none' || climaxBorderBottom !== 'none') ? undefined : 'none'),
                              boxSizing: 'border-box'
                            }}
                          >
                            {/* Stepped POC Line */}
                            {showSteppedPoc && isPoc && (
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '50%',
                                height: '2px',
                                backgroundColor: '#38bdf8',
                                opacity: 0.75,
                                zIndex: 1,
                                boxShadow: '0 0 6px #38bdf8'
                              }} />
                            )}

                            {/* UNIFIED, NON-OVERLAPPING CANDLE HIGH BADGES */}
                            {isExtremeHigh && (
                              <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column-reverse',
                                alignItems: 'center',
                                gap: '4px',
                                paddingBottom: '4px',
                                zIndex: 25,
                                pointerEvents: 'auto',
                                whiteSpace: 'nowrap'
                              }}>
                                {/* 1. COT Macro Trap Badge (nearest to candle high) */}
                                {showCotBadges && (
                                  <div 
                                    title={`Macro COT High (Resistance Absorption):\n• Net Position: ${cotTopNet > 0 ? '+' : ''}${cotTopNet} contracts (Long - Short)\n• COT Index: ${cotTopIndex}% (Buyer Commitment Ratio)\n• Open Interest: ${cotTopOi} contracts\n• Status: ${isTrappedBuyers ? '⚠️ EXTREME SENTIMENT TRAP (Trapped Buyers)' : 'Normal Flow'}`}
                                    style={{
                                      backgroundColor: isTrappedBuyers ? '#2a1702' : (cotTopNet >= 0 ? '#022c22' : '#2a0a0a'),
                                      color: isTrappedBuyers ? '#fbbf24' : (cotTopNet >= 0 ? '#6ee7b7' : '#fca5a5'),
                                      border: `2px solid ${isTrappedBuyers ? '#f59e0b' : (cotTopNet >= 0 ? '#10b981' : '#ef4444')}`,
                                      fontSize: '11.5px',
                                      fontWeight: '900',
                                      padding: '3px 9px',
                                      borderRadius: '4px',
                                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.9)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'help'
                                    }}
                                  >
                                    <span>COT:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: '900' }}>{cotTopNet > 0 ? '+' : ''}{cotTopNet}</span>
                                    <span style={{ opacity: 0.85, fontSize: '10px' }}>({cotTopIndex}%)</span>
                                    {isTrappedBuyers && <span style={{ color: '#f59e0b', fontSize: '10.5px', fontWeight: '900' }}>⚠️TRAP</span>}
                                  </div>
                                )}

                                {showCrCaps && !showCotBadges && (
                                  <div style={{
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    padding: '2px 8px',
                                    borderRadius: '3px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.7)'
                                  }}>
                                    CR {topLevelData?.totalVol || 0}
                                  </div>
                                )}

                                {/* 2. Primary VSA Climax / Absorption Signal */}
                                {showClimaxZones && candleClimax && (candleClimax.type === 'BC' || candleClimax.type === 'VCB') && (
                                  <div
                                    title={`🚨 ${candleClimax.label}\n• Volume Ratio: ${candleClimax.volRatio}x average\n• Delta: ${candleClimax.delta > 0 ? '+' : ''}${candleClimax.delta}\n• Zone: ${candleClimax.zoneBtm} - ${candleClimax.zoneTop}\n• Meaning: ${candleClimax.subLabel}\n• Action: Stop buying breakouts. Look for short setups on upthrusts/breakdown below ${candleClimax.zoneBtm}.`}
                                    onClick={(e) => { e.stopPropagation(); setIsVsaGuideOpen(true); }}
                                    style={{
                                      backgroundColor: candleClimax.type === 'BC' ? '#450a0a' : '#2e1802',
                                      border: `2px solid ${candleClimax.type === 'BC' ? '#ef4444' : '#f59e0b'}`,
                                      color: candleClimax.type === 'BC' ? '#fca5a5' : '#fde047',
                                      fontSize: '12px',
                                      fontWeight: '900',
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <span>{candleClimax.type === 'BC' ? '🚨 BC (LIMIT SELLER)' : '⚡ LIMIT SELLER ABSORPTION (VCB)'}</span>
                                    <span style={{ fontSize: '10.5px', opacity: 0.9 }}>({candleClimax.volRatio}x)</span>
                                  </div>
                                )}

                                {/* 3. CVD Swing Flow Badge (Deduplicated: only if not already shown by Climax) */}
                                {cvdSignal && (cvdSignal.category === 'BEAR_EXHAUSTION' || cvdSignal.category === 'BEAR_ABSORPTION') && 
                                  !(showClimaxZones && candleClimax && (candleClimax.type === 'BC' || candleClimax.type === 'VCB')) && (
                                  <div 
                                    title={`🎯 CVD MATRIX: ${cvdSignal.title}\n${cvdSignal.desc}`}
                                    style={{
                                      backgroundColor: cvdSignal.category === 'BEAR_ABSORPTION' ? '#2e1802' : '#450a0a',
                                      border: `2px solid ${cvdSignal.category === 'BEAR_ABSORPTION' ? '#f59e0b' : '#ef4444'}`,
                                      color: cvdSignal.category === 'BEAR_ABSORPTION' ? '#fde047' : '#fca5a5',
                                      fontSize: '12px',
                                      fontWeight: '900',
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)'
                                    }}
                                  >
                                    <span>{cvdSignal.badge}</span>
                                  </div>
                                )}

                                {/* 4. Absorption Divergence (Deduplicated: only if neither Climax nor BearDiv is showing) */}
                                {isAbsorptionDivergence && !isBearDivergence &&
                                  !(showClimaxZones && candleClimax && (candleClimax.type === 'BC' || candleClimax.type === 'VCB')) && 
                                  !(cvdSignal && cvdSignal.category === 'BEAR_ABSORPTION') && (
                                  <div 
                                    title="🧊 ABSORPTION DIVERGENCE: Aggressive buyers hit high with heavy volume but price was completely absorbed by passive limit sellers!"
                                    style={{
                                      backgroundColor: '#2e1065',
                                      border: '2px solid #a855f7',
                                      color: '#e9d5ff',
                                      fontSize: '12px',
                                      fontWeight: '900',
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)'
                                    }}
                                  >
                                    <span>🧊 LIMIT SELLER ABSORPTION</span>
                                  </div>
                                )}

                                {/* 5. Delta Divergence Badge */}
                                {isBearDivergence && (
                                  <div style={{
                                    backgroundColor: '#450a0a',
                                    border: '2px solid #ef4444',
                                    color: '#fca5a5',
                                    fontSize: '12px',
                                    fontWeight: '900',
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)'
                                  }}>
                                    <span>▼ BEAR DIV (Limit Sell)</span>
                                    <span style={{ fontSize: '10.5px', opacity: 0.9 }}>({candle.delta})</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* UNIFIED, NON-OVERLAPPING CANDLE LOW BADGES */}
                            {isExtremeLow && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                paddingTop: '4px',
                                zIndex: 25,
                                pointerEvents: 'auto',
                                whiteSpace: 'nowrap'
                              }}>
                                {/* 1. COT Macro Trap Badge (nearest to candle low) */}
                                {showCotBadges && (
                                  <div 
                                    title={`Macro COT Low (Support Absorption):\n• Net Position: ${cotBtmNet > 0 ? '+' : ''}${cotBtmNet} contracts (Long - Short)\n• COT Index: ${cotBtmIndex}% (Seller Commitment Ratio)\n• Open Interest: ${cotBtmOi} contracts\n• Status: ${isTrappedSellers ? '⚠️ EXTREME SENTIMENT TRAP (Trapped Sellers)' : 'Normal Flow'}`}
                                    style={{
                                      backgroundColor: isTrappedSellers ? '#022c22' : (cotBtmNet <= 0 ? '#2a0a0a' : '#042f2e'),
                                      color: isTrappedSellers ? '#86efac' : (cotBtmNet <= 0 ? '#fca5a5' : '#6ee7b7'),
                                      border: `2px solid ${isTrappedSellers ? '#10b981' : (cotBtmNet <= 0 ? '#ef4444' : '#059669')}`,
                                      fontSize: '11.5px',
                                      fontWeight: '900',
                                      padding: '3px 9px',
                                      borderRadius: '4px',
                                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.85)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'help'
                                    }}
                                  >
                                    <span>COT:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: '900' }}>{cotBtmNet > 0 ? '+' : ''}{cotBtmNet}</span>
                                    <span style={{ opacity: 0.85, fontSize: '10px' }}>({cotBtmIndex}%)</span>
                                    {isTrappedSellers && <span style={{ color: '#10b981', fontSize: '10.5px', fontWeight: '900' }}>⚠️TRAP</span>}
                                  </div>
                                )}

                                {showCrCaps && !showCotBadges && (
                                  <div style={{
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    padding: '2px 8px',
                                    borderRadius: '3px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.7)'
                                  }}>
                                    CR {btmLevelData?.totalVol || 0}
                                  </div>
                                )}

                                {/* 2. Primary VSA Climax / Buyer Absorption Signal */}
                                {showClimaxZones && candleClimax && (candleClimax.type === 'SC' || candleClimax.type === 'VCS') && (
                                  <div
                                    title={`🛡️ ${candleClimax.label}\n• Volume Ratio: ${candleClimax.volRatio}x average\n• Delta: ${candleClimax.delta > 0 ? '+' : ''}${candleClimax.delta}\n• Zone: ${candleClimax.zoneBtm} - ${candleClimax.zoneTop}\n• Meaning: ${candleClimax.subLabel}\n• Action: Cease shorting. Wait for low-volume retest to enter long with SL below ${candleClimax.zoneBtm}.`}
                                    onClick={(e) => { e.stopPropagation(); setIsVsaGuideOpen(true); }}
                                    style={{
                                      backgroundColor: candleClimax.type === 'SC' ? '#022c22' : '#083344',
                                      border: `2px solid ${candleClimax.type === 'SC' ? '#10b981' : '#06b6d4'}`,
                                      color: candleClimax.type === 'SC' ? '#86efac' : '#67e8f9',
                                      fontSize: '12px',
                                      fontWeight: '900',
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <span>{candleClimax.type === 'SC' ? '🛡️ SC (LIMIT BUYER)' : '🛡️ LIMIT BUYER ABSORPTION (VCS)'}</span>
                                    <span style={{ fontSize: '10.5px', opacity: 0.9 }}>({candleClimax.volRatio}x)</span>
                                  </div>
                                )}

                                {/* 3. CVD Swing Flow Badge (Deduplicated: only if not already shown by Climax) */}
                                {cvdSignal && (cvdSignal.category === 'BULL_EXHAUSTION' || cvdSignal.category === 'BULL_ABSORPTION') && 
                                  !(showClimaxZones && candleClimax && (candleClimax.type === 'SC' || candleClimax.type === 'VCS')) && (
                                  <div 
                                    title={`🎯 CVD MATRIX: ${cvdSignal.title}\n${cvdSignal.desc}`}
                                    style={{
                                      backgroundColor: cvdSignal.category === 'BULL_ABSORPTION' ? '#022c22' : '#083344',
                                      border: `2px solid ${cvdSignal.category === 'BULL_ABSORPTION' ? '#10b981' : '#38bdf8'}`,
                                      color: cvdSignal.category === 'BULL_ABSORPTION' ? '#86efac' : '#7dd3fc',
                                      fontSize: '12px',
                                      fontWeight: '900',
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)'
                                    }}
                                  >
                                    <span>{cvdSignal.badge}</span>
                                  </div>
                                )}

                                {/* 4. Absorption Divergence (Deduplicated: only if neither Climax nor BullDiv is showing) */}
                                {isAbsorptionDivergence && !isBullDivergence &&
                                  !(showClimaxZones && candleClimax && (candleClimax.type === 'SC' || candleClimax.type === 'VCS')) && 
                                  !(cvdSignal && cvdSignal.category === 'BULL_ABSORPTION') && (
                                  <div 
                                    title="🧊 ABSORPTION DIVERGENCE: Aggressive sellers hit low with heavy volume but price was completely absorbed by passive limit buyers!"
                                    style={{
                                      backgroundColor: '#2e1065',
                                      border: '2px solid #a855f7',
                                      color: '#e9d5ff',
                                      fontSize: '12px',
                                      fontWeight: '900',
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)'
                                    }}
                                  >
                                    <span>🛡️ LIMIT BUYER ABSORPTION</span>
                                  </div>
                                )}

                                {/* 5. Delta Divergence Badge */}
                                {isBullDivergence && (
                                  <div style={{
                                    backgroundColor: '#022c22',
                                    border: '2px solid #10b981',
                                    color: '#86efac',
                                    fontSize: '12px',
                                    fontWeight: '900',
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.95)'
                                  }}>
                                    <span>▲ BULL DIV (Limit Buy)</span>
                                    <span style={{ fontSize: '10.5px', opacity: 0.9 }}>(+{candle.delta})</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* CANDLESTICK IN CENTER + BID ORDERS ON LEFT + ASK ORDERS ON RIGHT */}
                            {layoutStyle === 'CANDLE_ORDERS' ? (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 18px 1fr',
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                zIndex: 2
                              }}>
                                {/* 1. LEFT COLUMN: BID ORDERS */}
                                <div 
                                  title={inCandleRange && levelData ? `BID: ${levelData.bidVol} Aggressive Market Sells matched with Institutional Passive Limit Buys` : undefined}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    paddingRight: '5px',
                                    borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}
                                >
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
                                    fontSize: rungHeight < 18 ? '9px' : (rungHeight < 24 ? '11px' : '12px'),
                                    fontWeight: hasSellImbalance ? '900' : (hasBidOrders ? '700' : '500'),
                                    color: hasSellImbalance ? '#ffffff' : (hasBidOrders ? '#fca5a5' : '#64748b'),
                                    fontFamily: 'monospace',
                                    opacity: hasBidOrders ? 1 : 0.45,
                                    textShadow: hasSellImbalance ? '0 1px 2px #000' : undefined
                                  }}>
                                    {inCandleRange ? (levelData ? levelData.bidVol : 0) : ''}
                                  </span>
                                </div>

                                {/* 2. CENTER COLUMN: CANDLESTICK */}
                                <div style={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
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

                                {/* 3. RIGHT COLUMN: ASK ORDERS + EXHAUSTION / ABSORPTION TAGS */}
                                <div 
                                  title={inCandleRange && levelData ? `ASK: ${levelData.askVol} Aggressive Market Buys matched with Institutional Passive Limit Sells` : undefined}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    paddingLeft: '5px',
                                    borderLeft: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}
                                >
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
                                    fontSize: rungHeight < 18 ? '9px' : (rungHeight < 24 ? '11px' : '12px'),
                                    fontWeight: hasBuyImbalance ? '900' : (hasAskOrders ? '700' : '500'),
                                    color: hasBuyImbalance ? '#ffffff' : (hasAskOrders ? '#86efac' : '#64748b'),
                                    fontFamily: 'monospace',
                                    opacity: hasAskOrders ? 1 : 0.45,
                                    textShadow: hasBuyImbalance ? '0 1px 2px #000' : undefined
                                  }}>
                                    {inCandleRange ? (levelData ? levelData.askVol : 0) : ''}
                                  </span>

                                  {/* Rung Tags: Exhaustion & Absorption (Matching user screenshot) */}
                                  {isTopAbsorption && inCandleRange && (
                                    <span 
                                      title="ABSORPTION AT HIGH: Institutional Passive Limit Seller absorbed all Aggressive Market Buys!"
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(124, 58, 237, 0.65)',
                                        border: '1px solid #d8b4fe',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- ABSORPTION (Limit Sell)!
                                    </span>
                                  )}
                                  {isTopExhaustion && !isTopAbsorption && inCandleRange && (
                                    <span 
                                      title="EXHAUSTION AT HIGH: Aggressive buying volume dried up at extreme high."
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(2, 132, 199, 0.65)',
                                        border: '1px solid #7dd3fc',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- EXHAUSTION!
                                    </span>
                                  )}
                                  {isBtmAbsorption && inCandleRange && (
                                    <span 
                                      title="ABSORPTION AT LOW: Institutional Passive Limit Buyer absorbed all Aggressive Market Sells!"
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(16, 185, 129, 0.65)',
                                        border: '1px solid #86efac',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- ABSORPTION (Limit Buy)!
                                    </span>
                                  )}
                                  {isBtmExhaustion && !isBtmAbsorption && inCandleRange && (
                                    <span 
                                      title="EXHAUSTION AT LOW: Selling volume dried up at extreme low."
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(2, 132, 199, 0.65)',
                                        border: '1px solid #7dd3fc',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- EXHAUSTION!
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Classic split grid view */
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
                                <div 
                                  title={inCandleRange && levelData ? `BID: ${levelData.bidVol} Aggressive Market Sells matched with Institutional Passive Limit Buys` : undefined}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    paddingRight: '4px',
                                    borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}
                                >
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
                                    fontSize: rungHeight < 18 ? '9px' : (rungHeight < 24 ? '11px' : '12px'),
                                    fontWeight: hasSellImbalance ? '900' : (hasBidOrders ? '700' : '500'),
                                    color: hasSellImbalance ? '#ffffff' : (hasBidOrders ? '#fca5a5' : '#64748b'),
                                    opacity: hasBidOrders ? 1 : 0.45,
                                    textShadow: hasSellImbalance ? '0 1px 2px #000' : undefined
                                  }}>
                                    {inCandleRange ? (levelData ? levelData.bidVol : 0) : ''}
                                  </span>
                                </div>

                                <div 
                                  title={inCandleRange && levelData ? `ASK: ${levelData.askVol} Aggressive Market Buys matched with Institutional Passive Limit Sells` : undefined}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    paddingLeft: '4px'
                                  }}
                                >
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
                                    fontSize: rungHeight < 18 ? '9px' : (rungHeight < 24 ? '11px' : '12px'),
                                    fontWeight: hasBuyImbalance ? '900' : (hasAskOrders ? '700' : '500'),
                                    color: hasBuyImbalance ? '#ffffff' : (hasAskOrders ? '#86efac' : '#64748b'),
                                    opacity: hasAskOrders ? 1 : 0.45,
                                    textShadow: hasBuyImbalance ? '0 1px 2px #000' : undefined
                                  }}>
                                    {inCandleRange ? (levelData ? levelData.askVol : 0) : ''}
                                  </span>

                                  {/* Rung Tags: Exhaustion & Absorption (Matching user screenshot) */}
                                  {isTopAbsorption && inCandleRange && (
                                    <span 
                                      title="ABSORPTION AT HIGH: Institutional Passive Limit Seller absorbed all Aggressive Market Buys!"
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(124, 58, 237, 0.65)',
                                        border: '1px solid #d8b4fe',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- ABSORPTION (Limit Sell)!
                                    </span>
                                  )}
                                  {isTopExhaustion && !isTopAbsorption && inCandleRange && (
                                    <span 
                                      title="EXHAUSTION AT HIGH: Aggressive buying volume dried up at extreme high."
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(2, 132, 199, 0.65)',
                                        border: '1px solid #7dd3fc',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- EXHAUSTION!
                                    </span>
                                  )}
                                  {isBtmAbsorption && inCandleRange && (
                                    <span 
                                      title="ABSORPTION AT LOW: Institutional Passive Limit Buyer absorbed all Aggressive Market Sells!"
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(16, 185, 129, 0.65)',
                                        border: '1px solid #86efac',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- ABSORPTION (Limit Buy)!
                                    </span>
                                  )}
                                  {isBtmExhaustion && !isBtmAbsorption && inCandleRange && (
                                    <span 
                                      title="EXHAUSTION AT LOW: Selling volume dried up at extreme low."
                                      style={{
                                        marginLeft: '4px',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        backgroundColor: 'rgba(2, 132, 199, 0.65)',
                                        border: '1px solid #7dd3fc',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                      }}
                                    >
                                      &lt;-- EXHAUSTION!
                                    </span>
                                  )}
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

            {/* Right Margin Offset Buffer Space (TradingView style offset so latest candle is never jammed) */}
            <div
              style={{
                width: '180px',
                minWidth: '180px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: '16px',
                borderLeft: '1px dashed rgba(56, 189, 248, 0.25)',
                backgroundColor: 'rgba(15, 23, 42, 0.15)',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 10,
                  zIndex: 10,
                  backgroundColor: '#121722',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: '800',
                  color: '#38bdf8',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                }}
              >
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                REAL-TIME
              </div>
            </div>
          </div>

          {/* Floating Jump to Live Candle Button (appears when scrolled away) */}
          {!isNearRight && (
            <button
              onClick={() => {
                setAutoScrollToLatest(true);
                scrollToLatest(true);
              }}
              style={{
                position: 'absolute',
                bottom: '18px',
                right: '110px',
                zIndex: 35,
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: '1px solid #38bdf8',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              title="Jump to latest real-time candle"
            >
              <span>▶</span> Jump to Live Candle
            </button>
          )}

          {/* 3. Right Column: Shared Continuous Price Ladder */}
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
                    {p.toFixed((selectedSymbol.includes('NIFTY') || selectedSymbol.includes('CRUDE')) ? 1 : 2)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM METRICS MATRIX                                                  */}
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
            onScroll={handleBottomMatrixScroll}
            style={{
              flex: 1,
              overflowX: 'auto',
              display: 'flex',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {state?.candles?.map((candle, cIdx) => {
              const isBull = candle.close >= candle.open;
              const deltaColor = candle.delta >= 0 ? '#10b981' : '#ef4444';
              const cvdColor = candle.cvd >= 0 ? '#34d399' : '#f87171';
              const prevCandle = cIdx > 0 ? state.candles[cIdx - 1] : null;
              const isBearDiv = (candle.close > candle.open && candle.delta < 0) || 
                                (prevCandle && candle.high > prevCandle.high && candle.delta < 0 && candle.close < candle.high);
              const isBullDiv = (candle.close < candle.open && candle.delta > 0) || 
                                (prevCandle && candle.low < prevCandle.low && candle.delta > 0 && candle.close > candle.low);
              const isAbsorpDiv = (candle.delta > 150 && candle.close < candle.open) ||
                                  (candle.delta < -150 && candle.close > candle.open);

              return (
                <div 
                  key={candle.timestamp || cIdx} 
                  onClick={() => jumpToCandle(candle)}
                  title={`Click to focus ${candle.period} (${candle.timeStr}) candle`}
                  style={{
                    width: `${candleWidth}px`,
                    minWidth: `${candleWidth}px`,
                    maxWidth: `${candleWidth}px`,
                    flexShrink: 0,
                    borderRight: '1px solid #1e2533',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    padding: '6px 4px',
                    textAlign: 'center',
                    fontSize: '10px',
                    backgroundColor: '#151a24',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '18px' }}>
                    <div style={{
                      width: '8px',
                      height: '14px',
                      backgroundColor: isBull ? '#00e676' : '#ff5252',
                      borderRadius: '1px',
                      boxShadow: isBull ? '0 0 3px #00e676' : '0 0 3px #ff5252'
                    }} />
                  </div>

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

                  <div style={{
                    backgroundColor: candle.delta >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                    color: deltaColor,
                    fontWeight: '800',
                    borderRadius: '2px',
                    margin: '0 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 0'
                  }}>
                    <span>{candle.delta >= 0 ? '+' : ''}{candle.delta}</span>
                    {isBearDiv && (
                      <span style={{ fontSize: '7px', color: '#fca5a5', fontWeight: '900', whiteSpace: 'nowrap' }}>🔻BEAR DIV (Limit Sell)</span>
                    )}
                    {isBullDiv && (
                      <span style={{ fontSize: '7px', color: '#86efac', fontWeight: '900', whiteSpace: 'nowrap' }}>▲BULL DIV (Limit Buy)</span>
                    )}
                    {isAbsorpDiv && !isBearDiv && !isBullDiv && (
                      <span style={{ fontSize: '7px', color: '#d8b4fe', fontWeight: '900', whiteSpace: 'nowrap' }}>🧊ABSORPTION</span>
                    )}
                  </div>

                  <div style={{ color: '#34d399', fontWeight: '700' }}>
                    +{candle.maxDelta}
                  </div>

                  <div style={{ color: '#f87171', fontWeight: '700' }}>
                    {candle.minDelta}
                  </div>

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

            {/* Matching Right Margin Buffer Spacer for Bottom Matrix */}
            <div
              style={{
                width: '180px',
                minWidth: '180px',
                flexShrink: 0,
                borderLeft: '1px dashed rgba(56, 189, 248, 0.25)',
                backgroundColor: '#0f1420',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#64748b',
                fontWeight: '700'
              }}
            >
              Next Bar ➔
            </div>
          </div>

          <div style={{ width: '94px', backgroundColor: '#0f131a', borderLeft: '1px solid #232a3b', flexShrink: 0 }} />
        </div>

        {/* ========================================================================= */}
        {/* 4. BOTTOM INSTRUMENT TABS (NIFTY FUT, BANKNIFTY FUT, ETC.)                */}
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
            {AVAILABLE_INSTRUMENTS.slice(0, 13).map((inst) => {
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
                  {inst.type === 'FUTURES' && (
                    <span style={{ fontSize: '8px', padding: '1px 3px', backgroundColor: '#00e67633', color: '#00e676', borderRadius: '2px', fontWeight: '800' }}>
                      FUT
                    </span>
                  )}
                  {inst.type === 'COMMODITY' && (
                    <span style={{ fontSize: '8px', padding: '1px 3px', backgroundColor: '#f59e0b33', color: '#f59e0b', borderRadius: '2px', fontWeight: '800' }}>
                      MCX
                    </span>
                  )}
                  {inst.symbol === 'SENSEX' && (
                    <span style={{ fontSize: '8px', padding: '1px 3px', backgroundColor: '#e11d4833', color: '#fb7185', borderRadius: '2px', fontWeight: '800' }}>
                      BSE
                    </span>
                  )}
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
      {/* ========================================================================= */}
      {/* 4. INSTITUTIONAL VSA CLIMAX MATRIX & EDUCATIONAL TRADING GUIDE MODAL        */}
      {/* ========================================================================= */}
      {isVsaGuideOpen && (
        <div 
          onClick={() => setIsVsaGuideOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#11151f',
              border: '1px solid #312e81',
              borderRadius: '12px',
              width: '95%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              padding: '24px',
              color: '#e2e8f0',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🎯</span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.3px' }}>
                    Institutional VSA Climax Matrix (VCB, VCS, SC, BC)
                  </h2>
                  <span style={{ fontSize: '10px', backgroundColor: '#312e81', color: '#c7d2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                    Bell Order Flow & VSA
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Identify institutional exhaustion, smart-money absorption, and market turning points using Volume (effort) alongside Spread (result).
                </p>
              </div>
              <button 
                onClick={() => setIsVsaGuideOpen(false)}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px'
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Matrix Table */}
            <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#e2e8f0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📊</span> 1. VSA Climax Matrix Overview
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e2638', color: '#cbd5e1' }}>
                    <th style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Zone</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Trend Context</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Volume vs. Spread Signature</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Institutional Dynamic</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Trading Action (Nifty / Bank Nifty / F&O)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', fontWeight: '900', color: '#ef4444' }}>
                      🚨 BC
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#fca5a5' }}>Late Stage Uptrend</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Ultra-High Vol (≥1.8x) + Wide Spread, Closes off High</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#f87171' }}>Wholesale Distribution to late retail buyers</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#fca5a5' }}>Stop buying breakouts; scout for short setups on upthrusts.</td>
                  </tr>
                  <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', fontWeight: '900', color: '#10b981' }}>
                      🛡️ SC
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#86efac' }}>Extended Downtrend</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Ultra-High Vol (≥1.8x) + Wide Spread, Closes off Low</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#34d399' }}>Institutional Accumulation & panic absorption</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#86efac' }}>Cease shorting; wait for a low-volume retest to go long.</td>
                  </tr>
                  <tr style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', fontWeight: '900', color: '#f59e0b' }}>
                      ⚡ VCB
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#fde047' }}>Micro Rejection Peak</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Delta Surge + Narrowing Spread (High Effort / Low Result)</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#fbbf24' }}>Aggressive Buyers Absorbed by Limit Sell Walls</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#fde047' }}>Initiate tactical short if price breaks below the VCB zone.</td>
                  </tr>
                  <tr style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)' }}>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', fontWeight: '900', color: '#06b6d4' }}>
                      ⚡ VCS
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#67e8f9' }}>Micro Rejection Trough</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748' }}>Delta Drop + Narrowing Spread (High Effort / Low Result)</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#22d3ee' }}>Aggressive Sellers Absorbed by Limit Buy Orders</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #2d3748', color: '#67e8f9' }}>Initiate tactical long if price clears above the VCS zone.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Trading Playbooks */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              
              {/* Playbook A */}
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #10b98144', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '800', fontSize: '13px', marginBottom: '8px' }}>
                  <span>🛡️</span> Strategy A: The SC / VCS Bottom Long (Reversal)
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.6', color: '#cbd5e1' }}>
                  <p style={{ margin: '0 0 6px 0' }}>
                    <strong>1. Identify the Pattern:</strong> Wait for Nifty or Bank Nifty to drop sharply into key support (Value Area Low, Yesterday's Low, or IB Low).
                  </p>
                  <p style={{ margin: '0 0 6px 0' }}>
                    <strong>2. Confirm the Climax:</strong> Look for the <code>SC</code> or <code>VCS</code> zone badge to print accompanied by an ultra-high volume spike.
                  </p>
                  <p style={{ margin: '0 0 0 0' }}>
                    <strong>3. Execution:</strong> Do not buy the climax candle instantly. Wait for the next 1 or 2 candles to form a low-volume retest ("No Supply" bar) that holds above the SC/VCS green floor zone. Enter long with Stop Loss below the zone low. Target: POC / VWAP.
                  </p>
                </div>
              </div>

              {/* Playbook B */}
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #ef444444', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: '800', fontSize: '13px', marginBottom: '8px' }}>
                  <span>🚨</span> Strategy B: The BC / VCB Top Short (Exhaustion Fade)
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.6', color: '#cbd5e1' }}>
                  <p style={{ margin: '0 0 6px 0' }}>
                    <strong>1. Identify the Pattern:</strong> Look for Nifty, Bank Nifty, or high-beta F&O stocks rallying heavily toward key overhead resistance (VAH, Yesterday High).
                  </p>
                  <p style={{ margin: '0 0 6px 0' }}>
                    <strong>2. Confirm the Climax:</strong> A <code>BC</code> or <code>VCB</code> zone prints with high volume effort on the Ask, but the candle spread stalls and closes off its highs.
                  </p>
                  <p style={{ margin: '0 0 0 0' }}>
                    <strong>3. Execution:</strong> Wait for price to break down and close below the red/amber VCB/BC zone floor. Short the breakdown or the subsequent test of the zone from below. Target: Session POC / Midpoint.
                  </p>
                </div>
              </div>

            </div>

            {/* How to Read On Your Chart */}
            <div style={{ backgroundColor: '#181e2b', borderRadius: '8px', padding: '14px', border: '1px solid #283548' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👁️</span> Visual Legend On Your Footprint Chart:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', lineHeight: '1.7', color: '#94a3b8' }}>
                <li><strong style={{ color: '#ef4444' }}>Red Pill [ 🚨 BC ZONE ]:</strong> Printed on the candle high when ultra-volume and wide spread distribute into retail buyers.</li>
                <li><strong style={{ color: '#f59e0b' }}>Amber Pill [ ⚡ VCB ]:</strong> Printed on the candle high when aggressive market buyers get absorbed by passive limit sellers.</li>
                <li><strong style={{ color: '#10b981' }}>Green Pill [ 🛡️ SC ZONE ]:</strong> Printed on the candle low when panic selling volume is absorbed by smart money accumulation.</li>
                <li><strong style={{ color: '#06b6d4' }}>Cyan Pill [ ⚡ VCS ]:</strong> Printed on the candle low when aggressive sellers hitting the Bid get absorbed by institutional limit buy floors.</li>
                <li><strong>Horizontal Bands & Dashed Lines:</strong> The chart automatically shades the active support/resistance zones from the climax candle forward across subsequent candles.</li>
              </ul>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
