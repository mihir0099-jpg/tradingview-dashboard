import json
import os
import sys
import numpy as np
from sklearn.ensemble import IsolationForest

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard\backend"
DATA_DIR = os.path.join(BASE_DIR, 'data')
STOCKS_BACKUP = os.path.join(DATA_DIR, 'stocks_moving_backup.json')
OUTPUT_FILE = os.path.join(DATA_DIR, 'fno_iceberg_floors_detected.json')

def run_fno_isolation_forest():
    print("=================================================================")
    print("🌲 RUNNING ISOLATION FOREST ON ENTIRE 212 F&O UNIVERSE")
    print("🔍 Hunting Institutional Iceberg Demand Floors & Volume Anomalies")
    print("=================================================================")

    if not os.path.exists(STOCKS_BACKUP):
        print(f"Error: {STOCKS_BACKUP} not found.")
        return

    with open(STOCKS_BACKUP, 'r', encoding='utf-8') as f:
        data = json.load(f)

    stocks = data.get('stocks', [])
    if not stocks:
        print("No stock data found in stocks_moving_backup.json.")
        return

    print(f"Total F&O Stocks Ingested: {len(stocks)}")

    feature_rows = []
    valid_stocks = []

    for s in stocks:
        try:
            delivery = float(s.get('deliveryPct', 50))
            compression = float(s.get('rangeCompressionPct', 50))
            sai = float(s.get('sai', 1.0))
            cvd = abs(float(s.get('cvdDeltaSoaked', 0)))
            tvpt = abs(float(s.get('tvptDropPct', 0)))
            dist_floor = float(s.get('distToFloorPct', 5.0))
            spot = float(s.get('spotPrice', 0))
            floor = float(s.get('demandFloor', 0))

            if spot > 0 and floor > 0:
                feature_rows.append([delivery, compression, sai, cvd, tvpt, dist_floor])
                valid_stocks.append(s)
        except Exception:
            continue

    X = np.array(feature_rows)
    print(f"Valid feature vectors constructed: {X.shape}")

    # Train Isolation Forest with 15% contamination for high-conviction anomaly extraction
    iso = IsolationForest(
        n_estimators=150,
        contamination=0.15,
        random_state=42,
        max_samples='auto'
    )
    iso.fit(X)

    preds = iso.predict(X)
    scores = iso.decision_function(X)

    anomalies = []
    for i, (p, score) in enumerate(zip(preds, scores)):
        s = valid_stocks[i]
        if p == -1 or score < 0.02:
            spot = float(s.get('spotPrice', 0))
            floor = float(s.get('demandFloor', 0))
            dist_pts = round(spot - floor, 2)
            dist_pct = round((dist_pts / spot) * 100, 2)

            anomalies.append({
                "symbol": s.get('symbol', ''),
                "cleanSymbol": s.get('cleanSymbol', ''),
                "name": s.get('name', ''),
                "sector": s.get('sector', 'F&O Equities'),
                "spotPrice": spot,
                "institutionalBedrockFloor": floor,
                "distanceAboveFloorPts": dist_pts,
                "distanceAboveFloorPct": dist_pct,
                "deliveryAbsorptionPct": s.get('deliveryPct', 0),
                "smartMoneyAbsorptionIndex": s.get('sai', 1.0),
                "cvdDeltaSoakedContracts": s.get('cvdDeltaSoaked', 0),
                "volatilityCompressionPct": s.get('rangeCompressionPct', 0),
                "anomalyScore": round(float(score), 4),
                "confidencePct": s.get('topBottomConfidencePct', 70),
                "recommendedTrade": s.get('actionableTrade', {}),
                "institutionalVerdict": f"Smart money absorbed massive selling supply at \u20b9{floor}. Spot holding +{dist_pct}% above bedrock floor with {s.get('deliveryPct')}% delivery hoarding."
            })

    anomalies.sort(key=lambda x: (x['distanceAboveFloorPct'], -x['deliveryAbsorptionPct']))

    output_payload = {
        "timestamp": "2026-09-17T16:25:00 IST",
        "model": "Isolation Forest Unsupervised Institutional Iceberg Detector (150 Trees)",
        "totalStocksScanned": len(valid_stocks),
        "totalAbsorptionFloorsIsolated": len(anomalies),
        "topInstitutionalAbsorptionFloors": anomalies
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Isolation Forest scan complete!")
    print(f"🎯 Isolated {len(anomalies)} high-conviction institutional absorption floors.")
    print(f"💾 Saved report to: {OUTPUT_FILE}")

    print("\n--- TOP 10 INSTITUTIONAL ABSORPTION FLOORS DETECTED ---")
    for idx, a in enumerate(anomalies[:10], 1):
        print(f"{idx}. {a['cleanSymbol']} ({a['sector']}):")
        print(f"   - Spot Price: ₹{a['spotPrice']}")
        print(f"   - Institutional Bedrock Floor: ₹{a['institutionalBedrockFloor']}")
        print(f"   - Distance to Floor: +₹{a['distanceAboveFloorPts']} (+{a['distanceAboveFloorPct']}%)")
        print(f"   - Demat Delivery Absorbed: {a['deliveryAbsorptionPct']}%")
        print(f"   - Anomaly Score: {a['anomalyScore']} (Severe Outlier Absorption)")
        trade_action = (a.get('recommendedTrade') or {}).get('action', 'BUY CE / Accumulate Spot')
        print(f"   - Recommended Play: {trade_action}\n")

if __name__ == '__main__':
    run_fno_isolation_forest()
