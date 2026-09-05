import { getBackendUrl, getWsUrls } from './config';

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
  private reconnectTimeout: number | null = null;
  private pollInterval: number | null = null;
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  constructor() {
    this.wsUrls = getWsUrls();
    this.url = this.wsUrls[0] || '';
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

  private fetchHttpCandlesSnapshot(symbol: string, timeframe: string) {
    const apiBase = getBackendUrl();

    fetch(`${apiBase}/api/chart/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.type === 'data' && this.onDataCallback) {
          this.onDataCallback(data);
          if (this.status === 'connecting') {
            this.setStatus('connected');
          }
        }
      })
      .catch(() => {});
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    console.log(`Connecting to backend WebSocket at ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log(`WebSocket connection established on ${this.url}`);
        this.setStatus('connected');
        
        // Resubscribe if we had an active subscription before disconnect
        if (this.currentSubscription) {
          this.sendSubscription(this.currentSubscription.symbol, this.currentSubscription.timeframe);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'data') {
            if (this.onDataCallback) {
              this.onDataCallback(payload);
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
        this.setStatus('disconnected');
        this.ws = null;
        this.triggerReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        this.setStatus('disconnected');
        if (this.onErrorCallback) {
          this.onErrorCallback('WebSocket server connection error');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket client:', err);
      this.setStatus('disconnected');
      this.triggerReconnect();
    }
  }

  private triggerReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      // Alternate between /ws and /
      this.currentUrlIndex = (this.currentUrlIndex + 1) % this.wsUrls.length;
      this.url = this.wsUrls[this.currentUrlIndex];
      console.log(`Attempting to reconnect with ${this.url}...`);
      this.connect();
    }, 3000);
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
