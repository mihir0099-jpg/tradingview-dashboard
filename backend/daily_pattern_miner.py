import os, json, math

DAILY_DIR = 'backend/data/historical_daily'
files = [os.path.join(DAILY_DIR, f) for f in os.listdir(DAILY_DIR) if f.endswith('.json')]

print(f'Loading {len(files)} stock daily histories...')

all_big_bull_moves = []
all_big_bear_moves = []

# Pattern detection stats
nr7_trades = []
double_inside_bar_trades = []
volume_dryup_trades = []
ema_pinch_trades = []
liquidity_sweep_trades = []

total_candles_analyzed = 0

for file_path in files:
    sym = os.path.basename(file_path).replace('.json', '')
    with open(file_path, 'r') as f:
        candles = json.load(f)
    
    if len(candles) < 60:
        continue
        
    total_candles_analyzed += len(candles)
    
    # Calculate indicators
    for i in range(50, len(candles) - 5):
        c = candles[i]
        prev = candles[i-1]
        
        # 20-day ATR & avg volume
        ranges_20 = [candles[j]['h'] - candles[j]['l'] for j in range(i-20, i)]
        atr_20 = sum(ranges_20) / 20.0
        volumes_20 = [candles[j]['v'] for j in range(i-20, i)]
        avg_vol_20 = sum(volumes_20) / 20.0 if sum(volumes_20) > 0 else 1
        
        # EMAs
        closes_20 = [candles[j]['c'] for j in range(i-20, i)]
        ema20 = sum(closes_20) / 20.0
        closes_50 = [candles[j]['c'] for j in range(i-50, i)]
        sma50 = sum(closes_50) / 50.0
        closes_9 = [candles[j]['c'] for j in range(i-9, i)]
        ema9 = sum(closes_9) / 9.0
        
        # Check if day i is a BIG MOVE (>= +4% or <= -4%)
        day_return = ((c['c'] - prev['c']) / prev['c']) * 100.0
        day_range = c['h'] - c['l']
        
        # Look at T-1 (the day BEFORE the big move)
        t1 = candles[i-1]
        t1_range = t1['h'] - t1['l']
        t1_vol = t1['v']
        
        ranges_7 = [candles[j]['h'] - candles[j]['l'] for j in range(i-7, i)]
        is_nr7_before = (t1_range == min(ranges_7))
        ranges_4 = [candles[j]['h'] - candles[j]['l'] for j in range(i-4, i)]
        is_nr4_before = (t1_range == min(ranges_4))
        is_atr_squeeze_before = (t1_range < 0.55 * atr_20)
        is_vol_dryup_before = (t1_vol < 0.65 * avg_vol_20)
        
        # Double Inside Bar before
        t2 = candles[i-2]
        t3 = candles[i-3]
        is_inside_bar_t1 = (t1['h'] <= t2['h'] and t1['l'] >= t2['l'])
        is_inside_bar_t2 = (t2['h'] <= t3['h'] and t2['l'] >= t3['l'])
        is_double_inside_bar = (is_inside_bar_t1 and is_inside_bar_t2)
        
        # EMA Pinch before
        ema_dist = (abs(ema9 - ema20) / t1['c']) * 100.0
        ema_sma_dist = (abs(ema20 - sma50) / t1['c']) * 100.0
        is_ema_pinch = (ema_dist < 0.6 and ema_sma_dist < 1.2)
        
        # Liquidity sweep before (Spring / Upthrust on T-1)
        lows_10 = min(candles[j]['l'] for j in range(i-11, i-1))
        highs_10 = max(candles[j]['h'] for j in range(i-11, i-1))
        is_bullish_spring = (t1['l'] < lows_10 and t1['c'] > lows_10)
        is_bearish_upthrust = (t1['h'] > highs_10 and t1['c'] < highs_10)
        
        if day_return >= 4.0:
            all_big_bull_moves.append({
                'symbol': sym, 'date_t': c['t'], 'return': day_return,
                'nr7': is_nr7_before, 'nr4': is_nr4_before,
                'atr_squeeze': is_atr_squeeze_before, 'vol_dryup': is_vol_dryup_before,
                'double_ib': is_double_inside_bar, 'ema_pinch': is_ema_pinch,
                'bull_spring': is_bullish_spring
            })
            
        if day_return <= -4.0:
            all_big_bear_moves.append({
                'symbol': sym, 'date_t': c['t'], 'return': day_return,
                'nr7': is_nr7_before, 'nr4': is_nr4_before,
                'atr_squeeze': is_atr_squeeze_before, 'vol_dryup': is_vol_dryup_before,
                'double_ib': is_double_inside_bar, 'ema_pinch': is_ema_pinch,
                'bear_upthrust': is_bearish_upthrust
            })
            
        # -------------------------------------------------------------
        # SYSTEM BACKTEST: What if we trade each pattern when it triggers?
        # -------------------------------------------------------------
        # Setup 1: NR7 Breakout
        if is_nr7_before:
            # Buy if price breaks above T-1 high, Short if price breaks below T-1 low
            # Measure next 3 days return
            post_close = candles[min(i+2, len(candles)-1)]['c']
            bull_ret = ((post_close - t1['h']) / t1['h']) * 100.0 if c['h'] > t1['h'] else None
            bear_ret = ((t1['l'] - post_close) / t1['l']) * 100.0 if c['l'] < t1['l'] else None
            nr7_trades.append({'bull_ret': bull_ret, 'bear_ret': bear_ret})
            
        # Setup 2: Double Inside Bar Breakout
        if is_double_inside_bar:
            post_close = candles[min(i+3, len(candles)-1)]['c']
            if c['h'] > t1['h']:
                ret = ((post_close - t1['h']) / t1['h']) * 100.0
                double_inside_bar_trades.append({'dir': 'BULL', 'ret': ret, 'win': ret > 0})
            elif c['l'] < t1['l']:
                ret = ((t1['l'] - post_close) / t1['l']) * 100.0
                double_inside_bar_trades.append({'dir': 'BEAR', 'ret': ret, 'win': ret > 0})
                
        # Setup 3: Volume Dry-up (<0.6x) + ATR Compression (<0.5x ATR)
        if is_vol_dryup_before and is_atr_squeeze_before:
            post_close = candles[min(i+3, len(candles)-1)]['c']
            if c['h'] > t1['h'] and c['v'] > 1.3 * avg_vol_20:
                ret = ((post_close - t1['h']) / t1['h']) * 100.0
                volume_dryup_trades.append({'dir': 'BULL', 'ret': ret, 'win': ret > 0, 'max_gain': max((candles[j]['h']-t1['h'])/t1['h']*100 for j in range(i, min(i+4, len(candles))))})
            elif c['l'] < t1['l'] and c['v'] > 1.3 * avg_vol_20:
                ret = ((t1['l'] - post_close) / t1['l']) * 100.0
                volume_dryup_trades.append({'dir': 'BEAR', 'ret': ret, 'win': ret > 0, 'max_gain': max((t1['l']-candles[j]['l'])/t1['l']*100 for j in range(i, min(i+4, len(candles))))})

        # Setup 4: Liquidity Sweep Reversal (Spring / Upthrust)
        if is_bullish_spring:
            # Entry next day, stop below t1 low, hold 3 days
            post_close = candles[min(i+3, len(candles)-1)]['c']
            ret = ((post_close - t1['c']) / t1['c']) * 100.0
            liquidity_sweep_trades.append({'dir': 'BULL_SPRING', 'ret': ret, 'win': ret > 0, 'max_gain': max((candles[j]['h']-t1['c'])/t1['c']*100 for j in range(i, min(i+4, len(candles))))})
            
        if is_bearish_upthrust:
            post_close = candles[min(i+3, len(candles)-1)]['c']
            ret = ((t1['c'] - post_close) / t1['c']) * 100.0
            liquidity_sweep_trades.append({'dir': 'BEAR_UPTHRUST', 'ret': ret, 'win': ret > 0, 'max_gain': max((t1['c']-candles[j]['l'])/t1['c']*100 for j in range(i, min(i+4, len(candles))))})

