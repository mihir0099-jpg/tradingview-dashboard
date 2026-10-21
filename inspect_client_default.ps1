Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$client = New-Object NinjaTrader.Client.Client
$h = [NinjaTrader.Client.Client].GetField('h', [System.Reflection.BindingFlags]'NonPublic,Instance').GetValue($client)
$p = [NinjaTrader.Client.Client].GetField('p', [System.Reflection.BindingFlags]'NonPublic,Instance').GetValue($client)
Write-Output "Default Host: $h, Default Port: $p"