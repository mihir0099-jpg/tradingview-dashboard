import os, json

DAILY_DIR = 'backend/data/historical_daily'
files = [os.path.join(DAILY_DIR, f) for f in os.listdir(DAILY_DIR) if f.endswith('.json')]

bear_cooker_trades = []
spring_coil_trades = []

for file_path in files:
    sym = os.path.basename(file_path).replace('.json', '')
    with open(file_path, 'r') as f:
        candles = json.load(f)
    if len(candles) < 60:
        continue
        
    for i in range(30, len(candles) - 5):
        c = candles[i]
        t1 = candles[i-1]
        t2 = candles[i-2]
        t3 = candles[i-3]
        
        r1 = t1['h'] - t1['l']
        atr20 = sum(candles[j]['h'] - candles[j]['l'] for j in range(i-20, i)) / 20.0
        avg_vol20 = sum(candles[j]['v'] for j in range(i-20, i)) / 20.0
        if avg_vol20 <= 0 or atr20 <= 0:
            continue
            
        c_next5 = candles[min(i+5, len(candles)-1)]
        min_low_next5 = min(candles[j]['l'] for j in range(i, min(i+6, len(candles))))
        max_high_next5 = max(candles[j]['h'] for j in range(i, min(i+6, len(candles))))
        
        # 1. BEAR PRESSURE COOKER (Descending Floor Pressure)
        floor15 = min(candles[j]['l'] for j in range(i-15, i-1))
        at_floor = abs(t1['l'] - floor15) / floor15 < 0.012
        falling_highs = t1['h'] < t2['h'] and t2['h'] < t3['h']
        if at_floor and falling_highs and r1 < 0.65 * atr20:
            if c['l'] < floor15 and c['v'] > 1.3 * avg_vol20:
                entry = floor15
                sl = t1['h']
                risk = sl - entry
                gain5 = entry - min_low_next5
                ret5 = ((entry - c_next5['c']) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                bear_cooker_trades.append({
                    'sym': sym, 'ret5': ret5, 'rr': rr,
                    'win_1to1': rr >= 1.0, 'win_1to2': rr >= 2.0, 'sl_hit': max_high_next5 > sl
                })
                
        # 2. SPRING COIL (Sweep of 15d Low + Close above + Next day breakout)
        swept_low = t1['l'] < floor15 and t1['c'] > floor15
        if swept_low and c['h'] > t1['h'] and c['v'] > 1.2 * avg_vol20:
            entry = t1['h']
            sl = t1['l']
            risk = entry - sl
            gain5 = max_high_next5 - entry
            ret5 = ((c_next5['c'] - entry) / entry) * 100.0
            rr = gain5 / risk if risk > 0 else 0
            spring_coil_trades.append({
                'sym': sym, 'ret5': ret5, 'rr': rr,
                'win_1to1': rr >= 1.0, 'win_1to2': rr >= 2.0, 'sl_hit': min_low_next5 < sl
            })

def summarize(name, trades):
    if not trades:
        return
    tot = len(trades)
    w1 = sum(1 for t in trades if t['win_1to1'])
    w2 = sum(1 for t in trades if t['win_1to2'])
    sl = sum(1 for t in trades if t['sl_hit'])
    avg_r = sum(t['ret5'] for t in trades) / tot
    avg_rr = sum(t['rr'] for t in trades) / tot
    print(f'{name}:')
    print(f'  Total Trades: {tot}')
    print(f'  1:1 Win Rate: {w1/tot*100:.1f}%')
    print(f'  1:2 Win Rate: {w2/tot*100:.1f}%')
    print(f'  SL Hit Rate: {sl/tot*100:.1f}%')
    print(f'  Avg 5d Return: {avg_r:.2f}%')
    print(f'  Avg Max R:R: {avg_rr:.2f}R')

summarize('BEAR PRESSURE COOKER (Descending Floor Breakdown)', bear_cooker_trades)
summarize('SPRING COIL REVERSAL (Liquidity Sweep + Reversal Drive)', spring_coil_trades)
