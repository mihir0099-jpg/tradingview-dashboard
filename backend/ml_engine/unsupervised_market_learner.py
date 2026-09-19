"""
Unsupervised & Self-Supervised Market Intelligence Engine
Learns emergent mathematical structures directly from raw market time-series:
1. Latent Market Regimes (Gaussian HMM via hmmlearn)
2. Cross-Asset Lead-Lag Information Flow (Granger Causality via statsmodels)
3. Stealth Iceberg Absorption & Liquidity Anomaly Detection (IsolationForest via sklearn)
4. Historical Waveform Shape Matching (Euclidean / DTW Curve Clones via scipy)
5. Sector & Stock Manifold Behavioral Clustering (PCA + KMeans via sklearn)
"""

import io
import os
import sys
import json
import glob
import numpy as np
import pandas as pd
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

from hmmlearn import hmm
from sklearn.ensemble import IsolationForest
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from scipy.spatial.distance import euclidean
from statsmodels.tsa.stattools import grangercausalitytests

ARCHIVE_DIR = r"C:\Users\mihir\Downloads\archive (1)"
BACKEND_DIR = r"C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard\backend"
DATA_DIR = os.path.join(BACKEND_DIR, "data")
DAILY_ARCHIVE_DIR = os.path.join(DATA_DIR, "daily_archive")
OUTPUT_PATH = os.path.join(DATA_DIR, "ml_unsupervised_insights.json")

def read_tail_csv(filepath, n_lines=2000):
    """Ultra-fast tail reader for multi-gigabyte/large CSVs"""
    try:
        with open(filepath, 'rb') as f:
            header = f.readline().decode('utf-8', errors='ignore')
            f.seek(0, os.SEEK_END)
            size = f.tell()
            buffer_size = min(size, n_lines * 120)
            f.seek(size - buffer_size)
            lines = f.read().decode('utf-8', errors='ignore').splitlines()
            data = lines[-n_lines:] if len(lines) >= n_lines else lines
            csv_str = header + '\n'.join(data)
            return pd.read_csv(io.StringIO(csv_str))
    except Exception as e:
        return None

def load_session_candles(target_date_str=None):
    session_file = None
    if target_date_str:
        candidate = os.path.join(DAILY_ARCHIVE_DIR, f"session_{target_date_str}.json")
        if os.path.exists(candidate):
            session_file = candidate

    if not session_file:
        candidates = sorted(glob.glob(os.path.join(DAILY_ARCHIVE_DIR, "session_*.json")))
        if candidates:
            session_file = candidates[-1]

    if not session_file or not os.path.exists(session_file):
        return None, None, None

    with open(session_file, 'r') as f:
        data = json.load(f)

    session_date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
    raw_candles = data.get('raw_candles', {})
    nifty_candles = raw_candles.get('nifty_1m', [])
    banknifty_candles = raw_candles.get('banknifty_1m', [])

    return session_date, nifty_candles, banknifty_candles

