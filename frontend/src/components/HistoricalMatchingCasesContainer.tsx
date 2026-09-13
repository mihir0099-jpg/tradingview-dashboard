import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../utils/config';
import { RefreshCw, History, TrendingUp, Calendar, ArrowUpRight, Layers, ShieldCheck, Filter } from 'lucide-react';

interface CaseStudy {
  caseNumber: number;
  caseTitle: string;
  date: string;
  dayOfWeek: string;
  vix: number;
  vixRegime: string;
  isFriday: boolean;
  spotStats: {
    open: number;
    high: number;
    low: number;
    close: number;
    ibHigh: number;
    ibLow: number;
    ibRange: number;
  };
  whatHappened: {
    title: string;
    description: string;
    periodCBreakHigh: number;
    periodCClose: number;
    ibRange: number;
  };
  afternoonOutcome: {
    title: string;
    description: string;
    periodGClose: number | null;
    heldAboveIB: boolean;
    afternoonExtensionPts: number;
    closedInTopThird: boolean;
  };
  nextDayOutcome: {
    title: string;
    description: string;
    nextDayDate: string | null;
    gapPoints: number | null;
    intradayMovePoints: number | null;
    isGreenContinuation: boolean | null;
  };
}

interface HistoricalApiResponse {
  generatedAt: string;
  todaySession: {
    date: string;
    dayOfWeek: string;
    currentVix: number;
    vixRegime: string;
    spot: number;
    dayLow: number;
    ibHigh: number;
    ibLow: number;
    periodCBreakHigh: number;
    periodGStatus: string;
    setupMatchScore: string;
  };
  statistics: {
    totalMatchingCases: number;
    fridayMatchingCases: number;
    afternoonWinRatePct: number;
    avgAfternoonExtensionPts: number;
    nextDayGapUpProbabilityPct: number;
    avgNextDayGapPts: number;
    mondayGapUpProbabilityPct: number;
    avgMondayGapPts: number;
    nextDayContinuationPct: number;
    filteredTotal?: number;
  };
  cases: CaseStudy[];
}

