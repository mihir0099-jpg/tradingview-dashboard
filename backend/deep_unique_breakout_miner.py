import os, json

DAILY_DIR = 'backend/data/historical_daily'
files = [os.path.join(DAILY_DIR, f) for f in os.listdir(DAILY_DIR) if f.endswith('.json')]

results = {
    'setup1_funnel_squeeze': [], # 3-day funnel contraction
    'setup2_ema20_launchpad_bull': [], # 20 EMA touch + NR4 in uptrend
    'setup3_ema20_deathcoil_bear': [], # 20 EMA retest from below in downtrend
    'setup4_volume_dryup_expansion': [], # Vol falling 3 days straight + ATR coil
    'setup5_pressure_cooker_breakout': [] # 3 retests of resistance within 15 days
}

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
        
        # Ranges
        r1 = t1['h'] - t1['l']
        r2 = t2['h'] - t2['l']
        r3 = t3['h'] - t3['l']
        
        # 20-day ATR & Volume
        atr20 = sum(candles[j]['h'] - candles[j]['l'] for j in range(i-20, i)) / 20.0
        avg_vol20 = sum(candles[j]['v'] for j in range(i-20, i)) / 20.0
        if avg_vol20 <= 0 or atr20 <= 0:
            continue
            
        # 20 EMA & 50 SMA
        ema20 = sum(candles[j]['c'] for j in range(i-20, i)) / 20.0
        sma50 = sum(candles[j]['c'] for j in range(i-30, i)) / 30.0 if i >= 30 else ema20
        
        # Future 3-day and 5-day performance
        c_next3 = candles[min(i+3, len(candles)-1)]
        c_next5 = candles[min(i+5, len(candles)-1)]
        max_high_next5 = max(candles[j]['h'] for j in range(i, min(i+6, len(candles))))
        min_low_next5 = min(candles[j]['l'] for j in range(i, min(i+6, len(candles))))
        
        # -------------------------------------------------------------
        # SETUP 1: The Fractal Funnel Squeeze (r1 < r2 < r3 and r1 < 0.5*atr20)
        # -------------------------------------------------------------
        if r1 < r2 and r2 < r3 and r1 < 0.5 * atr20:
            # Breakout on Day T
            if c['h'] > t1['h'] and c['v'] > 1.2 * avg_vol20:
                entry = t1['h']
                sl = t1['l']
                risk = entry - sl
                gain5 = max_high_next5 - entry
                ret5 = ((c_next5['c'] - entry) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                results['setup1_funnel_squeeze'].append({
                    'sym': sym, 'dir': 'BULL', 'ret5': ret5, 'rr': rr,
                    'win_1to2': rr >= 2.0, 'win_1to1': rr >= 1.0, 'sl_hit': min_low_next5 < sl
                })
            elif c['l'] < t1['l'] and c['v'] > 1.2 * avg_vol20:
                entry = t1['l']
                sl = t1['h']
                risk = sl - entry
                gain5 = entry - min_low_next5
                ret5 = ((entry - c_next5['c']) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                results['setup1_funnel_squeeze'].append({
                    'sym': sym, 'dir': 'BEAR', 'ret5': ret5, 'rr': rr,
                    'win_1to2': rr >= 2.0, 'win_1to1': rr >= 1.0, 'sl_hit': max_high_next5 > sl
                })

        # -------------------------------------------------------------
        # SETUP 2: The 20 EMA Bull Launchpad (Uptrend + touch 20 EMA + NR4)
        # -------------------------------------------------------------
        is_uptrend = t1['c'] > ema20 and ema20 > sma50
        touched_ema20 = t1['l'] <= ema20 * 1.008 and t1['c'] >= ema20 * 0.995
        ranges_4 = [candles[j]['h'] - candles[j]['l'] for j in range(i-4, i)]
        is_nr4 = (r1 == min(ranges_4))
        
        if is_uptrend and touched_ema20 and is_nr4:
            if c['h'] > t1['h']:
                entry = t1['h']
                sl = min(t1['l'], ema20 * 0.99)
                risk = entry - sl
                gain5 = max_high_next5 - entry
                ret5 = ((c_next5['c'] - entry) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                results['setup2_ema20_launchpad_bull'].append({
                    'sym': sym, 'ret5': ret5, 'rr': rr,
                    'win_1to2': rr >= 2.0, 'win_1to1': rr >= 1.0, 'sl_hit': min_low_next5 < sl
                })

        # -------------------------------------------------------------
        # SETUP 3: The 20 EMA Bear Death-Coil (Downtrend + retest 20 EMA from below + NR4)
        # -------------------------------------------------------------
        is_downtrend = t1['c'] < ema20 and ema20 < sma50
        touched_ema20_bear = t1['h'] >= ema20 * 0.992 and t1['c'] <= ema20 * 1.005
        
        if is_downtrend and touched_ema20_bear and is_nr4:
            if c['l'] < t1['l']:
                entry = t1['l']
                sl = max(t1['h'], ema20 * 1.01)
                risk = sl - entry
                gain5 = entry - min_low_next5
                ret5 = ((entry - c_next5['c']) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                results['setup3_ema20_deathcoil_bear'].append({
                    'sym': sym, 'ret5': ret5, 'rr': rr,
                    'win_1to2': rr >= 2.0, 'win_1to1': rr >= 1.0, 'sl_hit': max_high_next5 > sl
                })

        # -------------------------------------------------------------
        # SETUP 4: 3-Day Volume Dry-Up Exhaustion (Vol T-1 < T-2 < T-3 and T-1 Vol < 0.6x avg)
        # -------------------------------------------------------------
        vol_dryup_3d = (t1['v'] < t2['v'] and t2['v'] < t3['v'] and t1['v'] < 0.6 * avg_vol20 and r1 < 0.6 * atr20)
        if vol_dryup_3d:
            if c['h'] > t1['h'] and c['v'] > 1.4 * avg_vol20:
                entry = t1['h']
                sl = t1['l']
                risk = entry - sl
                gain5 = max_high_next5 - entry
                ret5 = ((c_next5['c'] - entry) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                results['setup4_volume_dryup_expansion'].append({
                    'sym': sym, 'dir': 'BULL', 'ret5': ret5, 'rr': rr,
                    'win_1to2': rr >= 2.0, 'win_1to1': rr >= 1.0, 'sl_hit': min_low_next5 < sl
                })
            elif c['l'] < t1['l'] and c['v'] > 1.4 * avg_vol20:
                entry = t1['l']
                sl = t1['h']
                risk = sl - entry
                gain5 = entry - min_low_next5
                ret5 = ((entry - c_next5['c']) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                results['setup4_volume_dryup_expansion'].append({
                    'sym': sym, 'dir': 'BEAR', 'ret5': ret5, 'rr': rr,
                    'win_1to2': rr >= 2.0, 'win_1to1': rr >= 1.0, 'sl_hit': max_high_next5 > sl
                })

        # -------------------------------------------------------------
        # SETUP 5: Pressure Cooker (Ascending Coil at Horizontal Ceiling)
        # -------------------------------------------------------------
        # Resistance level defined by max high of last 15 days
        res15 = max(candles[j]['h'] for j in range(i-15, i-1))
        # Within 1% of resistance, but lows are rising over last 5 days
        at_ceiling = abs(t1['h'] - res15) / res15 < 0.012
        rising_lows = t1['l'] > t2['l'] and t2['l'] > t3['l']
        if at_ceiling and rising_lows and r1 < 0.65 * atr20:
            if c['h'] > res15 and c['v'] > 1.3 * avg_vol20:
                entry = res15
                sl = t1['l']
                risk = entry - sl
                gain5 = max_high_next5 - entry
                ret5 = ((c_next5['c'] - entry) / entry) * 100.0
                rr = gain5 / risk if risk > 0 else 0
                results['setup5_pressure_cooker_breakout'].append({
                    'sym': sym, 'ret5': ret5, 'rr': rr,
                    'win_1to2': rr >= 2.0, 'win_1to1': rr >= 1.0, 'sl_hit': min_low_next5 < sl
                })

summary = {}
for k, trades in results.items():
    if not trades:
        continue
    total = len(trades)
    win1to1 = sum(1 for t in trades if t['win_1to1'])
    win1to2 = sum(1 for t in trades if t['win_1to2'])
    sl_hits = sum(1 for t in trades if t['sl_hit'])
    avg_ret = sum(t['ret5'] for t in trades) / total
    avg_rr = sum(t['rr'] for t in trades) / total
    
    summary[k] = {
        'total_trades': total,
        'win_rate_1to1_pct': round((win1to1 / total) * 100, 1),
        'win_rate_1to2_pct': round((win1to2 / total) * 100, 1),
        'sl_hit_rate_pct': round((sl_hits / total) * 100, 1),
        'avg_5d_return_pct': round(avg_ret, 2),
        'avg_risk_reward': round(avg_rr, 2)
    }

print(json.dumps(summary, indent=2))
with open('backend/data/deep_unique_breakout_results.json', 'w') as f:
    json.dump(summary, f, indent=2)
