const ACTIVE_LIVE_BACKEND = 'https://punk-successfully-profiles-anytime.trycloudflare.com';

export function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    // 0. Query parameter override (e.g. ?backend=https://...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramBackend = urlParams.get('backend');
      if (paramBackend && paramBackend.trim()) {
        const clean = paramBackend.trim().replace(/\/$/, '');
        localStorage.setItem('tradingview_backend_url', clean);
        return clean;
      }
    } catch (e) {}

    // 1. User configured custom backend in localStorage
    try {
      const storedBackend = localStorage.getItem('tradingview_backend_url');
      if (storedBackend && storedBackend.trim()) {
        return storedBackend.trim().replace(/\/$/, '');
      }
    } catch (e) {}

    // 2. Local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return (window.location.port && window.location.port !== '3002') ? 'http://localhost:3002' : '';
    }

    // 3. Hosted on Hugging Face Static (*.hf.space, huggingface.co) or GitHub Pages (*.github.io)
    if (
      window.location.hostname.endsWith('hf.space') ||
      window.location.hostname.includes('huggingface.co') ||
      window.location.hostname.endsWith('github.io')
    ) {
      return ACTIVE_LIVE_BACKEND;
    }

    // 4. Default direct host
    return window.location.origin;
  }
  return '';
}

export function setCustomBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('tradingview_backend_url');
    } else {
      localStorage.setItem('tradingview_backend_url', url.trim().replace(/\/$/, ''));
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
