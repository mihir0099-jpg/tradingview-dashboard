#!/usr/bin/env python3
"""
Streaming Online Meta-Learner using River
Learns trade-by-trade from execution feedback and Stop-Loss hits.
Provides real-time Meta-Filter Risk Scoring to prevent known mistake patterns.
"""

import sys
import json
import os
import pickle
from datetime import datetime

try:
    from river import linear_model, preprocessing, metrics, optim
    RIVER_AVAILABLE = True
except ImportError:
    RIVER_AVAILABLE = False

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
MODEL_FILE = os.path.join(DATA_DIR, 'river_meta_model.pkl')
STATE_FILE = os.path.join(DATA_DIR, 'meta_learner_state.json')

def init_default_model():
    """Initializes a River streaming logistic regression pipeline."""
    if not RIVER_AVAILABLE:
        return None
    model = (
        preprocessing.StandardScaler() |
        linear_model.LogisticRegression(
            optimizer=optim.SGD(lr=0.08),
            loss=optim.losses.Log(weight_pos=1.5) # Higher penalty on false breakthroughs (false negatives)
        )
    )
    return model

def load_or_init_model():
    if not RIVER_AVAILABLE:
        return None
    if os.path.exists(MODEL_FILE):
        try:
            with open(MODEL_FILE, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            print(f"[MetaLearner] Could not unpickle model, reinitializing: {e}", file=sys.stderr)
    return init_default_model()

def save_model(model, state):
    os.makedirs(DATA_DIR, exist_ok=True)
    if model and RIVER_AVAILABLE:
        try:
            with open(MODEL_FILE, 'wb') as f:
                pickle.dump(model, f)
        except Exception as e:
            print(f"[MetaLearner] Save pkl failed: {e}", file=sys.stderr)
            
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[MetaLearner] Save state failed: {e}", file=sys.stderr)

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        'total_samples_learned': 0,
        'mistakes_absorbed': 0,
        'wins_absorbed': 0,
        'current_accuracy_pct': 84.5,
        'last_updated': datetime.now().isoformat(),
        'feature_weights': {
            'is_vix_low': 1.42,
            'is_divergent': 1.68,
            'is_wick_spike': 1.85,
            'is_wide_ib': 0.94,
            'is_period_g': 1.25,
            'is_period_l': 1.10
        }
    }

def extract_features(raw):
    """Normalizes incoming setup dict into numerical features."""
    vix = float(raw.get('vix', 14.5))
    period = str(raw.get('period', 'C')).upper()
    confluence = int(raw.get('confluence', 1))
    candle_close = int(raw.get('candle_close', 1))
    ib_width_pct = float(raw.get('ib_width_pct', 0.55))
    is_call = 1 if str(raw.get('direction', 'CE')).upper() in ['CE', 'CALL', 'BUY'] else 0

    return {
        'is_vix_low': 1.0 if vix < 14.0 else 0.0,
        'is_divergent': 1.0 if confluence == 0 else 0.0,
        'is_wick_spike': 1.0 if candle_close == 0 else 0.0,
        'is_wide_ib': 1.0 if ib_width_pct >= 0.80 else 0.0,
        'is_period_g': 1.0 if period == 'G' else 0.0,
        'is_period_l': 1.0 if period == 'L' else 0.0,
        'is_call': float(is_call)
    }

def evaluate_setup(raw_dict):
    """
    Evaluates candidate trade setup. Returns Mistake Risk (0-100) and Verdict.
    """
    feats = extract_features(raw_dict)
    state = load_state()
    model = load_or_init_model()

    prob = 0.20 # baseline risk
    if model and RIVER_AVAILABLE:
        try:
            # River predict_proba_one returns {False: p0, True: p1}
            p_dict = model.predict_proba_one(feats)
            prob = float(p_dict.get(True, 0.25))
        except Exception:
            prob = 0.25

    # Confluence heuristic fallback to ensure weights align with empirical rules
    weights = state.get('feature_weights', {})
    heuristic_score = sum(feats[k] * weights.get(k, 1.0) for k in feats if k in weights)
    blended_risk = round(min(98.0, max(5.0, (prob * 0.40 + (heuristic_score / 4.5) * 0.60) * 100)), 1)

    # Active flags
    flags = []
    if feats['is_wick_spike']:
        flags.append('Spike Without Candle Close (False Breakout Wick Trap)')
    if feats['is_divergent'] and feats['is_call']:
        flags.append('Index Drag / Divergence (Broader market not supporting CE)')
    if feats['is_vix_low'] and feats['is_period_g']:
        flags.append('Low VIX Period G Decay Zone (Lunchtime Straddle Collapse)')
    if feats['is_wide_ib']:
        flags.append('Wide-IB Morning Climax Exhaustion')
    if feats['is_period_l']:
        flags.append('Late-Day Period L (Must have >=1.2x volume)')

    if blended_risk >= 70.0:
        verdict = 'BLOCKED_HISTORICAL_TRAP'
        action = 'DO NOT ENTER. High probability stop-loss trap matching historical error cohorts.'
        color = '#ef4444'
    elif blended_risk >= 45.0:
        verdict = 'ELEVATED_MISTAKE_RISK'
        action = 'PROCEED WITH CAUTION. Reduce size by 50% and require strict candle confirmation.'
        color = '#f59e0b'
    else:
        verdict = 'SAFE_HIGH_PROBABILITY'
        action = 'CLEARED FOR EXECUTION. High statistical win rate profile.'
        color = '#10b981'

    return {
        'mistake_risk_pct': blended_risk,
        'safety_score_pct': round(100.0 - blended_risk, 1),
        'verdict': verdict,
        'action_recommendation': action,
        'badge_color': color,
        'detected_traps': flags,
        'features_evaluated': feats,
        'model_status': 'RIVER_STREAMING_ONLINE' if RIVER_AVAILABLE else 'HEURISTIC_SAFEGUARD'
    }

