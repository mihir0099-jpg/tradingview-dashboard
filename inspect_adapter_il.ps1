Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$asm = [System.Reflection.Assembly]::LoadFrom('C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\bin\Custom\AccelPixNT8.dll')
$t = $asm.GetType('NinjaTrader.NinjaScript.Adapters.SampleOpenConnect')
$m = $t.GetMethod('Connect', [System.Reflection.BindingFlags]'Public,NonPublic,Instance')
Write-Output 'Method Connect body:'
$body = $m.GetMethodBody()
Write-Output ($body.GetILAsByteArray() | ForEach-Object { '{0:X2}' -f $_ }) -join ' '