/**
 * Comprehensive Machine Learning Runner
 * Wraps Python ML engines:
 * 1. Unsupervised Engine: HMM Regimes, Granger Lead-Lag, Waveforms, Manifold Clusters
 * 2. Unified ML Suite: LSTM (PyTorch), LightGBM/XGBoost, Random Forest, Isolation Forest
 * 3. Autonomous Dynamic Rule Miner: Automatically synthesizes and evolves new trading rules
 */

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UNSUPERVISED_DATA_FILE = path.join(__dirname, 'data', 'ml_unsupervised_insights.json');
const UNSUPERVISED_SCRIPT = path.join(__dirname, 'ml_engine', 'unsupervised_market_learner.py');

const UNIFIED_DATA_FILE = path.join(__dirname, 'data', 'unified_ml_models_output.json');
const UNIFIED_SCRIPT = path.join(__dirname, 'ml_engine', 'unified_ml_suite.py');

const DYNAMIC_RULES_FILE = path.join(__dirname, 'data', 'auto_learned_dynamic_rules.json');
const RULE_MINER_SCRIPT = path.join(__dirname, 'ml_engine', 'autonomous_rule_miner.py');

let cachedUnsupervised = null;
let lastUnsupervisedTime = 0;

let cachedUnified = null;
let lastUnifiedTime = 0;

let cachedDynamicRules = null;
let lastDynamicRulesTime = 0;

// 1. Unsupervised ML Cache
export function loadUnsupervisedMLFromFile() {
  try {
    if (fs.existsSync(UNSUPERVISED_DATA_FILE)) {
      const raw = fs.readFileSync(UNSUPERVISED_DATA_FILE, 'utf8');
      cachedUnsupervised = JSON.parse(raw);
      lastUnsupervisedTime = Date.now();
      return cachedUnsupervised;
    }
  } catch (err) {
    console.error('[ML Runner] Error loading unsupervised insights:', err.message);
  }
  return null;
}

export function getUnsupervisedMLInsights() {
  if (!cachedUnsupervised || Date.now() - lastUnsupervisedTime > 60000) {
    loadUnsupervisedMLFromFile();
  }
  return cachedUnsupervised;
}

// 2. Unified ML Suite Cache (LSTM, LightGBM, Random Forest, Isolation Forest)
export function loadUnifiedMLFromFile() {
  try {
    if (fs.existsSync(UNIFIED_DATA_FILE)) {
      const raw = fs.readFileSync(UNIFIED_DATA_FILE, 'utf8');
      cachedUnified = JSON.parse(raw);
      lastUnifiedTime = Date.now();
      return cachedUnified;
    }
  } catch (err) {
    console.error('[ML Runner] Error loading unified ML output:', err.message);
  }
  return null;
}

export function getUnifiedMLSuiteInsights() {
  if (!cachedUnified || Date.now() - lastUnifiedTime > 60000) {
    loadUnifiedMLFromFile();
  }
  return cachedUnified;
}

// 3. Autonomous Dynamic Rules Cache
export function loadDynamicRulesFromFile() {
  try {
    if (fs.existsSync(DYNAMIC_RULES_FILE)) {
      const raw = fs.readFileSync(DYNAMIC_RULES_FILE, 'utf8');
      cachedDynamicRules = JSON.parse(raw);
      lastDynamicRulesTime = Date.now();
      return cachedDynamicRules;
    }
  } catch (err) {
    console.error('[Rule Miner] Error loading dynamic rules file:', err.message);
  }
  return [];
}

export function getAutoLearnedDynamicRules() {
  if (!cachedDynamicRules || Date.now() - lastDynamicRulesTime > 30000) {
    loadDynamicRulesFromFile();
  }
  return cachedDynamicRules || [];
}