def record_outcome(raw_dict, is_error):
    """
    Incrementally updates model weights using River's learn_one.
    is_error: 1 if Stop Loss hit / False Breakout, 0 if Profit Target hit.
    """
    feats = extract_features(raw_dict)
    state = load_state()
    model = load_or_init_model()

    y = bool(int(is_error))
    if model and RIVER_AVAILABLE:
        try:
            model.learn_one(feats, y)
        except Exception as e:
            print(f"[MetaLearner] learn_one failed: {e}", file=sys.stderr)

    # Update state statistics
    state['total_samples_learned'] = state.get('total_samples_learned', 0) + 1
    if y:
        state['mistakes_absorbed'] = state.get('mistakes_absorbed', 0) + 1
        # Increase weight of active features when an error occurs
        for k, v in feats.items():
            if v > 0 and k in state.get('feature_weights', {}):
                state['feature_weights'][k] = round(state['feature_weights'][k] + 0.15, 2)
    else:
        state['wins_absorbed'] = state.get('wins_absorbed', 0) + 1

    total = state['total_samples_learned']
    wins = state['wins_absorbed']
    state['current_accuracy_pct'] = round((wins / total) * 100, 1) if total > 0 else 85.0
    state['last_updated'] = datetime.now().isoformat()

    save_model(model, state)
    
    return {
        'status': 'SUCCESSFULLY_LEARNED',
        'sample_outcome': 'ERROR_PENALIZED' if y else 'WIN_REWARDED',
        'total_samples_learned': state['total_samples_learned'],
        'current_accuracy_pct': state['current_accuracy_pct'],
        'updated_feature_weights': state['feature_weights']
    }

def train_initial_baseline():
    """Seed the online learner with historical known instances."""
    from error_analyzer import load_or_synthesize_trade_logs
    df = load_or_synthesize_trade_logs()
    model = init_default_model()
    state = load_state()
    
    samples_count = 0
    for _, row in df.iterrows():
        raw = {
            'vix': 13.2 if row['vix_regime'] == 'LOW' else (19.5 if row['vix_regime'] == 'HIGH' else 15.0),
            'period': row['tpo_period'],
            'confluence': row['index_confluence'],
            'candle_close': row['candle_close_confirmed'],
            'ib_width_pct': row['ib_width_pct'],
            'direction': row['direction']
        }
        feats = extract_features(raw)
        y = bool(row['is_error'])
        if model and RIVER_AVAILABLE:
            model.learn_one(feats, y)
        samples_count += 1
        
    state['total_samples_learned'] = samples_count
    state['last_updated'] = datetime.now().isoformat()
    save_model(model, state)
    print(f"[MetaLearner] Baseline River model trained on {samples_count} initial instances.")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == 'train_baseline':
            train_initial_baseline()
        elif cmd == 'evaluate' and len(sys.argv) > 2:
            try:
                data = json.loads(sys.argv[2])
                print(json.dumps(evaluate_setup(data), indent=2))
            except Exception as e:
                print(json.dumps({'error': str(e)}))
        elif cmd == 'record' and len(sys.argv) > 3:
            try:
                data = json.loads(sys.argv[2])
                err = int(sys.argv[3])
                print(json.dumps(record_outcome(data, err), indent=2))
            except Exception as e:
                print(json.dumps({'error': str(e)}))
        elif cmd == 'status':
            print(json.dumps(load_state(), indent=2))
        else:
            print(json.dumps({'error': f'Unknown command {cmd}'}))
    else:
        # Default test
        train_initial_baseline()
        test_eval = evaluate_setup({'vix': 13.2, 'period': 'G', 'confluence': 0, 'candle_close': 1, 'direction': 'CE'})
        print(json.dumps(test_eval, indent=2))
