@echo off
echo ====================================================================
echo Starting TradingView Dashboard Full System Backup...
echo ====================================================================
python "%~dp0scripts\backup.py"
echo.
echo Backup completed. Press any key to exit.
pause >nul