def compute_hmm_regimes(candles, n_states=3):
    if not candles or len(candles) < 30:
        return {"status": "insufficient_data"}

    df = pd.DataFrame(candles)
    df['returns'] = df['close'].pct_change().fillna(0)
    df['hl_spread'] = (df['high'] - df['low']) / df['close']
    df['body_spread'] = np.abs(df['close'] - df['open']) / df['close']

    X = df[['returns', 'hl_spread', 'body_spread']].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = hmm.GaussianHMM(n_components=n_states, covariance_type="diag", n_iter=200, random_state=42)
    model.fit(X_scaled)
    hidden_states = model.predict(X_scaled)
    df['state'] = hidden_states

    state_profiles = []
    for s in range(n_states):
        sub = df[df['state'] == s]
        vol = float(sub['returns'].std())
        mean_hl = float(sub['hl_spread'].mean())
        occ = len(sub) / len(df)
        
        if vol > 0.0010:
            label = "High Volatility Expansion"
            regime_type = "EXPANSION"
        elif mean_hl < 0.0004:
            label = "Low Volatility Consolidation / Compression"
            regime_type = "EQUILIBRIUM"
        else:
            label = "Steady Drift / Directional Auction"
            regime_type = "TREND"

        state_profiles.append({
            "state_id": s,
            "label": label,
            "regime_type": regime_type,
            "variance": float(vol),
            "mean_hl_spread": float(mean_hl),
            "occupancy_pct": round(occ * 100, 2),
            "bars_count": int(len(sub))
        })

    trans_matrix = model.transmat_.tolist()

    try:
        eigvals, eigvecs = np.linalg.eig(model.transmat_.T)
        stat_vec = np.real(eigvecs[:, np.isclose(eigvals, 1)])
        stat_dist = (stat_vec / stat_vec.sum()).flatten().tolist()
    except Exception:
        stat_dist = [round(1.0 / n_states, 4)] * n_states

    current_state = int(hidden_states[-1])
    next_state_probs = [round(p, 4) for p in trans_matrix[current_state]]

    timeline = []
    current_block = {"state": int(hidden_states[0]), "start_time": df.iloc[0].get('timeIST', '09:15'), "duration_bars": 1}
    for i in range(1, len(df)):
        st = int(hidden_states[i])
        if st == current_block["state"]:
            current_block["duration_bars"] += 1
        else:
            current_block["end_time"] = df.iloc[i-1].get('timeIST', '')
            timeline.append(current_block)
            current_block = {"state": st, "start_time": df.iloc[i].get('timeIST', ''), "duration_bars": 1}
    current_block["end_time"] = df.iloc[-1].get('timeIST', '')
    timeline.append(current_block)

    return {
        "status": "success",
        "current_eod_state": current_state,
        "current_regime_label": state_profiles[current_state]["label"],
        "next_state_probabilities": next_state_probs,
        "transition_matrix": [[round(x, 4) for x in row] for row in trans_matrix],
        "stationary_distribution": [round(x, 4) for x in stat_dist],
        "state_profiles": state_profiles,
        "regime_shifts_count": len(timeline) - 1,
        "timeline_blocks": timeline[-10:]
    }

def compute_cross_asset_lead_lag(target_date_str=None):
    sectors = {
        "NIFTY BANK": "NIFTY BANK_minute.csv",
        "NIFTY IT": "NIFTY IT_minute.csv",
        "NIFTY AUTO": "NIFTY AUTO_minute.csv",
        "NIFTY METAL": "NIFTY METAL_minute.csv",
        "NIFTY ENERGY": "NIFTY ENERGY_minute.csv",
        "NIFTY FMCG": "NIFTY FMCG_minute.csv",
        "NIFTY PSU BANK": "NIFTY PSU BANK_minute.csv",
        "NIFTY PHARMA": "NIFTY PHARMA_minute.csv",
        "NIFTY REALTY": "NIFTY REALTY_minute.csv",
        "NIFTY INFRA": "NIFTY INFRA_minute.csv"
    }

    nifty_path = os.path.join(ARCHIVE_DIR, "NIFTY 50_minute.csv")
    if not os.path.exists(nifty_path):
        return {"status": "archive_not_found"}

    df_nifty = read_tail_csv(nifty_path, 2000)
    if df_nifty is None or len(df_nifty) == 0:
        return {"status": "load_failed"}

    df_nifty['date'] = pd.to_datetime(df_nifty['date'])
    df_nifty = df_nifty.sort_values('date').reset_index(drop=True)
    df_nifty['ret'] = df_nifty['close'].pct_change().fillna(0)

    results = []
    lags = [1, 2, 3, 5]

    for name, filename in sectors.items():
        sec_path = os.path.join(ARCHIVE_DIR, filename)
        if not os.path.exists(sec_path):
            continue

        try:
            df_sec = read_tail_csv(sec_path, 2000)
            if df_sec is None or len(df_sec) == 0:
                continue

            df_sec['date'] = pd.to_datetime(df_sec['date'])
            df_sec = df_sec.sort_values('date').reset_index(drop=True)
            df_sec['ret'] = df_sec['close'].pct_change().fillna(0)

            # Merge on timestamp
            merged = pd.merge(df_nifty[['date', 'ret']], df_sec[['date', 'ret']], on='date', suffixes=('_nifty', '_sec')).dropna()
            if len(merged) < 100:
                continue

            gc_data = merged[['ret_nifty', 'ret_sec']]
            # In statsmodels 0.14+, verbose argument is removed
            gc_res = grangercausalitytests(gc_data, maxlag=lags)
            
            best_lag = None
            min_p = 1.0
            best_f = 0.0

            for lag in lags:
                test_stat = gc_res[lag][0]['ssr_ftest']
                f_stat = float(test_stat[0])
                p_val = float(test_stat[1])
                if p_val < min_p:
                    min_p = p_val
                    best_f = f_stat
                    best_lag = lag

            corr = float(merged['ret_nifty'].corr(merged['ret_sec']))

            results.append({
                "sector": name,
                "optimal_lag_minutes": int(best_lag) if best_lag else 1,
                "f_statistic": round(float(best_f), 3),
                "p_value": round(float(min_p), 5),
                "is_significant_lead": bool(min_p < 0.05),
                "correlation": round(corr, 3),
                "lead_strength": round(float(best_f * (1.0 - min_p)), 3)
            })
        except Exception:
            continue

    results = sorted(results, key=lambda x: x["lead_strength"], reverse=True)

    return {
        "status": "success",
        "sample_bars_tested": len(df_nifty),
        "primary_leading_sector": results[0]["sector"] if results else None,
        "lead_rankings": results
    }

