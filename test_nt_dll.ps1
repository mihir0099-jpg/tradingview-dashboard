
Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Client.dll'
foreach ( in [NinjaTrader.Client.Client].GetMethods()) {
     = @()
    foreach ( in .GetParameters()) {
         += (.ParameterType.Name + ' ' + .Name)
    }
    Write-Output (.ReturnType.Name + ' ' + .Name + '(' + ( -join ', ') + ')')
}
