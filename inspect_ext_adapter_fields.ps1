Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$ad = [NinjaTrader.Adapter.ExternalAdapter]
$ad.GetFields([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object { Write-Output ($_.FieldType.Name + ' ' + $_.Name) }