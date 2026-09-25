# keep_alive_tv.ps1
# Keeps the TradingView Dashboard backend (port 3002) and Cloudflare Tunnel running silently in the background 24/7.

$baseDir = "C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard"
$backendDir = "$baseDir\backend"
$logFile = "$baseDir\keep_alive_tv.log"
$port = 3002

function Log-Message {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $message"
    Write-Output $logLine
    try {
        if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 500KB)) {
            $tail = Get-Content $logFile -Tail 200
            Set-Content -Path $logFile -Value $tail -Force
        }
        Add-Content -Path $logFile -Value $logLine -ErrorAction SilentlyContinue
    } catch {}
}

Log-Message "🚀 Keep-alive TV watchdog started."

# Prevent duplicate instances of keep_alive_tv.ps1
$myPid = $PID
$otherInstances = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object {
    $_.CommandLine -like "*keep_alive_tv.ps1*" -and $_.CommandLine -notlike "*-Command *" -and $_.ProcessId -ne $myPid
}
if ($otherInstances) {
    $otherPids = ($otherInstances | Select-Object -ExpandProperty ProcessId) -join ", "
    Log-Message "Another instance of keep_alive_tv.ps1 is already running (PID: $otherPids). Exiting."
    exit
}

# Clean up rogue duplicate ngrok instances (managed by run_all_day watchdog)
# Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue

# Prevent Windows Sleep
$code = @'
using System;
using System.Runtime.InteropServices;
public class MasterSleepUtilTv {
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);

    public const uint ES_CONTINUOUS = 0x80000000;
    public const uint ES_SYSTEM_REQUIRED = 0x00000001;
    public const uint ES_AWAYMODE_REQUIRED = 0x00000040;

    public static uint PreventSleep() {
        return SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED);
    }
}
'@
try {
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
    [MasterSleepUtilTv]::PreventSleep()
    Log-Message "Sleep prevention active: Windows sleep blocked."
} catch {}

$nodeFailures = 0
$cfFailures = 0

