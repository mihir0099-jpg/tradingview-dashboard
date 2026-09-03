import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Activity, RefreshCw, Landmark, TrendingUp, Layers } from 'lucide-react';

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

  const [isAdmin, setIsAdmin] = useState(false);
  const [visitorData, setVisitorData] = useState<any>(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam === '1234') {
      localStorage.setItem('admin_pin', '1234');
      setIsAdmin(true);
    } else if (localStorage.getItem('admin_pin') === '1234') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchVisitors = async () => {
      try {
        const backendUrl = (window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : window.location.origin;
        const res = await fetch(`${backendUrl}/api/admin/visitors?pin=1234`);
        if (res.ok) {
          const data = await res.json();
          setVisitorData(data);
        }
      } catch (e) {}
    };
    fetchVisitors();
    const timer = setInterval(fetchVisitors, 3000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  // Load symbols list dynamically on mount
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const backendUrl = (window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : window.location.origin;
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
        const backendUrl = (window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : window.location.origin;
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

          {!isAdmin ? (
            <button
              onClick={() => setShowPinPrompt(true)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Unlock Admin Visitor Radar"
            >
              🔒 Admin
            </button>
          ) : (
            <div 
              onClick={() => setShowVisitorModal(!showVisitorModal)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'rgba(16, 185, 129, 0.15)', 
                border: '1px solid rgba(16, 185, 129, 0.4)', 
                padding: '6px 12px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)'
              }}
              title="Click to view live visitors"
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#86efac', fontFamily: 'monospace' }}>
                👥 {visitorData?.totalOnline || 1} LIVE VISITORS
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(), boxShadow: `0 0 10px ${getStatusColor()}` }}></div>
            <span style={{ fontSize: '12px', textTransform: 'capitalize', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {connectionStatus === 'connected' ? 'Live' : connectionStatus}
            </span>
          </div>
        </div>

      </div>

      {/* Secret Admin Visitor Radar Modal */}
      {isAdmin && showVisitorModal && (
        <div 
          onClick={() => setShowVisitorModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '90%', maxWidth: '540px', background: '#0b0f19', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🔒</span>
                <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '900' }}>
                  SECRET ADMIN LIVE VISITOR RADAR
                </h3>
              </div>
              <button onClick={() => setShowVisitorModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ margin: '16px 0', fontSize: '13px', color: '#86efac', fontWeight: '900', display: 'flex', justifyContent: 'space-between' }}>
              <span>CURRENTLY ONLINE: {visitorData?.totalOnline || 1} USER(S)</span>
              <span style={{ color: '#cbd5e1', fontSize: '11px', fontFamily: 'monospace' }}>🕒 {visitorData?.timestamp} IST</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {visitorData?.visitors?.map((v: any, idx: number) => (
                <div key={idx} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
                      📍 {v.country} ({v.device})
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                      IP: {v.ip} | Page: {v.url}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '800', fontFamily: 'monospace' }}>
                    Active {v.lastActiveTime}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
              🔒 100% Private to Admin. Only visible on your device via PIN 1234.
            </div>
          </div>
        </div>
      )}

      {/* Secret PIN Entry Prompt Modal */}
      {showPinPrompt && (
        <div 
          onClick={() => setShowPinPrompt(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '90%', maxWidth: '400px', background: '#0b0f19', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '900' }}>
                🔒 Enter Secret Admin PIN
              </h3>
              <button onClick={() => setShowPinPrompt(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (pinInput === '1234') {
                  localStorage.setItem('admin_pin', '1234');
                  setIsAdmin(true);
                  setShowPinPrompt(false);
                } else {
                  alert('Invalid Secret PIN!');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}
            >
              <input 
                type="password"
                placeholder="Enter Secret PIN (e.g. 1234)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
              />

              <button 
                type="submit"
                style={{ padding: '12px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: '900', fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >
                🔓 Unlock Admin Visitor Radar
              </button>
            </form>
          </div>
        </div>
      )}

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
            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '16px 20px', gap: '12px' }}>
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

      {/* Embedded fadeIn keyframe styling */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </header>
  );
};
