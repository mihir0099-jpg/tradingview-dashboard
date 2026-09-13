import('./telegram_notifier.js').then(m => m.sendTelegramMessage('<b>24/7 WATCHDOG ONLINE</b>\nSystem monitoring active.')).catch(()=>{});
