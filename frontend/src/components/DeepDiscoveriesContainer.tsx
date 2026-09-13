import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../utils/config';
import { 
  TrendingUp, TrendingDown, Activity, Calendar, Zap, 
  BarChart2, AlertTriangle, RefreshCw, Database, Shield
} from 'lucide-react';

interface VixRegimeData {
  sessions: number;
  avgDayRange: string;
  medianDayRange: string;
  bullDayRate: string;
  bearDayRate: string;
  rangeByDayOfWeek: Record<string, string>;
}

interface DiscoveriesResponse {
  generatedAt: string;
  dataRange: {
    nifty50: string;
    vix: string;
    nifty60min: string;
    analysisWindow: string;
  };
  discoveries: {
    A_vixRegimeDayRange: { title: string; data: Record<string, VixRegimeData> };
    B_vixCrossings: { title: string; data: Record<string, { occurrences: number; avg1WeekReturn: string; positive1WRate: string; avg2WeekReturn: string; positive2WRate: string }> };
    C_gapByDow: { title: string; data: Record<string, { sessions: number; avgGap: string; gapUpRate: string; gapDownRate: string; gapUpFillSameDay: string; gapDownFillSameDay: string; avgDayReturnAfterGapUp: string; avgDayReturnAfterGapDown: string }> };
    D_ibBreakouts: { title: string; data: { nifty: { totalSessions: number; periodC_BreaksUp: string; periodC_BreaksDown: string; byVixRegime: Record<string, { sessions: number; periodC_BreaksUp: string; periodC_BreaksDown: string; avgIBWidth: string }> }; bank: any } };
    E_weekendGap: { title: string; data: { nifty: { total: number; avgMondayGap: string; gapUpRate: string; gapDownRate: string; afterBullishFriday: { sessions: number; gapUpNext: string; avgGap: string; avgMonReturn: string }; afterBearishFriday: { sessions: number; gapDownNext: string; avgGap: string; avgMonReturn: string } }; bank: any } };
    F_seasonality: { title: string; data: Record<string, { sessions: number; bullDayRate: string; avgDayReturn: string; avgDayRange: string }> };
    G_vixSpikes: { title: string; data: { totalEvents: number; avg3DayReturn: string; bounceRate3Day: string; events: any[] } };
    H_niftyBankDivergence: { title: string; data: { totalDays: number; events: any[] } };
    I_lowVixStreaks: { title: string; data: { totalStreaks: number; avgBreakReturn: string; positiveBreakRate: string; streaks: any[] } };
  };
}

const VIX_ORDER = ['ultra-low (<12)', 'low (12-15)', 'moderate (15-18)', 'elevated (18-22)', 'high (22-28)', 'extreme (>28)'];
const VIX_COLORS: Record<string, string> = {
  'ultra-low (<12)': '#10b981',
  'low (12-15)': '#34d399',
  'moderate (15-18)': '#fbbf24',
  'elevated (18-22)': '#f97316',
  'high (22-28)': '#ef4444',
  'extreme (>28)': '#7c3aed',
};

