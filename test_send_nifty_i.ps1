Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$client = New-Object NinjaTrader.Client.Client
$conn = $client.Connected(0)
$res1 = $client.Last('NIFTY_I', 22530.30, 75)
$res2 = $client.Ask('NIFTY_I', 22530.35, 75)
$res3 = $client.Bid('NIFTY_I', 22530.25, 75)
$res4 = $client.Last('BANKNIFTY_I', 54794.80, 30)
Write-Output "Connected: $conn, NIFTY_I Last: $res1, BANKNIFTY_I Last: $res4"
$client.Dispose()