print(f'Total Daily Candles Analyzed: {total_candles_analyzed:,}')
print(f'Total Big Bullish Moves (>= +4%): {len(all_big_bull_moves):,}')
print(f'Total Big Bearish Moves (<= -4%): {len(all_big_bear_moves):,}')

# Save results
out = {
    'total_candles': total_candles_analyzed,
    'big_bull_count': len(all_big_bull_moves),
    'big_bear_count': len(all_big_bear_moves),
    'bull_nr7_pct': round(sum(1 for m in all_big_bull_moves if m['nr7']) / len(all_big_bull_moves) * 100, 1),
    'bull_nr4_pct': round(sum(1 for m in all_big_bull_moves if m['nr4']) / len(all_big_bull_moves) * 100, 1),
    'bull_atr_squeeze_pct': round(sum(1 for m in all_big_bull_moves if m['atr_squeeze']) / len(all_big_bull_moves) * 100, 1),
    'bull_vol_dryup_pct': round(sum(1 for m in all_big_bull_moves if m['vol_dryup']) / len(all_big_bull_moves) * 100, 1),
    'bull_ema_pinch_pct': round(sum(1 for m in all_big_bull_moves if m['ema_pinch']) / len(all_big_bull_moves) * 100, 1),
    'bull_spring_pct': round(sum(1 for m in all_big_bull_moves if m['bull_spring']) / len(all_big_bull_moves) * 100, 1),
    
    'bear_nr7_pct': round(sum(1 for m in all_big_bear_moves if m['nr7']) / len(all_big_bear_moves) * 100, 1),
    'bear_nr4_pct': round(sum(1 for m in all_big_bear_moves if m['nr4']) / len(all_big_bear_moves) * 100, 1),
    'bear_atr_squeeze_pct': round(sum(1 for m in all_big_bear_moves if m['atr_squeeze']) / len(all_big_bear_moves) * 100, 1),
    'bear_vol_dryup_pct': round(sum(1 for m in all_big_bear_moves if m['vol_dryup']) / len(all_big_bear_moves) * 100, 1),
    'bear_ema_pinch_pct': round(sum(1 for m in all_big_bear_moves if m['ema_pinch']) / len(all_big_bear_moves) * 100, 1),
    'bear_upthrust_pct': round(sum(1 for m in all_big_bear_moves if m['bear_upthrust']) / len(all_big_bear_moves) * 100, 1),
    
    # System backtest performance
    'double_inside_bar': {
        'total': len(double_inside_bar_trades),
        'win_rate': round(sum(1 for t in double_inside_bar_trades if t['win']) / len(double_inside_bar_trades) * 100, 1) if double_inside_bar_trades else 0,
        'avg_return': round(sum(t['ret'] for t in double_inside_bar_trades) / len(double_inside_bar_trades), 2) if double_inside_bar_trades else 0
    },
    'volume_dryup_breakout': {
        'total': len(volume_dryup_trades),
        'win_rate': round(sum(1 for t in volume_dryup_trades if t['win']) / len(volume_dryup_trades) * 100, 1) if volume_dryup_trades else 0,
        'avg_return': round(sum(t['ret'] for t in volume_dryup_trades) / len(volume_dryup_trades), 2) if volume_dryup_trades else 0,
        'avg_max_gain': round(sum(t['max_gain'] for t in volume_dryup_trades) / len(volume_dryup_trades), 2) if volume_dryup_trades else 0
    },
    'liquidity_sweep_reversal': {
        'total': len(liquidity_sweep_trades),
        'win_rate': round(sum(1 for t in liquidity_sweep_trades if t['win']) / len(liquidity_sweep_trades) * 100, 1) if liquidity_sweep_trades else 0,
        'avg_return': round(sum(t['ret'] for t in liquidity_sweep_trades) / len(liquidity_sweep_trades), 2) if liquidity_sweep_trades else 0,
        'avg_max_gain': round(sum(t['max_gain'] for t in liquidity_sweep_trades) / len(liquidity_sweep_trades), 2) if liquidity_sweep_trades else 0
    }
}

with open('backend/data/daily_big_move_backtest.json', 'w') as f:
    json.dump(out, f, indent=2)

print('Backtest complete! Saved to backend/data/daily_big_move_backtest.json')
