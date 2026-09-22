import urllib.request, json, datetime

url = 'https://query1.finance.yahoo.com/v8/finance/chart/TIMEX.NS?interval=5m&range=5d'
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
res = json.loads(urllib.request.urlopen(req, timeout=5).read())
r = res['chart']['result'][0]
ts = r.get('timestamp', [])
quote = r['indicators']['quote'][0]
closes = quote.get('close', [])
opens = quote.get('open', [])
highs = quote.get('high', [])
lows = quote.get('low', [])
vols = quote.get('volume', [])

friday_candles = []
for i, t in enumerate(ts):
    if i >= len(closes) or closes[i] is None or opens[i] is None:
        continue
    dt = datetime.datetime.fromtimestamp(t, tz=datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
    if dt.weekday() == 4:
        friday_candles.append({
            'time': dt.strftime('%H:%M'),
            'open': opens[i],
            'high': highs[i] if highs[i] is not None else closes[i],
            'low': lows[i] if lows[i] is not None else closes[i],
            'close': closes[i],
            'vol': vols[i] or 0
        })

print('Total 5m candles on Friday:', len(friday_candles))
sorted_by_vol = sorted(friday_candles, key=lambda x: x['vol'], reverse=True)
print('Top 8 Volume Spikes on Friday:')
for c in sorted_by_vol[:8]:
    pct = ((c['close'] - c['open']) / c['open']) * 100
    print(c['time'], 'Vol:', c['vol'], 'O:', round(c['open'], 1), '-> C:', round(c['close'], 1), f'({pct:+.2f}%)', 'H:', round(c['high'], 1), 'L:', round(c['low'], 1))

print('Chronological Progression (Every 30 mins):')
for i, c in enumerate(friday_candles):
    if i % 6 == 0 or i == len(friday_candles) - 1:
        cum_vol = sum(x['vol'] for x in friday_candles[:i+1])
        pct = ((c['close'] - friday_candles[0]['open']) / friday_candles[0]['open']) * 100
        print(c['time'], 'Price:', round(c['close'], 1), f'({pct:+.2f}%)', '5m Vol:', c['vol'], 'Cumul Vol:', cum_vol)
