Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$mod = [NinjaTrader.Client.Client].Module
@(0x06000030, 0x0600000B, 0x0600000C, 0x0600000A, 0x04000036) | ForEach-Object {
    try {
        $mb = $mod.ResolveMember($_)
        Write-Output ($mb.DeclaringType.Name + '.' + $mb.Name)
    } catch {
        Write-Output $_.ToString()
    }
}