def detect_stealth_absorption_anomalies(candles):
    if not candles or len(candles) < 30:
        return {"status": "insufficient_data"}

    df = pd.DataFrame(candles)
    vol = df['volume'].values
    has_volume = bool(np.max(vol) > 0)

    df['abs_return'] = np.abs(df['close'] - df['open'])
    df['hl_spread'] = df['high'] - df['low']
    df['upper_wick'] = df['high'] - df[['open', 'close']].max(axis=1)
    df['lower_wick'] = df[['open', 'close']].min(axis=1) - df['low']

    if has_volume:
        df['vol_norm'] = (df['volume'] - df['volume'].mean()) / (df['volume'].std() + 1e-8)
        df['vol_spread_ratio'] = df['volume'] / (df['hl_spread'] + 1e-5)
        features = df[['abs_return', 'hl_spread', 'vol_norm', 'vol_spread_ratio']].values
    else:
        features = df[['abs_return', 'hl_spread', 'upper_wick', 'lower_wick']].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    iso = IsolationForest(contamination=0.035, random_state=42)
    iso.fit(X_scaled)
    df['anomaly_score'] = iso.decision_function(X_scaled)
    df['is_anomaly'] = iso.predict(X_scaled) == -1

    anomaly_rows = df[df['is_anomaly']].copy()
    anomalies = []

    for idx, row in anomaly_rows.iterrows():
        t = row.get('timeIST', f"Bar_{idx}")
        score = float(row['anomaly_score'])
        close = float(row['close'])
        hl = float(row['hl_spread'])
        body = float(row['abs_return'])

        if has_volume and row['vol_norm'] > 1.8 and hl < df['hl_spread'].median():
            archetype = "STEALTH_ICEBERG_ABSORPTION"
            desc = "Extreme institutional order absorption; massive volume absorbed within tight price boundary."
        elif row['upper_wick'] > body * 1.8:
            archetype = "OVERHEAD_SUPPLY_TRAP"
            desc = "Severe rejection of highs; aggressive hidden supply cap detected."
        elif row['lower_wick'] > body * 1.8:
            archetype = "LIQUIDITY_SWEEP_ABSORPTION"
            desc = "Aggressive absorption of sell stops beneath intraday low; institutional bid present."
        elif hl > df['hl_spread'].quantile(0.95):
            archetype = "VOLATILITY_EXPANSION_DISPERSION"
            desc = "Structural range blowout; aggressive liquidity extraction."
        else:
            archetype = "MICROSTRUCTURE_ANOMALY"
            desc = "Non-linear price-action divergence from baseline session manifold."

        anomalies.append({
            "time": t,
            "bar_index": int(idx),
            "price_level": close,
            "anomaly_score": round(score, 4),
            "archetype": archetype,
            "description": desc,
            "hl_spread_pts": round(hl, 2)
        })

    return {
        "status": "success",
        "total_anomalies_detected": len(anomalies),
        "anomalies": anomalies
    }

