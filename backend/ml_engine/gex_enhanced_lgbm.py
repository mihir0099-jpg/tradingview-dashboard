"""
╔══════════════════════════════════════════════════════════════════════════════╗
║      GEX-Enhanced LightGBM / XGBoost / CatBoost Tri-Model Pipeline         ║
║  Adds 10 Gamma Exposure features on top of 10 microstructure features       ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
import os, sys, json, glob, time
import numpy as np
import pandas as pd
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class NumpyEncoder(json.JSONEncoder):
    """Safely serialize numpy types that json.dump can't handle natively."""
    def default(self, obj):
        if isinstance(obj, (np.integer,)):   return int(obj)
        if isinstance(obj, (np.floating,)):  return float(obj)
        if isinstance(obj, (np.bool_,)):     return bool(obj)
        if isinstance(obj, np.ndarray):      return obj.tolist()
        return super().default(obj)


try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import lightgbm as lgb
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

try:
    import catboost as cb
    CATBOOST_AVAILABLE = True
except ImportError:
    CATBOOST_AVAILABLE = False

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

BACKEND_DIR = r"C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard\backend"
DATA_DIR    = os.path.join(BACKEND_DIR, "data")
ARCHIVE_DIR = os.path.join(DATA_DIR, "daily_archive")
OUTPUT_PATH = os.path.join(DATA_DIR, "gex_lgbm_signals.json")

def load_all_sessions():
    all_sessions = []
    files = sorted(glob.glob(os.path.join(ARCHIVE_DIR, "session_*.json")))
    for fpath in files:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                s = json.load(f)
            candles = s.get('raw_candles', {}).get('nifty_1m', [])
            if len(candles) >= 50:
                all_sessions.append(s)
        except Exception:
            pass
    return all_sessions

def load_live_gex_snapshot():
    for p in [os.path.join(DATA_DIR, "gex_live_snapshot.json"), os.path.join(DATA_DIR, "forecast_cache.json")]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    d = json.load(f)
                if 'NIFTY' in d: return d['NIFTY']
                if 'nifty' in d: return d['nifty']
                if d.get('symbol') in ('NIFTY', 'NSE:NIFTY50'): return d
            except Exception:
                pass
    return None

def derive_gex_session_features(session_data, live_gex=None):
    opts  = session_data.get('options_skew_gamma') or {}
    nifty = (session_data.get('indices') or {}).get('nifty') or {}
    nifty = nifty.get('profile') or {}
    spot         = nifty.get('closePrice', nifty.get('openPrice', 23300))
    open_price   = nifty.get('openPrice', spot)
    ib_high      = nifty.get('ibHigh', spot * 1.004)
    ib_low       = nifty.get('ibLow',  spot * 0.996)
    ib_range     = max(1, nifty.get('ibRange', ib_high - ib_low))
    pcr_drift    = opts.get('pcrDriftNifty', 0)
    morning_skew = opts.get('morningSkewNifty', 0)
    period_c_broke_high = nifty.get('periodC', {}).get('brokeHigh', False)
    period_c_broke_low  = nifty.get('periodC', {}).get('brokeLow',  False)
    period_g_above_ib   = nifty.get('periodG', {}).get('closedAboveIB', False)
    period_g_below_ib   = nifty.get('periodG', {}).get('closedBelowIB', False)

    if live_gex:
        net_gex     = float(live_gex.get('netGex', 0))
        abs_gex     = float(live_gex.get('absGex', abs(net_gex) * 1.3))
        regime_str  = live_gex.get('regime', 'FLIP_ZONE')
        gf          = live_gex.get('gammaFlip', {})
        flip_mid    = float(gf.get('mid', spot))
        walls       = live_gex.get('walls', {})
        call_wall   = float(walls.get('callWall', spot + ib_range * 2))
        put_wall    = float(walls.get('putWall',  spot - ib_range * 2))
        momentum_m5 = float(live_gex.get('momentum', {}).get('m5', 0))
        ts          = live_gex.get('timeStats', {})
        total_mins  = max(1, ts.get('minutesBelowFlip', 0) + ts.get('minutesAboveFlip', 1))
        mins_below  = ts.get('minutesBelowFlip', 0)
    else:
        net_gex     = morning_skew * 120
        abs_gex     = abs(net_gex) * 1.4
        flip_mid    = (ib_high + ib_low) / 2
        call_wall   = ib_high + ib_range * 1.5
        put_wall    = ib_low  - ib_range * 1.5
        momentum_m5 = 0.0
        total_mins  = 375
        mins_below  = 187 if spot < flip_mid else 100
        regime_str  = ('LONG_GAMMA' if net_gex > 500 else 'SHORT_GAMMA' if net_gex < -500 else 'FLIP_ZONE')

    regime_map = {'LONG_GAMMA': 2, 'FLIP_ZONE': 1, 'SHORT_GAMMA': 0}
    return {
        'net_gex_sign':         float(1 if net_gex > 0 else (-1 if net_gex < 0 else 0)),
        'gamma_flip_dist_pct':  float(np.clip((spot - flip_mid) / (spot + 1e-5) * 100, -5, 5)),
        'call_wall_dist_pct':   float(np.clip((call_wall - spot) / (spot + 1e-5) * 100, 0, 10)),
        'put_wall_dist_pct':    float(np.clip((spot - put_wall) / (spot + 1e-5) * 100, 0, 10)),
        'gex_regime':           float(regime_map.get(regime_str, 1)),
        'abs_gex_norm':         float(np.clip(abs_gex / (spot * 1000 + 1e-5), 0, 2)),
        'spot_vs_flip':         float(1 if spot > flip_mid else -1),
        'gex_momentum_m5':      float(np.clip(momentum_m5, -1, 1)),
        'minutes_below_flip':   float(mins_below / total_mins),
        'gex_wall_compression': float(np.clip(ib_range / (call_wall - put_wall + 1e-5), 0, 1)),
        'ib_width_pct':         float(np.clip(ib_range / (spot + 1e-5) * 100, 0, 3)),
        'gap_pct':              float(np.clip((open_price - spot) / (spot + 1e-5) * 100, -2, 2)),
        'pcr_velocity_sign':    float(1 if pcr_drift > 0.03 else (-1 if pcr_drift < -0.03 else 0)),
        'period_c_direction':   float(1 if period_c_broke_high else (-1 if period_c_broke_low else 0)),
        'period_g_direction':   float(1 if period_g_above_ib else (-1 if period_g_below_ib else 0)),
        'morning_skew':         float(np.clip(morning_skew / 20, -1, 1)),
    }

