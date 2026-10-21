Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$client = New-Object NinjaTrader.Client.Client
$res = $client.Connected(0)
Write-Output "Connected return code: $res"
$client.Dispose()