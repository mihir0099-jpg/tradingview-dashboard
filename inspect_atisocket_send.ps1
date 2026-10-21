Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$t = [NinjaTrader.Client.Client].Assembly.GetType('NinjaTrader.Server.AtiSocket')
foreach ($m in $t.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static')) {
    if ($m.Name -eq 'Send') {
        $p = ($m.GetParameters() | ForEach-Object { $_.ParameterType.Name + ' ' + $_.Name }) -join ', '
        Write-Output ($m.Name + '(' + $p + ')')
    }
}