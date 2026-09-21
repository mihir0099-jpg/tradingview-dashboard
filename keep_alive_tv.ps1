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
    Add-Content -Path $logFile -Value $logLine -ErrorAction SilentlyContinue
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

# Clean up rogue duplicate ngrok instances
Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue

$nodeFailures = 0
$cfFailures = 0

while ($true) {
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

    } catch {
        Log-Message "Error in keep-alive loop: $_"
    }

    Start-Sleep -Seconds 15
}

