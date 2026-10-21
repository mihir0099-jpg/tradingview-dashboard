Add-Type -Path 'C:\Program Files\NinjaTrader 8\bin\NinjaTrader.Core.dll'
$asm = [System.Reflection.Assembly]::LoadFrom('C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\bin\Custom\AccelPixNT8.dll')
$t = $asm.GetType('NinjaTrader.NinjaScript.Adapters.SampleOpenConnect')
foreach ($m in $t.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static')) {
    if ($m.Name -match 'FeedThread|Connect|SubscribeMarketData') {
        Write-Output ($m.Name)
    }
}