def build_dataset(all_sessions):
    rows, targets = [], []
    for s in all_sessions:
        nifty = s.get('indices', {}).get('nifty', {}).get('profile', {})
        chg   = nifty.get('changePct', None)
        if chg is None: continue
        feats = derive_gex_session_features(s)
        rows.append(feats)
        targets.append(1 if chg > 0.05 else 0)
    if len(rows) < 5: return None, None, None
    feature_cols = list(rows[0].keys())
    X = np.array([[r[c] for c in feature_cols] for r in rows])
    y = np.array(targets)
    return X, y, feature_cols

def train_models(X, y, X_live, feature_cols):
    results = {}

    # LightGBM
    t0 = time.time()
    lgbm = lgb.LGBMClassifier(n_estimators=200, max_depth=6, learning_rate=0.05, verbosity=-1, random_state=42)
    lgbm.fit(X, y)
    lp = lgbm.predict_proba(X_live)[0]
    raw = lgbm.feature_importances_; tot = max(1, raw.sum())
    results['lightgbm'] = {
        'bull_prob_pct': round(float(lp[1]*100),1),
        'bear_prob_pct': round(float(lp[0]*100),1),
        'verdict': 'BUY_CE' if lp[1]>=0.65 else ('BUY_PE' if lp[0]>=0.65 else 'NEUTRAL'),
        'top_features': sorted([{'feature':feature_cols[i],'importance_pct':round(float(raw[i]/tot*100),1)} for i in range(len(feature_cols))],key=lambda x:x['importance_pct'],reverse=True)[:8],
        'train_ms': round((time.time()-t0)*1000,1)
    }

    # XGBoost
    t0 = time.time()
    xgbm = xgb.XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05, eval_metric='logloss', random_state=42, verbosity=0)
    xgbm.fit(X, y)
    xp = xgbm.predict_proba(X_live)[0]
    results['xgboost'] = {
        'bull_prob_pct': round(float(xp[1]*100),1),
        'bear_prob_pct': round(float(xp[0]*100),1),
        'verdict': 'BUY_CE' if xp[1]>=0.65 else ('BUY_PE' if xp[0]>=0.65 else 'NEUTRAL'),
        'train_ms': round((time.time()-t0)*1000,1)
    }

    # CatBoost
    if CATBOOST_AVAILABLE:
        t0 = time.time()
        cat = cb.CatBoostClassifier(iterations=200, depth=6, learning_rate=0.05, loss_function='Logloss', verbose=False, random_seed=42)
        cat.fit(X, y)
        cp = cat.predict_proba(X_live)[0]
        ci = cat.get_feature_importance(); cit = max(1, ci.sum())
        results['catboost'] = {
            'bull_prob_pct': round(float(cp[1]*100),1),
            'bear_prob_pct': round(float(cp[0]*100),1),
            'verdict': 'BUY_CE' if cp[1]>=0.65 else ('BUY_PE' if cp[0]>=0.65 else 'NEUTRAL'),
            'top_features': sorted([{'feature':feature_cols[i],'importance_pct':round(float(ci[i]/cit*100),1)} for i in range(len(feature_cols))],key=lambda x:x['importance_pct'],reverse=True)[:8],
            'train_ms': round((time.time()-t0)*1000,1)
        }
        bulls = [lp[1], xp[1], cp[1]]; bears = [lp[0], xp[0], cp[0]]
    else:
        results['catboost'] = {'status': 'not_installed'}
        bulls = [lp[1], xp[1]]; bears = [lp[0], xp[0]]

    avg_bull = round(float(np.mean(bulls)*100),1)
    avg_bear = round(float(np.mean(bears)*100),1)
    all_agree_bull = all(b>=0.60 for b in bulls)
    all_agree_bear = all(b>=0.60 for b in bears)
    if all_agree_bull:   verdict, conf = 'STRONG_BUY_CE', 'HIGH'
    elif all_agree_bear: verdict, conf = 'STRONG_BUY_PE', 'HIGH'
    elif avg_bull>=60:   verdict, conf = 'BUY_CE', 'MEDIUM'
    elif avg_bear>=60:   verdict, conf = 'BUY_PE', 'MEDIUM'
    else:                verdict, conf = 'NEUTRAL_WAIT', 'LOW'

    results['ensemble'] = {'avg_bull_pct': avg_bull, 'avg_bear_pct': avg_bear, 'verdict': verdict, 'confidence': conf, 'models_agreed': bool(all_agree_bull or all_agree_bear)}

    # SHAP
    if SHAP_AVAILABLE:
        try:
            exp = shap.TreeExplainer(lgbm)
            sv  = exp.shap_values(X_live)
            sv0 = sv[1][0] if isinstance(sv, list) else sv[0]
            results['shap'] = {'status':'success','top_drivers':sorted([{'feature':feature_cols[i],'shap':round(float(sv0[i]),4)} for i in range(len(feature_cols))],key=lambda x:abs(x['shap']),reverse=True)[:6]}
        except Exception as e:
            results['shap'] = {'status':'error','msg':str(e)}

    return results

