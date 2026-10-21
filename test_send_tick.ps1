Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$client = New-Object NinjaTrader.Client.Client
$conn = $client.Connected(0)
$last = $client.Last('NIFTY', 22530.30, 75)
Write-Output "Connected: $conn, Last return code: $last"
$client.Dispose()