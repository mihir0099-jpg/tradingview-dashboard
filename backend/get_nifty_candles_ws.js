import WebSocket from 'ws';
import fs from 'fs';

const ws = new WebSocket('ws://localhost:3002');

ws.on('open', () => {
  console.log('Connected to server WebSocket');
  // Subscribe to NSE:NIFTY with timeframe 5
  ws.send(JSON.stringify({
    type: 'subscribe',
    symbol: 'NSE:NIFTY',
    timeframe: '5'
  }));
});

ws.on('message', (data) => {
  try {
    const payload = JSON.parse(data.toString());
    if (payload.type === 'data' && payload.isSnapshot) {
      console.log(`Received historical snapshot candles: ${payload.candles.length}`);
      fs.writeFileSync('nifty_5min_candles.json', JSON.stringify(payload.candles, null, 2));
      ws.close();
      process.exit(0);
    }
  } catch (err) {
    console.error('Error parsing msg:', err);
  }
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('Timeout waiting for snapshot');
  ws.close();
  process.exit(1);
}, 10000);