def run_kalman_smoother():
    try:
        from pykalman import KalmanFilter
        cache = os.path.join(DATA_DIR, "gex_live_snapshot.json")
        if not os.path.exists(cache): return {'status':'no_cache'}
        with open(cache,'r') as f: snap = json.load(f)
        nd = snap.get('NIFTY') or snap.get('nifty')
        if not nd: return {'status':'no_nifty'}
        series = nd.get('intradaySeries', [])
        if len(series) < 15: return {'status':'insufficient'}
        vals = np.array([float(s.get('netGex',0)) for s in series])
        kf = KalmanFilter(transition_matrices=[1],observation_matrices=[1],initial_state_mean=vals[0],initial_state_covariance=1,observation_covariance=50,transition_covariance=5)
        sm, _ = kf.smooth(vals)
        sm = sm.flatten()
        slope = float(np.mean(np.diff(sm[-5:])))
        nxt   = round(float(sm[-1] + slope*3),1)
        cross = bool((sm[-1]<0<nxt) or (sm[-1]>0>nxt))
        return {'status':'success','current_gex':round(float(sm[-1]),1),'forecast_15min':nxt,'slope':round(slope,2),'trend':'RISING' if slope>0 else 'FALLING','zero_crossing':cross}
    except ImportError:
        return {'status':'pykalman_not_installed'}
    except Exception as e:
        return {'status':'error','msg':str(e)}

