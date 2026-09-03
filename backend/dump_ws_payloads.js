import WebSocket from 'ws';
import fs from 'fs';

const ws = new WebSocket('ws://localhost:3002');

ws.on('open', () => {
  console.log('Connected to server WebSocket');
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
      console.log('Received payload of count:', payload.candles.length);
      fs.writeFileSync('nifty_5min_candles.json', JSON.stringify(payload.candles, null, 2));
      console.log('Successfully wrote nifty_5min_candles.json');
      ws.close();
      process.exit(0);
    }
  } catch (err) {
    console.error('Error:', err);
  }
});

setTimeout(() => {
  console.log('Timeout');
  ws.close();
  process.exit(1);
}, 8000);
