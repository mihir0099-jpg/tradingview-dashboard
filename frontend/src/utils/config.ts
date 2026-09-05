export function getBackendUrl(): string {
  // 1. Local development
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return (window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : '';
    }
    // 2. Hosted on GitHub Pages (*.github.io) -> Point to live Render backend
    if (window.location.hostname.endsWith('github.io')) {
      return 'https://tradingview-dashboard-1.onrender.com';
    }
    // 3. Render or any direct host
    return window.location.origin;
  }
  return '';
}

export function getWsUrls(): string[] {
  if (typeof window !== 'undefined') {
    // 1. Local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const targetHost = window.location.hostname + ':3002';
      return ['ws://' + targetHost + '/ws', 'ws://' + targetHost + '/'];
    }
    // 2. GitHub Pages -> Point to live Render secure WebSocket
    if (window.location.hostname.endsWith('github.io')) {
      const targetHost = 'tradingview-dashboard-1.onrender.com';
      return ['wss://' + targetHost + '/ws', 'wss://' + targetHost + '/'];
    }
    // 3. Render or any direct host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const targetHost = window.location.host;
    return [protocol + '//' + targetHost + '/ws', protocol + '//' + targetHost + '/'];
  }
  return [];
}
