/**
 * Institutional Machine Learning Suite V2 Service
 * 
 * Orchestrates background execution and caching of all 6 institutional ML engines:
 * 1. Institutional Trap & False Breakout Predictor
 * 2. VPIN Order Flow Toxicity & Iceberg Hunter
 * 3. Deep Reinforcement Learning Strike & Exit Policy Network
 * 4. Graph Neural Network Sector Sympathy & Lead-Lag Alpha
 * 5. Multi-Horizon Implied Volatility (IV) & Greeks Surface Forecaster
 * 6. Block Deal Survival & Trajectory Forecaster (T+1 to T+20)
 */

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, 'data', 'institutional_ml_v2_output.json');
const PYTHON_SCRIPT = path.join(__dirname, 'ml_engine', 'institutional_ml_suite_v2.py');

let cachedMLInsights = null;
let lastExecutionTime = 0;
let isExecuting = false;

export function loadInstitutionalMLV2FromFile() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
      cachedMLInsights = JSON.parse(raw);
      lastExecutionTime = Date.now();
      return cachedMLInsights;
    }
  } catch (err) {
    console.error('[InstitutionalML-V2] Error reading output file:', err.message);
  }
  return null;
}

export function getInstitutionalMLV2Insights() {
  if (!cachedMLInsights) {
    loadInstitutionalMLV2FromFile();
  }
  return cachedMLInsights;
}

export function executeInstitutionalMLV2(triggerSource = 'BACKGROUND') {
  return new Promise((resolve) => {
    if (isExecuting) {
      return resolve({
        success: false,
        message: 'Execution already in progress',
        data: cachedMLInsights
      });
    }

    isExecuting = true;
    const startMs = Date.now();
    console.log(`[InstitutionalML-V2] Starting 6-Engine AI inference (Trigger: ${triggerSource})...`);

    exec(`python "${PYTHON_SCRIPT}"`, { cwd: path.dirname(PYTHON_SCRIPT) }, (error, stdout, stderr) => {
      isExecuting = false;
      const durationMs = Date.now() - startMs;

      if (error) {
        console.error(`[InstitutionalML-V2] Inference failed (${durationMs}ms):`, stderr || error.message);
        return resolve({
          success: false,
          error: error.message,
          data: cachedMLInsights
        });
      }

      const freshData = loadInstitutionalMLV2FromFile();
      console.log(`[InstitutionalML-V2] Completed successfully in ${durationMs}ms`);
      return resolve({
        success: true,
        durationMs,
        data: freshData
      });
    });
  });
}

// Auto-run scheduler (Every 45 seconds during market hours, or on startup)
export function startInstitutionalMLScheduler() {
  // Initial load or execute
  const existing = loadInstitutionalMLV2FromFile();
  if (!existing) {
    executeInstitutionalMLV2('STARTUP');
  }

  setInterval(() => {
    executeInstitutionalMLV2('AUTO_SCHEDULER');
  }, 45000);
}