def match_historical_waveforms(candles, top_k=5):
    if not candles or len(candles) < 60:
        return {"status": "insufficient_data"}

    df_today = pd.DataFrame(candles)
    n_sample_points = 60
    indices = np.linspace(0, len(df_today) - 1, n_sample_points, dtype=int)
    today_prices = df_today.iloc[indices]['close'].values
    today_z = (today_prices - np.mean(today_prices)) / (np.std(today_prices) + 1e-8)

    nifty_path = os.path.join(ARCHIVE_DIR, "NIFTY 50_minute.csv")
    if not os.path.exists(nifty_path):
        return {"status": "archive_not_found"}

    try:
        df_hist = read_tail_csv(nifty_path, 40000)
        if df_hist is None or len(df_hist) == 0:
            return {"status": "load_failed"}

        df_hist['date_only'] = pd.to_datetime(df_hist['date']).dt.date
        unique_dates = df_hist['date_only'].unique()
        
        candidates = []
        for d in unique_dates[:-1]:
            sub = df_hist[df_hist['date_only'] == d]
            if len(sub) < 300:
                continue
            
            sub_indices = np.linspace(0, len(sub) - 1, n_sample_points, dtype=int)
            hist_prices = sub.iloc[sub_indices]['close'].values
            hist_z = (hist_prices - np.mean(hist_prices)) / (np.std(hist_prices) + 1e-8)

            dist = euclidean(today_z, hist_z)

            d_idx = np.where(unique_dates == d)[0][0]
            next_day_ret = 0.0
            next_day_direction = "FLAT"
            if d_idx + 1 < len(unique_dates):
                next_d = unique_dates[d_idx + 1]
                next_sub = df_hist[df_hist['date_only'] == next_d]
                if len(next_sub) > 0:
                    open_p = next_sub.iloc[0]['open']
                    close_p = next_sub.iloc[-1]['close']
                    next_day_ret = round(((close_p - open_p) / open_p) * 100, 2)
                    next_day_direction = "BULLISH" if next_day_ret > 0.1 else ("BEARISH" if next_day_ret < -0.1 else "NEUTRAL")

            candidates.append({
                "date": str(d),
                "distance": round(float(dist), 4),
                "similarity_pct": round(max(0, 100 - (dist * 7.5)), 1),
                "next_day_return_pct": next_day_ret,
                "next_day_direction": next_day_direction
            })

        candidates = sorted(candidates, key=lambda x: x["distance"])[:top_k]

        bull_count = sum(1 for c in candidates if c["next_day_direction"] == "BULLISH")
        bear_count = sum(1 for c in candidates if c["next_day_direction"] == "BEARISH")
        avg_next_ret = round(float(np.mean([c["next_day_return_pct"] for c in candidates])), 2)

        return {
            "status": "success",
            "top_historical_twins": candidates,
            "next_day_projection": {
                "bullish_probability_pct": round((bull_count / len(candidates)) * 100, 1) if candidates else 0,
                "bearish_probability_pct": round((bear_count / len(candidates)) * 100, 1) if candidates else 0,
                "average_projected_return_pct": avg_next_ret,
                "mathematical_bias": "BULLISH_EXPANSION" if avg_next_ret > 0.1 else ("BEARISH_DRIFT" if avg_next_ret < -0.1 else "RANGE_BOUND")
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def compute_sector_manifold_clusters():
    """
    Component 5: Latent Sector Manifold Clustering (PCA + KMeans)
    Reads 80+ sectoral/thematic indices and clusters them into 4 emergent market regimes:
    Momentum Leaders, Range Consolidators, Distribution Donors, Squeeze Accumulators.
    """
    day_files = [f for f in glob.glob(os.path.join(ARCHIVE_DIR, "NIFTY*_day.csv")) if not any(x in f for x in ['EQL', 'PR ', 'TR ', 'USD', 'GS ', 'BOND'])]
    if not day_files:
        return {"status": "no_sector_day_data"}

    features = []
    names = []

    for f in day_files:
        base = os.path.basename(f).replace("_day.csv", "")
        try:
            df = read_tail_csv(f, 60)
            if df is None or len(df) < 15:
                continue
            
            recent = df.tail(10).copy()
            recent['ret'] = recent['close'].pct_change().fillna(0)
            recent['hl_pct'] = (recent['high'] - recent['low']) / recent['close']
            
            ret_5d = float(((recent['close'].iloc[-1] - recent['close'].iloc[-5]) / recent['close'].iloc[-5]) * 100) if len(recent) >= 5 else 0.0
            vol_5d = float(recent['ret'].std())
            mean_hl = float(recent['hl_pct'].mean())
            last_close_pos = float((recent['close'].iloc[-1] - recent['low'].iloc[-1]) / (recent['high'].iloc[-1] - recent['low'].iloc[-1] + 1e-6))

            features.append([ret_5d, vol_5d, mean_hl, last_close_pos])
            names.append(base)
        except Exception:
            continue

    if len(features) < 10:
        return {"status": "insufficient_sectors"}

    X = np.array(features)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    pca = PCA(n_components=2)
    embedding = pca.fit_transform(X_scaled)
    var_explained = [round(float(v * 100), 1) for v in pca.explained_variance_ratio_]

    kmeans = KMeans(n_clusters=4, random_state=42)
    clusters = kmeans.fit_predict(X_scaled)

    cluster_labels = {
        0: "Momentum Accumulators (High Relative Strength)",
        1: "Compression Squeeze Candidates (Low Volatility Springs)",
        2: "Distribution & Liquidating (High Dispersion Pullback)",
        3: "Mean-Reverting Range Traded (Equilibrium Oscillators)"
    }

    records = []
    for i, name in enumerate(names):
        c_id = int(clusters[i])
        records.append({
            "sector": name,
            "cluster_id": c_id,
            "cluster_name": cluster_labels[c_id],
            "pca_x": round(float(embedding[i][0]), 3),
            "pca_y": round(float(embedding[i][1]), 3),
            "ret_5d_pct": round(float(features[i][0]), 2),
            "volatility": round(float(features[i][1]), 4)
        })

    grouped = {}
    for c_id in range(4):
        grouped[c_id] = {
            "cluster_name": cluster_labels[c_id],
            "members": [s["sector"] for s in records if s["cluster_id"] == c_id][:8],
            "count": sum(1 for s in records if s["cluster_id"] == c_id)
        }

    return {
        "status": "success",
        "total_sectors_analyzed": len(names),
        "pca_variance_explained_pct": var_explained,
        "cluster_summaries": grouped,
        "sample_sectors": records[:30]
    }

def main():
    target_date = sys.argv[1] if len(sys.argv) > 1 else None
    print(f"[ML-Engine] Executing Unsupervised & Self-Supervised Learning for {target_date or 'Latest Session'}...")

    session_date, nifty_candles, banknifty_candles = load_session_candles(target_date)
    print(f"[ML-Engine] Loaded session date: {session_date} | Nifty bars: {len(nifty_candles) if nifty_candles else 0}")

    insights = {
        "generated_at": datetime.now().isoformat(),
        "session_date": session_date,
        "engine_version": "2.0-Unsupervised-ML",
        "description": "Genuine machine learning models trained on raw market microstructure (Hidden Markov Models, Vector Autoregression Granger Causality, Isolation Forest, and Waveform Clustering)."
    }

    print("[ML-Engine] 1. Computing Hidden Markov Model Regimes...")
    insights["hmm_regimes_nifty"] = compute_hmm_regimes(nifty_candles, n_states=3)

    if banknifty_candles:
        print("[ML-Engine] 1B. Computing Hidden Markov Model Regimes for BankNifty...")
        insights["hmm_regimes_banknifty"] = compute_hmm_regimes(banknifty_candles, n_states=3)

    print("[ML-Engine] 2. Computing Multi-Sector Granger Causality Lead-Lag Information Flow...")
    insights["cross_asset_lead_lag"] = compute_cross_asset_lead_lag(session_date)

    print("[ML-Engine] 3. Fitting Isolation Forest for Stealth Absorption & Liquidity Voids...")
    insights["stealth_absorption_anomalies"] = detect_stealth_absorption_anomalies(nifty_candles)

    print("[ML-Engine] 4. Scanning Historical Waveforms for Closest Curve Clones...")
    insights["waveform_shape_matching"] = match_historical_waveforms(nifty_candles, top_k=5)

    print("[ML-Engine] 5. Fitting PCA + KMeans Manifold Clustering on Sector Universe...")
    insights["sector_manifold_clusters"] = compute_sector_manifold_clusters()

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(insights, f, indent=2)

    print(f"[ML-Engine] Successfully generated ML insights -> {OUTPUT_PATH}")
    if insights.get("hmm_regimes_nifty", {}).get("status") == "success":
        print(f"[ML-Engine] Nifty Current Regime: {insights['hmm_regimes_nifty'].get('current_regime_label')}")
    if insights.get('cross_asset_lead_lag', {}).get('primary_leading_sector'):
        print(f"[ML-Engine] Primary Leading Sector: {insights['cross_asset_lead_lag']['primary_leading_sector']} (Lag: {insights['cross_asset_lead_lag']['lead_rankings'][0]['optimal_lag_minutes']}m, F: {insights['cross_asset_lead_lag']['lead_rankings'][0]['f_statistic']})")
    print(f"[ML-Engine] Stealth Anomalies Detected: {insights['stealth_absorption_anomalies'].get('total_anomalies_detected', 0)}")
    if insights.get('sector_manifold_clusters', {}).get('status') == "success":
        print(f"[ML-Engine] Total Sectors Clustered: {insights['sector_manifold_clusters'].get('total_sectors_analyzed')}")

if __name__ == "__main__":
    main()
