let dynamicBackendUrl: string | null = null;
const urlListeners: Array<(url: string) => void> = [];

export const DEFAULT_PUBLIC_TUNNEL = 'https://skimmer-savage-dipped.ngrok-free.dev';

export function onBackendChange(listener: (url: string) => void) {
  urlListeners.push(listener);
}

function notifyListeners(url: string) {
  for (const listener of urlListeners) {
    try { listener(url); } catch (e) {}
  }
}

function isValidTunnelUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  if (clean.includes('api.trycloudflare.com')) return false;
  if (clean.includes('loca.lt')) return false;
  return true;
}

// Fetch live_backend.json to discover active tunnel without rebuilding
export async function refreshBackendUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // On localhost, do not override local port 3002 with remote tunnel
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }

  // 1. Try local relative live_backend.json
  try {
    const r = await fetch('./live_backend.json?_t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      if (data && isValidTunnelUrl(data.backendUrl)) {
        const url = data.backendUrl.trim().replace(/\/$/, '');
        if (url !== dynamicBackendUrl) {
          dynamicBackendUrl = url;
          try { localStorage.setItem('tradingview_backend_url', url); } catch (e) {}
          notifyListeners(url);
        }
        return url;
      }
    }
  } catch (e) {}

  // 2. Fallback to Hugging Face raw live_backend.json
  try {
    const r = await fetch('https://huggingface.co/spaces/mihir0099/tradingview-dashboard/raw/main/live_backend.json?_t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      if (data && isValidTunnelUrl(data.backendUrl)) {
        const url = data.backendUrl.trim().replace(/\/$/, '');
        if (url !== dynamicBackendUrl) {
          dynamicBackendUrl = url;
          try { localStorage.setItem('tradingview_backend_url', url); } catch (e) {}
          notifyListeners(url);
        }
        return url;
      }
    }
  } catch (e) {}

  return dynamicBackendUrl || DEFAULT_PUBLIC_TUNNEL;
}

// Immediately auto-fetch live_backend.json on page load to discover active tunnel without rebuilding
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem('tradingview_backend_url');
    if (isValidTunnelUrl(cached)) {
      dynamicBackendUrl = cached!.trim().replace(/\/$/, '');
    } else {
      localStorage.removeItem('tradingview_backend_url');
      dynamicBackendUrl = DEFAULT_PUBLIC_TUNNEL;
    }
  } catch (e) {
    dynamicBackendUrl = DEFAULT_PUBLIC_TUNNEL;
  }

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
        if (isValidTunnelUrl(clean)) {
          localStorage.setItem('tradingview_backend_url', clean);
          dynamicBackendUrl = clean;
          return clean;
        }
      }
    } catch (e) {}

    // 1. Localhost prioritized: when viewing locally, always hit localhost:3002
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Check if user explicitly set a custom local port or URL
      try {
        const stored = localStorage.getItem('tradingview_backend_url');
        if (stored && (stored.includes('localhost') || stored.includes('127.0.0.1'))) {
          return stored.trim().replace(/\/$/, '');
        }
      } catch (e) {}
      return 'http://localhost:3002';
    }

    // 2. Dynamically discovered backend from live_backend.json or localStorage
    if (dynamicBackendUrl && isValidTunnelUrl(dynamicBackendUrl)) {
      return dynamicBackendUrl.trim();
    }
    try {
      const storedBackend = localStorage.getItem('tradingview_backend_url');
      if (storedBackend && isValidTunnelUrl(storedBackend)) {
        dynamicBackendUrl = storedBackend.trim().replace(/\/$/, '');
        return dynamicBackendUrl;
      }
    } catch (e) {}

    // 3. Fallback to active ngrok public tunnel
    return DEFAULT_PUBLIC_TUNNEL;
  }
  return '';
}

export function setCustomBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim() || url === 'auto' || url === 'default') {
      localStorage.removeItem('tradingview_backend_url');
      dynamicBackendUrl = null;
    } else {
      let clean = url.trim().replace(/\/$/, '');
      if (clean === 'local') clean = 'http://localhost:3002';
      if (clean === 'ngrok') clean = DEFAULT_PUBLIC_TUNNEL;
      localStorage.setItem('tradingview_backend_url', clean);
      dynamicBackendUrl = clean;
      notifyListeners(clean);
    }
  }
}

export function getWsUrls(): string[] {
  if (typeof window !== 'undefined') {
    const urls: string[] = [];

    // 1. Local endpoints if running on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      urls.push('ws://localhost:3002/ws');
      urls.push('ws://127.0.0.1:3002/ws');
      urls.push('ws://localhost:3002/');
    }

    // 2. Currently resolved backendUrl
    const backendUrl = getBackendUrl();
    if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
      try {
        const parsed = new URL(backendUrl);
        const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        urls.push(wsProto + '//' + parsed.host + '/ws');
        urls.push(wsProto + '//' + parsed.host + '/');
      } catch (e) {}
    }

    // 3. Known active public tunnel fallback (works for external & local)
    urls.push('wss://skimmer-savage-dipped.ngrok-free.dev/ws');
    urls.push('wss://skimmer-savage-dipped.ngrok-free.dev/');

    // Deduplicate while preserving priority order
    return Array.from(new Set(urls.filter(Boolean)));
  }
  return [];
}
