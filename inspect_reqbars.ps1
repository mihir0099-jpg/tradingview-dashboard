Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$ad = [NinjaTrader.Adapter.ExternalAdapter]
$m = $ad.GetMethod('RequestBars', [System.Reflection.BindingFlags]'Public,NonPublic,Instance')
$body = $m.GetMethodBody()
$bytes = $body.GetILAsByteArray()
Write-Output ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '