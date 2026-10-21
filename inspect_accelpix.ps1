Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Gui.dll'
$asm = [System.Reflection.Assembly]::LoadFrom('C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\bin\Custom\AccelPixNT8.dll')
$asm.GetExportedTypes() | ForEach-Object { Write-Output $_.FullName }