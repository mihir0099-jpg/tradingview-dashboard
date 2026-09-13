@echo off
title 24/7 Master Trading Dashboard Runner
cd /d "C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard"
echo =========================================================
echo   Starting 24/7 Master Trading Dashboard Service...
echo   Windows Sleep: BLOCKED (Runs all day continuously)
echo =========================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "run_all_day.ps1"
pause
