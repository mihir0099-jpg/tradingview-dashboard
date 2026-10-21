Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$asm = [System.Reflection.Assembly]::LoadFrom('C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\bin\Custom\AccelPixNT8.dll')
$asm.GetTypes() | Where-Object { $_.Name -like '*IPC*' -or $_.Name -like '*Record*' } | ForEach-Object {
    Write-Output ($_.FullName)
    $_.GetFields([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | ForEach-Object { Write-Output ('  ' + $_.FieldType.Name + ' ' + $_.Name) }
}