// Execution Controllers
export function executeUnsupervisedML(targetDate = null) {
  return new Promise((resolve, reject) => {
    const cmd = targetDate 
      ? `python "${UNSUPERVISED_SCRIPT}" ${targetDate}`
      : `python "${UNSUPERVISED_SCRIPT}"`;
      
    console.log(`[ML Runner] 🚀 Triggering Unsupervised ML Engine: ${cmd}`);
    
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('[ML Runner] Execution error:', error.message);
        const fallback = getUnsupervisedMLInsights();
        if (fallback) return resolve(fallback);
        return reject(error);
      }
      
      console.log('[ML Runner] Unsupervised Output:', stdout.trim().split('\n').pop());
      const fresh = loadUnsupervisedMLFromFile();
      resolve(fresh);
    });
  });
}

export function executeUnifiedMLSuite(targetDate = null) {
  return new Promise((resolve, reject) => {
    const cmd = targetDate 
      ? `python "${UNIFIED_SCRIPT}" ${targetDate}`
      : `python "${UNIFIED_SCRIPT}"`;
      
    console.log(`[ML Runner] 🧠 Triggering Unified ML Suite (LSTM + LightGBM + RF + IF): ${cmd}`);
    
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('[ML Runner] Unified Suite execution error:', error.message);
        const fallback = getUnifiedMLSuiteInsights();
        if (fallback) return resolve(fallback);
        return reject(error);
      }
      
      console.log('[ML Runner] Unified Suite Output:', stdout.trim().split('\n').pop());
      const fresh = loadUnifiedMLFromFile();
      resolve(fresh);
    });
  });
}

export function executeRuleMiner() {
  return new Promise((resolve, reject) => {
    const cmd = `python "${RULE_MINER_SCRIPT}"`;
    console.log(`[Rule Miner] ⚡ Synthesizing New Dynamic Rules from ML: ${cmd}`);
    
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Rule Miner] Rule miner execution error:', error.message);
        return resolve(getAutoLearnedDynamicRules());
      }
      
      console.log('[Rule Miner] Output:', stdout.trim().split('\n').shift());
      const fresh = loadDynamicRulesFromFile();
      resolve(fresh);
    });
  });
}

// 4. Order Flow & Footprint Machine Learning Miner
const ORDERFLOW_ML_FILE = path.join(__dirname, 'data', 'orderflow_ml_learnings.json');
const ORDERFLOW_ML_SCRIPT = path.join(__dirname, 'ml_engine', 'orderflow_footprint_ml_miner.py');

let cachedOrderFlowML = null;
let lastOrderFlowMLTime = 0;

export function loadOrderFlowMLFromFile() {
  try {
    if (fs.existsSync(ORDERFLOW_ML_FILE)) {
      const raw = fs.readFileSync(ORDERFLOW_ML_FILE, 'utf8');
      cachedOrderFlowML = JSON.parse(raw);
      lastOrderFlowMLTime = Date.now();
      return cachedOrderFlowML;
    }
  } catch (err) {
    console.error('[OrderFlow ML] Error loading learnings:', err.message);
  }
  return null;
}

export function getOrderFlowMLLearnings() {
  if (!cachedOrderFlowML || Date.now() - lastOrderFlowMLTime > 60000) {
    loadOrderFlowMLFromFile();
  }
  return cachedOrderFlowML;
}

export function executeOrderFlowMLMiner() {
  return new Promise((resolve, reject) => {
    const cmd = `python "${ORDERFLOW_ML_SCRIPT}"`;
    console.log(`[OrderFlow ML] 🚀 Executing Order Flow & Footprint Machine Learning Miner: ${cmd}`);
    
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('[OrderFlow ML] Execution error:', error.message);
        return resolve(getOrderFlowMLLearnings());
      }
      console.log('[OrderFlow ML] Completed successfully.');
      const fresh = loadOrderFlowMLFromFile();
      resolve(fresh);
    });
  });
}

// Initial warm caches on module load
loadUnsupervisedMLFromFile();
loadUnifiedMLFromFile();
loadDynamicRulesFromFile();
loadOrderFlowMLFromFile();
