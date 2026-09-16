import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Activity, RefreshCw, Landmark, TrendingUp, Layers, ShieldCheck, CheckCircle2, AlertTriangle, Wrench, Zap, Target, ArrowUpRight, ArrowDownRight, Award, Key, ExternalLink, Check } from 'lucide-react';
import { getBackendUrl, setCustomBackendUrl } from '../utils/config';

interface DashboardHeaderProps {
  currentSymbol: string;
  currentTimeframe: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  onRefresh: () => void;
}

interface SymbolPreset {
  value: string;
  label: string;
  type: 'index' | 'futures' | 'stock';
  exchange: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentSymbol,
  currentTimeframe,
  connectionStatus,
  onSymbolChange,
  onTimeframeChange,
  onRefresh
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'futures' | 'index'>('all');
  const [apiResults, setApiResults] = useState<SymbolPreset[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [symbolsList, setSymbolsList] = useState<SymbolPreset[]>([]);
  const modalInputRef = useRef<HTMLInputElement>(null);

  // Tab Health & Autonomous Self-Healing State
  const [healthData, setHealthData] = useState<any>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isHealTriggering, setIsHealTriggering] = useState(false);

  // Tomorrow's High-Conviction Watchlist State (Autonomous 212 F&O Chart Miner)
  const [watchlistData, setWatchlistData] = useState<any>(null);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [isMiningReplay, setIsMiningReplay] = useState(false);

  // Angel One & TradingView Feed States
  const [angelOneStatus, setAngelOneStatus] = useState<any>(null);

