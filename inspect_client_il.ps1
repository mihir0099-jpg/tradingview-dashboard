Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$t = [NinjaTrader.Client.Client]
$m = $t.GetMethod('Last', [System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static')
$bytes = $m.GetMethodBody().GetILAsByteArray()
Write-Output ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '