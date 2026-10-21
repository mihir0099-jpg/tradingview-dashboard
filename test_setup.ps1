Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$client = New-Object NinjaTrader.Client.Client
$setup = $client.SetUp('127.0.0.1', 36973)
Write-Output "SetUp: $setup"
$conn = $client.Connected(0)
Write-Output "Connected: $conn"
$client.Dispose()