export function HistoricalMatchingCasesContainer() {
  const [data, setData] = useState<HistoricalApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fridayOnly, setFridayOnly] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchCases = async (isFriday: boolean) => {
    try {
      setLoading(true);
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/historical/matching-cases?fridayOnly=${isFriday}&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch historical matching cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(fridayOnly);
  }, [fridayOnly]);

  const stats = data?.statistics;
  const today = data?.todaySession;

  const filteredCases = (data?.cases || []).filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.caseTitle.toLowerCase().includes(term) ||
      c.date.toLowerCase().includes(term) ||
      c.dayOfWeek.toLowerCase().includes(term) ||
      c.whatHappened.description.toLowerCase().includes(term) ||
      c.nextDayOutcome.description.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-primary)', height: '100%', overflowY: 'auto' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Historical Matching Clones
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  Same Day • Same VIX • Same Breakout
                </span>
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Multi-year backtest scans (2022–2026) for identical low-VIX Friday morning anchor setups & afternoon outcomes.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Friday Toggle Button */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={() => setFridayOnly(true)}
              style={{
                background: fridayOnly ? '#3b82f6' : 'transparent',
                color: fridayOnly ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={14} />
              Fridays Only ({data?.statistics?.fridayMatchingCases || 36})
            </button>
            <button
              onClick={() => setFridayOnly(false)}
              style={{
                background: !fridayOnly ? '#3b82f6' : 'transparent',
                color: !fridayOnly ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Layers size={14} />
              All Days ({data?.statistics?.totalMatchingCases || 49})
            </button>
          </div>

          <button
            onClick={() => fetchCases(fridayOnly)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Today Active Session Context Banner */}
      {today && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.35) 0%, rgba(17, 24, 39, 0.7) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#2563eb', color: '#fff', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                Active Market Profile
              </span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#60a5fa' }}>
                {today.dayOfWeek}, {today.date} • Current VIX: {today.currentVix}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                ⭐ {today.setupMatchScore}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px', paddingTop: '6px' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Spot / IB Range</div>
              <div style={{ fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
                {today.spot.toFixed(1)} <span style={{ color: '#94a3b8', fontSize: '12px' }}>(IB: {today.ibLow.toFixed(1)} - {today.ibHigh.toFixed(1)})</span>
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Period C Breakout</div>
              <div style={{ fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
                Cleared IB High to {today.periodCBreakHigh.toFixed(1)} (+11.0 pts)
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Period G Status (Lunchtime)</div>
              <div style={{ fontWeight: '700', color: '#60a5fa', marginTop: '2px' }}>
                {today.periodGStatus}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Statistics Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <span>Historical Sample Size</span>
              <Layers size={16} color="#60a5fa" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
              {stats.filteredTotal || stats.totalMatchingCases} <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>Sessions</span>
            </div>
            <div style={{ fontSize: '12px', color: '#60a5fa', marginTop: '4px' }}>
              Exact Low-VIX {fridayOnly ? 'Fridays' : 'Days'} with Period C Breakout
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#34d399', fontSize: '12px' }}>
              <span>Afternoon Win Rate (Closed Top 33%)</span>
              <TrendingUp size={16} color="#34d399" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>
              {stats.afternoonWinRatePct}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Avg Continuation: <strong style={{ color: '#f8fafc' }}>+{stats.avgAfternoonExtensionPts} pts</strong>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#60a5fa', fontSize: '12px' }}>
              <span>{fridayOnly ? 'Monday' : 'Next-Day'} Gap-Up Probability</span>
              <ArrowUpRight size={16} color="#60a5fa" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#60a5fa', marginTop: '6px' }}>
              {fridayOnly ? stats.mondayGapUpProbabilityPct : stats.nextDayGapUpProbabilityPct}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Avg Overnight Gap: <strong style={{ color: '#f8fafc' }}>+{fridayOnly ? stats.avgMondayGapPts : stats.avgNextDayGapPts} pts</strong>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#c084fc', fontSize: '12px' }}>
              <span>{fridayOnly ? 'Monday' : 'Next-Day'} Continuation Rate</span>
              <ShieldCheck size={16} color="#c084fc" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#c084fc', marginTop: '6px' }}>
              {stats.nextDayContinuationPct}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Next session closes higher than current day close
            </div>
          </div>

        </div>
      )}

      {/* Search Input Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Filter size={16} color="#94a3b8" />
        <input
          type="text"
          placeholder="Search historical cases by date (e.g. 19/6/2026), VIX, or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            width: '100%'
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Case Studies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <div>Scanning multi-year database for matching VIX and breakout profiles...</div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            No historical cases found matching current filters.
          </div>
        ) : (
          filteredCases.map((c) => (
            <div
              key={c.caseNumber}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                transition: 'border-color 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#3b82f6', color: '#ffffff', fontWeight: '800', fontSize: '12px', padding: '3px 8px', borderRadius: '4px' }}>
                    Case {c.caseNumber}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                    {c.dayOfWeek}, {c.date}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    India VIX: {c.vix} ({c.vixRegime})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: c.afternoonOutcome.closedInTopThird ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: c.afternoonOutcome.closedInTopThird ? '#34d399' : '#cbd5e1',
                    border: c.afternoonOutcome.closedInTopThird ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)'
                  }}>
                    PM Ext: +{c.afternoonOutcome.afternoonExtensionPts} pts
                  </span>
                  {c.nextDayOutcome.gapPoints !== null && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: c.nextDayOutcome.gapPoints > 0 ? 'rgba(59, 130, 246, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                      color: c.nextDayOutcome.gapPoints > 0 ? '#60a5fa' : '#f87171',
                      border: c.nextDayOutcome.gapPoints > 0 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      {c.isFriday ? 'Monday' : 'Next'} Gap: {c.nextDayOutcome.gapPoints > 0 ? (`+${c.nextDayOutcome.gapPoints}`) : c.nextDayOutcome.gapPoints} pts
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Step Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                
                {/* Section 1: Morning Action */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {c.whatHappened.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {c.whatHappened.description}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                      IB High: {c.spotStats.ibHigh.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                      IB Low: {c.spotStats.ibLow.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                      Range: {c.spotStats.ibRange.toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Section 2: Afternoon Outcome */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {c.afternoonOutcome.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {c.afternoonOutcome.description}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                    <span style={{ fontSize: '11px', background: c.afternoonOutcome.heldAboveIB ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', color: c.afternoonOutcome.heldAboveIB ? '#34d399' : '#f87171' }}>
                      {c.afternoonOutcome.heldAboveIB ? 'Period G: Filter Passed' : 'Period G: Inside IB'}
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                      Close: {c.spotStats.close.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Section 3: Next Day Outcome */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {c.nextDayOutcome.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {c.nextDayOutcome.description}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                    {c.nextDayOutcome.gapPoints !== null && (
                      <span style={{ fontSize: '11px', background: c.nextDayOutcome.gapPoints > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', color: c.nextDayOutcome.gapPoints > 0 ? '#34d399' : '#f87171' }}>
                        Gap: {c.nextDayOutcome.gapPoints > 0 ? (`+${c.nextDayOutcome.gapPoints}`) : c.nextDayOutcome.gapPoints} pts
                      </span>
                    )}
                    {c.nextDayOutcome.isGreenContinuation !== null && (
                      <span style={{ fontSize: '11px', background: c.nextDayOutcome.isGreenContinuation ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '4px', color: c.nextDayOutcome.isGreenContinuation ? '#60a5fa' : '#fbbf24' }}>
                        {c.nextDayOutcome.isGreenContinuation ? 'Continuation Win' : 'Range Retest'}
                      </span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
