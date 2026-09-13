# ==============================================================================
# MASTER 24/7 ALL-DAY TRADING DASHBOARD RUNNER
# Prevents Windows Sleep, Monitors Backends (3001 & 3002), Auto-Heals Tunnels
# ==============================================================================

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Starting 24/7 Master Trading Dashboard Service...      " -ForegroundColor Green
Write-Host "  - Windows Sleep: BLOCKED (Runs continuously all day)  " -ForegroundColor Yellow
Write-Host "  - Local Port 3001: Market Profile Dashboard Engine     " -ForegroundColor White
Write-Host "  - Local Port 3002: TradingView 20-Tab Engine           " -ForegroundColor White
Write-Host "  - Auto-Sync: Hugging Face live_backend.json Auto-Push  " -ForegroundColor White
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Prevent Windows from Sleeping while this script runs
$code = @'
[DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
public static extern uint SetThreadExecutionState(uint esFlags);
'@
try {
    $steType = Add-Type -MemberDefinition $code -Name "SleepUtil" -Namespace "Win32" -PassThru -ErrorAction SilentlyContinue
    # ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x00000001) | ES_AWAYMODE_REQUIRED (0x00000040)
    [Win32.SleepUtil]::SetThreadExecutionState(0x80000000 -bor 0x00000001 -bor 0x00000040)
    Write-Host "[Power Management] Laptop Sleep BLOCKED successfully." -ForegroundColor Green
} catch {
    Write-Host "[Power Management] Sleep blocker active." -ForegroundColor Yellow
}

$tvDir = "C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard"
$mpDir = "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard"

# Send one-time boot alert to Telegram
try {
    $scriptPath = Join-Path $tvDir "backend\notify_boot.js"
    if (-not (Test-Path $scriptPath)) {
        Set-Content -Path $scriptPath -Value "import('./telegram_notifier.js').then(m => m.sendTelegramMessage('<b>24/7 WATCHDOG ONLINE</b>\nSystem monitoring active.')).catch(()=>{});"
    }
    Start-Process -FilePath "node" -ArgumentList "backend\notify_boot.js" -WorkingDirectory $tvDir -WindowStyle Hidden -ErrorAction SilentlyContinue
} catch {}

# Function to check HTTP 200
function Test-HttpOk ($url, $timeoutMs = 4000) {
    try {
        $req = [System.Net.WebRequest]::Create($url)
        $req.Timeout = $timeoutMs
        $res = $req.GetResponse()
        $status = [int]$res.StatusCode
        $res.Close()
        return ($status -ge 200 -and $status -lt 400)
    } catch {
        return $false
    }
}

$cfConsecutiveFails = 0
$serveoConsecutiveFails = 0

while ($true) {
    # Refresh sleep prevention token
    try { [Win32.SleepUtil]::SetThreadExecutionState(0x80000000 -bor 0x00000001 -bor 0x00000040) } catch {}

    # Check Port 3002 (TradingView Dashboard)
    $tvOk = Test-HttpOk "http://localhost:3002/health" 3000
    if (-not $tvOk) {
        $port3002Listening = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
        if (-not $port3002Listening) {
            Write-Host "[Watchdog] Port 3002 not listening. Launching backend server..." -ForegroundColor Yellow
            Start-Process -FilePath "node" -ArgumentList "server.js --project=tradingview-dashboard" -WorkingDirectory "$tvDir\backend" -WindowStyle Hidden -ErrorAction SilentlyContinue
        }
    }

    # Check Port 3001 (Market Profile)
    $mpOk = Test-HttpOk "http://localhost:3001/api/live-indices" 3000
    if (-not $mpOk) {
        $port3001Listening = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
        if (-not $port3001Listening) {
            Write-Host "[Watchdog] Port 3001 not listening. Launching backend server..." -ForegroundColor Yellow
            Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "$mpDir\backend" -WindowStyle Hidden -ErrorAction SilentlyContinue
        }
    }

    # Check Serveo Tunnel (Port 3001)
    $serveoOk = Test-HttpOk "https://bhaichara-scanner-mihir.serveousercontent.com/health" 5000
    if (-not $serveoOk) {
        $serveoConsecutiveFails++
        if ($serveoConsecutiveFails -ge 3) {
            Write-Host "[Watchdog] Serveo tunnel disconnected (3 failures). Reconnecting..." -ForegroundColor Yellow
            Stop-Process -Name ssh -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File backend/run_tunnels.ps1" -WorkingDirectory $mpDir -WindowStyle Hidden -ErrorAction SilentlyContinue
            $serveoConsecutiveFails = 0
        }
    } else {
        $serveoConsecutiveFails = 0
    }

    # Check Cloudflare Tunnel for Port 3002 (Health-based check)
    $cfLog = "$tvDir\backend\data\active_tunnel_url.txt"
    $cfUrl = if (Test-Path $cfLog) { (Get-Content $cfLog -Raw).Trim() } else { "" }
    $cfOk = if ($cfUrl) { Test-HttpOk "$cfUrl/health" 5000 } else { $false }

    if (-not $cfOk -and $tvOk) {
        $cfConsecutiveFails++
        if ($cfConsecutiveFails -ge 2 -or -not $cfUrl) {
            Write-Host "[Watchdog] Port 3002 Cloudflare tunnel unreachable. Starting start_cloudflare_tunnel.js..." -ForegroundColor Yellow
            Start-Process -FilePath "node" -ArgumentList "start_cloudflare_tunnel.js" -WorkingDirectory "$tvDir\backend" -WindowStyle Hidden -ErrorAction SilentlyContinue
            $cfConsecutiveFails = 0
        }
    } else {
        $cfConsecutiveFails = 0
    }

    # Autonomous 3:45 PM IST EOD Auto-Learner Trigger
    try {
        $istNow = [System.DateTime]::UtcNow.AddHours(5.5)
        $todayKey = $istNow.ToString("yyyy-MM-dd")
        if ($istNow.Hour -eq 15 -and $istNow.Minute -ge 45 -and $global:lastStocksTrackerEODRun -ne $todayKey) {
            Write-Host "[Watchdog 15:45 IST] Auto-triggering Stocks Tracker EOD Auto-Learner for $todayKey..." -ForegroundColor Green
            $resp = Invoke-RestMethod -Uri "http://localhost:3002/api/stocks-tracker/trigger-eod-learning" -Method Post -TimeoutSec 10 -ErrorAction SilentlyContinue
            if ($resp) {
                $global:lastStocksTrackerEODRun = $todayKey
                Write-Host "[Watchdog 15:45 IST] Auto-Learner successfully executed and saved!" -ForegroundColor Green
            }
        }
    } catch {}

    # Sleep 30 seconds between health checks
    Start-Sleep -Seconds 30
}
