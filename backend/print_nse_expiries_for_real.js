function getExpiriesForSymbolReal(symbol) {
  const sym = symbol.replace('NSE:', '').toUpperCase();
  const expiries = [];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  let targetDay = 4; // Default to Thursday (Nifty)
  if (sym === 'BANKNIFTY') {
    targetDay = 3; // Wednesday
  } else if (sym === 'FINNIFTY') {
    targetDay = 2; // Tuesday
  } else if (sym === 'MIDCPNIFTY') {
    targetDay = 1; // Monday
  }
  
  if (sym === 'NIFTY' || sym === 'BANKNIFTY' || sym === 'FINNIFTY' || sym === 'MIDCPNIFTY') {
    // Generate next 5 weekly expiries
    for (let i = 0; i < 45; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() === targetDay) {
        const expiryStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (expiryStart < todayStart) continue;

        const yy = String(d.getFullYear()).slice(-2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        expiries.push({
          code: `${yy}${mm}${dd}`,
          label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        });
      }
    }
  } else {
    // Stock options: Monthly expiry on the last Thursday of the month
    for (let m = 0; m < 6; m++) {
      const d = new Date(today.getFullYear(), today.getMonth() + m + 1, 0); // Last day of month
      while (d.getDay() !== 4) { // Last Thursday
        d.setDate(d.getDate() - 1);
      }
      
      const expiryStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (expiryStart < todayStart) continue;

      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      expiries.push({
        code: `${yy}${mm}${dd}`,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      });
      if (expiries.length === 3) break;
    }
  }
  return expiries;
}

console.log('NIFTY:', getExpiriesForSymbolReal('NSE:NIFTY').slice(0, 3));
console.log('BANKNIFTY:', getExpiriesForSymbolReal('NSE:BANKNIFTY').slice(0, 3));
console.log('FINNIFTY:', getExpiriesForSymbolReal('NSE:FINNIFTY').slice(0, 3));
console.log('RELIANCE:', getExpiriesForSymbolReal('NSE:RELIANCE').slice(0, 3));
