import os, json, datetime
from collections import defaultdict

DAILY_DIR = 'backend/data/historical_daily'
files = [os.path.join(DAILY_DIR, f) for f in os.listdir(DAILY_DIR) if f.endswith('.json')]

stock_records = defaultdict(lambda: {'bull_trades': [], 'bear_trades': []})

# Granular metrics aggregators
dow_stats = defaultdict(lambda: {'bull_count': 0, 'bear_count': 0, 'bull_wins': 0, 'bear_wins': 0})
gap_stats = []
wick_stats = []
vol_ratio_stats = []
atr_comp_stats = []
runway_stats = defaultdict(list) # Day 1, Day 2, Day 3, Day 5 returns

for file_path in files:
    sym = os.path.basename(file_path).replace('.json', '')
    with open(file_path, 'r') as f:
        candles = json.load(f)
    if len(candles) < 60:
        continue
        
    for i in range(25, len(candles) - 6):
        c = candles[i]     # Breakout day T
        t1 = candles[i-1]   # Day T-1 (Squeeze day)
        t2 = candles[i-2]   # Day T-2
        t3 = candles[i-3]   # Day T-3
        
        # Ranges & Shadows
        r1 = t1['h'] - t1['l']
        if r1 <= 0:
            continue
        body1 = abs(t1['c'] - t1['o'])
        lower_wick1 = min(t1['o'], t1['c']) - t1['l']
        upper_wick1 = t1['h'] - max(t1['o'], t1['c'])
        lower_wick_ratio1 = lower_wick1 / r1
        upper_wick_ratio1 = upper_wick1 / r1
        
        # 20-day ATR & Volume
        atr20 = sum(candles[j]['h'] - candles[j]['l'] for j in range(i-20, i)) / 20.0
        avg_vol20 = sum(candles[j]['v'] for j in range(i-20, i)) / 20.0
        if avg_vol20 <= 0 or atr20 <= 0:
            continue
            
        comp1 = r1 / atr20
        vol_dryup1 = t1['v'] / avg_vol20
        vol_jump = c['v'] / t1['v'] if t1['v'] > 0 else 1
        vol_to_avg = c['v'] / avg_vol20
        
        # Gap on Day T
        gap_pct = ((c['o'] - t1['c']) / t1['c']) * 100.0
        
        # Day of week (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri)
        dt = datetime.datetime.fromtimestamp(c['t'], tz=datetime.timezone.utc)
        dow = dt.strftime('%A')
        
        # 15-day Resistance & Support
        res15 = max(candles[j]['h'] for j in range(i-15, i-1))
        floor15 = min(candles[j]['l'] for j in range(i-15, i-1))
        
        # Next days forward returns
        ret_day1 = ((c['c'] - t1['h']) / t1['h']) * 100.0
        ret_day2 = ((candles[i+1]['c'] - t1['h']) / t1['h']) * 100.0
        ret_day3 = ((candles[i+2]['c'] - t1['h']) / t1['h']) * 100.0
        ret_day5 = ((candles[i+4]['c'] - t1['h']) / t1['h']) * 100.0
        max_high_5d = max(candles[j]['h'] for j in range(i, i+5))
        min_low_5d = min(candles[j]['l'] for j in range(i, i+5))
        
        # -------------------------------------------------------------
        # BULLISH PRESSURE COOKER MICRO-CRITERIA
        # -------------------------------------------------------------
        at_ceiling = abs(t1['h'] - res15) / res15 < 0.015
        rising_lows = (t1['l'] >= t2['l'] * 0.997) and (t2['l'] >= t3['l'] * 0.997)
        
        if at_ceiling and rising_lows and comp1 < 0.70:
            if c['h'] > res15: # Breakout triggered
                entry = res15
                sl = t1['l']
                risk = entry - sl
                max_gain5 = max_high_5d - entry
                rr = max_gain5 / risk if risk > 0 else 0
                win = rr >= 1.5
                
                trade = {
                    'sym': sym, 'date': dt.strftime('%Y-%m-%d'), 'dow': dow,
                    'spot': entry, 'risk_pct': (risk / entry) * 100.0,
                    'comp': comp1, 'vol_dryup': vol_dryup1, 'vol_jump': vol_jump,
                    'gap_pct': gap_pct, 'lower_wick_ratio': lower_wick_ratio1,
                    'ret1': ret_day1, 'ret2': ret_day2, 'ret3': ret_day3, 'ret5': ret_day5,
                    'max_gain_pct': (max_gain5 / entry) * 100.0, 'rr': rr, 'win': win
                }
                stock_records[sym]['bull_trades'].append(trade)
                dow_stats[dow]['bull_count'] += 1
                if win: dow_stats[dow]['bull_wins'] += 1
                gap_stats.append((gap_pct, win, ret_day3))
                wick_stats.append((lower_wick_ratio1, win))
                vol_ratio_stats.append((vol_jump, win))
                atr_comp_stats.append((comp1, win))
                if win:
                    runway_stats['bull_d1'].append(ret_day1)
                    runway_stats['bull_d2'].append(ret_day2)
                    runway_stats['bull_d3'].append(ret_day3)
                    runway_stats['bull_d5'].append(ret_day5)

        # -------------------------------------------------------------
        # BEARISH PRESSURE COOKER MICRO-CRITERIA
        # -------------------------------------------------------------
        at_floor = abs(t1['l'] - floor15) / floor15 < 0.015
        falling_highs = (t1['h'] <= t2['h'] * 1.003) and (t2['h'] <= t3['h'] * 1.003)
        
        if at_floor and falling_highs and comp1 < 0.70:
            if c['l'] < floor15: # Breakdown triggered
                entry = floor15
                sl = t1['h']
                risk = sl - entry
                max_gain5 = entry - min_low_5d
                rr = max_gain5 / risk if risk > 0 else 0
                win = rr >= 1.5
                
                bear_ret_day1 = ((entry - c['c']) / entry) * 100.0
                bear_ret_day2 = ((entry - candles[i+1]['c']) / entry) * 100.0
                bear_ret_day3 = ((entry - candles[i+2]['c']) / entry) * 100.0
                bear_ret_day5 = ((entry - candles[i+4]['c']) / entry) * 100.0
                
                trade = {
                    'sym': sym, 'date': dt.strftime('%Y-%m-%d'), 'dow': dow,
                    'spot': entry, 'risk_pct': (risk / entry) * 100.0,
                    'comp': comp1, 'upper_wick_ratio': upper_wick_ratio1,
                    'gap_pct': gap_pct, 'rr': rr, 'win': win
                }
                stock_records[sym]['bear_trades'].append(trade)
                dow_stats[dow]['bear_count'] += 1
                if win: dow_stats[dow]['bear_wins'] += 1
                if win:
                    runway_stats['bear_d1'].append(bear_ret_day1)
                    runway_stats['bear_d2'].append(bear_ret_day2)
                    runway_stats['bear_d3'].append(bear_ret_day3)
                    runway_stats['bear_d5'].append(bear_ret_day5)

