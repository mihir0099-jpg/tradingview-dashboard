Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Gui.dll'
$asm = [System.Reflection.Assembly]::LoadFrom('C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\bin\Custom\AccelPixNT8.dll')
$t = $asm.GetType('NinjaTrader.NinjaScript.Adapters.SampleOpenConnect')
Write-Output '--- METHODS ---'
$t.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object { Write-Output ($_.ReturnType.Name + ' ' + $_.Name) }
Write-Output '--- FIELDS ---'
$t.GetFields([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object { Write-Output ($_.FieldType.Name + ' ' + $_.Name) }