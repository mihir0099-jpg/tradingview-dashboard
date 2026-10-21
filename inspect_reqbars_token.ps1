Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$mod = [NinjaTrader.Adapter.ExternalAdapter].Module
$mb = $mod.ResolveMember(0x06000197)
Write-Output ($mb.DeclaringType.FullName + '.' + $mb.Name)