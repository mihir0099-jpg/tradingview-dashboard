import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'data', 'zerodha_config.json');

class ZerodhaDataBridge {
  constructor() {
    this.config = {
      mode: 'enctoken',
      enctoken: '',
      apiKey: '',
      accessToken: '',
      clientId: '',
      userName: '',
      connected: false,
      lastVerified: null
    };
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        const saved = JSON.parse(raw);
        this.config = { ...this.config, ...saved };
        if (this.config.enctoken || (this.config.apiKey && this.config.accessToken)) {
          this.verifyConnection();
        }
      }
    } catch (err) {
      console.error('[Zerodha] Error reading config:', err.message);
    }
  }

  saveConfig() {
    try {
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('[Zerodha] Error saving config:', err.message);
    }
  }

  getHeaders() {
    if (this.config.mode === 'enctoken' && this.config.enctoken) {
      return {
        'Authorization': 'enctoken ' + this.config.enctoken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*'
      };
    } else if (this.config.mode === 'kiteconnect' && this.config.apiKey && this.config.accessToken) {
      return {
        'X-Kite-Version': '3',
        'Authorization': 'token ' + this.config.apiKey + ':' + this.config.accessToken,
        'Accept': 'application/json'
      };
    }
    return {};
  }

  async makeRequest(url) {
    const headers = this.getHeaders();
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ statusCode: res.statusCode, data });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(8000, () => {
        req.destroy();
        reject(new Error('Request timed out to Zerodha'));
      });
      req.end();
    });
  }

  async verifyConnection() {
    if (!this.config.enctoken && (!this.config.apiKey || !this.config.accessToken)) {
      this.config.connected = false;
      return false;
    }

    try {
      let url = 'https://kite.zerodha.com/oms/user/profile/full';
      if (this.config.mode === 'kiteconnect') {
        url = 'https://api.kite.trade/user/profile';
      }

      const res = await this.makeRequest(url);
      if (res.statusCode === 200 && res.data && res.data.status === 'success') {
        this.config.connected = true;
        this.config.clientId = res.data.data.user_id || res.data.data.user_name;
        this.config.userName = res.data.data.user_name || res.data.data.user_id;
        this.config.lastVerified = new Date().toISOString();
        this.saveConfig();
        console.log('[Zerodha Bridge] Successfully verified session for user: ' + this.config.userName + ' (' + this.config.clientId + ')');
        return true;
      } else {
        this.config.connected = false;
        console.warn('[Zerodha Bridge] Session token invalid or expired (Status ' + res.statusCode + ')');
        return false;
      }
    } catch (err) {
      this.config.connected = false;
      console.error('[Zerodha Bridge] Session verification failed:', err.message);
      return false;
    }
  }

  async setCredentials({ mode, enctoken, apiKey, accessToken }) {
    if (mode) this.config.mode = mode;
    if (enctoken) this.config.enctoken = enctoken.trim();
    if (apiKey) this.config.apiKey = apiKey.trim();
    if (accessToken) this.config.accessToken = accessToken.trim();

    const ok = await this.verifyConnection();
    return {
      success: ok,
      config: this.getStatus()
    };
  }

  async getQuotes(symbols = []) {
    if (!this.config.connected) {
      throw new Error('Zerodha is not connected. Please provide an active enctoken or Kite Connect API credentials.');
    }

    const queryParams = symbols.map(s => 'i=' + encodeURIComponent(s)).join('&');
    const url = 'https://kite.zerodha.com/oms/quote?' + queryParams;
    const res = await this.makeRequest(url);
    if (res.statusCode === 200 && res.data && res.data.status === 'success') {
      return res.data.data;
    }
    throw new Error(res.data && res.data.message ? res.data.message : 'Failed to fetch quotes from Zerodha');
  }

  async getHistoricalCandles(instrumentToken, interval = 'minute', from, to) {
    if (!this.config.connected) {
      throw new Error('Zerodha is not connected. Please provide an active enctoken.');
    }

    const url = 'https://kite.zerodha.com/oms/instruments/historical/' + instrumentToken + '/' + interval + '?from=' + from + '&to=' + to;
    const res = await this.makeRequest(url);
    if (res.statusCode === 200 && res.data && res.data.status === 'success') {
      return res.data.data.candles;
    }
    throw new Error(res.data && res.data.message ? res.data.message : 'Failed to fetch historical candles from Zerodha');
  }

  getStatus() {
    return {
      connected: this.config.connected,
      mode: this.config.mode,
      clientId: this.config.clientId,
      userName: this.config.userName,
      lastVerified: this.config.lastVerified,
      hasEnctoken: Boolean(this.config.enctoken),
      hasKiteConnect: Boolean(this.config.apiKey && this.config.accessToken)
    };
  }
}

const zerodhaBridge = new ZerodhaDataBridge();
export default zerodhaBridge;
