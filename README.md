---
title: TradingView Market Profile Dashboard
emoji: 📈
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# TradingView Market Profile & G-TPO Autonomous Trading Dashboard

An institutional Market Profile, G-TPO (Period A to M), Conformal Prediction (MAPIE), Online Meta-Learner (River), and QuantStats analytics platform.

## Features
- **G-TPO Breakout & Liquidity Sweep Engine:** Real-time detection of institutional candle close filters, spike acceptances, and period-by-period extensions.
- **Machine Learning Error Miner & Meta-Learner:** Stream learning with River incremental models and decision-tree error cohort identification.
- **Conformal Prediction Intervals (MAPIE):** 90% confidence bands for Session High/Low volatility projections.
- **QuantStats Institutional Analytics:** Sharpe, Sortino, Calmar, and Drawdown performance tear sheets.
- **Real-time WebSockets & TradingView Bridge:** Live data streaming for Nifty, Bank Nifty, FinNifty, Crude Oil, and top F&O stocks.

## Architecture
- **Frontend:** React 18, Vite, TailwindCSS, Lucide Icons
- **Backend:** Node.js Express 20, WebSocket Server (ws), Python 3.11 ML Subprocesses
- **Deployment:** Hugging Face Spaces (Docker SDK, Port 7860)