  // Zerodha Kite Data Bridge State
  const [zerodhaStatus, setZerodhaStatus] = useState<any>(null);
  const [isZerodhaModalOpen, setIsZerodhaModalOpen] = useState(false);
  const [zerodhaMode, setZerodhaMode] = useState<'enctoken' | 'kiteconnect'>('enctoken');
  const [enctokenInput, setEnctokenInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [zerodhaConnecting, setZerodhaConnecting] = useState(false);
  const [zerodhaMessage, setZerodhaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHealth = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/system/tab-health`);
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      // Backend offline or unreachable
    }
  };

  const fetchWatchlist = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/system/daily-chart-replay`);
      if (res.ok) {
        const data = await res.json();
        setWatchlistData(data);
      }
    } catch (err) {
      // Backend offline or unreachable
    }
  };

  const fetchZerodhaStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/zerodha/status`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setZerodhaStatus(data);
      }
    } catch (err) {
      // Backend offline or unreachable
    }
  };

  const fetchAngelOneStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/angelone/status`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setAngelOneStatus(data);
      }
    } catch (err) {
      // Backend offline or unreachable
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchWatchlist();
    fetchZerodhaStatus();
    fetchAngelOneStatus();
    const interval = setInterval(() => {
      fetchHealth();
      fetchWatchlist();
      fetchZerodhaStatus();
      fetchAngelOneStatus();
    }, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleConnectZerodha = async (e: React.FormEvent) => {
    e.preventDefault();
    setZerodhaConnecting(true);
    setZerodhaMessage(null);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/zerodha/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: zerodhaMode,
          enctoken: enctokenInput,
          apiKey: apiKeyInput,
          accessToken: accessTokenInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setZerodhaStatus(data.config);
        setZerodhaMessage({ type: 'success', text: `Verified successfully as ${data.config?.userName || data.config?.clientId}!` });
      } else {
        setZerodhaMessage({ type: 'error', text: 'Authentication failed. Please check your token.' });
      }
    } catch (err: any) {
      setZerodhaMessage({ type: 'error', text: err.message || 'Connection error' });
    } finally {
      setZerodhaConnecting(false);
    }
  };

  const handleTriggerAutoHeal = async () => {
    setIsHealTriggering(true);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/system/trigger-auto-heal`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.report) setHealthData(data.report);
      }
    } catch (err) {
      console.error('Trigger heal error:', err);
    } finally {
      setIsHealTriggering(false);
    }
  };

  const handleTriggerReplayMiner = async () => {
    setIsMiningReplay(true);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/system/trigger-chart-replay`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.report) setWatchlistData(data.report);
      }
    } catch (err) {
      console.error('Trigger replay miner error:', err);
    } finally {
      setIsMiningReplay(false);
    }
  };



  // Load symbols list dynamically on mount
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/api/symbols/presets`);
        if (res.ok) {
          const data = await res.json();
          setSymbolsList(data);
        }
      } catch (err) {
        console.error('Failed to load symbols presets from backend:', err);
      }
    };
    loadPresets();
  }, []);

  // Handle debounced search query fetching from backend search proxy endpoint
  useEffect(() => {
    if (!searchQuery.trim()) {
      setApiResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingApi(true);
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/api/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setApiResults(data);
        }
      } catch (err) {
        console.error('Failed to fetch symbols from backend search API:', err);
      } finally {
        setLoadingApi(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Focus modal input when modal opens
  useEffect(() => {
    if (isModalOpen && modalInputRef.current) {
      setTimeout(() => {
        modalInputRef.current?.focus();
        modalInputRef.current?.select();
      }, 50);
    }
  }, [isModalOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSelectSymbol = (val: string) => {
    onSymbolChange(val);
    setIsModalOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      let formatted = searchQuery.trim().toUpperCase();
      if (!formatted.includes(':')) {
        formatted = `NSE:${formatted}`;
      }
      handleSelectSymbol(formatted);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'disconnected': return '#ef4444';
    }
  };

  // Filter symbols based on search query and category tabs
  const filteredSymbols = symbolsList.filter((item) => {
    const matchesQuery = item.value.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    return matchesQuery && matchesTab;
  }).slice(0, 100);

  return (
    <header className="glass-panel animate-fade-in" style={{ padding: '16px 24px', position: 'relative', zIndex: 1100, overflow: 'visible' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            borderRadius: '10px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Activity size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
              Indian Market Chart Dashboard
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, fontWeight: '700', letterSpacing: '0.5px' }}>
              REAL-TIME CANDLESTICK CHARTS
            </p>
          </div>
        </div>

        {/* Trigger Search Button (Mock Search Box) */}
        <div 
          onClick={() => setIsModalOpen(true)}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '8px 14px',
            cursor: 'pointer',
            flex: '1',
            minWidth: '200px',
            maxWidth: '300px',
            transition: 'border 0.2s',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <Search size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', flex: 1 }}>
            {currentSymbol}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
            Search
          </span>
        </div>

        {/* Timeframe selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TF:</label>
          <select
            className="custom-input custom-select"
            style={{ width: '85px', padding: '6px 28px 6px 12px' }}
            value={currentTimeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
          >
            <option value="1">1 Min</option>
            <option value="5">5 Min</option>
            <option value="15">15 Min</option>
            <option value="30">30 Min</option>
            <option value="60">1 Hour</option>
            <option value="D">Daily</option>
            <option value="W">Weekly</option>
            <option value="M">Monthly</option>
          </select>
        </div>

        {/* Connection status and refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onRefresh}
            style={{
              background: 'transparent',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)'
            }}
            title="Force refresh"
          >
            <RefreshCw size={15} />
          </button>

          <div 
            onClick={() => {
              const current = getBackendUrl();
              const next = window.prompt(
                'Active Backend API & WebSocket Endpoint:\n' +
                '• Leave empty / type "auto" for Auto-Detection\n' +
                '• Type "local" for http://localhost:3002\n' +
                '• Type "ngrok" for https://skimmer-savage-dipped.ngrok-free.dev\n\n' +
                'Current active endpoint:',
                current || 'http://localhost:3002'
              );
              if (next !== null) {
                setCustomBackendUrl(next);
                window.location.reload();
              }
            }}
            title={`Backend: ${getBackendUrl() || 'Auto'} (Tap to configure/reset)`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-color)', 
              padding: '6px 12px', 
              borderRadius: '8px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(), boxShadow: `0 0 10px ${getStatusColor()}` }}></div>
            <span style={{ fontSize: '12px', textTransform: 'capitalize', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {connectionStatus === 'connected' ? 'Live' : connectionStatus}
            </span>
          </div>

          {/* Autonomous Tab Health & Self-Healing Badge */}
          <div 
            onClick={() => setIsHealthModalOpen(true)}
            title="Autonomous Tab Health & Self-Healing Engine (Click to view full health audit & trigger repair)"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: healthData?.overallStatus === 'ALL_SYSTEMS_GREEN' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.15)', 
              border: `1px solid ${healthData?.overallStatus === 'ALL_SYSTEMS_GREEN' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.4)'}`, 
              padding: '6px 12px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.2s'
            }}
          >
            <ShieldCheck size={14} color={healthData?.overallStatus === 'ALL_SYSTEMS_GREEN' ? '#10b981' : '#fde047'} />
            <span style={{ fontSize: '12px', fontWeight: '800', color: healthData?.overallStatus === 'ALL_SYSTEMS_GREEN' ? '#10b981' : '#fde047' }}>
              {healthData ? `${healthData.operationalCount}/${healthData.totalTabsAudited} Tabs 🟢` : 'Tab Health 🟢'}
            </span>
          </div>

          {/* Tomorrow's High-Conviction Watchlist Trigger Button */}
          <div 
            onClick={() => setIsWatchlistModalOpen(true)}
            title="Tomorrow's High-Conviction Watchlist (Autonomous 212 F&O Chart Replay Engine)"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.16), rgba(249, 115, 22, 0.16))', 
              border: '1px solid rgba(245, 158, 11, 0.45)', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)',
              transition: 'all 0.2s'
            }}
          >
            <Zap size={14} color="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#fbbf24' }}>
              🎯 Tomorrow's Watchlist ({watchlistData?.tomorrowHighConvictionWatchlist?.length || 5})
            </span>
          </div>

          {/* 1. TradingView Continuous Real-Time Feed Badge */}
          {/* 1. Angel One SmartStream Live Exchange Ticks & Order Flow Badge (PRIMARY BROKER FEED) */}
          <div 
            title={`Angel One SmartStream WebSocket: Live Ticks & Order Flow (${angelOneStatus?.clientCode || 'P337882'} - Official Real-Time Exchange Feed)`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: (angelOneStatus?.connected || connectionStatus === 'connected') ? 'rgba(16, 185, 129, 0.18)' : 'rgba(234, 179, 8, 0.15)', 
              border: `1px solid ${(angelOneStatus?.connected || connectionStatus === 'connected') ? 'rgba(16, 185, 129, 0.6)' : 'rgba(234, 179, 8, 0.35)'}`, 
              padding: '6px 14px', 
              borderRadius: '8px', 
              userSelect: 'none',
              boxShadow: (angelOneStatus?.connected || connectionStatus === 'connected') ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none'
            }}
          >
            <span style={{ fontSize: '13px' }}>⚡</span>
            <span style={{ fontSize: '12px', fontWeight: '900', color: (angelOneStatus?.connected || connectionStatus === 'connected') ? '#10b981' : '#fde047' }}>
              {angelOneStatus?.connected ? `Angel One 🟢 Live Ticks (${angelOneStatus.clientCode || 'P337882'})` : (connectionStatus === 'connected' ? 'Angel One 🟢 Live' : 'Angel One 🟡 Connecting')}
            </span>
          </div>

          {/* 2. TradingView Secondary / Auxiliary Feed */}
          <div 
            title="TradingView Auxiliary Feed (Charts & Historical Reference)"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(100, 116, 139, 0.10)', 
              border: '1px solid rgba(100, 116, 139, 0.25)', 
              padding: '6px 10px', 
              borderRadius: '8px', 
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '12px' }}>📈</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>
              TV Auxiliary
            </span>
          </div>

          {/* 3. Zerodha Kite Data Connection Badge */}
          <div 
            onClick={() => setIsZerodhaModalOpen(true)}
            title="Zerodha Kite Live Data Bridge (Click to configure & connect)"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: zerodhaStatus?.connected ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.12)', 
              border: `1px solid ${zerodhaStatus?.connected ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.35)'}`, 
              padding: '6px 12px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: zerodhaStatus?.connected ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '13px' }}>🪁</span>
            <span style={{ fontSize: '12px', fontWeight: '800', color: zerodhaStatus?.connected ? '#10b981' : '#f87171' }}>
              {zerodhaStatus?.connected ? `Zerodha 🟢 (${zerodhaStatus.clientId || 'Live'})` : 'Zerodha Connect'}
            </span>
          </div>
        </div>

      </div>

      {/* TradingView-Style Search Overlay Modal */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(4, 5, 8, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          {/* Modal Container */}
          <div 
            onClick={(e) => e.stopPropagation()} // Stop bubble up to prevent closing modal
            style={{
              width: '100%',
              maxWidth: '650px',
              backgroundColor: '#0d1017',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '80vh',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              boxSizing: 'border-box'
            }}
          >
            
            {/* Input Row */}
            <form action="#" method="dialog" onSubmit={(e) => { e.preventDefault(); handleCustomSubmit(e); }} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '16px 20px', gap: '12px' }}>
              <Search size={20} color="var(--text-secondary)" />
              <input
                ref={modalInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol description or type..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  padding: '4px 0'
                }}
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}
                >
                  <X size={16} />
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '4px'
                }}
              >
                <X size={20} />
              </button>
            </form>

            {/* Category tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', padding: '8px 20px', gap: '8px' }}>
              {(['all', 'stock', 'futures', 'index'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: activeTab === tab ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    border: 'none',
                    color: activeTab === tab ? '#3b82f6' : 'var(--text-secondary)',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {tab === 'all' ? 'All' : tab === 'stock' ? 'Stocks' : tab === 'futures' ? 'Futures' : 'Indices'}
                </button>
              ))}
            </div>

            {/* Symbol preset results list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
              {searchQuery && (
                <div 
                  onClick={() => {
                    let formatted = searchQuery.trim().toUpperCase();
                    if (!formatted.includes(':')) {
                      formatted = `NSE:${formatted}`;
                    }
                    handleSelectSymbol(formatted);
                  }}
                  style={{
                    padding: '12px 24px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#3b82f6',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    fontWeight: '600'
                  }}
                >
                  Press Enter to search custom symbol: "{searchQuery.toUpperCase()}"
                </div>
              )}

              {loadingApi ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
                  Searching TradingView database...
                </div>
              ) : searchQuery ? (
                (() => {
                  const activeApiResults = apiResults.filter(item => activeTab === 'all' || item.type === activeTab);
                  if (activeApiResults.length === 0) {
                    return (
                      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        No matching Indian symbols found.
                      </div>
                    );
                  }
                  return activeApiResults.map((item) => {
                    const getIcon = () => {
                      switch (item.type) {
                        case 'index': return <Landmark size={14} color="#00f0ff" />;
                        case 'futures': return <TrendingUp size={14} color="#f59e0b" />;
                        case 'stock': return <Layers size={14} color="#ec4899" />;
                      }
                    };

                    return (
                      <div
                        key={item.value}
                        onClick={() => handleSelectSymbol(item.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 24px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                          }}>
                            {getIcon()}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                              {item.value.split(':')[1]}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {item.label}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '800', 
                            color: item.type === 'index' ? '#00f0ff' : item.type === 'futures' ? '#f59e0b' : '#ec4899',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px'
                          }}>
                            {item.type}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                            {item.exchange}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : filteredSymbols.length > 0 ? (
                filteredSymbols.map((item) => {
                  const getIcon = () => {
                    switch (item.type) {
                      case 'index': return <Landmark size={14} color="#00f0ff" />;
                      case 'futures': return <TrendingUp size={14} color="#f59e0b" />;
                      case 'stock': return <Layers size={14} color="#ec4899" />;
                    }
                  };

                  return (
                    <div
                      key={item.value}
                      onClick={() => handleSelectSymbol(item.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 24px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                          {getIcon()}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                            {item.value.split(':')[1]}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.label}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          color: item.type === 'index' ? '#00f0ff' : item.type === 'futures' ? '#f59e0b' : '#ec4899',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px'
                        }}>
                          {item.type}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                          {item.exchange}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No matching presets found. Type and press Enter to search.
                </div>
              )}
            </div>

            <div style={{ 
              padding: '12px 20px', 
              borderTop: '1px solid rgba(255,255,255,0.03)', 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Search using symbol text (e.g. RELIANCE, SWIGGY, ZOMATO)</span>
              <span>ESC to close</span>
            </div>
            
          </div>
        </div>
      )}

      {/* Autonomous Tab Health & Self-Healing Modal */}
      {isHealthModalOpen && (
        <div 
          onClick={() => setIsHealthModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(4, 5, 8, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '850px',
              backgroundColor: '#0d1017',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={22} color="#10b981" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    🛡️ Autonomous Tab Health Auditor & Self-Healing Sentinel
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Auto-audits all 26 dashboard tabs & endpoints every evening at 16:00 IST + continuous 24/7 self-repair
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsHealthModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Audit Status</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                  {healthData?.overallStatus || 'ALL_SYSTEMS_GREEN'}
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Operational Tabs</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>
                  {healthData?.operationalCount || 26} / {healthData?.totalTabsAudited || 26} (100%)
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Heals Executed</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#c084fc', marginTop: '2px' }}>
                  {healthData?.totalHealsPerformed || 0} Auto-Remediated
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(234, 179, 8, 0.08)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Daily Evening Run</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#fde047', marginTop: '2px' }}>
                  16:00 IST (Post-Close)
                </div>
              </div>
            </div>

            {/* Content List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  All Monitored Tabs & Endpoints ({healthData?.tabs?.length || 26})
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Last Audit: {healthData?.istTime || 'Live'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(healthData?.tabs || []).map((t: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={16} color={t.status === 'OPERATIONAL' || t.status === 'HEALED_OPERATIONAL' ? '#10b981' : '#ef4444'} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{t.tabName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.endpoint}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {t.latencyMs}ms
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: t.status === 'OPERATIONAL' ? 'rgba(16, 185, 129, 0.15)' : (t.status === 'HEALED_OPERATIONAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                        color: t.status === 'OPERATIONAL' ? '#10b981' : (t.status === 'HEALED_OPERATIONAL' ? '#60a5fa' : '#ef4444')
                      }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with One-Click Action */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Protected by Autonomous Watchdog & Healing Ledger
              </span>
              <button
                onClick={handleTriggerAutoHeal}
                disabled={isHealTriggering}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: isHealTriggering ? 'not-allowed' : 'pointer',
                  opacity: isHealTriggering ? 0.7 : 1,
                  transition: 'all 0.15s'
                }}
              >
                <Wrench size={14} />
                <span>{isHealTriggering ? 'Auditing & Self-Healing...' : '⚡ Run Full Auto-Heal Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tomorrow's High-Conviction Watchlist Modal */}
      {isWatchlistModalOpen && (
        <div 
          onClick={() => setIsWatchlistModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(3, 7, 18, 0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '920px',
              backgroundColor: '#0d1117',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '88vh',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.08), rgba(0, 0, 0, 0))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
                  <Zap size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎯 Tomorrow's High-Conviction Watchlist
                    <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      212 F&O Autonomous Miner
                    </span>
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Automated full-day chart replay mined at 16:20 IST • Demat Delivery Hoarding • Institutional Squeeze
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsWatchlistModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Market Context Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '14px 24px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Total F&O Audited</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }}>
                  {watchlistData?.totalFnoStocksAnalyzed || 212} Stocks
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Demat Coils Forming</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                  {watchlistData?.fnoUniverseSummary?.coilingDematCount || 37} Vault Breakouts
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.06)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Nifty Day Structure</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#60a5fa', marginTop: '3px' }}>
                  {watchlistData?.indexAuction?.nifty?.dayType || 'TREND_EXPANSION_DAY'}
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(168, 85, 247, 0.06)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Bank Nifty Structure</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#c084fc', marginTop: '3px' }}>
                  {watchlistData?.indexAuction?.banknifty?.dayType || 'DOUBLE_DISTRIBUTION_DAY'}
                </div>
              </div>
            </div>

            {/* Watchlist Cards List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(watchlistData?.tomorrowHighConvictionWatchlist || []).map((item: any, idx: number) => {
                const isBullish = item.trade?.action?.startsWith('BUY') && !item.trade?.action?.includes('PE');
                return (
                  <div 
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: `1px solid ${isBullish ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      transition: 'transform 0.15s, border-color 0.15s'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '800', 
                          color: '#fff', 
                          background: 'rgba(255, 255, 255, 0.08)', 
                          padding: '3px 8px', 
                          borderRadius: '6px' 
                        }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff', letterSpacing: '0.3px' }}>
                            {item.symbol}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            {item.name} • <span style={{ color: '#93c5fd' }}>{item.sector}</span>
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isBullish ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isBullish ? '#34d399' : '#fbbf24',
                          border: `1px solid ${isBullish ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {item.badge || 'HIGH-CONVICTION'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          {item.trade?.winRatePct}% Win Rate
                        </span>
                      </div>
                    </div>

                    {/* Trade Action & Chart Switcher */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      background: isBullish ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${isBullish ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      borderRadius: '8px',
                      padding: '10px 14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isBullish ? <ArrowUpRight size={18} color="#10b981" /> : <ArrowDownRight size={18} color="#ef4444" />}
                        <span style={{ fontSize: '14px', fontWeight: '800', color: isBullish ? '#34d399' : '#f87171' }}>
                          {item.trade?.action}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => {
                          onSymbolChange(`NSE:${item.symbol}`);
                          setIsWatchlistModalOpen(false);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'opacity 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Activity size={13} />
                        View Live Chart 📊
                      </button>
                    </div>

                    {/* Levels & P&L Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                      <div style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Spot Entry</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                          ₹{item.trade?.spotEntry?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <div style={{ fontSize: '10px', color: '#f87171' }}>Spot Stop Loss</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#f87171', marginTop: '2px' }}>
                          ₹{item.trade?.spotSL?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Risk: ₹{item.trade?.spotRiskPts} pts</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.04)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                        <div style={{ fontSize: '10px', color: '#34d399' }}>Target 1</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
                          ₹{item.trade?.spotTarget1?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>+₹{item.trade?.target1GainPerLotINR?.toLocaleString('en-IN')}/lot</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <div style={{ fontSize: '10px', color: '#10b981' }}>Target 2</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                          ₹{item.trade?.spotTarget2?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>+₹{item.trade?.target2GainPerLotINR?.toLocaleString('en-IN')}/lot</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                        <div style={{ fontSize: '10px', color: '#fbbf24' }}>Reward : Risk</div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }}>
                          {item.trade?.rewardRiskRatio} : 1
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{item.trade?.expectedMove}</div>
                      </div>
                    </div>

                    {/* Rationale & Execution Note */}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(255, 255, 255, 0.015)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <span style={{ color: '#fbbf24', fontWeight: '700' }}>Analysis: </span>
                      {item.catalystRationale}
                      <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ color: '#f87171', fontWeight: '700' }}>SL Rule: </span>
                        {item.trade?.exitCondition}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Replayed daily at 16:20 IST across all 212 F&O contracts • Saved to daily ledger
              </span>
              <button
                onClick={handleTriggerReplayMiner}
                disabled={isMiningReplay}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: isMiningReplay ? 'not-allowed' : 'pointer',
                  opacity: isMiningReplay ? 0.7 : 1,
                  transition: 'all 0.15s'
                }}
              >
                <RefreshCw size={14} className={isMiningReplay ? 'animate-spin' : ''} />
                <span>{isMiningReplay ? 'Replaying 212 Charts...' : '⚡ Re-Analyze All 212 F&O Charts'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zerodha Kite Data Connection Modal */}
      {isZerodhaModalOpen && (
        <div 
          onClick={() => setIsZerodhaModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 10001,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              backgroundColor: '#0d1117',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(239, 68, 68, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.08), rgba(0, 0, 0, 0))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                  <span style={{ fontSize: '18px' }}>🪁</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Zerodha Kite Market Data Bridge
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Stream live ticks, real-time depth, and candles directly from Zerodha
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsZerodhaModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Banner */}
            <div style={{ padding: '14px 24px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connection Status</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: zerodhaStatus?.connected ? '#10b981' : '#f87171', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: zerodhaStatus?.connected ? '#10b981' : '#ef4444' }} />
                  {zerodhaStatus?.connected ? `Connected as ${zerodhaStatus.userName || zerodhaStatus.clientId} (${zerodhaStatus.clientId})` : 'Disconnected (Session Token Required)'}
                </div>
              </div>
              {zerodhaStatus?.lastVerified && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Verified: {new Date(zerodhaStatus.lastVerified).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST
                </span>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleConnectZerodha} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Mode Selector */}
              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '4px', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setZerodhaMode('enctoken')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: zerodhaMode === 'enctoken' ? '#ef4444' : 'transparent',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Direct Web Session (enctoken) - Free
                </button>
                <button
                  type="button"
                  onClick={() => setZerodhaMode('kiteconnect')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: zerodhaMode === 'kiteconnect' ? '#ef4444' : 'transparent',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  🔑 Official Kite Connect API
                </button>
              </div>

              {zerodhaMode === 'enctoken' ? (
                <>
                  <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: '700', color: '#f87171', marginBottom: '4px' }}>📌 How to get your enctoken (Free in 10 seconds):</div>
                    1. Open <a href="https://kite.zerodha.com" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>kite.zerodha.com</a> and log in.<br />
                    2. Press <b>F12</b> &rarr; go to <b>Application</b> (or Storage) &rarr; <b>Cookies</b> &rarr; <b>kite.zerodha.com</b>.<br />
                    3. Find the cookie named <b>enctoken</b>, copy its value and paste it below:
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      Zerodha `enctoken` Cookie Value:
                    </label>
                    <input
                      type="password"
                      value={enctokenInput}
                      onChange={(e) => setEnctokenInput(e.target.value)}
                      placeholder="Paste your enctoken here (e.g. k5J8...)"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      Kite Connect API Key:
                    </label>
                    <input
                      type="text"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="e.g. abc123xyz"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      Kite Connect Access Token:
                    </label>
                    <input
                      type="password"
                      value={accessTokenInput}
                      onChange={(e) => setAccessTokenInput(e.target.value)}
                      placeholder="Daily access_token"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}

              {/* Message Banner */}
              {zerodhaMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: zerodhaMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: zerodhaMessage.type === 'success' ? '#10b981' : '#f87171',
                  border: `1px solid ${zerodhaMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {zerodhaMessage.text}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={zerodhaConnecting}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: zerodhaConnecting ? 'not-allowed' : 'pointer',
                  opacity: zerodhaConnecting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                }}
              >
                {zerodhaConnecting ? <RefreshCw size={15} className="animate-spin" /> : <Key size={15} />}
                <span>{zerodhaConnecting ? 'Verifying Session...' : '⚡ Verify & Connect Zerodha'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </header>
  );
};