def run_online_learner(all_sessions):
    try:
        from river import tree, metrics, preprocessing as rprep
        mdl = rprep.StandardScaler() | tree.HoeffdingTreeClassifier(grace_period=5, delta=0.001)
        met = metrics.Accuracy()
        for s in all_sessions[:-1]:
            nifty = s.get('indices',{}).get('nifty',{}).get('profile',{})
            chg   = nifty.get('changePct', None)
            if chg is None: continue
            feats = derive_gex_session_features(s)
            y     = 1 if chg > 0.05 else 0
            xd    = {k: float(v) for k,v in feats.items()}
            p     = mdl.predict_one(xd)
            if p is not None: met.update(y, p)
            mdl.learn_one(xd, y)
        last  = all_sessions[-1]
        xd    = {k: float(v) for k,v in derive_gex_session_features(last).items()}
        pred  = mdl.predict_one(xd)
        proba = mdl.predict_proba_one(xd)
        return {'status':'success','algorithm':'Hoeffding Tree (Online)','sessions':len(all_sessions)-1,'accuracy_pct':round(float(met.get())*100,1),'prediction':'BULLISH' if pred==1 else 'BEARISH','confidence_pct':round(float(max(proba.values())*100),1) if proba else 50.0}
    except Exception as e:
        return {'status':'error','msg':str(e)}

def main():
    t0 = time.time()
    print(f"\n[GEX-LGBM] GEX-Enhanced Tri-Model Pipeline @ {datetime.now().strftime('%H:%M:%S')}")
    all_sessions = load_all_sessions()
    live_gex     = load_live_gex_snapshot()
    print(f"[GEX-LGBM] Sessions: {len(all_sessions)} | GEX Snapshot: {'OK' if live_gex else 'Using session estimates'}")
    print(f"[GEX-LGBM] CatBoost: {CATBOOST_AVAILABLE} | SHAP: {SHAP_AVAILABLE}")

    if not all_sessions:
        print("[GEX-LGBM] ERROR: No session archives found"); return

    X, y, fcols = build_dataset(all_sessions)
    if X is None:
        print("[GEX-LGBM] ERROR: Insufficient data"); return

    live_feats = derive_gex_session_features(all_sessions[-1], live_gex)
    X_live     = np.array([[live_feats[c] for c in fcols]])

    print(f"[GEX-LGBM] Training: {len(X)} sessions x {len(fcols)} features | Bull: {y.sum()} / Bear: {(1-y).sum()}")
    model_results = train_models(X, y, X_live, fcols)

    kalman = run_kalman_smoother()
    online = run_online_learner(all_sessions)

    output = {
        'generated_at': datetime.now().isoformat(),
        'session_date': all_sessions[-1].get('date',''),
        'pipeline':     'GEX-Enhanced-Tri-Model-v4.0',
        'packages':     {'lightgbm':lgb.__version__,'xgboost':xgb.__version__,'catboost':cb.__version__ if CATBOOST_AVAILABLE else 'n/a','shap':shap.__version__ if SHAP_AVAILABLE else 'n/a'},
        'live_gex_features': {k: round(float(v),4) for k,v in live_feats.items()},
        'models':       model_results,
        'kalman':       kalman,
        'online':       online,
        'stats':        {'sessions':len(X),'features':len(fcols),'bull':int(y.sum()),'bear':int((1-y).sum()),'runtime_ms':round((time.time()-t0)*1000,1)}
    }

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_PATH,'w',encoding='utf-8') as f:
        json.dump(output, f, indent=2, cls=NumpyEncoder)

    ens = model_results.get('ensemble',{})
    lgbr = model_results.get('lightgbm',{})
    print(f"\n{'='*55}")
    print(f"  ENSEMBLE: {ens.get('verdict')} | Confidence: {ens.get('confidence')}")
    print(f"  Bull: {ens.get('avg_bull_pct')}% | Bear: {ens.get('avg_bear_pct')}% | Agreed: {ens.get('models_agreed')}")
    print(f"  LightGBM → {lgbr.get('verdict')} (Bull {lgbr.get('bull_prob_pct')}%)")
    if CATBOOST_AVAILABLE:
        cat = model_results.get('catboost',{})
        print(f"  CatBoost → {cat.get('verdict')} (Bull {cat.get('bull_prob_pct')}%)")
    print(f"\n  Top GEX Drivers (LightGBM):")
    for f in lgbr.get('top_features',[])[:5]:
        bar = "█" * int(f['importance_pct']/4)
        print(f"    {f['feature']:28s} {bar} {f['importance_pct']}%")
    if kalman.get('status')=='success':
        print(f"\n  Kalman GEX → {kalman.get('trend')} | Forecast 15m: {kalman.get('forecast_15min')} {'⚠️ FLIP ALERT' if kalman.get('zero_crossing') else ''}")
    if online.get('status')=='success':
        print(f"  River Online → {online.get('prediction')} @ {online.get('confidence_pct')}% | Rolling Acc: {online.get('accuracy_pct')}%")
    print(f"\n  Output → {OUTPUT_PATH}")
    print(f"{'='*55}\n")

if __name__=='__main__':
    main()
