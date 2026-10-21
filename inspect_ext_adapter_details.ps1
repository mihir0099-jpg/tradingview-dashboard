Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$ad = [NinjaTrader.Adapter.ExternalAdapter]
foreach ($m in $ad.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static')) {
    if ($m.DeclaringType -eq $ad) {
        $p = ($m.GetParameters() | ForEach-Object { $_.ParameterType.Name + ' ' + $_.Name }) -join ', '
        Write-Output ($m.ReturnType.Name + ' ' + $m.Name + '(' + $p + ')')
    }
}