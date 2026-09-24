import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  Scale, RefreshCw, TrendingUp, TrendingDown, ShieldAlert, Award, 
  Brain, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Zap, AlertTriangle
} from 'lucide-react';

interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
}

interface Constituent {
  symbol: string;
  token: string;
  ltp: number;
  netChange: number;
  percentChange: number;
  macroBuyPct: number;
  macroSellPct: number;
  macroRatio: number;
  top5BuyPct: number;
  top5SellPct: number;
  top5BuyQty: number;
  top5SellQty: number;
  top5BuyOrders: number;
  top5SellOrders: number;
  avgBuyOrderSize: number;
  avgSellOrderSize: number;
  whaleRatio: number;
  whaleTag: string;
  regime: string;
  action: string;
  rationale: string;
  depth?: {
    buy: DepthLevel[];
    sell: DepthLevel[];
  };
}

interface Prediction {
  id: string;
  timestamp: number;
  istTime: string;
  symbol: string;
  entryPrice: number;
  top5BuyPct: number;
  top5SellPct: number;
  whaleTag: string;
  regime: string;
  expectedDirection: 'UP' | 'DOWN';
  targetPrice: number;
  stopLossPrice: number;
  niftyPressureAtEntry: number;
  status: 'ACTIVE' | 'WIN' | 'LOSS';
  resolvedAt: string | null;
  outcome: string | null;
  mistakeType: string | null;
  learnedLesson: string | null;
}

interface LearnedRule {
  id: string;
  rule: string;
  dateLearned: string;
  timesTriggered: number;
}

interface JournalData {
  totalPredictions: number;
  wins: number;
  losses: number;
  winRate: number;
  mistakePatterns: Record<string, number>;
  learnedRules: LearnedRule[];
  predictions: Prediction[];
}

interface ImbalanceResponse {
  success: boolean;
  istTime: string;
  marketRegime: string;
  nifty: {
    buyPressure: number;
    sellPressure: number;
    bias: string;
  };
  banknifty: {
    buyPressure: number;
    sellPressure: number;
    bias: string;
  };
  sensex?: {
    buyPressure: number;
    sellPressure: number;
    bias: string;
  };
  constituents: Constituent[];
  journalSummary?: {
    totalPredictions: number;
    wins: number;
    losses: number;
    winRate: number;
    recentMistakes: Prediction[];
    activeLearnings: LearnedRule[];
  };
}

