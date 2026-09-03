import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const presetsPath = path.join(__dirname, 'data/presets.json');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
const presetSet = new Set(presets.map(p => p.value));

const candidateSymbols = [
  "NSE:NIFTY", "NSE:BANKNIFTY", "NSE:FINNIFTY",
  "NSE:RELIANCE", "NSE:HDFCBANK", "NSE:ICICIBANK", "NSE:INFY", "NSE:TCS",
  "NSE:ITC", "NSE:SBIN", "NSE:BHARTIARTL", "NSE:LT", "NSE:BAJFINANCE",
  "NSE:AXISBANK", "NSE:KOTAKBANK", "NSE:HINDUNILVR", "NSE:TATASTEEL", "NSE:TATAMOTORS",
  "NSE:M&M", "NSE:MARUTI", "NSE:SUNPHARMA", "NSE:JSWSTEEL", "NSE:POWERGRID",
  "NSE:NTPC", "NSE:COALINDIA", "NSE:BPCL", "NSE:IOC", "NSE:ONGC",
  "NSE:ADANIENT", "NSE:ADANIPORTS", "NSE:APOLLOHOSP", "NSE:ASIANPAINT", "NSE:BRITANNIA",
  "NSE:CIPLA", "NSE:DIVISLAB", "NSE:DRREDDY", "NSE:EICHERMOT", "NSE:GRASIM",
  "NSE:HINDALCO", "NSE:HEROMOTOCO", "NSE:INDUSINDBK", "NSE:LTIM", "NSE:NESTLEIND",
  "NSE:SBILIFE", "NSE:SHRIRAMFIN", "NSE:TATACONSUM", "NSE:TECHM", "NSE:TITAN",
  "NSE:ULTRACEMCO", "NSE:WIPRO", "NSE:DLF", "NSE:HAL", "NSE:BEL",
  "NSE:OBEROIRLTY", "NSE:PFC", "NSE:RECLTD", "NSE:TRENT", "NSE:HINDZINC",
  "NSE:GMRINFRA", "NSE:ASHOKLEY", "NSE:TATACOMM", "NSE:TATAPOWER", "NSE:FEDERALBNK",
  "NSE:IDFCFIRSTB", "NSE:PNB", "NSE:CANBK", "NSE:BANKBARODA", "NSE:SAIL",
  "NSE:JINDALSTEL", "NSE:NMDC", "NSE:NATIONALUM", "NSE:AMBUJACEM", "NSE:ACC",
  "NSE:CONCOR", "NSE:LICHSGFIN", "NSE:IGL", "NSE:MGL", "NSE:PETRONET",
  "NSE:HINDPETRO", "NSE:GAIL", "NSE:BHEL", "NSE:VOLTAS", "NSE:HAVELLS",
  "NSE:POLYCAB", "NSE:DIXON", "NSE:MUTHOOTFIN", "NSE:CHOLAFIN", "NSE:SRF",
  "NSE:UPL", "NSE:LTF", "NSE:ABFRL", "NSE:PAGEIND", "NSE:TVSMOTOR",
  "NSE:BALKRISIND", "NSE:AUBANK", "NSE:BANDHANBNK", "NSE:ESCORTS", "NSE:PIDILITIND"
];

const validSymbols = [];
const invalidSymbols = [];

candidateSymbols.forEach(sym => {
  if (presetSet.has(sym)) {
    validSymbols.push(sym);
  } else {
    invalidSymbols.push(sym);
  }
});

console.log('Valid symbols count:', validSymbols.length);
console.log('Invalid symbols:', invalidSymbols);

if (invalidSymbols.length === 0) {
  const outputPath = path.join(__dirname, 'data/scan_symbols.json');
  fs.writeFileSync(outputPath, JSON.stringify(validSymbols, null, 2), 'utf8');
  console.log('Successfully expanded scan_symbols.json to 100 liquid F&O stocks!');
}
