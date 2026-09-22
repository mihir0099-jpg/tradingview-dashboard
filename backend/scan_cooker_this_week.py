import os, json

DAILY_DIR = 'backend/data/historical_daily'
files = [os.path.join(DAILY_DIR, f) for f in os.listdir(DAILY_DIR) if f.endswith('.json')]

bull_candidates = []
bear_candidates = []

for file_path in files:
    sym = os.path.basename(file_path).replace('.json', '')
    with open(file_path, 'r') as f:
        candles = json.load(f)
    if len(candles) < 30:
        continue
        
    c = candles[-1] # Friday
    t1 = candles[-2] # Thursday
    t2 = candles[-3] # Wednesday
    t3 = candles[-4] # Tuesday
    
    ranges_20 = [candles[j]['h'] - candles[j]['l'] for j in range(-21, -1)]
    atr20 = sum(ranges_20) / 20.0
    vols_20 = [candles[j]['v'] for j in range(-21, -1)]
    avg_vol20 = sum(vols_20) / 20.0 if sum(vols_20) > 0 else 1
    
    highs_15 = [candles[j]['h'] for j in range(-16, -1)]
    lows_15 = [candles[j]['l'] for j in range(-16, -1)]
    res15 = max(highs_15)
    floor15 = min(lows_15)
    
    r_fri = c['h'] - c['l']
    comp_pct = round((r_fri / atr20) * 100, 1)
    
    # 1. BULLISH PRESSURE COOKER
    dist_to_res = ((res15 - c['c']) / res15) * 100.0
    rising_lows = (c['l'] >= t1['l'] * 0.998) and (t1['l'] >= t2['l'] * 0.998)
    
    if dist_to_res <= 2.2 and dist_to_res >= -0.8 and rising_lows:
        tests = sum(1 for h in highs_15 if abs(h - res15) / res15 < 0.018)
        sl = round(min(c['l'], t1['l']), 2)
        risk = round(c['c'] - sl, 2)
        if risk > 0:
            target1 = round(c['c'] + (risk * 2), 2)
            target2 = round(c['c'] + (risk * 3), 2)
            bull_candidates.append({
                'sym': sym,
                'spot': c['c'],
                'res15': round(res15, 2),
                'dist_pct': round(dist_to_res, 2),
                'lows_staircase': str(round(t2['l'], 1)) + ' -> ' + str(round(t1['l'], 1)) + ' -> ' + str(round(c['l'], 1)),
                'comp_pct': comp_pct,
                'vol_ratio': round(c['v'] / avg_vol20, 1),
                'sl': sl,
                'target1': target1,
                'target2': target2,
                'tests': tests
            })
        
    # 2. BEARISH PRESSURE COOKER
    dist_to_floor = ((c['c'] - floor15) / floor15) * 100.0
    falling_highs = (c['h'] <= t1['h'] * 1.002) and (t1['h'] <= t2['h'] * 1.002)
    
    if dist_to_floor <= 2.2 and dist_to_floor >= -0.8 and falling_highs:
        tests = sum(1 for l in lows_15 if abs(l - floor15) / floor15 < 0.018)
        sl = round(max(c['h'], t1['h']), 2)
        risk = round(sl - c['c'], 2)
        if risk > 0:
            target1 = round(c['c'] - (risk * 2), 2)
            target2 = round(c['c'] - (risk * 3), 2)
            bear_candidates.append({
                'sym': sym,
                'spot': c['c'],
                'floor15': round(floor15, 2),
                'dist_pct': round(dist_to_floor, 2),
                'highs_staircase': str(round(t2['h'], 1)) + ' -> ' + str(round(t1['h'], 1)) + ' -> ' + str(round(c['h'], 1)),
                'comp_pct': comp_pct,
                'vol_ratio': round(c['v'] / avg_vol20, 1),
                'sl': sl,
                'target1': target1,
                'target2': target2,
                'tests': tests
            })

print('Found', len(bull_candidates), 'Bullish candidates')
print('Found', len(bear_candidates), 'Bearish candidates')

bull_candidates.sort(key=lambda x: abs(x['dist_pct']))
bear_candidates.sort(key=lambda x: abs(x['dist_pct']))

with open('backend/data/pressure_cooker_this_week.json', 'w') as f:
    json.dump({'bullish': bull_candidates[:8], 'bearish': bear_candidates[:8]}, f, indent=2)
print('Results saved to backend/data/pressure_cooker_this_week.json!')
