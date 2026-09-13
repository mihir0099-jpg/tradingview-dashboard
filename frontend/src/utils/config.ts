let dynamicBackendUrl: string | null = null;
const urlListeners: Array<(url: string) => void> = [];

export function onBackendChange(listener: (url: string) => void) {
  urlListeners.push(listener);
}

function notifyListeners(url: string) {
  for (const listener of urlListeners) {
    try { listener(url); } catch (e) {}
  }
}

// Fetch live_backend.json to discover active tunnel without rebuilding
export function refreshBackendUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  return fetch('./live_backend.json?_t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.backendUrl && typeof data.backendUrl === 'string') {
        const url = data.backendUrl.trim().replace(/\/$/, '');
        if (url && url !== dynamicBackendUrl) {
          dynamicBackendUrl = url;
          try {
            localStorage.setItem('tradingview_backend_url', url);
            console.log('[Auto-Discovery] Connected to live backend tunnel:', url);
          } catch (e) {}
          notifyListeners(url);
          return url;
        }
      }
      return dynamicBackendUrl;
    })
    .catch(() => dynamicBackendUrl);
}

// Immediately auto-fetch live_backend.json on page load to discover active tunnel without rebuilding
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem('tradingview_backend_url');
    if (cached) dynamicBackendUrl = cached.trim().replace(/\/$/, '');
  } catch (e) {}

  refreshBackendUrl();
  // Periodically refresh in background every 30 seconds
  setInterval(refreshBackendUrl, 30000);
}

export function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    // 0. Query parameter override (e.g. ?backend=https://...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramBackend = urlParams.get('backend');
      if (paramBackend && paramBackend.trim()) {
        const clean = paramBackend.trim().replace(/\/$/, '');
        localStorage.setItem('tradingview_backend_url', clean);
        dynamicBackendUrl = clean;
        return clean;
      }
    } catch (e) {}

    // 1. Dynamically discovered backend from live_backend.json or localStorage
    if (dynamicBackendUrl && dynamicBackendUrl.trim()) {
      return dynamicBackendUrl.trim();
    }
    try {
      const storedBackend = localStorage.getItem('tradingview_backend_url');
      if (storedBackend && storedBackend.trim()) {
        dynamicBackendUrl = storedBackend.trim().replace(/\/$/, '');
        return dynamicBackendUrl;
      }
    } catch (e) {}

    // 2. Local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return (window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : '';
    }

    // 3. Fallback direct host
    return window.location.origin;
  }
  return '';
}

export function setCustomBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('tradingview_backend_url');
      dynamicBackendUrl = null;
    } else {
      const clean = url.trim().replace(/\/$/, '');
      localStorage.setItem('tradingview_backend_url', clean);
      dynamicBackendUrl = clean;
      notifyListeners(clean);
    }
  }
}

export function getWsUrls(): string[] {
  if (typeof window !== 'undefined') {
    const backendUrl = getBackendUrl();
    if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
      try {
        const parsed = new URL(backendUrl);
        const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        return [wsProto + '//' + parsed.host + '/ws', wsProto + '//' + parsed.host + '/'];
      } catch (e) {}
    }

    // Local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const targetHost = window.location.hostname + ':3002';
      return ['ws://' + targetHost + '/ws', 'ws://' + targetHost + '/'];
    }

    // Fallback
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const targetHost = window.location.host;
    return [protocol + '//' + targetHost + '/ws', protocol + '//' + targetHost + '/'];
  }
  return [];
}