while ($true) {
    try { [MasterSleepUtilTv]::PreventSleep() } catch {}
    try {
        # ── 1. Check Node Backend Server (Port 3002) ───────────────────────────
        $nodeHealthy = $false
        try {
            $nodeHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -TimeoutSec 5 -ErrorAction Stop
            if ($nodeHealth.status -eq "OK") {
                $nodeHealthy = $true
                $nodeFailures = 0
            }
        } catch {
            $nodeFailures++
            Log-Message "Node TV health check failed ($nodeFailures/3): $_"
        }

        if (-not $nodeHealthy -and $nodeFailures -ge 2) {
            Log-Message "Node TV backend unreachable. Clearing any port $port conflict and starting..."
            
            # Kill any zombie process holding port 3002
            $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if ($conn) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }

            try {
                Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "backend/server.js" -WorkingDirectory $baseDir -WindowStyle Hidden -ErrorAction Stop
                Log-Message "Node TV backend server started successfully."
                $nodeFailures = 0
                Start-Sleep -Seconds 4
            } catch {
                Log-Message "Failed to start Node TV backend server: $_"
            }
        }

        # ── 2. Check Cloudflare Tunnel (Auto-Synced to Hugging Face) ───────────
        $cfProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*start_cloudflare_tunnel.js*" }
        $needStartCf = ($null -eq $cfProc)

        if (-not $needStartCf) {
            # Check public health via active tunnel URL
            $urlFile = "$backendDir\data\active_tunnel_url.txt"
            if (Test-Path $urlFile) {
                $activeUrl = (Get-Content $urlFile -Raw).Trim()
                if ($activeUrl) {
                    try {
                        $publicHealth = Invoke-RestMethod -Uri "$activeUrl/health" -TimeoutSec 6 -ErrorAction Stop
                        if ($publicHealth.status -eq "OK") {
                            $cfFailures = 0
                        } else {
                            $cfFailures++
                        }
                    } catch {
                        $cfFailures++
                    }

                    if ($cfFailures -ge 3) {
                        Log-Message "Cloudflare tunnel public URL failed 3 checks ($activeUrl). Restarting tunnel..."
                        $cfProc | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
                        Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue
                        $needStartCf = $true
                        $cfFailures = 0
                    }
                }
            }
        }

        if ($needStartCf) {
            Log-Message "Cloudflare tunnel runner not active. Launching start_cloudflare_tunnel.js..."
            try {
                Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "backend/start_cloudflare_tunnel.js" -WorkingDirectory $baseDir -WindowStyle Hidden -ErrorAction Stop
                Log-Message "Cloudflare tunnel runner launched successfully."
                Start-Sleep -Seconds 5
            } catch {
                Log-Message "Failed to launch Cloudflare tunnel runner: $_"
            }
        }

        # ── 3. Autonomous EOD Learning & Self-Evolution Engines (IST) ─────────
        try {
            $istNow = [System.DateTime]::UtcNow.AddHours(5.5)
            $todayKey = $istNow.ToString("yyyy-MM-dd")

            # 15:40 IST 40-Strike Weekly Expiry Decay Tracker
            if ($istNow.Hour -eq 15 -and $istNow.Minute -ge 40 -and $global:lastDecayTrackerRun -ne $todayKey) {
                Log-Message "[15:40 IST] Auto-triggering 40-Strike Expiry Decay Learner for $todayKey..."
                $resp = Invoke-RestMethod -Uri "http://localhost:3002/api/options/trigger-decay-tracker" -Method Post -TimeoutSec 10 -ErrorAction SilentlyContinue
                if ($resp) {
                    $global:lastDecayTrackerRun = $todayKey
                    Log-Message "[15:40 IST] Expiry Decay Learner snapshot recorded successfully."
                }
            }

            # 15:45 IST Stocks Tracker EOD Auto-Learner
            if ($istNow.Hour -eq 15 -and $istNow.Minute -ge 45 -and $global:lastStocksTrackerEODRun -ne $todayKey) {
                Log-Message "[15:45 IST] Auto-triggering Stocks Tracker EOD Auto-Learner for $todayKey..."
                $resp = Invoke-RestMethod -Uri "http://localhost:3002/api/stocks-tracker/trigger-eod-learning" -Method Post -TimeoutSec 10 -ErrorAction SilentlyContinue
                if ($resp) {
                    $global:lastStocksTrackerEODRun = $todayKey
                    Log-Message "[15:45 IST] Stocks Tracker Auto-Learner saved successfully."
                }
            }

            # 16:00 IST Evening 24-Tab Health Audit & Self-Healing
            if ($istNow.Hour -ge 16 -and $global:lastTabHealthAuditRun -ne $todayKey) {
                Log-Message "[16:00 IST] Running Autonomous Evening Tab Health Audit for $todayKey..."
                Start-Process -FilePath "node" -ArgumentList "backend\auto_heal_tabs.js" -WorkingDirectory $baseDir -WindowStyle Hidden -ErrorAction SilentlyContinue
                $global:lastTabHealthAuditRun = $todayKey
            }

            # 16:15 IST Daily Market Brain Self-Evolution
            if (($istNow.Hour -gt 16 -or ($istNow.Hour -eq 16 -and $istNow.Minute -ge 15)) -and $global:lastMarketBrainRun -ne $todayKey) {
                Log-Message "[16:15 IST] Running Daily Market Brain Self-Evolution for $todayKey..."
                Start-Process -FilePath "node" -ArgumentList "backend\autonomous_market_brain.js" -WorkingDirectory $baseDir -WindowStyle Hidden -ErrorAction SilentlyContinue
                $global:lastMarketBrainRun = $todayKey
            }

            # 16:20 IST Daily 212 F&O Chart Replay & Mining
            if (($istNow.Hour -gt 16 -or ($istNow.Hour -eq 16 -and $istNow.Minute -ge 20)) -and $global:lastChartReplayRun -ne $todayKey) {
                Log-Message "[16:20 IST] Running Autonomous 212 F&O Chart Replay for $todayKey..."
                Start-Process -FilePath "node" -ArgumentList "backend\daily_full_chart_miner.js" -WorkingDirectory $baseDir -WindowStyle Hidden -ErrorAction SilentlyContinue
                $global:lastChartReplayRun = $todayKey
            }
        } catch {
            Log-Message "Error in autonomous EOD engine triggers: $_"
        }

    } catch {
        Log-Message "Error in keep-alive loop: $_"
    }

    Start-Sleep -Seconds 15
}

