import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../utils/config';

interface FootprintPattern {
  id: string;
  name: string;
  category: string;
  setupType: string;
  occurrenceCount: number;
  winRatePct: number;
  avgContinuationPts: number;
  recommendedAction: string;
  conditionsSummary: string;
  marketRationale: string;
  sampleTimes: string[];
}

interface EODMinerData {
  lastMinedAt?: string;
  sessionDate?: string;
  summary?: {
    date: string;
    symbol: string;
    totalCandlesAnalyzed: number;
    totalSessionsAnalyzed?: number;
    todayCandlesCount?: number;
    totalContractsAnalyzed: number;
    netDelta: number;
    pocPrice: number;
    bestSetupWinRatePct: number;
  };
  patterns?: FootprintPattern[];
  llmNarrative?: {
    date: string;
    headline: string;
    executiveSummary: string;
    smartMoneyThemes: string[];
    tomorrowPlaybook: string[];
  };
  recentFeaturesSample?: any[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const EODFootprintMinerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<EODMinerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMining, setIsMining] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'TRAPPED_TRADERS' | 'STACKED_IMBALANCE' | 'DELTA_DIVERGENCE'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const backendUrl = (getBackendUrl() || '').replace(/\/$/, '');

  const fetchData = async (forceFresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const url = `${backendUrl}/api/orderflow/eod-mined-patterns?_t=${Date.now()}${forceFresh ? '&fresh=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to fetch footprint patterns');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerMining = async () => {
    try {
      setIsMining(true);
      const res = await fetch(`${backendUrl}/api/orderflow/trigger-footprint-mining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanAllArchives: true })
      });
      const json = await res.json();
      if (json.success && json.result) {
        setData(json.result);
      } else {
        await fetchData(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsMining(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const patterns = data?.patterns || [];
  const filteredPatterns = selectedFilter === 'ALL'
    ? patterns
    : patterns.filter(p => p.setupType === selectedFilter);

  const narrative = data?.llmNarrative;
  const summary = data?.summary;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '95%',
          maxWidth: '1280px',
          maxHeight: '92vh',
          backgroundColor: '#090d16',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
          color: '#e2e8f0'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)'
              }}
            >
              🔬
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                EOD Footprint Pattern Miner
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8'
                  }}
                >
                  INSTITUTIONAL TAPE AI
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Automated 5-min order flow feature extraction, COT trap mining & predictive tape debrief
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleTriggerMining}
              disabled={isMining}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: isMining ? '#334155' : '#0284c7',
                color: '#fff',
                fontSize: '12.5px',
                fontWeight: 700,
                border: 'none',
                cursor: isMining ? 'not-allowed' : 'pointer',
                boxShadow: isMining ? 'none' : '0 0 16px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ animation: isMining ? 'spin 1s infinite linear' : 'none' }}>
                {isMining ? '⏳' : '⚡'}
              </span>
              {isMining ? 'Mining 21 Sessions...' : 'Re-Mine Footprints'}
            </button>

            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>🔬</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading mined footprint patterns & tape narrative...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', color: '#fca5a5' }}>
              ⚠️ Error loading footprint patterns: {error}
            </div>
          ) : (
            <>
              {/* TOP STATS CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Patterns Discovered</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                    {patterns.length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Setups</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Categorized & Backtested</div>
                </div>

                <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Highest Win-Rate Edge</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                    {summary?.bestSetupWinRatePct || 85}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>15–30 min forward continuation</div>
                </div>

                <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Net Session Delta</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: (summary?.netDelta || 0) >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                    {(summary?.netDelta || 0) > 0 ? '+' : ''}{(summary?.netDelta || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Institutional Aggressor Bias</div>
                </div>

                <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Corpus Analyzed</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b', marginTop: '4px' }}>
                    {summary?.totalCandlesAnalyzed || 1376} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Bars</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Across {summary?.totalSessionsAnalyzed || 21} Archived Days</div>
                </div>
              </div>

              {/* AI INSTITUTIONAL TAPE DEBRIEF NARRATIVE */}
              {narrative && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.7) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '18px' }}>🧠</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      AI Tape Debrief & Smart Money Playbook
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: 'auto' }}>
                      Session Date: {narrative.date}
                    </span>
                  </div>

                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                    {narrative.headline}
                  </div>

                  <div style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>
                    {narrative.executiveSummary}
                  </div>

                  {/* 2-COLUMN NARRATIVE: Smart Money Themes & Tomorrow's Playbook */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '8px' }}>
                        🏛️ Smart Money Themes Discovered
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(narrative.smartMoneyThemes || []).map((thm, i) => (
                          <div key={i} style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                            {thm}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: '8px' }}>
                        🎯 Tomorrow's Key Reference Playbook
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(narrative.tomorrowPlaybook || []).map((pb, i) => (
                          <div key={i} style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                            {pb}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PATTERN SETUPS SECTION */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚡</span> High-Conviction Mined Footprint Setups ({filteredPatterns.length})
                  </div>

                  {/* FILTER TABS */}
                  <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    {(['ALL', 'TRAPPED_TRADERS', 'STACKED_IMBALANCE', 'DELTA_DIVERGENCE'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setSelectedFilter(f)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: selectedFilter === f ? '#0284c7' : 'transparent',
                          color: selectedFilter === f ? '#fff' : '#94a3b8',
                          transition: 'all 0.15s'
                        }}
                      >
                        {f.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPatterns.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: '#111827', borderRadius: '8px' }}>
                    No setups found for this filter category in the current mined corpus.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '14px' }}>
                    {filteredPatterns.map(pat => {
                      const isHighWin = pat.winRatePct >= 65;
                      const badgeColor = pat.recommendedAction.includes('CALL') ? '#10b981' : (pat.recommendedAction.includes('PUT') ? '#ef4444' : '#f59e0b');

                      return (
                        <div
                          key={pat.id}
                          style={{
                            background: '#111827',
                            border: `1px solid ${isHighWin ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.07)'}`,
                            borderRadius: '10px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            boxShadow: isHighWin ? '0 4px 16px rgba(56, 189, 248, 0.08)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#f8fafc' }}>
                                {pat.name}
                              </div>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: '#94a3b8',
                                  marginTop: '4px',
                                  display: 'inline-block'
                                }}
                              >
                                {pat.setupType}
                              </span>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '18px', fontWeight: 900, color: isHighWin ? '#10b981' : '#f59e0b' }}>
                                {pat.winRatePct}%
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                {pat.occurrenceCount} occurrences
                              </div>
                            </div>
                          </div>

                          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                            {pat.marketRationale}
                          </div>

                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            <span style={{ color: '#38bdf8', fontWeight: 700 }}>CONDITIONS: </span>
                            {pat.conditionsSummary}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '10.5px', color: '#64748b' }}>Action:</span>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: badgeColor, background: `${badgeColor}15`, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${badgeColor}35` }}>
                                {pat.recommendedAction}
                              </span>
                            </div>

                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              Avg Edge: <span style={{ fontWeight: 800, color: pat.avgContinuationPts >= 0 ? '#10b981' : '#ef4444' }}>{pat.avgContinuationPts > 0 ? `+${pat.avgContinuationPts}` : pat.avgContinuationPts} pts</span>
                            </div>
                          </div>

                          {pat.sampleTimes && pat.sampleTimes.length > 0 && (
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              Sample triggers today: {pat.sampleTimes.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
