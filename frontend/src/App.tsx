import { useState, useEffect, useMemo } from 'react';
import { getBackendUrl } from './utils/config';
import { DashboardHeader } from './components/DashboardHeader';
import { ChartContainer } from './components/ChartContainer';
import { tvStreamer } from './utils/tvStreamer';
import type { Candle } from './utils/profileCalculator';
import { calculateMatrixSeriesData } from './utils/matrixCalculator';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ScannerContainer } from './components/ScannerContainer';
import { OptionsChain } from './components/OptionsChain';
import { SignalsContainer } from './components/SignalsContainer';
import { DojiContainer } from './components/DojiContainer';
import { VolumeContainer } from './components/VolumeContainer';
import { OpeningBiasContainer } from './components/OpeningBiasContainer';
import { ConfluencesContainer } from './components/ConfluencesContainer';
import { EarlyPicksContainer } from './components/EarlyPicksContainer';
import { BhaicharaWorkContainer } from './components/BhaicharaWorkContainer';
import { DadaThoughtsContainer } from './components/DadaThoughtsContainer';
import { HourlyUpdatesContainer } from './components/HourlyUpdatesContainer';
import { BacktestResultsContainer } from './components/BacktestResultsContainer';
import { FifteenMinForensicContainer } from './components/FifteenMinForensicContainer';
import { PatternForecasterContainer } from './components/PatternForecasterContainer';
import { WeeklySellingContainer } from './components/WeeklySellingContainer';
import { PcrVelocityContainer } from './components/PcrVelocityContainer';
import { DayRangeContainer } from './components/DayRangeContainer';
import { AutoLearnerContainer } from './components/AutoLearnerContainer';
import { CycleContainer } from './components/CycleContainer';
import { HistoricalMatchingCasesContainer } from './components/HistoricalMatchingCasesContainer';
import { DeepDiscoveriesContainer } from './components/DeepDiscoveriesContainer';
import { DataLearningContainer } from './components/DataLearningContainer';
import { MicrostructureContainer } from './components/MicrostructureContainer';
import { StocksTrackerContainer } from './components/StocksTrackerContainer';
import { StocksMovingContainer } from './components/StocksMovingContainer';
import { AutonomousRuleMinerContainer } from './components/AutonomousRuleMinerContainer';
import { ImbalanceMeterContainer } from './components/ImbalanceMeterContainer';
import { OrderFlowContainer } from './components/OrderFlowContainer';
import { GexContainer } from './components/GexContainer';
import { ValueTraderContainer } from './components/ValueTraderContainer';
import { StockPcrScannerContainer } from './components/StockPcrScannerContainer';
import { InstitutionalMLSuiteV2Card } from './components/InstitutionalMLSuiteV2Card';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [symbol, setSymbol] = useState('NSE:NIFTY');
  const [timeframe, setTimeframe] = useState('30'); // Default to 30-minute interval
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [matrixHistory, setMatrixHistory] = useState<Record<string, any> | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'institutional_ml_v2' | 'stock_pcr' | 'gex_algo' | 'gex' | 'value_trader' | 'chart' | 'historical' | 'deep_discoveries' | 'data_learning' | 'microstructure' | 'stocks_tracker' | 'stocks_moving' | 'autonomous_rule_miner' | 'imbalance_meter' | 'orderflow' | 'pcr_velocity' | 'day_range' | 'cycle' | 'auto_learner' | 'bhaichara' | 'dada_thoughts' | 'fifteen_min' | 'scanner' | 'options' | 'signals' | 'doji' | 'doji_novol' | 'volume' | 'opening_bias' | 'hourly_updates' | 'backtest_results' | 'confluences' | 'early_picks' | 'pattern_forecaster' | 'weekly_selling'>('value_trader');
  const [biasData, setBiasData] = useState<any>(null);
  const [chartFeedSource, setChartFeedSource] = useState<'angelone' | 'tradingview'>('angelone');

  useEffect(() => {
    const backendUrl = getBackendUrl();

    const fetchBias = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/scanner/opening-bias?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setBiasData(data);
        }
      } catch (e) {}
    };
    fetchBias();
    const interval = setInterval(fetchBias, 1000); // 1-second background polling for high-level bias updates
    return () => clearInterval(interval);
  }, []);

  // Subscribe to symbol data: Angel One (Primary) or TradingView (Secondary)
  useEffect(() => {
    setLoading(true);
    setError(null);
    setCandles([]);
    setMatrixHistory(null);

    const backendUrl = getBackendUrl();

    if (chartFeedSource === 'angelone') {
      let isCancelled = false;
      const fetchAngelCandles = async (isInitial = false) => {
        try {
          const res = await fetch(`${backendUrl}/api/angelone/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&_t=${Date.now()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!isCancelled && data.candles && data.candles.length > 0) {
            setCandles(data.candles);
            setConnectionStatus('connected');
            if (isInitial) setLoading(false);
          }
        } catch (err: any) {
          if (!isCancelled && isInitial) {
            console.warn('Angel One candle error, fallback to TV:', err.message);
            // Auto-fallback to TV if Angel One has no historical candles for this symbol
            setChartFeedSource('tradingview');
          }
        }
      };

      fetchAngelCandles(true);
      const interval = setInterval(() => fetchAngelCandles(false), 3000);

      return () => {
        isCancelled = true;
        clearInterval(interval);
      };
    }

    tvStreamer.setStatusListener((status) => {
      setConnectionStatus(status);
    });

    // Start streaming from TV WebSocket backend
    tvStreamer.subscribe(
      symbol,
      timeframe,
      (data) => {
        setLoading(false);
        setError(null);
        if (data.matrixHistory) {
          setMatrixHistory(data.matrixHistory);
        }
        if (data.candles && data.candles.length > 0) {
          setCandles((prevCandles) => {
            if (data.isSnapshot) {
              return data.candles;
            } else {
              const tick = data.candles[0];
              const index = prevCandles.findIndex((c) => c.time === tick.time);
              if (index !== -1) {
                const updated = [...prevCandles];
                updated[index] = tick;
                return updated;
              } else {
                return [...prevCandles, tick];
              }
            }
          });
        }
      },
      (err) => {
        setLoading(false);
        setError(err);
      }
    );

    return () => {
      tvStreamer.unsubscribe();
    };
  }, [symbol, timeframe, refreshKey, chartFeedSource]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  const matrixSeriesData = useMemo(() => {
    if (matrixHistory && candles && candles.length > 0) {
      const isDailyAnchor = !(timeframe === 'D' || timeframe === 'W' || timeframe === 'M');
      
      const seriesData = {
        level1: [], level2: [], level3: [], level4: [], level5: [],
        level6: [], level7: [], level8: [], level9: [], level10: []
      };
      
      candles.forEach(c => {
        const date = new Date(c.time * 1000);
        let key = '';
        if (isDailyAnchor) {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        const levels = matrixHistory[key];
        if (levels) {
          seriesData.level1.push({ time: c.time as any, value: levels.level1 });
          seriesData.level2.push({ time: c.time as any, value: levels.level2 });
          seriesData.level3.push({ time: c.time as any, value: levels.level3 });
          seriesData.level4.push({ time: c.time as any, value: levels.level4 });
          seriesData.level5.push({ time: c.time as any, value: levels.level5 });
          seriesData.level6.push({ time: c.time as any, value: levels.level6 });
          seriesData.level7.push({ time: c.time as any, value: levels.level7 });
          seriesData.level8.push({ time: c.time as any, value: levels.level8 });
          seriesData.level9.push({ time: c.time as any, value: levels.level9 });
          seriesData.level10.push({ time: c.time as any, value: levels.level10 });
        }
      });
      return seriesData;
    }
    return calculateMatrixSeriesData(candles, timeframe);
  }, [candles, timeframe, matrixHistory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minHeight: '100vh', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Header controls */}
      <DashboardHeader
        currentSymbol={symbol}
        currentTimeframe={timeframe}
        connectionStatus={connectionStatus}
        onSymbolChange={setSymbol}
        onTimeframeChange={setTimeframe}
        onRefresh={handleRefresh}
      />

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '2px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('institutional_ml_v2')}
          style={{
            background: activeTab === 'institutional_ml_v2' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)' : 'rgba(56, 189, 248, 0.08)',
            border: activeTab === 'institutional_ml_v2' ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.25)',
            borderBottom: activeTab === 'institutional_ml_v2' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'institutional_ml_v2' ? '#38bdf8' : '#e2e8f0',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '900',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'institutional_ml_v2' ? '0 0 14px rgba(56, 189, 248, 0.4)' : 'none'
          }}
        >
          🧠 Institutional AI V2 (6 Engines)
        </button>
        <button
          onClick={() => setActiveTab('historical')}
          style={{
            background: activeTab === 'historical' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'historical' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'historical' ? '#60a5fa' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🏛️ Historical
        </button>
        <button
          onClick={() => setActiveTab('deep_discoveries')}
          style={{
            background: activeTab === 'deep_discoveries' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'deep_discoveries' ? '2px solid #8b5cf6' : '2px solid transparent',
            color: activeTab === 'deep_discoveries' ? '#a78bfa' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🔬 Deep Learnings
        </button>
        <button
          onClick={() => setActiveTab('data_learning')}
          style={{
            background: activeTab === 'data_learning' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'data_learning' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'data_learning' ? '#34d399' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🧠 Data Learning
        </button>
        <button
          onClick={() => setActiveTab('microstructure')}
          style={{
            background: activeTab === 'microstructure' ? 'rgba(234, 179, 8, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'microstructure' ? '2px solid #eab308' : '2px solid transparent',
            color: activeTab === 'microstructure' ? '#fde047' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⚡ Gamma & Order Flow
        </button>
        <button
          onClick={() => setActiveTab('stocks_tracker')}
          style={{
            background: activeTab === 'stocks_tracker' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'stocks_tracker' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'stocks_tracker' ? '#38bdf8' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🐋 Stocks Tracker
        </button>
        <button
          onClick={() => setActiveTab('stocks_moving')}
          style={{
            background: activeTab === 'stocks_moving' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'stocks_moving' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'stocks_moving' ? '#34d399' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🚀 Stocks Moving
        </button>
        <button
          onClick={() => setActiveTab('autonomous_rule_miner')}
          style={{
            background: activeTab === 'autonomous_rule_miner' ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(109, 40, 217, 0.3) 100%)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'autonomous_rule_miner' ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === 'autonomous_rule_miner' ? '#c084fc' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🧠 Autonomous ML Rule Miner
        </button>
        <button
          onClick={() => setActiveTab('imbalance_meter')}
          style={{
            background: activeTab === 'imbalance_meter' ? 'rgba(0, 230, 118, 0.22)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'imbalance_meter' ? '2px solid #00e676' : '2px solid transparent',
            color: activeTab === 'imbalance_meter' ? '#00e676' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⚖️ Imbalance Meter
        </button>
        <button
          onClick={() => setActiveTab('gex')}
          style={{
            background: activeTab === 'gex' ? 'rgba(45, 212, 191, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'gex' ? '2px solid #2dd4bf' : '2px solid transparent',
            color: activeTab === 'gex' ? '#2dd4bf' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⚡ GEX Exposure
        </button>
        <button
          onClick={() => setActiveTab('gex_algo')}
          style={{
            background: activeTab === 'gex_algo' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'gex_algo' ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === 'gex_algo' ? '#c084fc' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🤖 GEX Algo & AI Learner
        </button>
        <button
          onClick={() => setActiveTab('value_trader')}
          style={{
            background: activeTab === 'value_trader' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'value_trader' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'value_trader' ? '#38bdf8' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          💎 The Value Trader
        </button>
        <button
          onClick={() => setActiveTab('orderflow')}
          style={{
            background: activeTab === 'orderflow' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'orderflow' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'orderflow' ? '#38bdf8' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🌊 Order Flow & Footprint
        </button>
        <button
          onClick={() => setActiveTab('pcr_velocity')}
          style={{
            background: activeTab === 'pcr_velocity' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pcr_velocity' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'pcr_velocity' ? '#38bdf8' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⚡ PCR Velocity
        </button>
        <button
          onClick={() => setActiveTab('stock_pcr')}
          style={{
            background: activeTab === 'stock_pcr' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'stock_pcr' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'stock_pcr' ? '#38bdf8' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🎯 Stock PCR
        </button>
        <button
          onClick={() => setActiveTab('day_range')}
          style={{
            background: activeTab === 'day_range' ? 'rgba(59, 130, 246, 0.22)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'day_range' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'day_range' ? '#60a5fa' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📐 Day Range
        </button>
        <button
          onClick={() => setActiveTab('cycle')}
          style={{
            background: activeTab === 'cycle' ? 'rgba(234, 179, 8, 0.22)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'cycle' ? '2px solid #eab308' : '2px solid transparent',
            color: activeTab === 'cycle' ? '#fde047' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🌀 Cycle (Sq of 9)
        </button>
        <button
          onClick={() => setActiveTab('auto_learner')}
          style={{
            background: activeTab === 'auto_learner' ? 'rgba(168, 85, 247, 0.22)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'auto_learner' ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === 'auto_learner' ? '#c084fc' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🔬 Auto-Learner & Mistake Miner
        </button>
        <button
          onClick={() => setActiveTab('bhaichara')}
          style={{
            background: activeTab === 'bhaichara' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'bhaichara' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'bhaichara' ? '#60a5fa' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🤝 Bhaichara Work
        </button>
        <button
          onClick={() => setActiveTab('dada_thoughts')}
          style={{
            background: activeTab === 'dada_thoughts' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'dada_thoughts' ? '2px solid #eab308' : '2px solid transparent',
            color: activeTab === 'dada_thoughts' ? '#eab308' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🧠 Dada Thoughts
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          style={{
            background: activeTab === 'chart' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chart' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'chart' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          Candlestick Chart
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          style={{
            background: activeTab === 'scanner' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'scanner' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'scanner' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          Scanner
        </button>
        <button
          onClick={() => setActiveTab('confluences')}
          style={{
            background: activeTab === 'confluences' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'confluences' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'confluences' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          Confluences
        </button>
        <button
          onClick={() => setActiveTab('options')}
          style={{
            background: activeTab === 'options' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'options' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'options' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          Options Chain
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          style={{
            background: activeTab === 'signals' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'signals' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'signals' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          Live Signals
        </button>
        <button
          onClick={() => setActiveTab('doji')}
          style={{
            background: activeTab === 'doji' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'doji' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'doji' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          First Doji
        </button>
        <button
          onClick={() => setActiveTab('doji_novol')}
          style={{
            background: activeTab === 'doji_novol' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'doji_novol' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'doji_novol' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          Doji (No Vol)
        </button>
        <button
          onClick={() => setActiveTab('volume')}
          style={{
            background: activeTab === 'volume' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'volume' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'volume' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          🔥 Volume Breakouts
        </button>
        <button
          onClick={() => setActiveTab('opening_bias')}
          style={{
            background: activeTab === 'opening_bias' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'opening_bias' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'opening_bias' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          ⚡ Opening Bias
        </button>
        <button
          onClick={() => setActiveTab('fifteen_min')}
          style={{
            background: activeTab === 'fifteen_min' ? 'rgba(59, 130, 246, 0.22)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'fifteen_min' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'fifteen_min' ? '#60a5fa' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⏱️ 15 Mins
        </button>
        <button
          onClick={() => setActiveTab('hourly_updates')}
          style={{
            background: activeTab === 'hourly_updates' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'hourly_updates' ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === 'hourly_updates' ? '#a855f7' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⏱️ Hourly Updates
        </button>
        <button
          onClick={() => setActiveTab('backtest_results')}
          style={{
            background: activeTab === 'backtest_results' ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'backtest_results' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeTab === 'backtest_results' ? '#f87171' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🎯 Live Math Signals
        </button>
        <button
          onClick={() => setActiveTab('early_picks')}
          style={{
            background: activeTab === 'early_picks' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'early_picks' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'early_picks' ? '#3b82f6' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          ⚡ Early Picks
        </button>
        <button
          onClick={() => setActiveTab('pattern_forecaster')}
          style={{
            background: activeTab === 'pattern_forecaster' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pattern_forecaster' ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === 'pattern_forecaster' ? '#c084fc' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          🔮 AI Pattern Forecaster
        </button>
        <button
          onClick={() => setActiveTab('weekly_selling')}
          style={{
            background: activeTab === 'weekly_selling' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'weekly_selling' ? '2px solid #f59e0b' : '2px solid transparent',
            color: activeTab === 'weekly_selling' ? '#fbbf24' : 'var(--text-primary)',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            transition: 'all 0.15s'
          }}
        >
          🔥 Weekly Option Selling Engine
        </button>
      </div>

      {/* Main Workspace */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0' }}>
        <ErrorBoundary key={activeTab} fallbackTitle={`Error Loading Tab (${activeTab})`}>
        {activeTab === 'institutional_ml_v2' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <InstitutionalMLSuiteV2Card />
          </div>
        )}
        {activeTab === 'historical' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <HistoricalMatchingCasesContainer />
          </div>
        )}
        {activeTab === 'deep_discoveries' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <DeepDiscoveriesContainer />
          </div>
        )}
        {activeTab === 'data_learning' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <DataLearningContainer />
          </div>
        )}
        {activeTab === 'microstructure' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <MicrostructureContainer />
          </div>
        )}
        {activeTab === 'stocks_tracker' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <StocksTrackerContainer />
          </div>
        )}
        {activeTab === 'stocks_moving' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <StocksMovingContainer />
          </div>
        )}
        {activeTab === 'autonomous_rule_miner' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <AutonomousRuleMinerContainer />
          </div>
        )}
        {activeTab === 'imbalance_meter' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <ImbalanceMeterContainer />
          </div>
        )}
        {activeTab === 'gex' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <GexContainer initialViewMode="hub" />
          </div>
        )}
        {activeTab === 'gex_algo' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <GexContainer initialViewMode="algo" />
          </div>
        )}
        {activeTab === 'value_trader' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <ValueTraderContainer
              onSwitchToChart={(sym) => {
                setSymbol(sym);
                setActiveTab('chart');
              }}
            />
          </div>
        )}
        {activeTab === 'orderflow' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <OrderFlowContainer />
          </div>
        )}
        {activeTab === 'weekly_selling' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <WeeklySellingContainer />
          </div>
        )}
        {activeTab === 'fifteen_min' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <FifteenMinForensicContainer />
          </div>
        )}
        {activeTab === 'pattern_forecaster' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <PatternForecasterContainer />
          </div>
        )}
        {activeTab === 'pcr_velocity' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <PcrVelocityContainer />
          </div>
        )}
        {activeTab === 'stock_pcr' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <StockPcrScannerContainer />
          </div>
        )}
        {activeTab === 'day_range' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <DayRangeContainer />
          </div>
        )}
        {activeTab === 'auto_learner' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <AutoLearnerContainer />
          </div>
        )}
        {activeTab === 'bhaichara' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <BhaicharaWorkContainer
              onSymbolSelect={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'dada_thoughts' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <DadaThoughtsContainer
              onSymbolSelect={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'hourly_updates' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <HourlyUpdatesContainer />
          </div>
        )}
        {activeTab === 'backtest_results' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <BacktestResultsContainer />
          </div>
        )}
        {activeTab === 'scanner' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <ScannerContainer 
              onSymbolSelect={setSymbol} 
              onSwitchToChart={() => setActiveTab('chart')} 
            />
          </div>
        )}
        {activeTab === 'confluences' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <ConfluencesContainer 
              onSymbolSelect={setSymbol} 
              onSwitchToChart={() => setActiveTab('chart')} 
            />
          </div>
        )}
        {activeTab === 'options' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <OptionsChain
              currentSymbol={symbol}
              onSymbolChange={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'signals' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <SignalsContainer
              onSymbolSelect={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'doji' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <DojiContainer
              onSymbolSelect={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'doji_novol' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <DojiContainer
              onSymbolSelect={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
              noVolumeFilter={true}
            />
          </div>
        )}
        {activeTab === 'volume' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <VolumeContainer
              onSymbolSelect={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'opening_bias' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <OpeningBiasContainer />
          </div>
        )}
        {activeTab === 'early_picks' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <EarlyPicksContainer
              onSymbolSelect={setSymbol}
              onSwitchToChart={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'cycle' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <CycleContainer />
          </div>
        )}
        
        {/* Chart Workspace (default fallback) */}
        {activeTab === 'chart' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            {/* Feed Source Switcher Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              padding: '6px 14px',
              background: '#121620',
              borderRadius: '8px',
              border: '1px solid #232a3b',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>FEED ENGINE:</span>
                <button
                  type="button"
                  onClick={() => setChartFeedSource('angelone')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '5px',
                    border: chartFeedSource === 'angelone' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: chartFeedSource === 'angelone' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: chartFeedSource === 'angelone' ? '#34d399' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: chartFeedSource === 'angelone' ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
                  }}
                >
                  ⚡ Angel One SmartAPI (Official 0ms Live Exchange)
                </button>
                <button
                  type="button"
                  onClick={() => setChartFeedSource('tradingview')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: chartFeedSource === 'tradingview' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: chartFeedSource === 'tradingview' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: chartFeedSource === 'tradingview' ? '#38bdf8' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  📈 TradingView WebSocket
                </button>
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: chartFeedSource === 'angelone' ? '#10b981' : '#f59e0b' }}>
                {chartFeedSource === 'angelone' ? `Angel One Official Candles (${candles.length} bars)` : `TV Auxiliary Feed (${candles.length} bars)`}
              </div>
            </div>

            {error && (
              <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', marginBottom: '20px' }}>
                <AlertCircle color="#ef4444" size={20} />
                <div>
                  <strong style={{ color: '#ef4444', fontSize: '14px' }}>Connection Error:</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="glass-panel" style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '400px' }}>
                <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Connecting to {chartFeedSource === 'angelone' ? 'Angel One SmartAPI' : 'TradingView WebSocket'} & streaming data...</p>
              </div>
            ) : (
              <div style={{ flex: '1', display: 'flex', minHeight: '0' }}>
                {(() => {
                  const currentBias = symbol.includes('BANKNIFTY') ? biasData?.banknifty : biasData?.nifty;
                  const gexLevels = currentBias?.straddleSkew || {};
                  return (
                    <ChartContainer
                      candles={candles}
                      symbol={symbol}
                      timeframe={timeframe}
                      matrixSeriesData={matrixSeriesData}
                      gexCallWall={gexLevels.gexCallWall}
                      gexPutWall={gexLevels.gexPutWall}
                      gexFlipZone={gexLevels.gexFlipZone}
                      gexMaxPain={gexLevels.gexMaxPain}
                    />
                  );
                })()}
              </div>
            )}
          </div>
        )}
        </ErrorBoundary>
      </div>

      {/* Global Disclaimer Footer */}
      <footer style={{
        padding: '10px 20px 0 20px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: '1.5',
        letterSpacing: '0.2px'
      }}>
        "Investments in the securities market are subject to market risks. Read all the related documents carefully before investing. All calls and ideas shared are for educational purposes only."
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