export const ImbalanceMeterContainer: React.FC = () => {
  const [data, setData] = useState<ImbalanceResponse | null>(null);
  const [journal, setJournal] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const backendUrl = getBackendUrl();

  const fetchLiveImbalance = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/imbalance/live?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
          setLastUpdated(json.istTime);
        }
      }
    } catch (e) {
      console.error('Failed to fetch live imbalance:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchJournal = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/imbalance/journal?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setJournal(json);
      }
    } catch (e) {
      console.error('Failed to fetch journal:', e);
    }
  };

  const triggerEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`${backendUrl}/api/imbalance/evaluate`, { method: 'POST' });
      if (res.ok) {
        await fetchJournal();
        await fetchLiveImbalance();
      }
    } catch (e) {
      console.error('Failed to evaluate outcomes:', e);
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    fetchLiveImbalance();
    fetchJournal();
    const interval = setInterval(fetchLiveImbalance, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'STRONG_BULLISH_AGGRESSION':
      case 'ABSORPTION_BUY':
      case 'BREAKOUT_DRIVE':
        return '#00e676';
      case 'STRONG_BEARISH_DISTRIBUTION':
      case 'SELL_WALL_REJECTION':
      case 'BREAKDOWN_DUMP':
        return '#ff5252';
      case 'MILD_BULLISH_BIAS':
        return '#4ade80';
      case 'MILD_BEARISH_BIAS':
        return '#f87171';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px', color: '#e0e0e0' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
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
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <Scale size={24} color="#3b82f6" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                Live Bid/Ask Imbalance Meter & Mistake Miner
              </h2>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: 'rgba(0, 230, 118, 0.15)',
                color: '#00e676',
                border: '1px solid rgba(0, 230, 118, 0.3)'
              }}>
                ANGEL ONE LEVEL 2 (SUB-SECOND)
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#787b86', marginTop: '2px' }}>
              Real-time buying vs selling pressure across Nifty, Bank Nifty & key F&O heavyweights with self-evolving mistake journal.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#787b86' }}>
            Live Feed Time: <span style={{ color: '#fff', fontWeight: '600' }}>{lastUpdated || 'Connecting...'}</span>
          </div>
          <button
            onClick={() => { fetchLiveImbalance(); fetchJournal(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2a2e39',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Feed
          </button>
          <button
            onClick={triggerEvaluation}
            disabled={evaluating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: evaluating ? '#4b5563' : 'rgba(168, 85, 247, 0.2)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: evaluating ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <Brain size={14} />
            {evaluating ? 'Evaluating...' : 'Run EOD Mistake Audit'}
          </button>
        </div>
      </div>

      {/* Synthetic Index Imbalance Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* NIFTY 50 Synthetic Card */}
        <div style={{
          backgroundColor: '#131722',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #2a2e39'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>NIFTY 50 Weighted Pressure</div>
            <span style={{
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: data?.nifty?.bias === 'BULLISH' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
              color: data?.nifty?.bias === 'BULLISH' ? '#00e676' : (data?.nifty?.bias === 'BEARISH' ? '#ff5252' : '#9e9e9e')
            }}>
              {data?.nifty?.bias || 'CALCULATING'}
            </span>
          </div>

          {/* Bar Gauge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
            <span style={{ color: '#00e676' }}>BUY: {data?.nifty?.buyPressure ?? 50}%</span>
            <span style={{ color: '#ff5252' }}>SELL: {data?.nifty?.sellPressure ?? 50}%</span>
          </div>
          <div style={{ width: '100%', height: '14px', backgroundColor: '#ff5252', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
            <div style={{
              width: `${data?.nifty?.buyPressure ?? 50}%`,
              height: '100%',
              backgroundColor: '#00e676',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ fontSize: '11px', color: '#787b86', marginTop: '8px' }}>
            Synthesized from Level 2 depth of top 10 index heavyweights (Reliance, HDFC, ICICI, Infosys, etc.).
          </div>
        </div>

        {/* BANK NIFTY Synthetic Card */}
        <div style={{
          backgroundColor: '#131722',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #2a2e39'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>BANK NIFTY Weighted Pressure</div>
            <span style={{
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: data?.banknifty?.bias === 'BULLISH' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
              color: data?.banknifty?.bias === 'BULLISH' ? '#00e676' : (data?.banknifty?.bias === 'BEARISH' ? '#ff5252' : '#9e9e9e')
            }}>
              {data?.banknifty?.bias || 'CALCULATING'}
            </span>
          </div>

          {/* Bar Gauge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
            <span style={{ color: '#00e676' }}>BUY: {data?.banknifty?.buyPressure ?? 50}%</span>
            <span style={{ color: '#ff5252' }}>SELL: {data?.banknifty?.sellPressure ?? 50}%</span>
          </div>
          <div style={{ width: '100%', height: '14px', backgroundColor: '#ff5252', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
            <div style={{
              width: `${data?.banknifty?.buyPressure ?? 50}%`,
              height: '100%',
              backgroundColor: '#00e676',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ fontSize: '11px', color: '#787b86', marginTop: '8px' }}>
            Synthesized from HDFC Bank, ICICI Bank, SBI, Axis Bank, and Kotak Bank (&gt;85% Bank Nifty weight).
          </div>
        </div>

        {/* SENSEX Synthetic Card */}
        <div style={{
          backgroundColor: '#131722',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #2a2e39'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>SENSEX Weighted Pressure</div>
            <span style={{
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: data?.sensex?.bias === 'BULLISH' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
              color: data?.sensex?.bias === 'BULLISH' ? '#00e676' : (data?.sensex?.bias === 'BEARISH' ? '#ff5252' : '#9e9e9e')
            }}>
              {data?.sensex?.bias || 'CALCULATING'}
            </span>
          </div>

          {/* Bar Gauge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
            <span style={{ color: '#00e676' }}>BUY: {data?.sensex?.buyPressure ?? 50}%</span>
            <span style={{ color: '#ff5252' }}>SELL: {data?.sensex?.sellPressure ?? 50}%</span>
          </div>
          <div style={{ width: '100%', height: '14px', backgroundColor: '#ff5252', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
            <div style={{
              width: `${data?.sensex?.buyPressure ?? 50}%`,
              height: '100%',
              backgroundColor: '#00e676',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ fontSize: '11px', color: '#787b86', marginTop: '8px' }}>
            Synthesized from BSE SENSEX top constituents (Reliance, HDFC Bank, ICICI Bank, Infosys, TCS, L&amp;T).
          </div>
        </div>

        {/* EOD Mistake Journal Summary Card */}
        <div style={{
          backgroundColor: '#131722',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #2a2e39',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={18} color="#eab308" />
              Mistake Miner Calibration
            </div>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308'
            }}>
              {journal?.winRate ? `${journal.winRate}% ACCURACY` : 'CALIBRATING'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', margin: '12px 0' }}>
            <div style={{ backgroundColor: '#1e222d', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#787b86' }}>Total Signals</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{journal?.totalPredictions ?? 0}</div>
            </div>
            <div style={{ backgroundColor: '#1e222d', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#787b86' }}>Validated Wins</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#00e676' }}>{journal?.wins ?? 0}</div>
            </div>
            <div style={{ backgroundColor: '#1e222d', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#787b86' }}>Mistakes Learned</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#ff5252' }}>{journal?.losses ?? 0}</div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#787b86' }}>
            System automatically cross-checks every signal against price continuation to diagnose failure causes.
          </div>
        </div>
      </div>

      {/* Constituent Table */}
      <div style={{
        backgroundColor: '#131722',
        borderRadius: '12px',
        border: '1px solid #2a2e39',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2a2e39',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>
              Heavyweight Order Book Depth & Institutional Action
            </h3>
            <div style={{ fontSize: '12px', color: '#787b86', marginTop: '2px' }}>
              Real-time Top-5 bid/ask ladder, order size skew (whale vs retail), and absorption triggers. Click any row to view full 5x5 ladder.
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#181c27', color: '#787b86', borderBottom: '1px solid #2a2e39' }}>
                <th style={{ padding: '12px 16px' }}>Stock & LTP</th>
                <th style={{ padding: '12px 16px', width: '220px' }}>Top-5 Depth Skew (Buy vs Sell)</th>
                <th style={{ padding: '12px 16px' }}>Whale vs Retail Skew</th>
                <th style={{ padding: '12px 16px' }}>Total Book Ratio</th>
                <th style={{ padding: '12px 16px' }}>Institutional Action</th>
                <th style={{ padding: '12px 16px' }}>Strategic Rationale</th>
              </tr>
            </thead>
            <tbody>
              {(data?.constituents || []).map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                const pctColor = item.percentChange >= 0 ? '#00e676' : '#ff5252';

                return (
                  <React.Fragment key={item.symbol}>
                    <tr
                      onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                      style={{
                        borderBottom: '1px solid #222632',
                        backgroundColor: isExpanded ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>{item.symbol}</span>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: item.percentChange >= 0 ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 82, 82, 0.12)',
                            color: pctColor
                          }}>
                            {item.percentChange >= 0 ? '+' : ''}{item.percentChange.toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#a0a5b5', marginTop: '2px' }}>
                          ₹{item.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                          <span style={{ color: '#00e676' }}>{item.top5BuyPct}% ({item.top5BuyQty.toLocaleString()})</span>
                          <span style={{ color: '#ff5252' }}>{item.top5SellPct}% ({item.top5SellQty.toLocaleString()})</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#ff5252', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${item.top5BuyPct}%`, height: '100%', backgroundColor: '#00e676', transition: 'width 0.3s' }} />
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: item.whaleTag.includes('WHALE ACCUMULATION') ? 'rgba(0, 230, 118, 0.15)' :
                            (item.whaleTag.includes('WHALE DISTRIBUTION') ? 'rgba(255, 82, 82, 0.15)' : 'rgba(158, 158, 158, 0.15)'),
                          color: item.whaleTag.includes('WHALE ACCUMULATION') ? '#00e676' :
                            (item.whaleTag.includes('WHALE DISTRIBUTION') ? '#ff5252' : '#9e9e9e')
                        }}>
                          {item.whaleTag}
                        </span>
                        <div style={{ fontSize: '10px', color: '#787b86', marginTop: '3px' }}>
                          Avg Bid: {item.avgBuyOrderSize} | Avg Ask: {item.avgSellOrderSize}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: '700', color: item.macroRatio >= 1.2 ? '#00e676' : (item.macroRatio <= 0.8 ? '#ff5252' : '#fff') }}>
                          {item.macroRatio}x
                        </span>
                        <div style={{ fontSize: '10px', color: '#787b86', marginTop: '2px' }}>
                          {item.macroBuyPct}% Buy / {item.macroSellPct}% Sell
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: getRegimeColor(item.regime) + '22',
                          color: getRegimeColor(item.regime),
                          border: `1px solid ${getRegimeColor(item.regime)}44`
                        }}>
                          {item.action}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#a0a5b5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{item.rationale}</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded 5x5 Level 2 Order Book Depth */}
                    {isExpanded && item.depth && (
                      <tr style={{ backgroundColor: '#0d1017' }}>
                        <td colSpan={6} style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Buy Bids Ladder */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#00e676', marginBottom: '8px' }}>
                                BUY DEPTH (BIDS)
                              </div>
                              <table style={{ width: '100%', fontSize: '12px', textAlign: 'right' }}>
                                <thead>
                                  <tr style={{ color: '#787b86', borderBottom: '1px solid #222632' }}>
                                    <th style={{ textAlign: 'left', padding: '4px' }}>Orders</th>
                                    <th style={{ padding: '4px' }}>Quantity</th>
                                    <th style={{ padding: '4px' }}>Bid Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(item.depth.buy || []).map((b, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #161922' }}>
                                      <td style={{ textAlign: 'left', padding: '4px', color: '#787b86' }}>{b.orders}</td>
                                      <td style={{ padding: '4px', color: '#fff' }}>{b.quantity.toLocaleString()}</td>
                                      <td style={{ padding: '4px', color: '#00e676', fontWeight: '600' }}>₹{b.price.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Sell Asks Ladder */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#ff5252', marginBottom: '8px' }}>
                                SELL DEPTH (ASKS / OFFERS)
                              </div>
                              <table style={{ width: '100%', fontSize: '12px', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ color: '#787b86', borderBottom: '1px solid #222632' }}>
                                    <th style={{ padding: '4px' }}>Ask Price</th>
                                    <th style={{ padding: '4px' }}>Quantity</th>
                                    <th style={{ textAlign: 'right', padding: '4px' }}>Orders</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(item.depth.sell || []).map((s, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #161922' }}>
                                      <td style={{ padding: '4px', color: '#ff5252', fontWeight: '600' }}>₹{s.price.toFixed(2)}</td>
                                      <td style={{ padding: '4px', color: '#fff' }}>{s.quantity.toLocaleString()}</td>
                                      <td style={{ textAlign: 'right', padding: '4px', color: '#787b86' }}>{s.orders}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🎓 The Mistake Miner & Self-Evolution Journal */}
      <div style={{
        backgroundColor: '#131722',
        borderRadius: '12px',
        border: '1px solid #2a2e39',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={20} color="#a855f7" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                🎓 Mistake Miner & Learning Journal: What Was Predicted vs What Actually Happened
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#787b86', marginTop: '2px' }}>
              End-of-day audit compares predictions with real-world outcomes, diagnoses errors, and extracts permanent rules.
            </div>
          </div>
        </div>

        {/* Active Learned Rules Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {(journal?.learnedRules || []).map((rule) => (
            <div key={rule.id} style={{
              backgroundColor: '#181c27',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid #2a2e39',
              borderLeft: '4px solid #a855f7'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#c084fc' }}>{rule.id}</span>
                <span style={{ fontSize: '10px', color: '#787b86' }}>Triggered: {rule.timesTriggered} times</span>
              </div>
              <div style={{ fontSize: '12px', color: '#e0e0e0', lineHeight: '1.4' }}>
                {rule.rule}
              </div>
            </div>
          ))}
        </div>

        {/* Prediction Audit Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#181c27', color: '#787b86', borderBottom: '1px solid #2a2e39' }}>
                <th style={{ padding: '10px 14px' }}>Time & Symbol</th>
                <th style={{ padding: '10px 14px' }}>Order Flow Signal</th>
                <th style={{ padding: '10px 14px' }}>Entry & Targets</th>
                <th style={{ padding: '10px 14px' }}>Outcome Status</th>
                <th style={{ padding: '10px 14px' }}>Diagnosed Mistake & Learning Rule</th>
              </tr>
            </thead>
            <tbody>
              {(!journal?.predictions || journal.predictions.length === 0) ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#787b86' }}>
                    No predictions logged yet. The engine logs signals automatically when top-5 depth skew exceeds 75%.
                  </td>
                </tr>
              ) : (
                journal.predictions.map((p) => {
                  const statusBg = p.status === 'WIN' ? 'rgba(0, 230, 118, 0.15)' :
                    (p.status === 'LOSS' ? 'rgba(255, 82, 82, 0.15)' : 'rgba(59, 130, 246, 0.15)');
                  const statusColor = p.status === 'WIN' ? '#00e676' :
                    (p.status === 'LOSS' ? '#ff5252' : '#60a5fa');

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #1e222d' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{p.symbol}</div>
                        <div style={{ fontSize: '11px', color: '#787b86' }}>{p.istTime}</div>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          backgroundColor: getRegimeColor(p.regime) + '22',
                          color: getRegimeColor(p.regime)
                        }}>
                          {p.regime}
                        </span>
                        <div style={{ fontSize: '11px', color: '#a0a5b5', marginTop: '3px' }}>
                          Buy {p.top5BuyPct}% | {p.whaleTag}
                        </div>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <div>Entry: ₹{p.entryPrice} ({p.expectedDirection})</div>
                        <div style={{ fontSize: '11px', color: '#787b86' }}>
                          Tgt: ₹{p.targetPrice} | SL: ₹{p.stopLossPrice}
                        </div>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          backgroundColor: statusBg,
                          color: statusColor,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {p.status === 'WIN' && <CheckCircle2 size={12} />}
                          {p.status === 'LOSS' && <XCircle size={12} />}
                          {p.status === 'ACTIVE' && <Clock size={12} />}
                          {p.status}
                        </span>
                        {p.outcome && (
                          <div style={{ fontSize: '11px', color: '#e0e0e0', marginTop: '3px' }}>
                            {p.outcome}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', maxWidth: '340px' }}>
                        {p.mistakeType ? (
                          <div>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: '700',
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171'
                            }}>
                              {p.mistakeType}
                            </span>
                            <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', lineHeight: '1.3' }}>
                              {p.learnedLesson}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#787b86', fontSize: '11px' }}>
                            {p.status === 'ACTIVE' ? 'Observing price action...' : 'Validated institutional flow'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
