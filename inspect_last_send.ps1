Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
$client = New-Object NinjaTrader.Client.Client
$m = [NinjaTrader.Client.Client].GetMethod('Last')
Write-Output $m.ToString()
$calls = @()
foreach ($inst in $m.GetMethodBody().GetILAsByteArray()) {
    $calls += ('{0:X2}' -f $inst)
}
Write-Output ($calls -join ' ')