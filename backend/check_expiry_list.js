import { getExpiriesForSymbol } from './scanner.js';

console.log('NIFTY Expiries:', getExpiriesForSymbol('NSE:NIFTY'));
console.log('BANKNIFTY Expiries:', getExpiriesForSymbol('NSE:BANKNIFTY'));
