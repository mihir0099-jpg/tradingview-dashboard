Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$t = [NinjaTrader.Client.Client]
$t.GetFields([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object { Write-Output ($_.FieldType.FullName + ' ' + $_.Name) }