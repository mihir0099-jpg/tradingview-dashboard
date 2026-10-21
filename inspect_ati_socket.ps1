Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$t = [NinjaTrader.Client.Client].Assembly.GetType('NinjaTrader.Server.AtiSocket')
$t.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object { Write-Output ($_.ReturnType.Name + ' ' + $_.Name) }