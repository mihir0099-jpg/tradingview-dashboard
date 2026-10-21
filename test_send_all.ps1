Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$client = New-Object NinjaTrader.Client.Client
$conn = $client.Connected(0)
Write-Output "Connection: $conn"
foreach ($sym in @('^BANKNIFTY', 'BANKNIFTY_I', 'BANKNIFTY', '^NIFTY', 'NIFTY_I', 'NIFTY')) {
    $price = 22530.30
    if ($sym -match 'BANK') { $price = 54794.80 }
    $r1 = $client.Last($sym, $price, 30)
    $r2 = $client.Bid($sym, $price - 0.10, 30)
    $r3 = $client.Ask($sym, $price + 0.10, 30)
    Write-Output "Sent to $sym : $r1, $r2, $r3"
}
$client.Dispose()