export const DeepDiscoveriesContainer: React.FC = () => {
  const [data, setData] = useState<DiscoveriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('vix-regime');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getBackendUrl()}/api/discoveries`);
      if (!res.ok) throw new Error('Not ready');
      const json: DiscoveriesResponse = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sections = [
    { id: 'vix-regime', label: 'VIX Regime' },
    { id: 'vix-crossings', label: 'VIX Crossings' },
    { id: 'gap-dow', label: 'Gap by DoW' },
    { id: 'ib-breakouts', label: 'IB Breakouts' },
    { id: 'weekend-gap', label: 'Weekend Gap' },
    { id: 'seasonality', label: 'Seasonality' },
    { id: 'vix-spikes', label: 'VIX Spikes' },
    { id: 'streaks', label: 'VIX Streaks' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw className="animate-spin mr-3 w-6 h-6" />
      Loading 36-year deep analysis...
    </div>
  );

  if (error || !data) return (
    <div className="p-6">
      <div className="bg-red-900/40 border border-red-500 rounded-lg p-4 text-red-300">
        <AlertTriangle className="inline w-5 h-5 mr-2" />
        {error || 'No discovery data found'}
      </div>
    </div>
  );

  const { discoveries } = data;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-purple-900/60 to-blue-900/60 border border-purple-500/40 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">🔬 Deep Historical Discoveries</h2>
              <span className="px-2 py-0.5 bg-purple-700/50 text-purple-200 text-xs rounded-full">NEW</span>
            </div>
            <p className="text-purple-200 text-sm">{data.dataRange.analysisWindow} · NIFTY 50 + BANK + VIX · 36-year archive</p>
            <p className="text-purple-300/60 text-xs mt-1">Generated: {new Date(data.generatedAt).toLocaleString('en-IN')}</p>
          </div>
          <button onClick={load} className="p-2 bg-purple-700/50 hover:bg-purple-600/60 rounded-lg text-purple-200 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === s.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'vix-regime' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-purple-500/20 space-y-4">
          <div>
            <h3 className="text-white font-bold mb-1">📊 VIX Regime vs Nifty Day Range</h3>
            <p className="text-gray-400 text-xs mb-3">Use this to predict expected straddle premium and intraday move size.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700 text-xs">
                  <th className="text-left py-2 pr-4">VIX Regime</th>
                  <th className="text-right py-2 pr-4">Sessions</th>
                  <th className="text-right py-2 pr-4">Avg Range</th>
                  <th className="text-right py-2 pr-4">Median</th>
                  <th className="text-right py-2 pr-4">Bull Day %</th>
                  <th className="text-right py-2">Nifty Pts (Avg)</th>
                </tr>
              </thead>
              <tbody>
                {VIX_ORDER.filter(k => discoveries.A_vixRegimeDayRange.data[k]).map(k => {
                  const d = discoveries.A_vixRegimeDayRange.data[k];
                  const bullPct = parseFloat(d.bullDayRate);
                  const avgPts = (parseFloat(d.avgDayRange) / 100 * 23300).toFixed(0);
                  return (
                    <tr key={k} className="border-b border-gray-700/50">
                      <td className="py-2 pr-4">
                        <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ backgroundColor: VIX_COLORS[k] }} />
                        <span className="text-white font-medium text-xs">{k}</span>
                      </td>
                      <td className="text-right text-gray-300 pr-4 text-xs">{d.sessions}</td>
                      <td className="text-right text-yellow-300 font-mono pr-4 text-xs">{d.avgDayRange}</td>
                      <td className="text-right text-gray-300 font-mono pr-4 text-xs">{d.medianDayRange}</td>
                      <td className={`text-right font-mono pr-4 text-xs ${bullPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>{d.bullDayRate}</td>
                      <td className="text-right text-blue-300 font-mono text-xs">~{avgPts} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-yellow-900/30 border border-yellow-600/40 rounded-lg">
            <p className="text-yellow-300 text-xs font-semibold">⚡ Today VIX=12.31 (Ultra-Low) → Expected day range: ~152–175 Nifty pts</p>
            <p className="text-yellow-200/80 text-xs mt-1">Bear day rate: 52.4%. Straddle compression active. Do NOT expect wide breakouts. Buy ATM straddle decay trades.</p>
          </div>
        </div>
      )}

      {activeSection === 'vix-crossings' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-yellow-500/20 space-y-3">
          <h3 className="text-white font-bold mb-1">⚡ VIX Level Crossings as Swing Signals</h3>
          <p className="text-gray-400 text-xs mb-3">What happens to Nifty 1-2 weeks after VIX crosses a key level.</p>
          <div className="space-y-2">
            {Object.entries(discoveries.B_vixCrossings.data).map(([key, val]) => {
              const isUp = key.includes('above');
              const level = key.replace('cross_above_', '').replace('cross_below_', '');
              const posRate = parseFloat(val.positive1WRate);
              const bg = posRate > 55 ? 'bg-green-900/30 border-green-600/40' : posRate < 45 ? 'bg-red-900/30 border-red-600/40' : 'bg-gray-700/40 border-gray-600/40';
              return (
                <div key={key} className={`p-3 rounded-lg border ${bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isUp ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-green-400" />}
                      <span className="text-white text-sm font-medium">VIX {isUp ? '↑ above' : '↓ below'} {level}</span>
                      <span className="text-gray-400 text-xs">({val.occurrences} events)</span>
                    </div>
                    <span className={`text-sm font-bold ${posRate > 55 ? 'text-green-400' : posRate < 45 ? 'text-red-400' : 'text-gray-300'}`}>{posRate.toFixed(0)}% bull 1W</span>
                  </div>
                  <div className="flex gap-6 mt-1 text-xs">
                    <span className="text-gray-400">1W: <span className={`font-mono ${parseFloat(val.avg1WeekReturn) >= 0 ? 'text-green-300' : 'text-red-300'}`}>{val.avg1WeekReturn}</span></span>
                    <span className="text-gray-400">2W: <span className={`font-mono ${parseFloat(val.avg2WeekReturn) >= 0 ? 'text-green-300' : 'text-red-300'}`}>{val.avg2WeekReturn}</span></span>
                    <span className="text-gray-400">2W bull: <span className="font-mono text-white">{val.positive2WRate}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-blue-900/30 border border-blue-600/40 rounded-lg">
            <p className="text-blue-300 text-xs font-bold">VIX above 18 = Most bearish signal (41.3% bull 1W). VIX below 20 = Best recovery signal (63.2% bull 1W).</p>
          </div>
        </div>
      )}

      {activeSection === 'gap-dow' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-blue-500/20 space-y-4">
          <h3 className="text-white font-bold mb-1">📅 Opening Gap by Day of Week (2015–2026)</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2 pr-3">Day</th>
                <th className="text-right py-2 pr-3">Gap Up</th>
                <th className="text-right py-2 pr-3">Gap Down</th>
                <th className="text-right py-2 pr-3">↑Fill%</th>
                <th className="text-right py-2 pr-3">↓Fill%</th>
                <th className="text-right py-2 pr-3">Ret after↑</th>
                <th className="text-right py-2">Ret after↓</th>
              </tr>
            </thead>
            <tbody>
              {['Mon','Tue','Wed','Thu','Fri'].map(day => {
                const d = discoveries.C_gapByDow.data[day];
                if (!d) return null;
                return (
                  <tr key={day} className="border-b border-gray-700/50">
                    <td className="py-2 pr-3 font-bold text-white">{day}</td>
                    <td className="text-right text-green-400 font-mono pr-3">{d.gapUpRate}</td>
                    <td className="text-right text-red-400 font-mono pr-3">{d.gapDownRate}</td>
                    <td className={`text-right font-mono pr-3 ${parseFloat(d.gapUpFillSameDay) > 52 ? 'text-yellow-300' : 'text-gray-300'}`}>{d.gapUpFillSameDay}</td>
                    <td className={`text-right font-mono pr-3 ${parseFloat(d.gapDownFillSameDay) > 52 ? 'text-yellow-300' : 'text-gray-300'}`}>{d.gapDownFillSameDay}</td>
                    <td className={`text-right font-mono pr-3 ${parseFloat(d.avgDayReturnAfterGapUp) < 0 ? 'text-red-400' : 'text-green-400'}`}>{d.avgDayReturnAfterGapUp}</td>
                    <td className={`text-right font-mono ${parseFloat(d.avgDayReturnAfterGapDown) < 0 ? 'text-red-400' : 'text-green-400'}`}>{d.avgDayReturnAfterGapDown}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-green-900/30 border border-green-600/40 rounded-lg text-xs">
              <p className="text-green-300 font-bold">Tuesday Gap Down = BUY SIGNAL</p>
              <p className="text-green-200/80">Only 15.8% gap-down rate on expiry day. 55.1% fill same day. Best reversal entry.</p>
            </div>
            <div className="p-3 bg-red-900/30 border border-red-600/40 rounded-lg text-xs">
              <p className="text-red-300 font-bold">All Gap-Ups Drift Down Intraday</p>
              <p className="text-red-200/80">Avg intraday after gap-up is negative every day of week. Fade the open on gap-up days.</p>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'ib-breakouts' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-orange-500/20 space-y-4">
          <h3 className="text-white font-bold mb-1">🎯 Period C IB Breakout Rate by VIX (2,797 sessions)</h3>
          <div className="grid grid-cols-2 gap-4">
            {(['nifty','bank'] as const).map(sym => {
              const ibData = sym === 'nifty' ? discoveries.D_ibBreakouts.data.nifty : discoveries.D_ibBreakouts.data.bank;
              return (
                <div key={sym}>
                  <h4 className="text-white font-semibold text-sm mb-2">{sym === 'nifty' ? 'NIFTY 50' : 'NIFTY BANK'}</h4>
                  <div className="text-xs text-gray-400 mb-2">Overall: <span className="text-green-400">{ibData.periodC_BreaksUp} ↑</span> <span className="text-red-400">{ibData.periodC_BreaksDown} ↓</span></div>
                  <div className="space-y-1">
                    {VIX_ORDER.filter(k => ibData.byVixRegime[k]).map(k => {
                      const r = ibData.byVixRegime[k];
                      return (
                        <div key={k} className="p-2 bg-gray-700/40 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: VIX_COLORS[k] }} />
                              <span className="text-gray-300">{k}</span>
                            </div>
                            <span className="text-gray-500">IB: {r.avgIBWidth}</span>
                          </div>
                          <span className="text-green-400 font-mono mr-3">{r.periodC_BreaksUp} ↑</span>
                          <span className="text-red-400 font-mono">{r.periodC_BreaksDown} ↓</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-orange-900/30 border border-orange-600/40 rounded-lg text-xs">
            <p className="text-orange-300 font-bold">Period C breaks IB in only ~25% of sessions. Ultra-Low VIX IB is ~107 Nifty pts / ~340 Bank pts.</p>
            <p className="text-orange-200/80 mt-1">The 86.1% win rate is conditional on a breakout occurring — this is the base rate showing HOW OFTEN it happens.</p>
          </div>
        </div>
      )}

      {activeSection === 'weekend-gap' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-indigo-500/20 space-y-4">
          <h3 className="text-white font-bold mb-1">🌙 Weekend Gap Effect (514 Monday Opens, 2015–2026)</h3>
          <div className="grid grid-cols-2 gap-4">
            {(['nifty','bank'] as const).map(sym => {
              const d = sym === 'nifty' ? discoveries.E_weekendGap.data.nifty : discoveries.E_weekendGap.data.bank;
              return (
                <div key={sym} className="space-y-2">
                  <h4 className="text-white font-semibold text-sm">{sym === 'nifty' ? 'NIFTY' : 'BANK'}</h4>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="p-2 bg-green-900/30 rounded text-center"><span className="text-green-300 font-bold text-lg block">{d.gapUpRate}</span>Gap Up Mon</div>
                    <div className="p-2 bg-red-900/30 rounded text-center"><span className="text-red-300 font-bold text-lg block">{d.gapDownRate}</span>Gap Down Mon</div>
                  </div>
                  <div className="p-2 bg-green-900/20 border border-green-700/40 rounded text-xs">
                    <div className="text-green-300 font-semibold">After Bull Fri ({d.afterBullishFriday.sessions})</div>
                    <div className="text-white">{d.afterBullishFriday.gapUpNext} gap-up chance · avg: {d.afterBullishFriday.avgGap}</div>
                  </div>
                  <div className="p-2 bg-red-900/20 border border-red-700/40 rounded text-xs">
                    <div className="text-red-300 font-semibold">After Bear Fri ({d.afterBearishFriday.sessions})</div>
                    <div className="text-white">{d.afterBearishFriday.gapDownNext} gap-down chance · avg: {d.afterBearishFriday.avgGap}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-indigo-900/30 border border-indigo-600/40 rounded-lg text-xs">
            <p className="text-indigo-300 font-bold">Today is Friday. If close is bullish (+0.3%+): 59% Monday gap-up probability for Nifty.</p>
            <p className="text-indigo-200/80 mt-1">But Monday intraday return after gap-up is −0.03%. Fade the Monday morning gap-up by 10:15 AM.</p>
          </div>
        </div>
      )}

      {activeSection === 'seasonality' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-teal-500/20 space-y-4">
          <h3 className="text-white font-bold mb-1">🗓️ Monthly Seasonality (2015–2026)</h3>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(discoveries.F_seasonality.data).map(([month, d]) => {
              const bullRate = parseFloat(d.bullDayRate);
              const avgRet = parseFloat(d.avgDayReturn);
              const isSep = month === 'Sep';
              const color = bullRate > 50 ? 'green' : bullRate < 45 ? 'red' : 'yellow';
              return (
                <div key={month} className={`p-2 rounded-lg border text-xs ${isSep ? 'ring-2 ring-orange-400' : ''} ${color === 'green' ? 'bg-green-900/30 border-green-600/40' : color === 'red' ? 'bg-red-900/30 border-red-600/40' : 'bg-yellow-900/20 border-yellow-600/30'}`}>
                  <div className="font-bold text-white text-sm">{month}{isSep ? ' ←NOW' : ''}</div>
                  <div className={`font-mono ${color === 'green' ? 'text-green-300' : color === 'red' ? 'text-red-300' : 'text-yellow-300'}`}>{d.bullDayRate} bull</div>
                  <div className={`font-mono ${avgRet >= 0 ? 'text-green-400' : 'text-red-400'}`}>{d.avgDayReturn}</div>
                  <div className="text-gray-400">{d.avgDayRange} rng</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-green-900/30 border border-green-600/40 rounded"><span className="text-green-300 font-bold">April = Only Positive Month</span><br/><span className="text-green-200/80">+0.002% avg · 51.1% bull. Buy dips in April.</span></div>
            <div className="p-2 bg-red-900/30 border border-red-600/40 rounded"><span className="text-red-300 font-bold">Sep (NOW) = Bearish Month</span><br/><span className="text-red-200/80">43.4% bull day rate. Sell strength. Avoid naked calls.</span></div>
          </div>
        </div>
      )}

      {activeSection === 'vix-spikes' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-red-500/20 space-y-4">
          <h3 className="text-white font-bold mb-1">🚨 VIX Spike Events &gt;20% Single Day (2015–2026)</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-gray-700/50 rounded-lg"><div className="text-2xl font-bold text-white">{discoveries.G_vixSpikes.data.totalEvents}</div><div className="text-gray-400 text-xs">Events</div></div>
            <div className="p-3 bg-red-900/40 rounded-lg"><div className="text-2xl font-bold text-red-400">{discoveries.G_vixSpikes.data.avg3DayReturn}</div><div className="text-gray-400 text-xs">Avg 3-Day Ret</div></div>
            <div className="p-3 bg-blue-900/40 rounded-lg"><div className="text-2xl font-bold text-blue-400">{discoveries.G_vixSpikes.data.bounceRate3Day}</div><div className="text-gray-400 text-xs">3D Bounce Rate</div></div>
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {discoveries.G_vixSpikes.data.events.map((ev: any, i: number) => {
              const ret3d = parseFloat(ev.nifty3dRet);
              return (
                <div key={i} className={`p-2 rounded text-xs flex items-center gap-2 ${ret3d > 0 ? 'bg-green-900/20 border border-green-700/30' : 'bg-red-900/20 border border-red-700/30'}`}>
                  <span className="text-gray-300 font-mono w-20 flex-shrink-0">{ev.date}</span>
                  <span className="text-orange-300 flex-shrink-0">VIX: {ev.vixPrev}→{ev.vixNow}</span>
                  <span className={`font-mono ${parseFloat(ev.niftyDayRet) < 0 ? 'text-red-400' : 'text-green-400'}`}>{ev.niftyDayRet}</span>
                  <span className={`font-mono font-bold ml-auto ${ret3d > 0 ? 'text-green-400' : 'text-red-400'}`}>3D: {ev.nifty3dRet}</span>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-red-900/30 border border-red-600/40 rounded-lg text-xs">
            <p className="text-red-300 font-bold">Rule: 58.3% bounce BUT COVID/bear-market exceptions were -6% to -20%. Filter: if VIX keeps rising next day → stay short.</p>
          </div>
        </div>
      )}

      {activeSection === 'streaks' && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-purple-500/20 space-y-4">
          <h3 className="text-white font-bold mb-1">🔴 Low VIX (&lt;15) Consecutive Streak Analysis — 41 Events</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-gray-700/50 rounded-lg"><div className="text-2xl font-bold text-white">{discoveries.I_lowVixStreaks.data.totalStreaks}</div><div className="text-gray-400 text-xs">Streaks (≥5D)</div></div>
            <div className="p-3 bg-red-900/40 rounded-lg"><div className="text-2xl font-bold text-red-400">{discoveries.I_lowVixStreaks.data.avgBreakReturn}</div><div className="text-gray-400 text-xs">Avg Break Day</div></div>
            <div className="p-3 bg-red-900/40 rounded-lg"><div className="text-2xl font-bold text-red-400">{discoveries.I_lowVixStreaks.data.positiveBreakRate}</div><div className="text-gray-400 text-xs">Positive Rate</div></div>
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {discoveries.I_lowVixStreaks.data.streaks.map((s: any, i: number) => {
              const ret = parseFloat(s.breakDayReturn);
              return (
                <div key={i} className={`p-2 rounded text-xs flex items-center gap-2 ${ret >= 0 ? 'bg-green-900/20 border border-green-700/20' : 'bg-red-900/20 border border-red-700/20'}`}>
                  <span className="text-gray-300 font-mono w-20 flex-shrink-0">{s.start}</span>
                  <span className="text-blue-300">{s.days}d streak</span>
                  <span className="text-orange-300">VIX broke @ {s.vixAtBreak}</span>
                  <span className={`font-mono font-bold ml-auto ${ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.breakDayReturn}</span>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-purple-900/30 border border-purple-600/40 rounded-lg text-xs">
            <p className="text-purple-300 font-bold">🔑 Highest Confidence New Rule: VIX Streak Break = 78% Bearish (only 22% positive break day)</p>
            <p className="text-purple-200/80 mt-1">When VIX crosses above 15 after 5+ consecutive days below it: avg −0.59% on break day. Buy ATM puts immediately. Current VIX=12.31 → Streak continues → Stay bullish/neutral until VIX hits 15.</p>
          </div>
        </div>
      )}
    </div>
  );
};
