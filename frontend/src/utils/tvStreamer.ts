import { getBackendUrl, getWsUrls, onBackendChange, refreshBackendUrl } from './config';

export interface TVDataMessage {
  symbol: string;
  timeframe: string;
  isSnapshot?: boolean;
  candles: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  matrixHistory?: Record<string, any> | null;
}

type OnDataCallback = (data: TVDataMessage) => void;
type OnErrorCallback = (error: string) => void;
type OnStatusCallback = (status: 'connecting' | 'connected' | 'disconnected') => void;

class TVWebSocketStreamer {
  private ws: WebSocket | null = null;
  private url: string = '';
  private wsUrls: string[] = [];
  private currentUrlIndex: number = 0;
  private currentSubscription: { symbol: string; timeframe: string } | null = null;
  private onDataCallback: OnDataCallback | null = null;
  private onErrorCallback: OnErrorCallback | null = null;
  private onStatusCallback: OnStatusCallback | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private pollInterval: any = null;
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  constructor() {
    this.refreshWsUrls();
    // React immediately if backend tunnel URL changes in config
    onBackendChange(() => {
      console.log('[tvStreamer] Backend URL changed, refreshing connection...');
      this.refreshWsUrls();
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    });
  }

  private refreshWsUrls() {
    this.wsUrls = getWsUrls();
    if (this.currentUrlIndex >= this.wsUrls.length) {
      this.currentUrlIndex = 0;
    }
    this.url = this.wsUrls[this.currentUrlIndex] || '';
  }

  public setStatusListener(callback: OnStatusCallback) {
    this.onStatusCallback = callback;
    callback(this.status);
  }

  private setStatus(newStatus: 'connecting' | 'connected' | 'disconnected') {
    this.status = newStatus;
    if (this.onStatusCallback) {
      this.onStatusCallback(newStatus);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // Send application ping every 10 seconds to keep reverse proxy tunnel and backend alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (e) {}
      }
    }, 10000);
  }

  private connectTimeout: any = null;

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
  }

  private fetchHttpCandlesSnapshot(symbol: string, timeframe: string) {
    const apiBase = getBackendUrl();
    const candidateBases = [
      apiBase,
      (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:3002' : '',
      'https://skimmer-savage-dipped.ngrok-free.dev'
    ].filter(Boolean);

    const tryFetch = (index: number) => {
      if (index >= candidateBases.length) return;
      const base = candidateBases[index].replace(/\/$/, '');
      fetch(`${base}/api/chart/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.type === 'data' && this.onDataCallback) {
            this.onDataCallback(data);
            if (this.status !== 'connected') {
              this.setStatus('connected');
            }
          } else {
            tryFetch(index + 1);
          }
        })
        .catch(() => {
          tryFetch(index + 1);
        });
    };

    tryFetch(0);
  }

  public connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.refreshWsUrls();
    if (!this.url) {
      this.setStatus('disconnected');
      this.triggerReconnect();
      return;
    }

    // Clean up any stale connecting socket
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }

    this.setStatus('connecting');
    console.log(`Connecting to backend WebSocket at ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      // Enforce 4-second timeout on initial handshake to avoid getting stuck in CONNECTING
      if (this.connectTimeout) clearTimeout(this.connectTimeout);
      this.connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn(`[tvStreamer] WebSocket handshake timed out on ${this.url}. Trying next candidate...`);
          try { this.ws.close(); } catch (e) {}
          this.ws = null;
          this.triggerReconnect();
        }
      }, 4000);

      this.ws.onopen = () => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        console.log(`WebSocket connection established on ${this.url}`);
        this.setStatus('connected');
        this.startHeartbeat();
        
        // Resubscribe if we had an active subscription before disconnect
        if (this.currentSubscription) {
          this.sendSubscription(this.currentSubscription.symbol, this.currentSubscription.timeframe);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Fast heartbeat pong response from server
          if (payload.type === 'pong') {
            return;
          }

          if (payload.type === 'data') {
            if (this.onDataCallback) {
              this.onDataCallback(payload);
            }
            if (this.status !== 'connected') {
              this.setStatus('connected');
            }
          } else if (payload.type === 'error') {
            console.error('WebSocket Error message from server:', payload.message);
            if (this.onErrorCallback) {
              this.onErrorCallback(payload.message);
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log(`WebSocket connection closed (${this.url})`);
        this.stopHeartbeat();
        this.ws = null;
        this.triggerReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error on ' + this.url, err);
        this.stopHeartbeat();
        if (this.onErrorCallback) {
          this.onErrorCallback('WebSocket server connection error');
        }
        this.triggerReconnect();
      };
    } catch (err) {
      console.error('Failed to create WebSocket client:', err);
      this.stopHeartbeat();
      this.triggerReconnect();
    }
  }

  private triggerReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = window.setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        await refreshBackendUrl();
      } catch (e) {}
      this.refreshWsUrls();
      if (this.wsUrls.length > 0) {
        this.currentUrlIndex = (this.currentUrlIndex + 1) % this.wsUrls.length;
        this.url = this.wsUrls[this.currentUrlIndex];
      }
      console.log(`Attempting to reconnect with candidate #${this.currentUrlIndex}: ${this.url}...`);
      this.connect();
    }, 1500);
  }

  private sendSubscription(symbol: string, timeframe: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({
        type: 'subscribe',
        symbol,
        timeframe
      });
      this.ws.send(msg);
      console.log(`Sent subscription request for ${symbol} (${timeframe})`);
    } else {
      console.warn('Cannot send subscription, WebSocket not open. Fetching HTTP snapshot.');
      this.fetchHttpCandlesSnapshot(symbol, timeframe);
    }
  }

  public subscribe(
    symbol: string,
    timeframe: string,
    onData: OnDataCallback,
    onError?: OnErrorCallback
  ) {
    this.currentSubscription = { symbol, timeframe };
    this.onDataCallback = onData;
    if (onError) this.onErrorCallback = onError;

    // Instant HTTP snapshot fetch so chart renders in <100ms
    this.fetchHttpCandlesSnapshot(symbol, timeframe);

    this.connect();
    this.sendSubscription(symbol, timeframe);

    // Periodic HTTP fallback if WebSocket remains disconnected
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.pollInterval = window.setInterval(() => {
      if (this.currentSubscription && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
        this.fetchHttpCandlesSnapshot(this.currentSubscription.symbol, this.currentSubscription.timeframe);
      }
    }, 5000);
  }

  public unsubscribe() {
    this.currentSubscription = null;
    this.onDataCallback = null;
    this.onErrorCallback = null;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public disconnect() {
    this.unsubscribe();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.setStatus('disconnected');
  }
}

export const tvStreamer = new TVWebSocketStreamer();
export default tvStreamer;
