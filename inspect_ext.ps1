Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$opt = [NinjaTrader.Cbi.ExternalOptions]
Write-Output '--- ExternalOptions properties ---'
$opt.GetProperties() | ForEach-Object { Write-Output ($_.PropertyType.Name + ' ' + $_.Name) }
$ad = [NinjaTrader.Adapter.ExternalAdapter]
Write-Output '--- ExternalAdapter methods ---'
$ad.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object { Write-Output ($_.ReturnType.Name + ' ' + $_.Name) }