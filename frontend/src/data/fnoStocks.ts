export interface FnoStock {
  symbol: string;
  name: string;
  sector: string;
  strikeInterval: number;
  defaultSpot: number;
  lotSize?: number;
}

export const FNO_STOCKS: FnoStock[] = [
  // Heavyweights & Nifty 50
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Energy & Petrochemicals', strikeInterval: 20, defaultSpot: 1294.90, lotSize: 250 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Banking & Financials', strikeInterval: 10, defaultSpot: 706.65, lotSize: 550 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Banking & Financials', strikeInterval: 10, defaultSpot: 1430.00, lotSize: 700 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Public Sector Banking', strikeInterval: 10, defaultSpot: 845.50, lotSize: 750 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Information Technology', strikeInterval: 50, defaultSpot: 2255.50, lotSize: 175 },
  { symbol: 'INFY', name: 'Infosys Limited', sector: 'Information Technology', strikeInterval: 20, defaultSpot: 1130.30, lotSize: 400 },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG & Cigarettes', strikeInterval: 5, defaultSpot: 485.40, lotSize: 1600 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', sector: 'Infrastructure & Capital Goods', strikeInterval: 50, defaultSpot: 3640.00, lotSize: 175 },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', sector: 'Banking & Financials', strikeInterval: 10, defaultSpot: 1240.20, lotSize: 625 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking & Financials', strikeInterval: 10, defaultSpot: 1815.00, lotSize: 400 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', sector: 'Telecom', strikeInterval: 20, defaultSpot: 1890.00, lotSize: 475 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', sector: 'NBFC & Financials', strikeInterval: 100, defaultSpot: 7350.00, lotSize: 125 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', sector: 'FMCG', strikeInterval: 20, defaultSpot: 2480.00, lotSize: 300 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', sector: 'Automobile', strikeInterval: 10, defaultSpot: 742.80, lotSize: 550 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', sector: 'Automobile', strikeInterval: 100, defaultSpot: 12850.00, lotSize: 50 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', sector: 'Pharma & Healthcare', strikeInterval: 20, defaultSpot: 1860.00, lotSize: 350 },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', sector: 'Consumer Goods & Luxury', strikeInterval: 50, defaultSpot: 3390.00, lotSize: 175 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', sector: 'Metals & Energy', strikeInterval: 50, defaultSpot: 2540.00, lotSize: 300 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports and SEZ', sector: 'Ports & Logistics', strikeInterval: 20, defaultSpot: 1280.00, lotSize: 400 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', sector: 'Cement & Building Materials', strikeInterval: 100, defaultSpot: 11400.00, lotSize: 100 },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', sector: 'Metals & Mining', strikeInterval: 2.5, defaultSpot: 154.20, lotSize: 5500 },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation', sector: 'Power Utilities', strikeInterval: 5, defaultSpot: 318.50, lotSize: 1800 },
  { symbol: 'NTPC', name: 'NTPC Limited', sector: 'Power Utilities', strikeInterval: 5, defaultSpot: 395.00, lotSize: 1500 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', sector: 'Automobile', strikeInterval: 50, defaultSpot: 3120.00, lotSize: 200 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd.', sector: 'Financial Services', strikeInterval: 20, defaultSpot: 1845.00, lotSize: 500 },
  { symbol: 'COALINDIA', name: 'Coal India Ltd.', sector: 'Mining & Energy', strikeInterval: 5, defaultSpot: 465.00, lotSize: 2100 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Oil & Gas Exploration', strikeInterval: 5, defaultSpot: 268.00, lotSize: 3850 },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', sector: 'Information Technology', strikeInterval: 20, defaultSpot: 1680.00, lotSize: 350 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', sector: 'Paints & Chemicals', strikeInterval: 50, defaultSpot: 2590.00, lotSize: 200 },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corp', sector: 'Oil Refining & Marketing', strikeInterval: 5, defaultSpot: 345.00, lotSize: 1800 },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd.', sector: 'Cement & Chemicals', strikeInterval: 20, defaultSpot: 2680.00, lotSize: 250 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', sector: 'Metals & Mining', strikeInterval: 10, defaultSpot: 995.00, lotSize: 675 },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd.', sector: 'Information Technology', strikeInterval: 20, defaultSpot: 1620.00, lotSize: 600 },
  { symbol: 'DRREDDY', name: 'Dr. Reddy\'s Laboratories', sector: 'Pharma', strikeInterval: 50, defaultSpot: 1380.00, lotSize: 125 },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd.', sector: 'Automobile', strikeInterval: 50, defaultSpot: 5120.00, lotSize: 175 },
  { symbol: 'CIPLA', name: 'Cipla Limited', sector: 'Pharma', strikeInterval: 20, defaultSpot: 1540.00, lotSize: 650 },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd.', sector: 'FMCG', strikeInterval: 50, defaultSpot: 2360.00, lotSize: 250 },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd.', sector: 'FMCG', strikeInterval: 50, defaultSpot: 5240.00, lotSize: 200 },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products', sector: 'FMCG', strikeInterval: 10, defaultSpot: 1045.00, lotSize: 900 },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise', sector: 'Healthcare', strikeInterval: 100, defaultSpot: 7120.00, lotSize: 125 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd.', sector: 'Banking & Financials', strikeInterval: 20, defaultSpot: 1180.00, lotSize: 500 },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd.', sector: 'Automobile', strikeInterval: 50, defaultSpot: 4850.00, lotSize: 150 },
  { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories Ltd.', sector: 'Pharma', strikeInterval: 50, defaultSpot: 5890.00, lotSize: 100 },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd.', sector: 'Metals & Mining', strikeInterval: 10, defaultSpot: 695.00, lotSize: 1400 },
  { symbol: 'SHREECEM', name: 'Shree Cement Ltd.', sector: 'Cement', strikeInterval: 250, defaultSpot: 27400.00, lotSize: 25 },
  { symbol: 'WIPRO', name: 'Wipro Limited', sector: 'Information Technology', strikeInterval: 10, defaultSpot: 520.00, lotSize: 1500 },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance Company', sector: 'Insurance', strikeInterval: 20, defaultSpot: 1680.00, lotSize: 750 },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Co.', sector: 'Insurance', strikeInterval: 10, defaultSpot: 725.00, lotSize: 1100 },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd.', sector: 'Defense & Aerospace', strikeInterval: 5, defaultSpot: 312.00, lotSize: 2850 },
  { symbol: 'TRENT', name: 'Trent Limited', sector: 'Retail & Consumer', strikeInterval: 100, defaultSpot: 6850.00, lotSize: 100 },

  // Banking & Financial Services
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', sector: 'Public Sector Banking', strikeInterval: 5, defaultSpot: 245.00, lotSize: 2925 },
  { symbol: 'CANBK', name: 'Canara Bank', sector: 'Public Sector Banking', strikeInterval: 2.5, defaultSpot: 105.00, lotSize: 6750 },
  { symbol: 'PNB', name: 'Punjab National Bank', sector: 'Public Sector Banking', strikeInterval: 2.5, defaultSpot: 102.50, lotSize: 8000 },
  { symbol: 'UNIONBANK', name: 'Union Bank of India', sector: 'Public Sector Banking', strikeInterval: 2.5, defaultSpot: 122.00, lotSize: 4500 },
  { symbol: 'FEDERALBNK', name: 'The Federal Bank Ltd.', sector: 'Private Banking', strikeInterval: 2.5, defaultSpot: 198.00, lotSize: 5000 },
  { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd.', sector: 'Private Banking', strikeInterval: 1, defaultSpot: 72.50, lotSize: 7500 },
  { symbol: 'AUBANK', name: 'AU Small Finance Bank', sector: 'Private Banking', strikeInterval: 10, defaultSpot: 620.00, lotSize: 1000 },
  { symbol: 'BANDHANBNK', name: 'Bandhan Bank Ltd.', sector: 'Private Banking', strikeInterval: 2.5, defaultSpot: 168.00, lotSize: 2500 },
  { symbol: 'RBLBANK', name: 'RBL Bank Limited', sector: 'Private Banking', strikeInterval: 5, defaultSpot: 185.00, lotSize: 2500 },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment', sector: 'NBFC', strikeInterval: 20, defaultSpot: 1420.00, lotSize: 625 },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd.', sector: 'NBFC', strikeInterval: 50, defaultSpot: 3180.00, lotSize: 300 },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd.', sector: 'NBFC', strikeInterval: 20, defaultSpot: 1890.00, lotSize: 350 },
  { symbol: 'MANAPPURAM', name: 'Manappuram Finance Ltd.', sector: 'NBFC', strikeInterval: 5, defaultSpot: 195.00, lotSize: 3000 },
  { symbol: 'M&MFIN', name: 'Mahindra & Mahindra Financial', sector: 'NBFC', strikeInterval: 5, defaultSpot: 290.00, lotSize: 2000 },
  { symbol: 'LICHSGFIN', name: 'LIC Housing Finance', sector: 'Housing Finance', strikeInterval: 10, defaultSpot: 650.00, lotSize: 1000 },
  { symbol: 'CANFINHOME', name: 'Can Fin Homes Ltd.', sector: 'Housing Finance', strikeInterval: 10, defaultSpot: 860.00, lotSize: 975 },
  { symbol: 'PFC', name: 'Power Finance Corporation', sector: 'Financial Institutions', strikeInterval: 5, defaultSpot: 480.00, lotSize: 1300 },
  { symbol: 'RECLTD', name: 'REC Limited', sector: 'Financial Institutions', strikeInterval: 5, defaultSpot: 510.00, lotSize: 1400 },
  { symbol: 'LICI', name: 'Life Insurance Corporation', sector: 'Insurance', strikeInterval: 10, defaultSpot: 980.00, lotSize: 700 },
  { symbol: 'ICICIPRULI', name: 'ICICI Prudential Life', sector: 'Insurance', strikeInterval: 10, defaultSpot: 690.00, lotSize: 900 },
  { symbol: 'ICICIGI', name: 'ICICI Lombard General', sector: 'Insurance', strikeInterval: 20, defaultSpot: 1920.00, lotSize: 350 },
  { symbol: 'SBICARD', name: 'SBI Cards and Payment', sector: 'Financial Services', strikeInterval: 10, defaultSpot: 710.00, lotSize: 800 },
  { symbol: 'HDFCAMC', name: 'HDFC Asset Management Co.', sector: 'Asset Management', strikeInterval: 50, defaultSpot: 4280.00, lotSize: 150 },

  // IT & Technology
  { symbol: 'LTIM', name: 'LTIMindtree Limited', sector: 'Information Technology', strikeInterval: 50, defaultSpot: 5650.00, lotSize: 150 },
  { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd.', sector: 'Information Technology', strikeInterval: 50, defaultSpot: 5420.00, lotSize: 175 },
  { symbol: 'COFORGE', name: 'Coforge Limited', sector: 'Information Technology', strikeInterval: 100, defaultSpot: 7890.00, lotSize: 100 },
  { symbol: 'MPHASIS', name: 'MphasiS Limited', sector: 'Information Technology', strikeInterval: 50, defaultSpot: 2890.00, lotSize: 275 },
  { symbol: 'LTTS', name: 'L&T Technology Services', sector: 'Information Technology', strikeInterval: 50, defaultSpot: 5240.00, lotSize: 100 },
  { symbol: 'BSOFT', name: 'Birlasoft Limited', sector: 'Information Technology', strikeInterval: 10, defaultSpot: 640.00, lotSize: 1000 },
  { symbol: 'TATAELXSI', name: 'Tata Elxsi Ltd.', sector: 'Information Technology', strikeInterval: 50, defaultSpot: 6950.00, lotSize: 100 },
  { symbol: 'NAUKRI', name: 'Info Edge (India) Ltd.', sector: 'Internet & E-Commerce', strikeInterval: 100, defaultSpot: 7650.00, lotSize: 100 },
  { symbol: 'ZOMATO', name: 'Zomato Limited', sector: 'Internet & Food Delivery', strikeInterval: 5, defaultSpot: 260.00, lotSize: 2200 },

  // Auto & Auto Ancillaries
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd.', sector: 'Automobile', strikeInterval: 100, defaultSpot: 9650.00, lotSize: 75 },
  { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd.', sector: 'Automobile', strikeInterval: 50, defaultSpot: 2480.00, lotSize: 350 },
  { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd.', sector: 'Commercial Vehicles', strikeInterval: 2.5, defaultSpot: 228.00, lotSize: 5000 },
  { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd.', sector: 'Auto Components', strikeInterval: 20, defaultSpot: 1380.00, lotSize: 500 },
  { symbol: 'BALKRISIND', name: 'Balkrishna Industries', sector: 'Auto Tyres', strikeInterval: 50, defaultSpot: 2940.00, lotSize: 300 },
  { symbol: 'MRF', name: 'MRF Limited', sector: 'Auto Tyres', strikeInterval: 500, defaultSpot: 132000.00, lotSize: 5 },
  { symbol: 'APOLLOTYRE', name: 'Apollo Tyres Ltd.', sector: 'Auto Tyres', strikeInterval: 10, defaultSpot: 510.00, lotSize: 1700 },
  { symbol: 'BOSCHLTD', name: 'Bosch Limited', sector: 'Auto Components', strikeInterval: 250, defaultSpot: 34500.00, lotSize: 25 },
  { symbol: 'ESCORTS', name: 'Escorts Kubota Ltd.', sector: 'Agri Machinery & Tractors', strikeInterval: 50, defaultSpot: 3780.00, lotSize: 200 },
  { symbol: 'MOTHERSON', name: 'Samvardhana Motherson', sector: 'Auto Components', strikeInterval: 2.5, defaultSpot: 165.00, lotSize: 4500 },

  // Metals & Mining
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power', sector: 'Metals & Mining', strikeInterval: 10, defaultSpot: 960.00, lotSize: 625 },
  { symbol: 'VEDL', name: 'Vedanta Limited', sector: 'Metals & Mining', strikeInterval: 10, defaultSpot: 470.00, lotSize: 1100 },
  { symbol: 'NMDC', name: 'NMDC Limited', sector: 'Mining & Minerals', strikeInterval: 2.5, defaultSpot: 235.00, lotSize: 3375 },
  { symbol: 'SAIL', name: 'Steel Authority of India', sector: 'Metals & Mining', strikeInterval: 2.5, defaultSpot: 135.00, lotSize: 4000 },
  { symbol: 'NATIONALUM', name: 'National Aluminium Co.', sector: 'Aluminium Mining', strikeInterval: 2.5, defaultSpot: 225.00, lotSize: 3750 },
  { symbol: 'HINDCOPPER', name: 'Hindustan Copper Ltd.', sector: 'Copper Mining', strikeInterval: 5, defaultSpot: 310.00, lotSize: 1800 },
  { symbol: 'HINDZINC', name: 'Hindustan Zinc Ltd.', sector: 'Zinc & Silver Mining', strikeInterval: 10, defaultSpot: 520.00, lotSize: 1000 },

  // Pharma & Healthcare
  { symbol: 'LUPIN', name: 'Lupin Limited', sector: 'Pharmaceuticals', strikeInterval: 20, defaultSpot: 2180.00, lotSize: 425 },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd.', sector: 'Pharmaceuticals', strikeInterval: 20, defaultSpot: 1290.00, lotSize: 550 },
  { symbol: 'ALKEM', name: 'Alkem Laboratories Ltd.', sector: 'Pharmaceuticals', strikeInterval: 50, defaultSpot: 5650.00, lotSize: 125 },
  { symbol: 'TORNTPHARM', name: 'Torrent Pharmaceuticals', sector: 'Pharmaceuticals', strikeInterval: 50, defaultSpot: 3380.00, lotSize: 250 },
  { symbol: 'BIOCON', name: 'Biocon Limited', sector: 'Biotechnology', strikeInterval: 5, defaultSpot: 360.00, lotSize: 2500 },
  { symbol: 'ZYDUSLIFE', name: 'Zydus Lifesciences Ltd.', sector: 'Pharmaceuticals', strikeInterval: 10, defaultSpot: 1060.00, lotSize: 900 },
  { symbol: 'GLENMARK', name: 'Glenmark Pharmaceuticals', sector: 'Pharmaceuticals', strikeInterval: 20, defaultSpot: 1540.00, lotSize: 725 },
  { symbol: 'LAURUSLABS', name: 'Laurus Labs Ltd.', sector: 'Pharmaceuticals', strikeInterval: 10, defaultSpot: 480.00, lotSize: 1700 },
  { symbol: 'LALPATHLAB', name: 'Dr. Lal PathLabs Ltd.', sector: 'Healthcare Diagnostics', strikeInterval: 50, defaultSpot: 3120.00, lotSize: 300 },
  { symbol: 'MAXHEALTH', name: 'Max Healthcare Institute', sector: 'Hospitals & Healthcare', strikeInterval: 20, defaultSpot: 1020.00, lotSize: 550 },

  // Energy, Oil & Power
  { symbol: 'TATAPOWER', name: 'Tata Power Co. Ltd.', sector: 'Power Utilities', strikeInterval: 5, defaultSpot: 425.00, lotSize: 1500 },
  { symbol: 'TORNTPOWER', name: 'Torrent Power Ltd.', sector: 'Power Utilities', strikeInterval: 20, defaultSpot: 1680.00, lotSize: 400 },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd.', sector: 'Natural Gas Transmission', strikeInterval: 2.5, defaultSpot: 205.00, lotSize: 3250 },
  { symbol: 'IOC', name: 'Indian Oil Corporation', sector: 'Oil Refining & Marketing', strikeInterval: 2.5, defaultSpot: 175.00, lotSize: 4875 },
  { symbol: 'HINDPETRO', name: 'Hindustan Petroleum Corp', sector: 'Oil Refining & Marketing', strikeInterval: 5, defaultSpot: 390.00, lotSize: 1350 },
  { symbol: 'PETRONET', name: 'Petronet LNG Ltd.', sector: 'LNG Regasification', strikeInterval: 5, defaultSpot: 345.00, lotSize: 1800 },
  { symbol: 'IGL', name: 'Indraprastha Gas Ltd.', sector: 'City Gas Distribution', strikeInterval: 5, defaultSpot: 410.00, lotSize: 1375 },
  { symbol: 'GUJGASLTD', name: 'Gujarat Gas Limited', sector: 'City Gas Distribution', strikeInterval: 10, defaultSpot: 540.00, lotSize: 1250 },

  // Capital Goods & Defense
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', sector: 'Defense & Aerospace', strikeInterval: 50, defaultSpot: 4350.00, lotSize: 150 },
  { symbol: 'BHEL', name: 'Bharat Heavy Electricals', sector: 'Heavy Electrical Equipment', strikeInterval: 5, defaultSpot: 265.00, lotSize: 2625 },
  { symbol: 'SIEMENS', name: 'Siemens Limited', sector: 'Capital Goods & Engineering', strikeInterval: 100, defaultSpot: 7450.00, lotSize: 125 },
  { symbol: 'ABB', name: 'ABB India Limited', sector: 'Industrial Automation', strikeInterval: 100, defaultSpot: 8120.00, lotSize: 125 },
  { symbol: 'CUMMINSIND', name: 'Cummins India Ltd.', sector: 'Engines & Power Gen', strikeInterval: 50, defaultSpot: 3740.00, lotSize: 200 },
  { symbol: 'POLYCAB', name: 'Polycab India Ltd.', sector: 'Cables & Electricals', strikeInterval: 100, defaultSpot: 6920.00, lotSize: 125 },
  { symbol: 'HAVELLS', name: 'Havells India Ltd.', sector: 'Electrical Consumer Goods', strikeInterval: 20, defaultSpot: 1780.00, lotSize: 500 },

  // Consumer, Retail & Realty
  { symbol: 'DLF', name: 'DLF Limited', sector: 'Real Estate & Property', strikeInterval: 10, defaultSpot: 885.00, lotSize: 825 },
  { symbol: 'GODREJPROP', name: 'Godrej Properties Ltd.', sector: 'Real Estate & Property', strikeInterval: 50, defaultSpot: 2980.00, lotSize: 225 },
  { symbol: 'OBEROIRLTY', name: 'Oberoi Realty Ltd.', sector: 'Real Estate & Property', strikeInterval: 20, defaultSpot: 1980.00, lotSize: 350 },
  { symbol: 'INDHOTEL', name: 'The Indian Hotels Co.', sector: 'Hotels & Hospitality', strikeInterval: 10, defaultSpot: 780.00, lotSize: 1000 },
  { symbol: 'JUBLFOOD', name: 'Jubilant FoodWorks Ltd.', sector: 'Restaurants & Fast Food', strikeInterval: 10, defaultSpot: 615.00, lotSize: 1250 },
  { symbol: 'VOLTAS', name: 'Voltas Limited', sector: 'Air Conditioning & Cooling', strikeInterval: 20, defaultSpot: 1780.00, lotSize: 375 },
  { symbol: 'CROMPTON', name: 'Crompton Greaves Consumer', sector: 'Consumer Electricals', strikeInterval: 5, defaultSpot: 410.00, lotSize: 1800 },
  { symbol: 'DIXON', name: 'Dixon Technologies Ltd.', sector: 'Electronics Manufacturing', strikeInterval: 250, defaultSpot: 14850.00, lotSize: 50 },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd.', sector: 'Adhesives & Chemicals', strikeInterval: 50, defaultSpot: 3120.00, lotSize: 250 },
  { symbol: 'SRF', name: 'SRF Limited', sector: 'Specialty Chemicals', strikeInterval: 50, defaultSpot: 2340.00, lotSize: 375 },
  { symbol: 'AARTIIND', name: 'Aarti Industries Ltd.', sector: 'Chemicals', strikeInterval: 10, defaultSpot: 510.00, lotSize: 1000 },
  { symbol: 'DEEPAKNTR', name: 'Deepak Nitrite Ltd.', sector: 'Chemicals', strikeInterval: 50, defaultSpot: 2780.00, lotSize: 300 }
];

export function getFnoStockBySymbol(symbol: string): FnoStock | undefined {
  const clean = symbol.replace('NSE:', '').trim().toUpperCase();
  return FNO_STOCKS.find(s => s.symbol.toUpperCase() === clean);
}