# Calculate stock-by-stock rankings
stock_leaderboard = []
for sym, d in stock_records.items():
    bt = d['bull_trades']
    brt = d['bear_trades']
    tot_trades = len(bt) + len(brt)
    if tot_trades >= 4:
        wins = sum(1 for t in bt if t['win']) + sum(1 for t in brt if t['win'])
        win_rate = (wins / tot_trades) * 100.0
        avg_rr = (sum(t['rr'] for t in bt) + sum(t['rr'] for t in brt)) / tot_trades
        avg_gain = sum(t.get('max_gain_pct', 0) for t in bt) / (len(bt) or 1)
        stock_leaderboard.append({
            'symbol': sym, 'total': tot_trades, 'wins': wins,
            'win_rate': round(win_rate, 1), 'avg_rr': round(avg_rr, 2),
            'avg_gain_pct': round(avg_gain, 2),
            'bull_count': len(bt), 'bear_count': len(brt)
        })

stock_leaderboard.sort(key=lambda x: (x['win_rate'], x['total']), reverse=True)

# Granular Insights
print('--- TOP 15 STOCKS FOR THIS STRATEGY ---')
for s in stock_leaderboard[:15]:
    print(s)

# Day of week breakdown
print("\n--- DAY OF WEEK BREAKDOWN ---")
dow_summary = {}
for d, st in dow_stats.items():
    tot = st['bull_count'] + st['bear_count']
    wins = st['bull_wins'] + st['bear_wins']
    wr = (wins / tot * 100.0) if tot > 0 else 0
    dow_summary[d] = {'total': tot, 'win_rate': round(wr, 1), 'bulls': st['bull_count'], 'bears': st['bear_count']}
    print(d, dow_summary[d])

