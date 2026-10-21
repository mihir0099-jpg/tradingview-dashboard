Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
[AppDomain]::CurrentDomain.GetAssemblies() | ForEach-Object {
    try {
        $_.GetTypes() | ForEach-Object {
            $t = $_
            $t.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object {
                if ($_.Name -eq 'Last' -or $_.Name -eq 'MarketData') {
                    Write-Output ($t.FullName + '.' + $_.Name)
                }
            }
        }
    } catch {}
}