Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$asm = [System.Reflection.Assembly]::LoadFrom('C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\bin\Custom\AccelPixNT8.dll')
$t = $asm.GetType('NinjaTrader.NinjaScript.Adapters.SampleOpenConnect')
$m = $t.GetMethod('FeedThread', [System.Reflection.BindingFlags]'Public,NonPublic,Instance')
$body = $m.GetMethodBody()
$bytes = $body.GetILAsByteArray()
Write-Output ($bytes.Length.ToString() + ' IL bytes')