# Multi-day runway progression
print("\n--- MULTI-DAY RUNWAY GAINS ---")
runway_summary = {
    'bull_d1_avg': round(sum(runway_stats['bull_d1']) / len(runway_stats['bull_d1']), 2) if runway_stats['bull_d1'] else 0,
    'bull_d2_avg': round(sum(runway_stats['bull_d2']) / len(runway_stats['bull_d2']), 2) if runway_stats['bull_d2'] else 0,
    'bull_d3_avg': round(sum(runway_stats['bull_d3']) / len(runway_stats['bull_d3']), 2) if runway_stats['bull_d3'] else 0,
    'bull_d5_avg': round(sum(runway_stats['bull_d5']) / len(runway_stats['bull_d5']), 2) if runway_stats['bull_d5'] else 0,
    'bear_d1_avg': round(sum(runway_stats['bear_d1']) / len(runway_stats['bear_d1']), 2) if runway_stats['bear_d1'] else 0,
    'bear_d2_avg': round(sum(runway_stats['bear_d2']) / len(runway_stats['bear_d2']), 2) if runway_stats['bear_d2'] else 0,
    'bear_d3_avg': round(sum(runway_stats['bear_d3']) / len(runway_stats['bear_d3']), 2) if runway_stats['bear_d3'] else 0,
    'bear_d5_avg': round(sum(runway_stats['bear_d5']) / len(runway_stats['bear_d5']), 2) if runway_stats['bear_d5'] else 0
}
print(runway_summary)

# Gap filter findings
gap_healthy = [g for g in gap_stats if 0.0 <= g[0] <= 1.5]
gap_large = [g for g in gap_stats if g[0] > 2.0]
print(f"\nHealthy Gap (0% to +1.5%): Win Rate = {sum(1 for g in gap_healthy if g[1])/len(gap_healthy)*100:.1f}% (n={len(gap_healthy)})")
print(f"Exhaustion Gap (> +2.0%): Win Rate = {sum(1 for g in gap_large if g[1])/len(gap_large)*100:.1f}% (n={len(gap_large)})")

# Lower Wick (Absorption) findings
wick_absorbed = [w for w in wick_stats if w[0] >= 0.35]
wick_flat = [w for w in wick_stats if w[0] < 0.15]
print(f"\nPre-Breakout Lower Wick >= 35% (Dip Buying Absorption): Win Rate = {sum(1 for w in wick_absorbed if w[1])/len(wick_absorbed)*100:.1f}% (n={len(wick_absorbed)})")
print(f"Pre-Breakout Lower Wick < 15% (No Dip Buying): Win Rate = {sum(1 for w in wick_flat if w[1])/len(wick_flat)*100:.1f}% (n={len(wick_flat)})")

out = {
    'top_stocks': stock_leaderboard[:25],
    'dow_breakdown': dow_summary,
    'runway_progression': runway_summary,
    'gap_analysis': {
        'healthy_gap_win_rate': round(sum(1 for g in gap_healthy if g[1])/len(gap_healthy)*100, 1),
        'exhaustion_gap_win_rate': round(sum(1 for g in gap_large if g[1])/len(gap_large)*100, 1)
    },
    'wick_absorption': {
        'absorbed_win_rate': round(sum(1 for w in wick_absorbed if w[1])/len(wick_absorbed)*100, 1),
        'unabsorbed_win_rate': round(sum(1 for w in wick_flat if w[1])/len(wick_flat)*100, 1)
    }
}

with open('backend/data/granular_pressure_cooker_dna.json', 'w') as f:
    json.dump(out, f, indent=2)
print("\nSaved granular analysis to backend/data/granular_pressure_cooker_dna.json!")
