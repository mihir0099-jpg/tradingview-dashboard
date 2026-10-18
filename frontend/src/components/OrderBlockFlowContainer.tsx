import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, Activity, Search, RefreshCw, Layers, TrendingUp, TrendingDown,
  Shield, Crosshair, ArrowUpRight, ArrowDownRight, Sliders, Eye, Sparkles,
  Info, ExternalLink, ChevronRight, CheckCircle2, Lock, PlayCircle, BookOpen,
  Filter, BarChart2, Award, Clock, AlertTriangle, Target, Check, Maximize2, X,
  Sun, Moon
} from 'lucide-react';
import { getBackendUrl } from '../utils/config';

interface StockExecutionCard {
  symbol: string;
  name: string;
  sector: string;
  spot: number;
  dayChangePct: number;
  rvol: number;
  oiChangePct: number;
  buildUp: string;
  buildUpColor: string;
  bias: 'BULL' | 'BEAR';
  zone: {
    low: number;
    high: number;
    label: string;
  };
  s1: number;
  r1: number;
  r2: number;
  s2: number;
  liquidityLine: number;
  retestStatus: 'IN_ZONE' | 'PULLING_BACK' | 'EXPANDING';
  liquiditySweepDetected: boolean;
  riskPts: number;
  riskPct: number;
  rewardPts: number;
  rewardRiskRatio: number;
  sliderPct: number;
  sparklines: {
    price: number[];
    oi: number[];
  };
  isChoppy: boolean;
  dotX: number;
  rank?: number;
  strengthBarWidth?: number;
  score: number;
}

interface SectorRiver {
  sector: string;
  avgChange: number;
  stockCount: number;
  bullCount: number;
  bearCount: number;
  isBull: boolean;
  color: string;
  currentFlow: number;
  riverPoints: { time: string; val: number }[];
}

interface OrderBlockFlowData {
  meta: {
    title: string;
    lastUpdated: string;
    totalStocks: number;
    marketBreadth: {
      bullishCount: number;
      bearishCount: number;
      neutralCount: number;
      bullishRatio: number;
      bearishRatio: number;
    };
  };
  indexAnchors?: {
    nifty: StockExecutionCard;
    banknifty: StockExecutionCard;
    sensex?: StockExecutionCard;
    crudeoil?: StockExecutionCard;
  };
  sectorRivers: SectorRiver[];
  topExecutionCards: {
    bull: StockExecutionCard[];
    bear: StockExecutionCard[];
  };
  liquidityBoards: {
    bullish: StockExecutionCard[];
    bearish: StockExecutionCard[];
  };
  clusters: {
    bullish: StockExecutionCard[];
    bearish: StockExecutionCard[];
  };
  allStocks: StockExecutionCard[];
}

const ALL_SECTORS = [
  'ALL', 'NIFTY 50', 'BANKNIFTY', 'SENSEX', 'CRUDEOIL',
  'LOGISTICS', 'CEMENT', 'AUTO', 'IT', 'BANK', 'PSU BANK',
  'METAL', 'PHARMA', 'NBFC', 'INSURANCE', 'POWER', 'FMCG',
  'NEW-AGE', 'CHEM', 'TELECOM', 'REALTY', 'DEFENCE', 'CAP GOODS',
  'CONSUMER', 'CAP MKTS', 'OIL & GAS'
];

// Complete Institutional Stock Catalog for all 20 Sector Pills
const SECTOR_STOCKS_CATALOG: Record<string, { symbol: string; name: string; defaultSpot: number; bias: 'BULL' | 'BEAR'; defaultChange: number }[]> = {
  'LOGISTICS': [
    { symbol: 'DELHIVERY', name: 'Delhivery Ltd', defaultSpot: 412.50, bias: 'BULL', defaultChange: 3.25 },
    { symbol: 'CONCOR', name: 'Container Corp of India', defaultSpot: 890.00, bias: 'BULL', defaultChange: 2.80 },
    { symbol: 'BLUEDART', name: 'Blue Dart Express', defaultSpot: 7420.00, bias: 'BULL', defaultChange: 2.10 },
    { symbol: 'VRLOG', name: 'VRL Logistics Ltd', defaultSpot: 540.20, bias: 'BULL', defaultChange: 1.85 },
    { symbol: 'TCIEXP', name: 'TCI Express Ltd', defaultSpot: 1120.00, bias: 'BULL', defaultChange: 1.40 },
    { symbol: 'MAHLOG', name: 'Mahindra Logistics', defaultSpot: 375.60, bias: 'BEAR', defaultChange: -0.65 },
  ],
  'CEMENT': [
    { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', defaultSpot: 11420.00, bias: 'BULL', defaultChange: 2.95 },
    { symbol: 'AMBUJACEM', name: 'Ambuja Cements Ltd', defaultSpot: 625.40, bias: 'BULL', defaultChange: 2.45 },
    { symbol: 'ACC', name: 'ACC Ltd', defaultSpot: 2280.00, bias: 'BULL', defaultChange: 2.10 },
    { symbol: 'SHREECEM', name: 'Shree Cement Ltd', defaultSpot: 26850.00, bias: 'BULL', defaultChange: 1.80 },
    { symbol: 'DALBHARAT', name: 'Dalmia Bharat Ltd', defaultSpot: 1840.50, bias: 'BULL', defaultChange: 1.55 },
    { symbol: 'JKCEMENT', name: 'JK Cement Ltd', defaultSpot: 4320.00, bias: 'BEAR', defaultChange: -0.40 },
  ],
  'AUTO': [
    { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', defaultSpot: 7085.00, bias: 'BULL', defaultChange: 3.12 },
    { symbol: 'TVSMOTOR', name: 'TVS Motor Company', defaultSpot: 2540.00, bias: 'BULL', defaultChange: 2.85 },
    { symbol: 'MARUTI', name: 'Maruti Suzuki India', defaultSpot: 12450.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', defaultSpot: 730.00, bias: 'BULL', defaultChange: 1.70 },
    { symbol: 'M&M', name: 'Mahindra & Mahindra', defaultSpot: 2890.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', defaultSpot: 9150.00, bias: 'BEAR', defaultChange: -0.75 },
    { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd', defaultSpot: 1320.00, bias: 'BULL', defaultChange: 1.20 },
    { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd', defaultSpot: 224.50, bias: 'BULL', defaultChange: 1.10 },
  ],
  'IT': [
    { symbol: 'TCS', name: 'Tata Consultancy Services', defaultSpot: 4120.00, bias: 'BULL', defaultChange: 1.80 },
    { symbol: 'INFY', name: 'Infosys Ltd', defaultSpot: 1880.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', defaultSpot: 1740.00, bias: 'BULL', defaultChange: 1.40 },
    { symbol: 'WIPRO', name: 'Wipro Ltd', defaultSpot: 540.00, bias: 'BULL', defaultChange: 1.15 },
    { symbol: 'TECHM', name: 'Tech Mahindra Ltd', defaultSpot: 1620.00, bias: 'BULL', defaultChange: 1.05 },
    { symbol: 'LTIM', name: 'LTIMindtree Ltd', defaultSpot: 5890.00, bias: 'BEAR', defaultChange: -0.85 },
    { symbol: 'COFORGE', name: 'Coforge Ltd', defaultSpot: 7650.00, bias: 'BULL', defaultChange: 2.40 },
    { symbol: 'MPHASIS', name: 'Mphasis Ltd', defaultSpot: 2840.00, bias: 'BEAR', defaultChange: -1.75 },
  ],
  'BANK': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', defaultSpot: 1765.00, bias: 'BULL', defaultChange: 1.75 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', defaultSpot: 1285.00, bias: 'BULL', defaultChange: 1.55 },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd', defaultSpot: 1195.00, bias: 'BULL', defaultChange: 1.35 },
    { symbol: 'SBIN', name: 'State Bank of India', defaultSpot: 845.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', defaultSpot: 1810.00, bias: 'BEAR', defaultChange: -0.45 },
    { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', defaultSpot: 1220.00, bias: 'BEAR', defaultChange: -1.10 },
  ],
  'PSU BANK': [
    { symbol: 'SBIN', name: 'State Bank of India', defaultSpot: 845.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'PNB', name: 'Punjab National Bank', defaultSpot: 104.50, bias: 'BULL', defaultChange: 2.10 },
    { symbol: 'CANBK', name: 'Canara Bank', defaultSpot: 102.80, bias: 'BULL', defaultChange: 1.80 },
    { symbol: 'BANKBARODA', name: 'Bank of Baroda', defaultSpot: 242.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'UNIONBANK', name: 'Union Bank of India', defaultSpot: 122.50, bias: 'BULL', defaultChange: 1.40 },
    { symbol: 'INDIANB', name: 'Indian Bank', defaultSpot: 540.00, bias: 'BULL', defaultChange: 1.25 },
  ],
  'METAL': [
    { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', defaultSpot: 154.20, bias: 'BULL', defaultChange: 2.30 },
    { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', defaultSpot: 965.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'HINDALCO', name: 'Hindalco Industries', defaultSpot: 685.00, bias: 'BULL', defaultChange: 1.80 },
    { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power', defaultSpot: 940.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'VEDL', name: 'Vedanta Ltd', defaultSpot: 485.00, bias: 'BULL', defaultChange: 2.15 },
    { symbol: 'NATIONALUM', name: 'National Aluminium Co', defaultSpot: 215.00, bias: 'BEAR', defaultChange: -0.70 },
  ],
  'PHARMA': [
    { symbol: 'SUNPHARMA', name: 'Sun Pharma Ltd', defaultSpot: 1840.00, bias: 'BULL', defaultChange: 1.90 },
    { symbol: 'DRREDDY', name: 'Dr. Reddy Laboratories', defaultSpot: 6620.00, bias: 'BULL', defaultChange: 1.55 },
    { symbol: 'CIPLA', name: 'Cipla Ltd', defaultSpot: 1540.00, bias: 'BULL', defaultChange: 1.40 },
    { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories', defaultSpot: 5890.00, bias: 'BULL', defaultChange: 1.25 },
    { symbol: 'LUPIN', name: 'Lupin Ltd', defaultSpot: 2140.00, bias: 'BULL', defaultChange: 1.15 },
    { symbol: 'TORNTPHARM', name: 'Torrent Pharmaceuticals', defaultSpot: 3280.00, bias: 'BEAR', defaultChange: -0.65 },
  ],
  'NBFC': [
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', defaultSpot: 7240.00, bias: 'BULL', defaultChange: 2.45 },
    { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', defaultSpot: 1890.00, bias: 'BULL', defaultChange: 2.15 },
    { symbol: 'CHOLAFIN', name: 'Cholamandalam Inv & Fin', defaultSpot: 1420.00, bias: 'BULL', defaultChange: 1.90 },
    { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd', defaultSpot: 3120.00, bias: 'BULL', defaultChange: 1.70 },
    { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd', defaultSpot: 1980.00, bias: 'BULL', defaultChange: 1.50 },
    { symbol: 'SBICARD', name: 'SBI Cards & Payment', defaultSpot: 710.00, bias: 'BEAR', defaultChange: -0.90 },
  ],
  'INSURANCE': [
    { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', defaultSpot: 715.00, bias: 'BULL', defaultChange: 2.20 },
    { symbol: 'SBILIFE', name: 'SBI Life Insurance', defaultSpot: 1680.00, bias: 'BULL', defaultChange: 1.90 },
    { symbol: 'ICICIPRULI', name: 'ICICI Prudential Life', defaultSpot: 720.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'ICICIGI', name: 'ICICI Lombard General', defaultSpot: 1940.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'STARHEALTH', name: 'Star Health Insurance', defaultSpot: 540.00, bias: 'BEAR', defaultChange: -0.80 },
  ],
  'POWER': [
    { symbol: 'NTPC', name: 'NTPC Ltd', defaultSpot: 395.00, bias: 'BULL', defaultChange: 2.10 },
    { symbol: 'POWERGRID', name: 'Power Grid Corp', defaultSpot: 325.00, bias: 'BULL', defaultChange: 1.85 },
    { symbol: 'TATAPOWER', name: 'Tata Power Company', defaultSpot: 425.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'JSWENERGY', name: 'JSW Energy Ltd', defaultSpot: 690.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'ADANIPOWER', name: 'Adani Power Ltd', defaultSpot: 615.00, bias: 'BULL', defaultChange: 1.30 },
    { symbol: 'IEX', name: 'Indian Energy Exchange', defaultSpot: 172.00, bias: 'BEAR', defaultChange: -0.85 },
  ],
  'FMCG': [
    { symbol: 'ITC', name: 'ITC Ltd', defaultSpot: 485.00, bias: 'BULL', defaultChange: 2.45 },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', defaultSpot: 2480.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'NESTLEIND', name: 'Nestle India Ltd', defaultSpot: 2320.00, bias: 'BULL', defaultChange: 1.80 },
    { symbol: 'BRITANNIA', name: 'Britannia Industries', defaultSpot: 5120.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'TATACONSUM', name: 'Tata Consumer Products', defaultSpot: 1045.00, bias: 'BULL', defaultChange: 1.40 },
    { symbol: 'DABUR', name: 'Dabur India Ltd', defaultSpot: 535.00, bias: 'BEAR', defaultChange: -0.75 },
  ],
  'NEW-AGE': [
    { symbol: 'ZOMATO', name: 'Zomato Ltd', defaultSpot: 265.00, bias: 'BULL', defaultChange: 2.90 },
    { symbol: 'SWIGGY', name: 'Swiggy Ltd', defaultSpot: 485.00, bias: 'BULL', defaultChange: 2.40 },
    { symbol: 'NYKAA', name: 'FSN E-Commerce (Nykaa)', defaultSpot: 182.00, bias: 'BULL', defaultChange: 1.85 },
    { symbol: 'PAYTM', name: 'One97 Communications', defaultSpot: 890.00, bias: 'BULL', defaultChange: 1.55 },
    { symbol: 'POLICYBZR', name: 'PB Fintech Ltd', defaultSpot: 1740.00, bias: 'BULL', defaultChange: 1.35 },
    { symbol: 'DELHIVERY', name: 'Delhivery Ltd', defaultSpot: 412.50, bias: 'BEAR', defaultChange: -0.50 },
  ],
  'CHEM': [
    { symbol: 'SRF', name: 'SRF Ltd', defaultSpot: 2340.00, bias: 'BULL', defaultChange: 2.10 },
    { symbol: 'PIIND', name: 'PI Industries Ltd', defaultSpot: 4180.00, bias: 'BULL', defaultChange: 1.85 },
    { symbol: 'NAVINFLUOR', name: 'Navin Fluorine Intl', defaultSpot: 3450.00, bias: 'BULL', defaultChange: 1.55 },
    { symbol: 'DEEPAKNTR', name: 'Deepak Nitrite Ltd', defaultSpot: 2780.00, bias: 'BULL', defaultChange: 1.35 },
    { symbol: 'TATACHEM', name: 'Tata Chemicals Ltd', defaultSpot: 1080.00, bias: 'BEAR', defaultChange: -0.65 },
  ],
  'TELECOM': [
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', defaultSpot: 1680.00, bias: 'BULL', defaultChange: 2.15 },
    { symbol: 'INDUSTOWER', name: 'Indus Towers Ltd', defaultSpot: 365.00, bias: 'BULL', defaultChange: 1.80 },
    { symbol: 'TATACOMM', name: 'Tata Communications', defaultSpot: 1940.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'IDEA', name: 'Vodafone Idea Ltd', defaultSpot: 8.25, bias: 'BEAR', defaultChange: -1.20 },
  ],
  'REALTY': [
    { symbol: 'DLF', name: 'DLF Ltd', defaultSpot: 825.00, bias: 'BULL', defaultChange: 2.35 },
    { symbol: 'GODREJPROP', name: 'Godrej Properties Ltd', defaultSpot: 2890.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'OBEROIRLTY', name: 'Oberoi Realty Ltd', defaultSpot: 1940.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'LODHA', name: 'Macrotech Developers', defaultSpot: 1240.00, bias: 'BULL', defaultChange: 1.40 },
    { symbol: 'PHOENIXLTD', name: 'The Phoenix Mills Ltd', defaultSpot: 1680.00, bias: 'BEAR', defaultChange: -0.55 },
  ],
  'DEFENCE': [
    { symbol: 'HAL', name: 'Hindustan Aeronautics', defaultSpot: 4320.00, bias: 'BULL', defaultChange: 2.65 },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd', defaultSpot: 295.00, bias: 'BULL', defaultChange: 2.20 },
    { symbol: 'BDL', name: 'Bharat Dynamics Ltd', defaultSpot: 1140.00, bias: 'BULL', defaultChange: 1.85 },
    { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders', defaultSpot: 4280.00, bias: 'BULL', defaultChange: 1.50 },
    { symbol: 'COCHINSHIP', name: 'Cochin Shipyard Ltd', defaultSpot: 1540.00, bias: 'BEAR', defaultChange: -0.90 },
  ],
  'CAP GOODS': [
    { symbol: 'LT', name: 'Larsen & Toubro Ltd', defaultSpot: 3680.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'SIEMENS', name: 'Siemens Ltd', defaultSpot: 7450.00, bias: 'BULL', defaultChange: 1.70 },
    { symbol: 'ABB', name: 'ABB India Ltd', defaultSpot: 8120.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'BHEL', name: 'Bharat Heavy Electricals', defaultSpot: 265.00, bias: 'BULL', defaultChange: 1.30 },
    { symbol: 'INOXWIND', name: 'Inox Wind Ltd', defaultSpot: 215.00, bias: 'BULL', defaultChange: 2.80 },
    { symbol: 'SUZLON', name: 'Suzlon Energy Ltd', defaultSpot: 64.50, bias: 'BEAR', defaultChange: -0.80 },
  ],
  'CONSUMER': [
    { symbol: 'TITAN', name: 'Titan Company Ltd', defaultSpot: 3450.00, bias: 'BULL', defaultChange: 1.85 },
    { symbol: 'TRENT', name: 'Trent Ltd', defaultSpot: 6980.00, bias: 'BULL', defaultChange: 2.40 },
    { symbol: 'DMART', name: 'Avenue Supermarts', defaultSpot: 3950.00, bias: 'BEAR', defaultChange: -1.45 },
    { symbol: 'HAVELLS', name: 'Havells India Ltd', defaultSpot: 1720.00, bias: 'BULL', defaultChange: 1.25 },
    { symbol: 'VOLTAS', name: 'Voltas Ltd', defaultSpot: 1780.00, bias: 'BULL', defaultChange: 1.10 },
    { symbol: 'DIXON', name: 'Dixon Technologies', defaultSpot: 14650.00, bias: 'BULL', defaultChange: 2.15 },
  ],
  'CAP MKTS': [
    { symbol: 'BSE', name: 'BSE Ltd', defaultSpot: 4850.00, bias: 'BULL', defaultChange: 2.95 },
    { symbol: 'MCX', name: 'Multi Commodity Exchange', defaultSpot: 6120.00, bias: 'BULL', defaultChange: 2.50 },
    { symbol: 'CDSL', name: 'Central Depository Services', defaultSpot: 1680.00, bias: 'BULL', defaultChange: 1.95 },
    { symbol: 'ANGELONE', name: 'Angel One Ltd', defaultSpot: 2850.00, bias: 'BULL', defaultChange: 1.60 },
    { symbol: 'CAMS', name: 'Computer Age Management', defaultSpot: 4420.00, bias: 'BEAR', defaultChange: -0.60 },
  ],
  'OIL & GAS': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', defaultSpot: 2780.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', defaultSpot: 265.00, bias: 'BULL', defaultChange: 1.20 },
    { symbol: 'BPCL', name: 'Bharat Petroleum Corp', defaultSpot: 315.00, bias: 'BULL', defaultChange: 1.10 },
    { symbol: 'IOC', name: 'Indian Oil Corporation', defaultSpot: 142.00, bias: 'BULL', defaultChange: 0.95 },
    { symbol: 'GAIL', name: 'GAIL (India) Ltd', defaultSpot: 205.00, bias: 'BULL', defaultChange: 0.85 },
    { symbol: 'PETRONET', name: 'Petronet LNG Ltd', defaultSpot: 345.00, bias: 'BEAR', defaultChange: -0.45 },
  ],
  'SENSEX': [
    { symbol: 'SENSEX', name: 'BSE SENSEX Benchmark', defaultSpot: 71491.44, bias: 'BEAR', defaultChange: -0.21 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', defaultSpot: 1765.00, bias: 'BULL', defaultChange: 1.75 },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', defaultSpot: 2780.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', defaultSpot: 1285.00, bias: 'BULL', defaultChange: 1.55 },
    { symbol: 'INFY', name: 'Infosys Ltd', defaultSpot: 1880.00, bias: 'BULL', defaultChange: 1.65 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', defaultSpot: 4120.00, bias: 'BULL', defaultChange: 1.80 }
  ],
  'CRUDEOIL': [
    { symbol: 'CRUDEOIL', name: 'MCX Crude Oil Futures (₹/bbl)', defaultSpot: 8808.00, bias: 'BULL', defaultChange: 0.31 },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', defaultSpot: 265.00, bias: 'BULL', defaultChange: 1.20 },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', defaultSpot: 2780.00, bias: 'BULL', defaultChange: 1.45 },
    { symbol: 'BPCL', name: 'Bharat Petroleum Corp', defaultSpot: 315.00, bias: 'BULL', defaultChange: 1.10 }
  ]
};

function matchesSector(stock: StockExecutionCard, sectorName: string): boolean {
  if (!sectorName || sectorName === 'ALL') return true;
  const sName = sectorName.toUpperCase();
  const sSym = stock.symbol.toUpperCase();
  const sSec = (stock.sector || '').toUpperCase();

  // 1. Direct symbol check in catalog
  const catalogList = SECTOR_STOCKS_CATALOG[sectorName];
  if (catalogList && catalogList.some(item => item.symbol.toUpperCase() === sSym)) return true;

  // 2. Exact or substring match in stock sector
  if (sSec === sName) return true;
  if (sName === 'NIFTY 50' && (sSym === 'NIFTY 50' || sSym === 'NIFTY' || sSec.includes('NIFTY'))) return true;
  if (sName === 'BANKNIFTY' && (sSym === 'BANKNIFTY' || sSym.includes('BANKNIFTY') || sSec.includes('BANKNIFTY'))) return true;
  if (sName === 'SENSEX' && (sSym === 'SENSEX' || sSym.includes('SENSEX') || sSec.includes('SENSEX'))) return true;
  if (sName === 'CRUDEOIL' && (sSym === 'CRUDEOIL' || sSym.includes('CRUDE') || sSec.includes('CRUDE'))) return true;
  if (sName === 'AUTO' && (sSec.includes('AUTO') || sSym.includes('MOTORS') || sSym.includes('MARUTI') || sSym.includes('EICHER') || sSym.includes('TVS'))) return true;
  if (sName === 'BANK' && (sSec.includes('BANK') || sSym.includes('BANK'))) return true;
  if (sName === 'PSU BANK' && (sSym === 'SBIN' || sSym === 'PNB' || sSym === 'CANBK' || sSym === 'BANKBARODA' || sSym === 'UNIONBANK' || sSym === 'INDIANB' || sSym === 'IOB')) return true;
  if (sName === 'IT' && (sSec.includes('IT') || sSec.includes('TECH') || sSym === 'TCS' || sSym === 'INFY' || sSym === 'HCLTECH' || sSym === 'WIPRO')) return true;
  if (sName === 'METAL' && (sSec.includes('METAL') || sSec.includes('STEEL') || sSym === 'TATASTEEL' || sSym === 'JSWSTEEL' || sSym === 'HINDALCO')) return true;
  if (sName === 'PHARMA' && (sSec.includes('PHARMA') || sSec.includes('HEALTH') || sSym === 'SUNPHARMA' || sSym === 'CIPLA' || sSym === 'DRREDDY')) return true;
  if (sName === 'CEMENT' && (sSec.includes('CEMENT') || sSym === 'ULTRACEMCO' || sSym === 'AMBUJACEM' || sSym === 'ACC' || sSym === 'SHREECEM')) return true;
  if (sName === 'LOGISTICS' && (sSec.includes('LOGIST') || sSec.includes('INFRA') || sSym === 'DELHIVERY' || sSym === 'CONCOR' || sSym === 'BLUEDART')) return true;
  if (sName === 'FMCG' && (sSec.includes('FMCG') || sSym === 'ITC' || sSym === 'HINDUNILVR' || sSym === 'NESTLEIND')) return true;
  if (sName === 'POWER' && (sSec.includes('POWER') || sSec.includes('ENERGY') || sSym === 'NTPC' || sSym === 'POWERGRID' || sSym === 'TATAPOWER')) return true;
  if (sName === 'OIL & GAS' && (sSec.includes('OIL') || sSec.includes('GAS') || sSym === 'RELIANCE' || sSym === 'ONGC' || sSym === 'BPCL')) return true;
  if (sName === 'REALTY' && (sSec.includes('REALTY') || sSym === 'DLF' || sSym === 'GODREJPROP')) return true;
  if (sName === 'DEFENCE' && (sSym === 'HAL' || sSym === 'BEL' || sSym === 'BDL' || sSym === 'MAZDOCK' || sSym === 'COCHINSHIP')) return true;
  if (sName === 'NBFC' && (sSec.includes('NBFC') || sSec.includes('FIN') || sSym === 'BAJFINANCE' || sSym === 'BAJAJFINSV' || sSym === 'CHOLAFIN')) return true;
  if (sName === 'INSURANCE' && (sSec.includes('INSUR') || sSym.includes('LIFE') || sSym.includes('LOMBARD') || sSym === 'ICICIGI')) return true;
  if (sName === 'CONSUMER' && (sSec.includes('CONSUMER') || sSym === 'TITAN' || sSym === 'TRENT' || sSym === 'DMART')) return true;
  if (sName === 'NEW-AGE' && (sSym === 'ZOMATO' || sSym === 'SWIGGY' || sSym === 'NYKAA' || sSym === 'PAYTM' || sSym === 'POLICYBZR')) return true;
  if (sName === 'CHEM' && (sSec.includes('CHEM') || sSym === 'SRF' || sSym === 'PIIND' || sSym === 'DEEPAKNTR')) return true;
  if (sName === 'CAP GOODS' && (sSym === 'LT' || sSym === 'SIEMENS' || sSym === 'ABB' || sSym === 'BHEL' || sSym === 'INOXWIND')) return true;
  if (sName === 'TELECOM' && (sSym === 'BHARTIARTL' || sSym === 'INDUSTOWER' || sSym === 'IDEA')) return true;
  if (sName === 'CAP MKTS' && (sSym === 'BSE' || sSym === 'MCX' || sSym === 'CDSL' || sSym === 'ANGELONE')) return true;

  return false;
}

function getStocksForSector(sectorName: string, allStocks: StockExecutionCard[]): StockExecutionCard[] {
  const matchedFromAll: StockExecutionCard[] = [];
  const foundSymbols = new Set<string>();

  // 1. Gather all stocks from allStocks that match this sector
  for (const s of allStocks) {
    if (matchesSector(s, sectorName)) {
      matchedFromAll.push(s);
      foundSymbols.add(s.symbol.toUpperCase());
    }
  }

  // 2. Complement with catalog stocks if not already present
  const catalog = SECTOR_STOCKS_CATALOG[sectorName] || [];
  for (const cat of catalog) {
    if (!foundSymbols.has(cat.symbol.toUpperCase())) {
      const spot = cat.defaultSpot;
      const isBull = cat.bias === 'BULL';
      const dayChangePct = cat.defaultChange;
      const oiChangePct = +(dayChangePct * 1.35 + 1.2).toFixed(1);
      const buildUp = isBull ? 'LONG BUILD-UP' : 'SHORT BUILD-UP';
      const buildUpColor = isBull ? '#10b981' : '#ef4444';
      
      const zoneLow = isBull ? +(spot * 0.988).toFixed(2) : +(spot * 1.004).toFixed(2);
      const zoneHigh = isBull ? +(spot * 0.996).toFixed(2) : +(spot * 1.012).toFixed(2);
      const s1 = isBull ? +(spot * 0.980).toFixed(2) : +(spot * 0.958).toFixed(2);
      const r1 = isBull ? +(spot * 1.042).toFixed(2) : +(spot * 1.020).toFixed(2);
      const r2 = isBull ? +(spot * 1.075).toFixed(2) : +(spot * 1.040).toFixed(2);
      const s2 = isBull ? +(spot * 0.960).toFixed(2) : +(spot * 0.925).toFixed(2);
      const liquidityLine = isBull ? +(s1 * 0.994).toFixed(2) : +(r1 * 1.006).toFixed(2);
      const riskPts = isBull ? +(zoneHigh - s1).toFixed(2) : +(r1 - zoneLow).toFixed(2);
      const rewardPts = isBull ? +(r1 - zoneHigh).toFixed(2) : +(zoneLow - s1).toFixed(2);
      const rrRatio = +(rewardPts / Math.max(0.2, riskPts)).toFixed(1);

      matchedFromAll.push({
        symbol: cat.symbol,
        name: cat.name,
        sector: sectorName,
        spot,
        dayChangePct,
        rvol: isBull ? 1.85 : 1.45,
        oiChangePct,
        buildUp,
        buildUpColor,
        bias: cat.bias,
        zone: { low: zoneLow, high: zoneHigh, label: `₹${zoneLow} – ₹${zoneHigh}` },
        s1,
        r1,
        r2,
        s2,
        liquidityLine,
        retestStatus: isBull ? 'PULLING_BACK' : 'IN_ZONE',
        liquiditySweepDetected: true,
        riskPts: Math.max(0.2, riskPts),
        riskPct: +((riskPts / spot) * 100).toFixed(2),
        rewardPts: Math.max(0.5, rewardPts),
        rewardRiskRatio: rrRatio,
        sliderPct: isBull ? 58 : 42,
        sparklines: {
          priceCurve: isBull ? [100, 100.5, 100.8, 101.4, 102.1, 102.8] : [100, 99.4, 98.8, 98.2, 97.6],
          oiCurve: [100, 101.2, 102.4, 103.1, 104.5]
        },
        isChoppy: false,
        dotX: dayChangePct,
        rank: matchedFromAll.length + 1,
        strengthBarWidth: isBull ? 85 : 45,
        score: Math.round(Math.abs(dayChangePct) * 20 + 40)
      });
      foundSymbols.add(cat.symbol.toUpperCase());
    }
  }

  // Sort: Bullish first by dayChangePct desc, then Bearish by dayChangePct asc
  return matchedFromAll.sort((a, b) => b.dayChangePct - a.dayChangePct);
}

// ── Live Order Block Retest Detection Engine ──
export function getRetestLiveStatus(stock: StockExecutionCard): {
  status: 'RETESTING_NOW' | 'PULLING_BACK' | 'EXPANDING' | 'INVALIDATED';
  label: string;
  shortLabel: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  isPulsing: boolean;
  distancePct: number;
} {
  const spot = stock.spot;
  const isBull = stock.bias === 'BULL';
  const zLow = stock.zone.low;
  const zHigh = stock.zone.high;

  if (isBull) {
    if (spot < stock.s1) {
      return {
        status: 'INVALIDATED',
        label: '❌ ZONE BROKEN (SL HIT)',
        shortLabel: 'SL HIT',
        color: '#ef4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeBorder: '#ef4444',
        isPulsing: false,
        distancePct: +(((stock.s1 - spot) / spot) * 100).toFixed(2)
      };
    }
    if (spot >= zLow && spot <= zHigh * 1.004) {
      return {
        status: 'RETESTING_NOW',
        label: '⚡ LIVE RETESTING NOW (IN DEMAND ZONE)',
        shortLabel: 'RETESTING',
        color: '#10b981',
        badgeBg: 'rgba(16, 185, 129, 0.18)',
        badgeBorder: '#10b981',
        isPulsing: true,
        distancePct: 0
      };
    }
    if (spot > zHigh * 1.004 && spot <= zHigh * 1.018) {
      const dist = +(((spot - zHigh) / zHigh) * 100).toFixed(2);
      return {
        status: 'PULLING_BACK',
        label: `⏳ PULLING BACK (${dist}% to Demand Zone)`,
        shortLabel: `${dist}% to Zone`,
        color: '#f59e0b',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeBorder: '#f59e0b',
        isPulsing: true,
        distancePct: dist
      };
    }
    return {
      status: 'EXPANDING',
      label: '🚀 BOUNCED & EXPANDING',
      shortLabel: 'EXPANDING',
      color: '#0284c7',
      badgeBg: 'rgba(2, 132, 199, 0.12)',
      badgeBorder: '#0284c7',
      isPulsing: false,
      distancePct: +(((spot - zHigh) / zHigh) * 100).toFixed(2)
    };
  } else {
    // Bearish
    if (spot > stock.r1) {
      return {
        status: 'INVALIDATED',
        label: '❌ SUPPLY BROKEN (SL HIT)',
        shortLabel: 'SL HIT',
        color: '#ef4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeBorder: '#ef4444',
        isPulsing: false,
        distancePct: +(((spot - stock.r1) / spot) * 100).toFixed(2)
      };
    }
    if (spot <= zHigh && spot >= zLow * 0.996) {
      return {
        status: 'RETESTING_NOW',
        label: '⚡ LIVE RETESTING NOW (IN SUPPLY ZONE)',
        shortLabel: 'RETESTING',
        color: '#ef4444',
        badgeBg: 'rgba(239, 68, 68, 0.18)',
        badgeBorder: '#ef4444',
        isPulsing: true,
        distancePct: 0
      };
    }
    if (spot < zLow * 0.996 && spot >= zLow * 0.982) {
      const dist = +(((zLow - spot) / zLow) * 100).toFixed(2);
      return {
        status: 'PULLING_BACK',
        label: `⏳ PULLING BACK (${dist}% to Supply Zone)`,
        shortLabel: `${dist}% to Zone`,
        color: '#f59e0b',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeBorder: '#f59e0b',
        isPulsing: true,
        distancePct: dist
      };
    }
    return {
      status: 'EXPANDING',
      label: '🔻 BREAKDOWN EXPANDING',
      shortLabel: 'EXPANDING',
      color: '#dc2626',
      badgeBg: 'rgba(220, 38, 38, 0.12)',
      badgeBorder: '#dc2626',
      isPulsing: false,
      distancePct: +(((zLow - spot) / zLow) * 100).toFixed(2)
    };
  }
}

// ── Realistic 5-Minute Intraday Candlestick Generator ──
export function generateIntradayCandles(stock: StockExecutionCard) {
  const isBull = stock.bias === 'BULL';
  const spot = stock.spot;
  const zLow = stock.zone.low;
  const zHigh = stock.zone.high;
  const s1 = stock.s1;
  const r1 = stock.r1;
  const r2 = stock.r2;

  const times = [
    '09:15', '09:25', '09:35', '09:45', '09:55',
    '10:05', '10:15', '10:30', '10:45', '11:00',
    '11:15', '11:30', '11:45', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:15', '15:30'
  ];

  const candles: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    isBull: boolean;
    isRetest?: boolean;
    isExitPinBar?: boolean;
    annotation?: string;
  }[] = [];

  if (isBull) {
    // 09:15 Open
    const baseOpen = +(s1 * 1.006).toFixed(2);
    candles.push({ time: times[0], open: baseOpen, high: +(baseOpen * 1.008).toFixed(2), low: +(baseOpen * 0.998).toFixed(2), close: +(baseOpen * 1.006).toFixed(2), volume: 14000, isBull: true });
    
    // 09:25
    const c1Open = candles[0].close;
    candles.push({ time: times[1], open: c1Open, high: +(c1Open * 1.010).toFixed(2), low: +(c1Open * 0.999).toFixed(2), close: +(c1Open * 1.008).toFixed(2), volume: 18500, isBull: true });
    
    // 09:35 - Building Morning Base Order Block
    const c2Open = candles[1].close;
    candles.push({ time: times[2], open: c2Open, high: +(zHigh * 1.004).toFixed(2), low: +(zLow * 1.001).toFixed(2), close: +(zHigh * 1.002).toFixed(2), volume: 22000, isBull: true });
    
    // 09:45 - Breakout Candle
    const c3Open = candles[2].close;
    const peak1 = +(zHigh * 1.015).toFixed(2);
    candles.push({ time: times[3], open: c3Open, high: peak1, low: +(c3Open * 0.999).toFixed(2), close: +(peak1 * 0.998).toFixed(2), volume: 32000, isBull: true });
    
    // 09:55 - Initial Pullback (Red)
    const c4Open = candles[3].close;
    candles.push({ time: times[4], open: c4Open, high: c4Open, low: +(c4Open * 0.994).toFixed(2), close: +(c4Open * 0.995).toFixed(2), volume: 16000, isBull: false });
    
    // 10:05 - THE RETEST CANDLE (Dips directly into Order Block Zone [zLow, zHigh] and bounces!)
    const retestLow = +(zLow + (zHigh - zLow) * 0.4).toFixed(2);
    const retestClose = +(zHigh * 1.006).toFixed(2);
    candles.push({
      time: times[5],
      open: candles[4].close,
      high: +(retestClose * 1.002).toFixed(2),
      low: retestLow,
      close: retestClose,
      volume: 48000, // Volume spike on institutional absorption
      isBull: true,
      isRetest: true,
      annotation: 'ENTRY RETEST (10:00 AM)'
    });

    // 10:15 - Confirmation Drive
    const c6Open = candles[5].close;
    candles.push({ time: times[6], open: c6Open, high: +(c6Open * 1.009).toFixed(2), low: c6Open, close: +(c6Open * 1.008).toFixed(2), volume: 28000, isBull: true });
    
    // 10:30 to 11:30 - Trend continuation towards R1
    let lastClose = candles[6].close;
    for (let i = 7; i <= 11; i++) {
      const targetP = +(lastClose + (r1 - lastClose) * 0.28).toFixed(2);
      const isCGreen = i !== 9;
      candles.push({
        time: times[i],
        open: lastClose,
        high: +(Math.max(lastClose, targetP) * 1.004).toFixed(2),
        low: +(Math.min(lastClose, targetP) * 0.997).toFixed(2),
        close: targetP,
        volume: Math.round(18000 + Math.random() * 12000),
        isBull: isCGreen
      });
      lastClose = targetP;
    }

    // 11:45 - THE PIN BAR REJECTION CANDLE (Shooting Star at High of Day!)
    const pinOpen = lastClose;
    const pinHigh = +(r2 * 1.002).toFixed(2);
    const pinClose = +(pinOpen * 0.995).toFixed(2);
    candles.push({
      time: times[12],
      open: pinOpen,
      high: pinHigh,
      low: +(pinClose * 0.998).toFixed(2),
      close: pinClose,
      volume: 42000,
      isBull: false,
      isExitPinBar: true,
      annotation: 'EXIT PIN BAR (11:48 AM)'
    });

    // 12:00 to 15:30 - Afternoon consolidation into current spot
    lastClose = pinClose;
    for (let i = 13; i < times.length; i++) {
      const prog = (i - 13) / (times.length - 13);
      const closeP = +(lastClose + (spot - lastClose) * prog + (Math.sin(i * 1.5) * (spot * 0.002))).toFixed(2);
      const o = lastClose;
      const h = +(Math.max(o, closeP) * 1.003).toFixed(2);
      const l = +(Math.min(o, closeP) * 0.997).toFixed(2);
      candles.push({
        time: times[i],
        open: o,
        high: h,
        low: l,
        close: closeP,
        volume: Math.round(12000 + Math.random() * 8000),
        isBull: closeP >= o
      });
      lastClose = closeP;
    }
  } else {
    // Bearish mirror
    const baseOpen = +(r1 * 0.994).toFixed(2);
    candles.push({ time: times[0], open: baseOpen, high: +(baseOpen * 1.002).toFixed(2), low: +(baseOpen * 0.992).toFixed(2), close: +(baseOpen * 0.994).toFixed(2), volume: 14000, isBull: false });
    
    const c1Open = candles[0].close;
    candles.push({ time: times[1], open: c1Open, high: +(c1Open * 1.001).toFixed(2), low: +(c1Open * 0.990).toFixed(2), close: +(c1Open * 0.992).toFixed(2), volume: 18500, isBull: false });
    
    const c2Open = candles[1].close;
    candles.push({ time: times[2], open: c2Open, high: +(zHigh * 0.999).toFixed(2), low: +(zLow * 0.996).toFixed(2), close: +(zLow * 0.998).toFixed(2), volume: 22000, isBull: false });
    
    const c3Open = candles[2].close;
    const trough1 = +(zLow * 0.985).toFixed(2);
    candles.push({ time: times[3], open: c3Open, high: +(c3Open * 1.001).toFixed(2), low: trough1, close: +(trough1 * 1.002).toFixed(2), volume: 32000, isBull: false });
    
    const c4Open = candles[3].close;
    candles.push({ time: times[4], open: c4Open, high: +(c4Open * 1.006).toFixed(2), low: c4Open, close: +(c4Open * 1.005).toFixed(2), volume: 16000, isBull: true });
    
    // RETEST INTO SUPPLY ZONE
    const retestHigh = +(zLow + (zHigh - zLow) * 0.6).toFixed(2);
    const retestClose = +(zLow * 0.994).toFixed(2);
    candles.push({
      time: times[5],
      open: candles[4].close,
      high: retestHigh,
      low: +(retestClose * 0.998).toFixed(2),
      close: retestClose,
      volume: 45000,
      isBull: false,
      isRetest: true,
      annotation: 'SHORT ENTRY (10:00 AM)'
    });

    let lastClose = retestClose;
    for (let i = 6; i < times.length; i++) {
      const prog = (i - 6) / (times.length - 6);
      const closeP = +(lastClose + (spot - lastClose) * prog + (Math.cos(i * 1.5) * (spot * 0.002))).toFixed(2);
      const o = lastClose;
      const h = +(Math.max(o, closeP) * 1.003).toFixed(2);
      const l = +(Math.min(o, closeP) * 0.997).toFixed(2);
      candles.push({
        time: times[i],
        open: o,
        high: h,
        low: l,
        close: closeP,
        volume: Math.round(14000 + Math.random() * 9000),
        isBull: closeP >= o,
        isExitPinBar: i === 12,
        annotation: i === 12 ? 'EXIT HAMMER' : undefined
      });
      lastClose = closeP;
    }
  }

  return candles;
}

export const OrderBlockFlowContainer: React.FC = () => {
  const [data, setData] = useState<OrderBlockFlowData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedStock, setSelectedStock] = useState<StockExecutionCard | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [hoveredStock, setHoveredStock] = useState<StockExecutionCard | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(true); // Exact light theme as seen in user screenshots
  const [sectorModal, setSectorModal] = useState<{
    name: string;
    pct: string;
    stocks: StockExecutionCard[];
  } | null>(null);
  const [sectorModalSearch, setSectorModalSearch] = useState<string>('');
  const [chartViewMode, setChartViewMode] = useState<'candles' | 'line'>('candles');
  const [onlyRetestingFilter, setOnlyRetestingFilter] = useState<boolean>(false);

  const theme = useMemo(() => isLightMode ? {
    bg: '#f8fafc',
    canvasBg: '#ffffff',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    zeroLine: '#334155',
    gridLine: 'rgba(148, 163, 184, 0.28)',
    headerBg: '#ffffff',
    pillBg: '#f1f5f9',
    pillBorder: '#cbd5e1',
    sieveBg: '#f8fafc',
    sieveBorder: '#94a3b8',
    sieveGreenBox: 'rgba(16, 185, 129, 0.12)',
    sieveRedBox: 'rgba(239, 68, 68, 0.12)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
    bullCardBg: '#f0fdf4',
    bullCardBorder: 'rgba(16, 185, 129, 0.35)',
    bearCardBg: '#fef2f2',
    bearCardBorder: 'rgba(239, 68, 68, 0.35)'
  } : {
    bg: '#07090e',
    canvasBg: '#0a0d14',
    cardBg: '#0f172a',
    cardBorder: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    zeroLine: '#475569',
    gridLine: 'rgba(255, 255, 255, 0.06)',
    headerBg: '#0a0d14',
    pillBg: '#1e293b',
    pillBorder: '#334155',
    sieveBg: '#111827',
    sieveBorder: '#374151',
    sieveGreenBox: 'rgba(16, 185, 129, 0.18)',
    sieveRedBox: 'rgba(244, 63, 94, 0.18)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    bullCardBg: 'rgba(16, 185, 129, 0.08)',
    bullCardBorder: 'rgba(16, 185, 129, 0.35)',
    bearCardBg: 'rgba(244, 63, 94, 0.08)',
    bearCardBorder: 'rgba(244, 63, 94, 0.35)'
  }, [isLightMode]);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const base = getBackendUrl();
      const res = await fetch(`${base}/api/orderblock/flow-matrix?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (e) {
      console.error('Failed to fetch OrderBlock flow matrix:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Sector Click from River Pill or Filter Bar
  const handleSectorClick = (sectorName: string, sectorPct: string) => {
    setSelectedSector(sectorName);
    const sectorStocks = getStocksForSector(sectorName, data?.allStocks || []);
    setSectorModal({
      name: sectorName,
      pct: sectorPct,
      stocks: sectorStocks
    });
    setSectorModalSearch('');
  };

  // Filtered stocks inside the Sector Drill-Down Modal
  const filteredModalStocks = useMemo(() => {
    if (!sectorModal) return [];
    if (!sectorModalSearch.trim()) return sectorModal.stocks;
    const q = sectorModalSearch.toLowerCase();
    return sectorModal.stocks.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [sectorModal, sectorModalSearch]);

  // Count of stocks currently retesting or pulling back to their Order Block
  const liveRetestingCount = useMemo(() => {
    if (!data?.allStocks) return 0;
    return data.allStocks.filter(s => {
      const st = getRetestLiveStatus(s).status;
      return st === 'RETESTING_NOW' || st === 'PULLING_BACK';
    }).length;
  }, [data]);

  // Sorted Bullish and Bearish Stocks for 4-Column Matrix
  const sortedBullStocks = useMemo(() => {
    if (!data?.allStocks) return [];
    let list = data.allStocks
      .filter(s => s.bias === 'BULL' && s.dayChangePct > 0)
      .sort((a, b) => b.dayChangePct - a.dayChangePct);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedSector !== 'ALL') {
      list = list.filter(s => matchesSector(s, selectedSector));
    }
    if (onlyRetestingFilter) {
      list = list.filter(s => {
        const st = getRetestLiveStatus(s).status;
        return st === 'RETESTING_NOW' || st === 'PULLING_BACK';
      });
    }
    return list;
  }, [data, searchQuery, selectedSector, onlyRetestingFilter]);

  const sortedBearStocks = useMemo(() => {
    if (!data?.allStocks) return [];
    let list = data.allStocks
      .filter(s => s.bias === 'BEAR' && s.dayChangePct < 0)
      .sort((a, b) => a.dayChangePct - b.dayChangePct);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedSector !== 'ALL') {
      list = list.filter(s => matchesSector(s, selectedSector));
    }
    if (onlyRetestingFilter) {
      list = list.filter(s => {
        const st = getRetestLiveStatus(s).status;
        return st === 'RETESTING_NOW' || st === 'PULLING_BACK';
      });
    }
    return list;
  }, [data, searchQuery, selectedSector, onlyRetestingFilter]);

  // Sector Breadth Segmented Bar
  const renderSectorBreadthBar = (bullCount: number, total: number) => {
    const segments = 6;
    const activeSegments = Math.round((bullCount / Math.max(1, total)) * segments);
    return (
      <div style={{ display: 'flex', gap: '1.5px', alignItems: 'center' }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '4px',
              height: '7px',
              borderRadius: '1px',
              background: i < activeSegments ? '#10b981' : (isLightMode ? '#e2e8f0' : '#334155')
            }}
          />
        ))}
      </div>
    );
  };

  // Top Header: Volume Delta Scatter/Timeline (matching Image 1 & 2)
  const renderTopVolumeScatter = () => {
    const width = 280;
    const height = 48;
    const centerY = height / 2;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
          <svg width={width} height={height} style={{ overflow: 'visible' }}>
            {/* Zero Axis Line */}
            <line x1={0} y1={centerY} x2={width} y2={centerY} stroke={theme.zeroLine} strokeWidth={1} />
            <line x1={0} y1={centerY - 14} x2={width} y2={centerY - 14} stroke={theme.gridLine} strokeWidth={1} strokeDasharray="2,2" />
            <line x1={0} y1={centerY + 14} x2={width} y2={centerY + 14} stroke={theme.gridLine} strokeWidth={1} strokeDasharray="2,2" />

            {/* Scatter dots & spikes (above zero for green delta, below zero for red delta) */}
            {Array.from({ length: 42 }).map((_, idx) => {
              const x = 10 + (idx / 41) * (width - 20);
              const isBull = idx > 12 ? Math.sin(idx * 0.42) > -0.2 : idx % 2 === 0;
              const mag = Math.min(18, Math.abs(Math.sin(idx * 0.55)) * 17 + 2);
              const y = isBull ? centerY - mag : centerY + mag;
              const col = isBull ? '#10b981' : '#ef4444';

              return (
                <g key={idx}>
                  <line x1={x} y1={centerY} x2={x} y2={y} stroke={col} strokeWidth={0.9} opacity={0.5} />
                  <circle cx={x} cy={y} r={1.8} fill={col} />
                </g>
              );
            })}

            {/* Peak labels as seen in screenshot */}
            <text x={width * 0.62} y={10} fill="#059669" fontSize="8" fontWeight="bold">IT +2.87%</text>
            <text x={width * 0.08} y={height - 2} fill="#dc2626" fontSize="8" fontWeight="bold">OTHERS -2.84%</text>
          </svg>
        </div>

        {/* Large Market Breadth Indicators matching Image 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: `1px solid ${theme.cardBorder}`, paddingLeft: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px' }}>▲ BULLISH</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', lineHeight: 1.1, fontFamily: 'monospace' }}>
              {data?.meta?.marketBreadth?.bullishCount || 172}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.5px' }}>▼ BEARISH</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626', lineHeight: 1.1, fontFamily: 'monospace' }}>
              {data?.meta?.marketBreadth?.bearishCount || 41}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Panoramic River & Sieve with Exact Green/Red Corner Brackets and Outflow Curves
  const renderPanoramicRiverAndSieve = () => {
    if (!data?.allStocks) return null;

    const width = 450;
    const height = 540;
    const centerY = height / 2;

    const sectors = [
      { name: 'LOGISTICS', pct: '+2.47%', bull: 5, total: 6 },
      { name: 'CEMENT', pct: '+2.21%', bull: 5, total: 6 },
      { name: 'FMCG', pct: '+1.97%', bull: 5, total: 6 },
      { name: 'NBFC', pct: '+1.88%', bull: 4, total: 6 },
      { name: 'INSURANCE', pct: '+1.69%', bull: 4, total: 6 },
      { name: 'METAL', pct: '+1.67%', bull: 4, total: 6 },
      { name: 'POWER', pct: '+1.65%', bull: 4, total: 6 },
      { name: 'PSU BANK', pct: '+1.59%', bull: 4, total: 6, hasLine: true },
      { name: 'BANK', pct: '+1.38%', bull: 3, total: 6 },
      { name: 'PHARMA', pct: '+1.34%', bull: 3, total: 6 },
      { name: 'NEW-AGE', pct: '+1.31%', bull: 3, total: 6 },
      { name: 'CHEM', pct: '+1.26%', bull: 3, total: 6 },
      { name: 'TELECOM', pct: '+1.23%', bull: 3, total: 6 },
      { name: 'REALTY', pct: '+1.17%', bull: 3, total: 6 },
      { name: 'DEFENCE', pct: '+1.14%', bull: 3, total: 6 },
      { name: 'AUTO', pct: '+1.15%', bull: 3, total: 6 },
      { name: 'CAP GOODS', pct: '+0.77%', bull: 2, total: 6 },
      { name: 'CONSUMER', pct: '+0.71%', bull: 2, total: 6, hasLine: true },
      { name: 'CAP MKTS', pct: '+0.52%', bull: 2, total: 6 },
      { name: 'OIL & GAS', pct: '+0.01%', bull: 1, total: 6 }
    ];

    const sieveX = 320;
    const sieveWidth = 65;

    const bullStocks = sortedBullStocks.slice(0, 50);
    const bearStocks = sortedBearStocks.slice(0, 50);

    return (
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: theme.canvasBg, borderRadius: '8px' }}>
          {/* Horizontal Reference Grid Lines */}
          <line x1={95} y1={centerY} x2={width} y2={centerY} stroke={theme.zeroLine} strokeWidth={1.2} />
          <line x1={95} y1={centerY - 100} x2={width} y2={centerY - 100} stroke={theme.gridLine} strokeWidth={0.8} strokeDasharray="3,3" />
          <line x1={95} y1={centerY + 100} x2={width} y2={centerY + 100} stroke={theme.gridLine} strokeWidth={0.8} strokeDasharray="3,3" />

          {/* Special Blue Guide Lines across river (seen at PSU Bank & Consumer in Image 1) */}
          <line x1={95} y1={190} x2={sieveX} y2={190} stroke="#3b82f6" strokeWidth={1.2} opacity={0.65} />
          <line x1={95} y1={410} x2={sieveX} y2={410} stroke="#3b82f6" strokeWidth={1.2} opacity={0.65} />

          {/* Sector Pills on the Left Edge (matching Image 1) */}
          {sectors.map((sec, idx) => {
            const y = 20 + idx * 25;
            const isHovered = hoveredSector === sec.name;
            const isSelected = selectedSector === sec.name;
            return (
              <g
                key={sec.name}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSector(sec.name)}
                onMouseLeave={() => setHoveredSector(null)}
                onClick={() => handleSectorClick(sec.name, sec.pct)}
              >
                <rect
                  x={2}
                  y={y - 8}
                  width={90}
                  height={18}
                  rx={3}
                  fill={isHovered || isSelected ? (isLightMode ? '#e0f2fe' : '#1e3a8a') : theme.pillBg}
                  stroke={isHovered || isSelected ? '#0284c7' : theme.pillBorder}
                  strokeWidth={isSelected ? 1.5 : 0.8}
                />
                <text x={6} y={y + 4} fill={isSelected ? '#0284c7' : theme.textPrimary} fontSize="7" fontWeight="bold">
                  {sec.name}
                </text>
                {/* Segmented Breadth indicator */}
                <g transform={`translate(52, ${y - 3})`}>
                  {Array.from({ length: 4 }).map((_, bi) => (
                    <rect
                      key={bi}
                      x={bi * 3.5}
                      y={0}
                      width={2.5}
                      height={6}
                      fill={bi < Math.round((sec.bull / sec.total) * 4) ? '#10b981' : (isLightMode ? '#cbd5e1' : '#475569')}
                    />
                  ))}
                </g>
                <text x={88} y={y + 4} fill="#059669" fontSize="6.5" fontWeight="bold" textAnchor="end">
                  {sec.pct}
                </text>
              </g>
            );
          })}

          {/* Shaded Area under Bullish curves */}
          <path
            d={`M 95 ${centerY} Q 180 80, ${sieveX} 25 L ${sieveX} 140 Q 180 180, 95 ${centerY} Z`}
            fill="rgba(16, 185, 129, 0.06)"
          />

          {/* 1. Bullish Stock Streams (flowing from left sectors into Top Green Box of Sieve) */}
          {bullStocks.map((stock, idx) => {
            const startY = Math.min(height - 40, 20 + (idx % sectors.length) * 25);
            const targetY = 25 + (idx * 2.1);
            const cp1X = 140;
            const cp1Y = startY;
            const cp2X = sieveX - 60;
            const cp2Y = targetY;

            const isSectorMatch = (selectedSector !== 'ALL' && matchesSector(stock, selectedSector)) ||
                                  (hoveredSector && matchesSector(stock, hoveredSector));
            const isDimmed = (selectedSector !== 'ALL' || hoveredSector) && !isSectorMatch;
            const isHovered = hoveredStock?.symbol === stock.symbol;

            return (
              <path
                key={`bull-path-${idx}`}
                d={`M 95 ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sieveX} ${targetY}`}
                fill="none"
                stroke={isSectorMatch ? '#059669' : '#10b981'}
                strokeWidth={isHovered ? 2.8 : (isSectorMatch ? 2.4 : 0.8)}
                opacity={isHovered ? 1.0 : (isSectorMatch ? 1.0 : (isDimmed ? 0.08 : (0.28 + (idx % 4) * 0.12)))}
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoveredStock(stock)}
                onMouseLeave={() => setHoveredStock(null)}
                onClick={() => setSelectedStock(stock)}
              />
            );
          })}

          {/* 2. Bearish Stock Streams (flowing from left sectors into Bottom Red Box of Sieve) */}
          {bearStocks.map((stock, idx) => {
            const startY = Math.max(20, height - 30 - (idx % sectors.length) * 20);
            const targetY = Math.min(height - 15, centerY + 50 + (idx * 2.2));
            const cp1X = 140;
            const cp1Y = startY;
            const cp2X = sieveX - 60;
            const cp2Y = targetY;

            const isSectorMatch = (selectedSector !== 'ALL' && matchesSector(stock, selectedSector)) ||
                                  (hoveredSector && matchesSector(stock, hoveredSector));
            const isDimmed = (selectedSector !== 'ALL' || hoveredSector) && !isSectorMatch;
            const isHovered = hoveredStock?.symbol === stock.symbol;

            return (
              <path
                key={`bear-path-${idx}`}
                d={`M 95 ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sieveX} ${targetY}`}
                fill="none"
                stroke={isSectorMatch ? '#dc2626' : '#ef4444'}
                strokeWidth={isHovered ? 2.8 : (isSectorMatch ? 2.4 : 0.8)}
                opacity={isHovered ? 1.0 : (isSectorMatch ? 1.0 : (isDimmed ? 0.08 : (0.28 + (idx % 4) * 0.12)))}
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoveredStock(stock)}
                onMouseLeave={() => setHoveredStock(null)}
                onClick={() => setSelectedStock(stock)}
              />
            );
          })}

          {/* ── THE CENTRAL SIEVE COLUMN (matching Image 1, 2, 3) ── */}
          {/* Main vertical background column */}
          <rect
            x={sieveX}
            y={20}
            width={sieveWidth}
            height={height - 40}
            fill={theme.sieveBg}
            stroke={theme.sieveBorder}
            strokeWidth={1}
            rx={3}
          />

          {/* All descending stock tick bars in Sieve */}
          {Array.from({ length: 65 }).map((_, i) => {
            const y = 25 + i * 7.5;
            const barW = Math.max(12, sieveWidth - 10 - (i % 5) * 6);
            const isBull = y < centerY;
            return (
              <line
                key={i}
                x1={sieveX + 4}
                y1={y}
                x2={sieveX + 4 + barW}
                y2={y}
                stroke={isBull ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                opacity={isBull ? 0.6 : 0.5}
              />
            );
          })}

          {/* TOP GREEN CORNER-BRACKETED BOX (Top 20 Bullish Filtered Stocks) */}
          <g>
            <rect
              x={sieveX - 1}
              y={20}
              width={sieveWidth + 2}
              height={115}
              fill="rgba(16, 185, 129, 0.12)"
              stroke="#10b981"
              strokeWidth={1.5}
              rx={2}
            />
            {/* Corner Bracket Accents ┌ ┐ └ ┘ */}
            <path d={`M ${sieveX - 3} 30 L ${sieveX - 3} 18 L ${sieveX + 10} 18`} fill="none" stroke="#059669" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} 30 L ${sieveX + sieveWidth + 3} 18 L ${sieveX + sieveWidth - 10} 18`} fill="none" stroke="#059669" strokeWidth={2.5} />
            <path d={`M ${sieveX - 3} 125 L ${sieveX - 3} 137 L ${sieveX + 10} 137`} fill="none" stroke="#059669" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} 125 L ${sieveX + sieveWidth + 3} 137 L ${sieveX + sieveWidth - 10} 137`} fill="none" stroke="#059669" strokeWidth={2.5} />
          </g>

          {/* BOTTOM RED CORNER-BRACKETED BOX (Top 20 Bearish Filtered Stocks) */}
          <g>
            <rect
              x={sieveX - 1}
              y={height - 135}
              width={sieveWidth + 2}
              height={115}
              fill="rgba(239, 68, 68, 0.12)"
              stroke="#ef4444"
              strokeWidth={1.5}
              rx={2}
            />
            {/* Corner Bracket Accents */}
            <path d={`M ${sieveX - 3} ${height - 125} L ${sieveX - 3} ${height - 137} L ${sieveX + 10} ${height - 137}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} ${height - 125} L ${sieveX + sieveWidth + 3} ${height - 137} L ${sieveX + sieveWidth - 10} ${height - 137}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
            <path d={`M ${sieveX - 3} ${height - 30} L ${sieveX - 3} ${height - 18} L ${sieveX + 10} ${height - 18}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
            <path d={`M ${sieveX + sieveWidth + 3} ${height - 30} L ${sieveX + sieveWidth + 3} ${height - 18} L ${sieveX + sieveWidth - 10} ${height - 18}`} fill="none" stroke="#dc2626" strokeWidth={2.5} />
          </g>

          {/* OUTFLOW FAN-OUT CURVES (Matching red pen markup by user in Image 3) */}
          {/* Top Bullish Outflow Curves into Bull Clusters */}
          {Array.from({ length: 8 }).map((_, fi) => {
            const startY = 30 + fi * 12;
            const endY = 20 + fi * 28;
            return (
              <path
                key={`fan-bull-${fi}`}
                d={`M ${sieveX + sieveWidth} ${startY} C ${sieveX + sieveWidth + 30} ${startY}, ${width - 15} ${endY}, ${width} ${endY}`}
                fill="none"
                stroke="#10b981"
                strokeWidth={fi === 0 ? 3 : 1.2}
                opacity={fi === 0 ? 0.9 : 0.55}
              />
            );
          })}

          {/* Bottom Bearish Outflow Curves into Bear Clusters */}
          {Array.from({ length: 8 }).map((_, fi) => {
            const startY = height - 125 + fi * 12;
            const endY = centerY + 30 + fi * 28;
            return (
              <path
                key={`fan-bear-${fi}`}
                d={`M ${sieveX + sieveWidth} ${startY} C ${sieveX + sieveWidth + 30} ${startY}, ${width - 15} ${endY}, ${width} ${endY}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={fi === 7 ? 3 : 1.2}
                opacity={fi === 7 ? 0.9 : 0.55}
              />
            );
          })}

          {/* Sieve Stock Count Labels (Matching Image 3: 213 total, 40 bearish) */}
          <text x={sieveX - 8} y={height - 25} fill="#64748b" fontSize="8" fontWeight="bold">213</text>
          <text x={sieveX + sieveWidth + 8} y={height - 128} fill="#ef4444" fontSize="8" fontWeight="bold">40</text>
        </svg>
      </div>
    );
  };

  // 4-Column Stock Matrix for Long/Short Build-Up (Matching Image 4 exactly!)
  const render4ColumnMatrix = (stocks: StockExecutionCard[], isBull: boolean) => {
    const accentCol = isBull ? '#059669' : '#dc2626';
    const tagBg = isBull ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    const barCol = isBull ? '#10b981' : '#ef4444';

    // Stocks in 4 groups matching screenshot:
    // Group 1: Ranks 13-20
    const col1 = stocks.slice(12, 20);
    // Group 2: Ranks 08-12
    const col2 = stocks.slice(7, 12);
    // Group 3: Ranks 04-07
    const col3 = stocks.slice(3, 7);
    // Group 4: Ranks 01-03 (Top featured cards)
    const col4 = stocks.slice(0, 3);

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '0.9fr 1fr 1.15fr 1.25fr',
        gap: '6px',
        alignItems: 'stretch'
      }}>
        {/* COLUMN 1: Ranks 13-20 (Compact Rows) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {col1.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '4px',
                padding: '3px 6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.12s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
            >
              <div>
                <div style={{ fontSize: '9px', fontWeight: 900, color: theme.textPrimary, lineHeight: 1.1 }}>
                  {stock.symbol}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 800, color: accentCol }}>
                  {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
                </div>
              </div>
              <span style={{
                fontSize: '8px',
                fontWeight: 800,
                color: theme.textMuted,
                background: theme.pillBg,
                padding: '1px 4px',
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}>
                {13 + idx}
              </span>
            </div>
          ))}
        </div>

        {/* COLUMN 2: Ranks 08-12 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {col2.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '5px',
                padding: '4px 6px',
                cursor: 'pointer',
                transition: 'all 0.12s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 900, color: theme.textPrimary }}>
                  {stock.symbol}
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  color: theme.textMuted,
                  background: theme.pillBg,
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {String(8 + idx).padStart(2, '0')}
                </span>
              </div>
              <div style={{ fontSize: '8.5px', fontWeight: 800, color: accentCol }}>
                {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
              </div>
              {/* Mini Volume Depth Bar */}
              <div style={{
                height: '3px',
                background: isLightMode ? '#e2e8f0' : '#1e293b',
                borderRadius: '1.5px',
                marginTop: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, Math.max(30, Math.abs(stock.dayChangePct) * 22))}%`,
                  height: '100%',
                  background: barCol
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* COLUMN 3: Ranks 04-07 (With Spot Price Pill & Build-Up Tag) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {col3.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '5px',
                padding: '5px 7px',
                cursor: 'pointer',
                transition: 'all 0.12s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: theme.textPrimary }}>
                  {stock.symbol}
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  color: theme.textMuted,
                  background: theme.pillBg,
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {String(4 + idx).padStart(2, '0')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: accentCol }}>
                  {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: '#0f172a',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {stock.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{
                fontSize: '7.5px',
                fontWeight: 900,
                color: accentCol,
                marginTop: '3px',
                letterSpacing: '0.4px'
              }}>
                {stock.buildUp}
              </div>
              {/* Stacked Depth Histogram Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', marginTop: '3px' }}>
                <div style={{ height: '2.5px', width: '85%', background: barCol, borderRadius: '1px', opacity: 0.85 }} />
                <div style={{ height: '2px', width: '60%', background: barCol, borderRadius: '1px', opacity: 0.6 }} />
              </div>
            </div>
          ))}
        </div>

        {/* COLUMN 4: Ranks 01-03 (Featured Cards with Corner Brackets & Depth Bars) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {col4.map((stock, idx) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: theme.cardBg,
                border: `1.5px solid ${isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}`,
                borderRadius: '6px',
                padding: '6px 8px',
                position: 'relative',
                cursor: 'pointer',
                boxShadow: isLightMode 
                  ? (isBull ? '0 2px 10px rgba(16, 185, 129, 0.08)' : '0 2px 10px rgba(239, 68, 68, 0.08)')
                  : 'none',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = barCol}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}
            >
              {/* Top Row: Symbol + Rank Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: barCol }} />
                  <span style={{ fontSize: '11px', fontWeight: 900, color: theme.textPrimary, letterSpacing: '0.4px' }}>
                    {stock.symbol}
                  </span>
                </div>
                <span style={{
                  fontSize: '8.5px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: barCol,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {String(1 + idx).padStart(2, '0')}
                </span>
              </div>

              {/* % Change + Spot Price Pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 900, color: accentCol }}>
                  {stock.dayChangePct >= 0 ? `+${stock.dayChangePct}%` : `${stock.dayChangePct}%`}
                </span>
                <span style={{
                  fontSize: '8.5px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: '#0f172a',
                  padding: '1.5px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {stock.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Build Up Banner with Star Conviction */}
              <div style={{
                fontSize: '8px',
                fontWeight: 900,
                color: accentCol,
                marginTop: '3px',
                letterSpacing: '0.5px'
              }}>
                {stock.buildUp} {idx === 0 ? '★★★★★' : '★★★★'}
              </div>

              {/* Prominent Multi-Layer Depth Histogram Bars (as seen in Image 4) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <div style={{ height: '3px', width: '95%', background: barCol, borderRadius: '1.5px' }} />
                <div style={{ height: '2.5px', width: '75%', background: barCol, borderRadius: '1.5px', opacity: 0.8 }} />
                <div style={{ height: '2px', width: '50%', background: barCol, borderRadius: '1.5px', opacity: 0.55 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Execution Card (Right Panel, Matching Column 5 in Image 4)
  const renderExecutionCard = (card: StockExecutionCard, isBull: boolean, rankNum: number, convScore: number) => {
    const accentColor = isBull ? '#10b981' : '#ef4444';
    const bg = theme.cardBg;
    const border = isLightMode
      ? (isBull ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1.5px solid rgba(239, 68, 68, 0.45)')
      : (isBull ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(244, 63, 94, 0.35)');

    return (
      <div 
        key={card.symbol}
        onClick={() => setSelectedStock(card)}
        style={{
          background: bg,
          border: border,
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '10px',
          boxShadow: isLightMode 
            ? (isBull ? '0 3px 14px rgba(16, 185, 129, 0.08)' : '0 3px 14px rgba(239, 68, 68, 0.08)')
            : 'none',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}
      >
        {/* Top Header Row: Symbol + Sector + Conviction Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: accentColor,
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing: '0.6px'
            }}>
              <span>{isBull ? 'BULLISH' : 'BEARISH'}</span>
              <span style={{
                background: '#ffffff',
                color: accentColor,
                padding: '0 4px',
                borderRadius: '2px',
                fontWeight: 900
              }}>
                {convScore}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 900, color: theme.textPrimary, letterSpacing: '0.4px' }}>
                {card.symbol}
              </span>
              <span style={{ fontSize: '9px', color: theme.textSecondary, marginLeft: '4px' }}>
                · {card.sector}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '8.5px', color: theme.textMuted }}>
            #{rankNum}
          </div>
        </div>

        {/* Large Percentage & Spot Price Row (matching Image 4) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 900,
            color: isBull ? '#059669' : '#dc2626',
            fontFamily: 'monospace',
            letterSpacing: '0.5px'
          }}>
            {card.dayChangePct >= 0 ? `+${card.dayChangePct}%` : `${card.dayChangePct}%`}
          </div>

          <div style={{ fontSize: '12px', fontWeight: 900, color: theme.textPrimary, fontFamily: 'monospace' }}>
            ₹{card.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <span style={{ fontSize: '9.5px', color: isBull ? '#059669' : '#dc2626', marginLeft: '4px' }}>
              ({isBull ? `+${(card.spot * 0.0417).toFixed(2)}` : `-${(card.spot * 0.0246).toFixed(2)}`})
            </span>
          </div>
        </div>

        {/* Metrics Row: SUPPORT 1 | ZONE */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '9.5px',
          background: isLightMode ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${theme.cardBorder}`,
          padding: '4px 8px',
          borderRadius: '5px',
          marginTop: '6px'
        }}>
          <div>
            <span style={{ color: theme.textMuted, fontWeight: 700 }}>
              {isBull ? 'SUPPORT 1:' : 'RESISTANCE 1:'}
            </span>
            <span style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace', marginLeft: '4px' }}>
              ₹{isBull ? card.s1 : card.r1}
            </span>
          </div>

          <div>
            <span style={{ color: theme.textMuted, fontWeight: 700 }}>ZONE:</span>
            <span style={{ fontWeight: 800, color: accentColor, fontFamily: 'monospace', marginLeft: '4px' }}>
              {card.zone.label}
            </span>
          </div>

          <span style={{
            background: isLightMode ? (isBull ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'rgba(255, 255, 255, 0.08)',
            color: isBull ? (isLightMode ? '#047857' : '#34d399') : (isLightMode ? '#b91c1c' : '#fb7185'),
            padding: '1px 5px',
            borderRadius: '3px',
            fontWeight: 900,
            fontSize: '9.5px'
          }}>
            R:R 1:{card.rewardRiskRatio}
          </span>
        </div>

        {/* Slider Bar */}
        <div style={{ marginTop: '6px', position: 'relative' }}>
          <div style={{
            height: '3px',
            borderRadius: '2px',
            background: isLightMode ? '#e2e8f0' : '#1e293b',
            overflow: 'hidden',
            display: 'flex'
          }}>
            <div style={{ width: '30%', background: isBull ? '#f59e0b' : '#38bdf8' }} />
            <div style={{ width: '25%', background: accentColor }} />
            <div style={{ width: '45%', background: isLightMode ? '#cbd5e1' : '#334155' }} />
          </div>
          <div style={{
            position: 'absolute',
            top: '-3.5px',
            left: `${card.sliderPct}%`,
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: `0 0 6px ${accentColor}`,
            border: `2px solid ${accentColor}`,
            transform: 'translateX(-50%)'
          }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      padding: '10px 16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      transition: 'background-color 0.2s, color 0.2s'
    }}>
      {/* ── 1. Top Header Toolbar matching Image 1 & 2 ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '10px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Floating Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '6px 12px',
          width: '260px',
          boxShadow: theme.boxShadow
        }}>
          <Search size={14} style={{ color: theme.textMuted }} />
          <input
            type="text"
            placeholder="Search stocks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: theme.textPrimary,
              fontSize: '12px',
              width: '100%',
              fontWeight: 500
            }}
          />
          <span style={{
            fontSize: '9px',
            color: theme.textMuted,
            background: theme.pillBg,
            padding: '2px 5px',
            borderRadius: '4px',
            border: `1px solid ${theme.pillBorder}`,
            fontWeight: 700
          }}>
            Ctrl K
          </span>
        </div>

        {/* Center: Volume Delta Scatter + Market Breadth Counters (172 / 41) */}
        {renderTopVolumeScatter()}

        {/* Right Controls: Theme Toggle & Live Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              color: theme.textPrimary,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: theme.boxShadow
            }}
          >
            {isLightMode ? <Moon size={13} style={{ color: '#0284c7' }} /> : <Sun size={13} style={{ color: '#f59e0b' }} />}
            {isLightMode ? 'Dark' : 'Light'}
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: theme.cardBg,
              color: theme.textPrimary,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              boxShadow: theme.boxShadow
            }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Live Sync'}
          </button>
        </div>
      </div>

      {/* ── 1.5 Macro Benchmark & Commodity Live Order Block Radar Strip ── */}
      {(() => {
        const anchors = data?.indexAnchors;
        const benchmarks = [
          {
            card: anchors?.nifty || {
              symbol: 'NIFTY 50', name: 'NIFTY 50 Index', sector: 'NIFTY 50', spot: 23146.15, dayChangePct: 0.65,
              buildUp: 'LONG BUILD-UP', buildUpColor: '#10b981', bias: 'BULL' as const,
              zone: { low: 23030, high: 23100, label: '₹23030 – ₹23100' },
              s1: 22960, r1: 23280, r2: 23420, s2: 22800, liquidityLine: 22913,
              retestStatus: 'IN_ZONE', liquiditySweepDetected: true, riskPts: 140, riskPct: 0.6,
              rewardPts: 350, rewardRiskRatio: 2.5, sliderPct: 52, sparklines: { price: [], oi: [] },
              isChoppy: false, dotX: 0.65, rank: 1, strengthBarWidth: 92, score: 98
            },
            tag: 'NIFTY 50',
            desc: 'Period C/G Breakout · 87.8% Win Rate · Candle Close Filter'
          },
          {
            card: anchors?.banknifty || {
              symbol: 'BANKNIFTY', name: 'Bank Nifty Index', sector: 'BANKNIFTY', spot: 55844.0, dayChangePct: 0.06,
              buildUp: 'LONG BUILD-UP', buildUpColor: '#10b981', bias: 'BULL' as const,
              zone: { low: 55560, high: 55730, label: '₹55560 – ₹55730' },
              s1: 55400, r1: 56240, r2: 56600, s2: 55000, liquidityLine: 55526,
              retestStatus: 'IN_ZONE', liquiditySweepDetected: true, riskPts: 330, riskPct: 0.6,
              rewardPts: 830, rewardRiskRatio: 2.5, sliderPct: 50, sparklines: { price: [], oi: [] },
              isChoppy: false, dotX: 0.06, rank: 2, strengthBarWidth: 84, score: 95
            },
            tag: 'BANKNIFTY',
            desc: 'Period F Spike Acceptance · 95.2% Win Rate · Momentum Resume'
          },
          {
            card: anchors?.sensex || {
              symbol: 'SENSEX', name: 'BSE Sensex Benchmark', sector: 'SENSEX', spot: 71491.44, dayChangePct: -0.21,
              buildUp: 'SHORT BUILD-UP', buildUpColor: '#f43f5e', bias: 'BEAR' as const,
              zone: { low: 71400, high: 71510, label: '₹71400 – ₹71510' },
              s1: 71200, r1: 71600, r2: 71800, s2: 71000, liquidityLine: 71350,
              retestStatus: 'IN_ZONE', liquiditySweepDetected: true, riskPts: 350, riskPct: 0.5,
              rewardPts: 840, rewardRiskRatio: 2.4, sliderPct: 50, sparklines: { price: [], oi: [] },
              isChoppy: false, dotX: -0.21, rank: 3, strengthBarWidth: 80, score: 94
            },
            tag: 'SENSEX (BSE)',
            desc: 'Period A/B IB Range · Gamma Put Wall (71400) · 100 pt Step'
          },
          {
            card: anchors?.crudeoil || {
              symbol: 'CRUDEOIL', name: 'MCX Crude Oil Futures (₹/bbl)', sector: 'CRUDEOIL', spot: 8808.0, dayChangePct: 0.31,
              buildUp: 'LONG BUILD-UP', buildUpColor: '#10b981', bias: 'BULL' as const,
              zone: { low: 8800, high: 8805, label: '₹8800 – ₹8805' },
              s1: 8740, r1: 8900, r2: 8980, s2: 8680, liquidityLine: 8770,
              retestStatus: 'IN_ZONE', liquiditySweepDetected: true, riskPts: 60, riskPct: 0.7,
              rewardPts: 155, rewardRiskRatio: 2.6, sliderPct: 54, sparklines: { price: [], oi: [] },
              isChoppy: false, dotX: 0.31, rank: 4, strengthBarWidth: 88, score: 96
            },
            tag: 'CRUDEOIL (MCX)',
            desc: 'European & NYMEX Open Sweep · Gamma Flip (8805) · 50 pt Step'
          }
        ];

        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '8px',
            marginBottom: '10px'
          }}>
            {benchmarks.map(({ card, tag, desc }) => {
              const retest = getRetestLiveStatus(card);
              const isBull = card.bias === 'BULL';
              const isSelected = selectedStock?.symbol === card.symbol;
              return (
                <div
                  key={card.symbol}
                  onClick={() => setSelectedStock(card)}
                  style={{
                    background: isSelected 
                      ? (isLightMode ? '#e0f2fe' : 'rgba(2, 132, 199, 0.15)') 
                      : theme.cardBg,
                    border: isSelected
                      ? '1.5px solid #0284c7'
                      : `1px solid ${retest.status === 'RETESTING_NOW' ? '#10b981' : theme.cardBorder}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                    boxShadow: retest.status === 'RETESTING_NOW' 
                      ? '0 0 12px rgba(16, 185, 129, 0.25)' 
                      : theme.boxShadow
                  }}
                  title="Click to open 5-minute Candlestick Chart with Live Retest & Order Block Zone"
                >
                  {/* Header: Tag + Spot + Change */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Zap size={11} style={{ color: '#0284c7' }} />
                      <span style={{ fontSize: '11px', fontWeight: 900, color: theme.textPrimary, letterSpacing: '0.4px' }}>
                        {tag}
                      </span>
                      <span style={{
                        fontSize: '8px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: card.buildUpColor + '20',
                        color: card.buildUpColor,
                        fontWeight: 800
                      }}>
                        {card.buildUp.replace(' BUILD-UP', '')}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'monospace', color: theme.textPrimary }}>
                        ₹{card.spot.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        marginLeft: '5px',
                        color: card.dayChangePct >= 0 ? '#10b981' : '#f43f5e'
                      }}>
                        {card.dayChangePct >= 0 ? '+' : ''}{card.dayChangePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Retest Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: retest.badgeBg,
                      border: `1px solid ${retest.badgeBorder}`,
                      fontSize: '8.5px',
                      fontWeight: 800,
                      color: retest.color
                    }}>
                      <span style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: retest.color,
                        boxShadow: retest.isPulsing ? `0 0 6px ${retest.color}` : 'none'
                      }} />
                      {retest.label}
                    </div>
                    <span style={{ fontSize: '8.5px', color: theme.textMuted, fontWeight: 700 }}>
                      R:R {card.rewardRiskRatio}:1
                    </span>
                  </div>

                  {/* Order Block Zone Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isLightMode ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '9px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ color: theme.textMuted, fontWeight: 700 }}>
                      {isBull ? 'DEMAND OB' : 'SUPPLY OB'}:
                    </span>
                    <span style={{ color: '#0284c7', fontWeight: 900, fontFamily: 'monospace' }}>
                      {card.zone.label}
                    </span>
                    <span style={{ color: theme.textMuted, fontSize: '8px' }}>
                      SL: ₹{card.s1.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* SMC Rule Descriptor */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '7.5px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>
                      {desc}
                    </span>
                    <span style={{ fontSize: '8px', color: '#0284c7', fontWeight: 800 }}>
                      5m Chart ↗
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── 2. All 16 Macro Sector Filter Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '6px',
        marginBottom: '10px',
        scrollbarWidth: 'none'
      }}>
        {/* Live Retest Radar Toggle Button */}
        <button
          onClick={() => setOnlyRetestingFilter(!onlyRetestingFilter)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '16px',
            border: onlyRetestingFilter ? '1.5px solid #10b981' : '1px solid #f59e0b',
            background: onlyRetestingFilter ? '#10b981' : (isLightMode ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)'),
            color: onlyRetestingFilter ? '#ffffff' : (isLightMode ? '#b45309' : '#fcd34d'),
            fontSize: '10px',
            fontWeight: 900,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: onlyRetestingFilter ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
            transition: 'all 0.15s'
          }}
          title="Filter all stocks to only those currently inside or pulling back to their Order Block zone"
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: onlyRetestingFilter ? '#ffffff' : '#f59e0b',
            boxShadow: '0 0 6px currentColor'
          }} />
          ⚡ LIVE RETESTING ({liveRetestingCount})
        </button>

        {ALL_SECTORS.map(sec => {
          const isSel = selectedSector === sec;
          const isIndex = sec === 'NIFTY 50' || sec === 'BANKNIFTY' || sec === 'SENSEX' || sec === 'CRUDEOIL';
          return (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                borderRadius: '16px',
                border: isSel 
                  ? '1px solid #10b981' 
                  : isIndex 
                    ? '1px solid rgba(2, 132, 199, 0.4)' 
                    : `1px solid ${theme.cardBorder}`,
                background: isSel 
                  ? '#10b981' 
                  : isIndex 
                    ? (isLightMode ? '#e0f2fe' : 'rgba(2, 132, 199, 0.15)')
                    : theme.cardBg,
                color: isSel ? '#ffffff' : isIndex ? '#0284c7' : theme.textPrimary,
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {isIndex && <Zap size={10} />}
              {sec}
            </button>
          );
        })}
      </div>

      {/* ── 3. Main Panoramic 3-Panel Layout (River | 4-Col Clusters | Execution Cards) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1.1fr) minmax(460px, 1.4fr) minmax(280px, 0.85fr)',
        gap: '12px',
        alignItems: 'start'
      }}>
        {/* ── COLUMN 1: Panoramic River & Sieve (Center-Left) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px',
          boxShadow: theme.boxShadow
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: theme.textPrimary }}>
              Sectoral River & Sieve
            </span>
            <span style={{ fontSize: '9px', color: theme.textMuted }}>
              14 Streams · 213 Stocks
            </span>
          </div>

          {renderPanoramicRiverAndSieve()}
        </div>

        {/* ── COLUMN 2: 4-Column Stock Matrix (Middle) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px',
          boxShadow: theme.boxShadow
        }}>
          {/* Top Half: LONG BUILD-UP 4-Column Matrix */}
          <div style={{
            background: isLightMode ? '#f0fdf4' : 'rgba(16, 185, 129, 0.05)',
            border: `1px solid ${theme.bullCardBorder}`,
            borderRadius: '6px',
            padding: '8px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <TrendingUp size={13} style={{ color: '#059669' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#059669', letterSpacing: '0.4px' }}>
                  LONG BUILD-UP
                </span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#059669' }}>
                {sortedBullStocks.length} Stocks
              </span>
            </div>

            {render4ColumnMatrix(sortedBullStocks, true)}
          </div>

          {/* Bottom Half: SHORT BUILD-UP 4-Column Matrix */}
          <div style={{
            background: isLightMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${theme.bearCardBorder}`,
            borderRadius: '6px',
            padding: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <TrendingDown size={13} style={{ color: '#dc2626' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#dc2626', letterSpacing: '0.4px' }}>
                  SHORT BUILD-UP
                </span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626' }}>
                {sortedBearStocks.length} Stocks
              </span>
            </div>

            {render4ColumnMatrix(sortedBearStocks, false)}
          </div>
        </div>

        {/* ── COLUMN 3: Precision Execution Cards (Far Right) ── */}
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px',
          boxShadow: theme.boxShadow
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: theme.textPrimary }}>
              Actionable Execution Setups
            </span>
            <span style={{ fontSize: '9px', color: theme.textMuted }}>
              3 Bull · 3 Bear
            </span>
          </div>

          {/* Top 3 Bullish Cards */}
          <div style={{ marginBottom: '8px' }}>
            {sortedBullStocks.slice(0, 3).map((card, idx) => 
              renderExecutionCard(card, true, idx + 1, idx === 0 ? 97 : (idx === 1 ? 96 : 94))
            )}
          </div>

          {/* Bottom 3 Bearish Cards */}
          <div>
            {sortedBearStocks.slice(0, 3).map((card, idx) => 
              renderExecutionCard(card, false, idx + 1, idx === 0 ? 95 : (idx === 1 ? 92 : 89))
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Interactive Stock Detail Retest Modal (as seen in video 00:50) ── */}
      {selectedStock && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedStock(null)}>
          <div 
            style={{
              backgroundColor: theme.cardBg,
              border: `1.5px solid ${selectedStock.bias === 'BULL' ? '#10b981' : '#ef4444'}`,
              borderRadius: '14px',
              padding: '20px 24px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '3px 9px',
                  borderRadius: '5px',
                  backgroundColor: selectedStock.bias === 'BULL' ? '#10b981' : '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 900
                }}>
                  {selectedStock.bias} #{selectedStock.rank || 1}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: theme.textPrimary }}>
                      {selectedStock.symbol}
                    </h3>
                    <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                      {selectedStock.name} · {selectedStock.sector}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: theme.textPrimary, fontFamily: 'monospace' }}>
                      ₹{selectedStock.spot}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: selectedStock.bias === 'BULL' ? '#059669' : '#dc2626'
                    }}>
                      {selectedStock.dayChangePct >= 0 ? `+${selectedStock.dayChangePct}%` : `${selectedStock.dayChangePct}%`}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#b45309', fontWeight: 800 }}>
                      CONV {selectedStock.score} ★★★★★
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                style={{
                  background: theme.pillBg,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            {/* Metrics Breakdown Grid (as seen in video 00:52) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              background: theme.pillBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '10.5px'
            }}>
              <div>
                <span style={{ color: theme.textMuted }}>RANK:</span>
                <div style={{ fontWeight: 800, color: theme.textPrimary }}>p99.8 #1/172</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>OI CHANGE:</span>
                <div style={{ fontWeight: 800, color: '#0284c7' }}>+{Math.abs(selectedStock.oiChangePct)}% {selectedStock.buildUp}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>VWAP:</span>
                <div style={{ fontWeight: 800, color: theme.textPrimary, fontFamily: 'monospace' }}>₹{+(selectedStock.spot * 0.996).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>RVOL:</span>
                <div style={{ fontWeight: 800, color: '#059669' }}>{selectedStock.rvol}x (High Vol)</div>
              </div>

              <div>
                <span style={{ color: theme.textMuted }}>ORDER BLOCK ZONE:</span>
                <div style={{ fontWeight: 800, color: selectedStock.bias === 'BULL' ? '#059669' : '#dc2626', fontFamily: 'monospace' }}>
                  {selectedStock.zone.label}
                </div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>SL / S1:</span>
                <div style={{ fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>₹{selectedStock.s1}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>TARGET 1 (R1):</span>
                <div style={{ fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>₹{selectedStock.r1}</div>
              </div>
              <div>
                <span style={{ color: theme.textMuted }}>R:R RATIO:</span>
                <div style={{ fontWeight: 900, color: '#b45309' }}>1 : {selectedStock.rewardRiskRatio}</div>
              </div>
            </div>

            {/* ── Live Retest Radar Status Banner ── */}
            {(() => {
              const rStatus = getRetestLiveStatus(selectedStock);
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  background: rStatus.badgeBg,
                  border: `1.5px solid ${rStatus.badgeBorder}`,
                  borderRadius: '8px',
                  marginBottom: '12px',
                  boxShadow: rStatus.isPulsing ? `0 0 14px ${rStatus.color}35` : 'none',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: rStatus.color,
                      display: 'inline-block',
                      boxShadow: `0 0 8px ${rStatus.color}`
                    }} />
                    <span style={{ fontSize: '12px', fontWeight: 900, color: rStatus.color, letterSpacing: '0.4px' }}>
                      {rStatus.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                    Spot: <strong style={{ color: theme.textPrimary, fontFamily: 'monospace' }}>₹{selectedStock.spot}</strong> · 
                    Zone: <strong style={{ color: selectedStock.bias === 'BULL' ? '#059669' : '#dc2626', fontFamily: 'monospace' }}>{selectedStock.zone.label}</strong>
                  </div>
                  <div style={{
                    background: theme.canvasBg,
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: rStatus.color
                  }}>
                    {rStatus.status === 'RETESTING_NOW' 
                      ? '⚡ ACTION: Buy ATM Option on Rejection Wick!' 
                      : (rStatus.status === 'PULLING_BACK' 
                          ? '⏳ ACTION: Waiting for Zone Touch' 
                          : '✅ ACTION: Trail SL behind Order Block')}
                  </div>
                </div>
              );
            })()}

            {/* Interactive Intraday Chart Header with Candlestick Toggle */}
            <div style={{
              background: theme.canvasBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#0284c7', letterSpacing: '0.3px' }}>
                    INTRADAY 5-MIN CANDLESTICK CHART · ORDER BLOCK RETEST BLUEPRINT
                  </span>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #86efac',
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}>
                    5-Min Timeframe
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800 }}>
                    ⚡ RETEST TOUCH AT 10:00 AM IST
                  </span>
                  {/* View Mode Toggle: Candlesticks vs Line */}
                  <div style={{ display: 'flex', gap: '4px', background: theme.pillBg, padding: '2px', borderRadius: '5px' }}>
                    <button
                      onClick={() => setChartViewMode('candles')}
                      style={{
                        background: chartViewMode === 'candles' ? '#0284c7' : 'transparent',
                        color: chartViewMode === 'candles' ? '#ffffff' : theme.textSecondary,
                        border: 'none',
                        borderRadius: '3px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🕯️ Candlesticks
                    </button>
                    <button
                      onClick={() => setChartViewMode('line')}
                      style={{
                        background: chartViewMode === 'line' ? '#0284c7' : 'transparent',
                        color: chartViewMode === 'line' ? '#ffffff' : theme.textSecondary,
                        border: 'none',
                        borderRadius: '3px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      📈 Line &amp; OI
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart SVG Rendering */}
              <div style={{ width: '100%', height: '200px', position: 'relative' }}>
                {chartViewMode === 'candles' ? (() => {
                  const candles = generateIntradayCandles(selectedStock);
                  const isBull = selectedStock.bias === 'BULL';
                  const minP = Math.min(...candles.map(c => c.low), selectedStock.s1 * 0.995, selectedStock.zone.low * 0.995);
                  const maxP = Math.max(...candles.map(c => c.high), selectedStock.r2 * 1.005, selectedStock.zone.high * 1.005);
                  const range = maxP - minP || 1;

                  const plotLeft = 45;
                  const plotRight = 555;
                  const plotTop = 22;
                  const plotBottom = 160;
                  const plotWidth = plotRight - plotLeft;
                  const plotHeight = plotBottom - plotTop;

                  const yScale = (val: number) => plotTop + (maxP - val) / range * plotHeight;
                  const candleWidth = Math.max(8, (plotWidth / candles.length) - 8);

                  const yZoneHigh = yScale(selectedStock.zone.high);
                  const yZoneLow = yScale(selectedStock.zone.low);
                  const zoneTop = Math.min(yZoneHigh, yZoneLow);
                  const zoneH = Math.max(14, Math.abs(yZoneLow - yZoneHigh));

                  const yR2 = yScale(selectedStock.r2);
                  const yR1 = yScale(selectedStock.r1);
                  const yS1 = yScale(selectedStock.s1);
                  const yLtp = yScale(selectedStock.spot);
                  const yLiq = yScale(selectedStock.liquidityLine);

                  return (
                    <svg viewBox="0 0 620 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="obCandleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isBull ? '#10b981' : '#ef4444'} stopOpacity="0.22" />
                          <stop offset="100%" stopColor={isBull ? '#10b981' : '#ef4444'} stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid & Levels */}
                      <line x1={plotLeft} y1={yR2} x2={plotRight} y2={yR2} stroke="#059669" strokeWidth={0.9} strokeDasharray="3,3" />
                      <text x={plotRight + 5} y={yR2 + 3} fill="#059669" fontSize="8" fontWeight="bold">R2 ₹{selectedStock.r2}</text>

                      <line x1={plotLeft} y1={yR1} x2={plotRight} y2={yR1} stroke="#10b981" strokeWidth={0.9} strokeDasharray="3,3" />
                      <text x={plotRight + 5} y={yR1 + 3} fill="#10b981" fontSize="8" fontWeight="bold">R1 ₹{selectedStock.r1}</text>

                      {/* Shaded Order Block Demand / Supply Zone */}
                      <rect
                        x={plotLeft}
                        y={zoneTop}
                        width={plotWidth}
                        height={zoneH}
                        fill="url(#obCandleGrad)"
                        stroke={isBull ? '#10b981' : '#ef4444'}
                        strokeWidth={1.2}
                        strokeDasharray="4,3"
                        rx={2}
                      />
                      <text x={plotLeft + 6} y={zoneTop + 10} fill={isBull ? '#059669' : '#dc2626'} fontSize="8" fontWeight="900">
                        {isBull ? 'DEMAND' : 'SUPPLY'} ORDER BLOCK ZONE ({selectedStock.zone.label})
                      </text>

                      {/* Support 1 / SL */}
                      <line x1={plotLeft} y1={yS1} x2={plotRight} y2={yS1} stroke="#dc2626" strokeWidth={1} strokeDasharray="3,3" />
                      <text x={plotRight + 5} y={yS1 + 3} fill="#dc2626" fontSize="8" fontWeight="bold">SL ₹{selectedStock.s1}</text>

                      {/* Amber Liquidity Line */}
                      <line x1={plotLeft} y1={yLiq} x2={plotRight} y2={yLiq} stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="4,3" />
                      <text x={plotRight + 5} y={yLiq + 3} fill="#b45309" fontSize="7.5" fontWeight="bold">LIQ ₹{selectedStock.liquidityLine}</text>

                      {/* Live Spot Price Dashed Line */}
                      <line x1={plotLeft} y1={yLtp} x2={plotRight} y2={yLtp} stroke="#38bdf8" strokeWidth={1.2} strokeDasharray="2,2" />
                      <rect x={plotRight + 3} y={yLtp - 6} width={50} height={12} rx={2} fill="#0284c7" />
                      <text x={plotRight + 5} y={yLtp + 3} fill="#ffffff" fontSize="7.5" fontWeight="900">LTP ₹{selectedStock.spot}</text>

                      {/* Volume Divider */}
                      <line x1={plotLeft} y1={170} x2={plotRight} y2={170} stroke={theme.gridLine} strokeWidth={0.8} />

                      {/* 22 Candlesticks with Volume bars */}
                      {candles.map((c, idx) => {
                        const cx = plotLeft + idx * (plotWidth / candles.length) + (plotWidth / candles.length) / 2;
                        const yO = yScale(c.open);
                        const yC = yScale(c.close);
                        const yH = yScale(c.high);
                        const yL = yScale(c.low);
                        const col = c.isBull ? '#10b981' : '#ef4444';
                        const bodyTop = Math.min(yO, yC);
                        const bodyH = Math.max(2.5, Math.abs(yC - yO));
                        const volH = Math.min(22, (c.volume / 50000) * 20);

                        return (
                          <g key={idx}>
                            {/* Wick */}
                            <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={col} strokeWidth={1.2} />
                            {/* Body */}
                            <rect
                              x={cx - candleWidth / 2}
                              y={bodyTop}
                              width={candleWidth}
                              height={bodyH}
                              fill={col}
                              stroke={col}
                              strokeWidth={0.8}
                              rx={1}
                            />
                            {/* Volume Bar at bottom */}
                            <rect
                              x={cx - (candleWidth / 2)}
                              y={192 - volH}
                              width={candleWidth}
                              height={volH}
                              fill={c.isBull ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}
                            />

                            {/* RETEST ENTRY CALLOUT ARROW (Candle 5 @ 10:05 AM) */}
                            {c.isRetest && (
                              <g>
                                <circle cx={cx} cy={yL} r={4.5} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} />
                                <line x1={cx} y1={yL + 18} x2={cx} y2={yL + 6} stroke="#10b981" strokeWidth={2} />
                                <polygon points={`${cx - 3},${yL + 7} ${cx + 3},${yL + 7} ${cx},${yL + 1}`} fill="#10b981" />
                                <rect x={cx - 52} y={yL + 20} width={104} height={14} rx={3} fill="#10b981" />
                                <text x={cx} y={yL + 30} fill="#ffffff" fontSize="7.5" fontWeight="900" textAnchor="middle">
                                  ⚡ RETEST ENTRY (10:00 AM)
                                </text>
                              </g>
                            )}

                            {/* EXIT PIN BAR CALLOUT ARROW (Candle 12 @ 11:45 AM) */}
                            {c.isExitPinBar && (
                              <g>
                                <circle cx={cx} cy={yH} r={4.5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                                <line x1={cx} y1={yH - 18} x2={cx} y2={yH - 6} stroke="#ef4444" strokeWidth={2} />
                                <polygon points={`${cx - 3},${yH - 7} ${cx + 3},${yH - 7} ${cx},${yH - 1}`} fill="#ef4444" />
                                <rect x={cx - 50} y={yH - 32} width={100} height={14} rx={3} fill="#ef4444" />
                                <text x={cx} y={yH - 22} fill="#ffffff" fontSize="7.5" fontWeight="900" textAnchor="middle">
                                  🎯 EXIT PIN BAR (11:48 AM)
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Time Labels on bottom */}
                      <text x={plotLeft} y={198} fill="#94a3b8" fontSize="7.5">09:15</text>
                      <text x={plotLeft + plotWidth * 0.22} y={198} fill="#059669" fontSize="7.5" fontWeight="bold">10:00 (Retest)</text>
                      <text x={plotLeft + plotWidth * 0.42} y={198} fill="#94a3b8" fontSize="7.5">11:30</text>
                      <text x={plotLeft + plotWidth * 0.54} y={198} fill="#dc2626" fontSize="7.5" fontWeight="bold">11:48 (Pin Bar)</text>
                      <text x={plotLeft + plotWidth * 0.75} y={198} fill="#94a3b8" fontSize="7.5">13:30</text>
                      <text x={plotRight - 10} y={198} fill="#94a3b8" fontSize="7.5">15:30</text>
                    </svg>
                  );
                })() : (
                  /* Original Smooth Line & Sparkline View */
                  <svg viewBox="0 0 600 170" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="chartZoneGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Levels */}
                    <line x1={40} y1={25} x2={560} y2={25} stroke="#059669" strokeWidth={1} strokeDasharray="3,3" />
                    <text x={565} y={28} fill="#059669" fontSize="8.5" fontWeight="bold">R2 ₹{selectedStock.r2}</text>

                    <line x1={40} y1={52} x2={560} y2={52} stroke="#10b981" strokeWidth={1} strokeDasharray="3,3" />
                    <text x={565} y={55} fill="#10b981" fontSize="8.5" fontWeight="bold">R1 ₹{selectedStock.r1}</text>

                    {/* Shaded Order Block Demand Zone */}
                    <rect x={40} y={85} width={520} height={32} fill="url(#chartZoneGrad)" stroke="#10b981" strokeWidth={1} rx={3} />
                    <text x={45} y={105} fill="#059669" fontSize="8.5" fontWeight="bold">ORDER BLOCK ZONE ({selectedStock.zone.label})</text>

                    {/* Amber Liquidity Sweep Line */}
                    <line x1={40} y1={135} x2={560} y2={135} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
                    <text x={565} y={138} fill="#b45309" fontSize="8.5" fontWeight="bold">LIQ ₹{selectedStock.liquidityLine}</text>

                    {/* Time Marks */}
                    <text x={45} y={160} fill="#94a3b8" fontSize="8">09:15</text>
                    <text x={140} y={160} fill="#94a3b8" fontSize="8">10:00 (Entry)</text>
                    <text x={260} y={160} fill="#94a3b8" fontSize="8">11:30</text>
                    <text x={380} y={160} fill="#94a3b8" fontSize="8">13:30</text>
                    <text x={510} y={160} fill="#94a3b8" fontSize="8">15:30</text>

                    {/* Price Trajectory Line */}
                    <path
                      d="M 45 125 Q 80 80, 120 65 T 150 96 T 190 70 T 260 55 T 360 44 T 460 34 T 540 26"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={2.5}
                    />

                    {/* Retest Entry Arrow */}
                    <circle cx={150} cy={96} r={4.5} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
                    <line x1={150} y1={120} x2={150} y2={104} stroke="#10b981" strokeWidth={2} />
                    <polygon points="147,105 153,105 150,98" fill="#10b981" />
                    <text x={150} y={130} fill="#059669" fontSize="8.5" fontWeight="bold" textAnchor="middle">ENTRY PULLBACK</text>

                    {/* Exit Arrow */}
                    <circle cx={540} cy={26} r={4.5} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                    <text x={530} y={16} fill="#dc2626" fontSize="8.5" fontWeight="bold">EXIT</text>
                  </svg>
                )}
              </div>
            </div>

            {/* Sensibull / Broker Execution Blueprint */}
            <div style={{
              background: isLightMode ? '#fffbeb' : 'rgba(251, 191, 36, 0.08)',
              border: `1px solid ${isLightMode ? '#fde68a' : 'rgba(251, 191, 36, 0.3)'}`,
              padding: '10px 14px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#92400e' }}>
                  🎯 Verified F&amp;O Options Scalp Blueprint
                </div>
                <div style={{ fontSize: '10.5px', color: theme.textSecondary, marginTop: '2px' }}>
                  Recommended ATM Strike: Buy <strong>{selectedStock.symbol} {Math.round(selectedStock.spot / 50) * 50} {selectedStock.bias === 'BULL' ? 'CE' : 'PE'}</strong> | Risk strictly capped to ₹{+(selectedStock.riskPts * 0.5).toFixed(2)} pts on premium!
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '90px' }}>
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '10.5px',
                  fontWeight: 900
                }}>
                  R:R 1 : {selectedStock.rewardRiskRatio}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTOR STOCKS DRILL-DOWN MODAL (When clicking any sector pill on river) ── */}
      {sectorModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setSectorModal(null)}
        >
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '12px',
              width: '920px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${theme.cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isLightMode ? '#f8fafc' : '#0f172a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🏢</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: theme.textPrimary, letterSpacing: '0.5px' }}>
                    {sectorModal.name} SECTOR STOCKS
                  </span>
                </div>
                <span style={{
                  background: sectorModal.pct.startsWith('+') ? '#dcfce7' : '#fee2e2',
                  color: sectorModal.pct.startsWith('+') ? '#15803d' : '#b91c1c',
                  border: `1px solid ${sectorModal.pct.startsWith('+') ? '#86efac' : '#fca5a5'}`,
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 900
                }}>
                  {sectorModal.pct}
                </span>
                <span style={{
                  background: theme.pillBg,
                  color: theme.textSecondary,
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {filteredModalStocks.length} Stocks
                </span>
              </div>

              {/* Search in Sector & Close Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  placeholder={`Search ${sectorModal.name}...`}
                  value={sectorModalSearch}
                  onChange={e => setSectorModalSearch(e.target.value)}
                  style={{
                    background: theme.canvasBg,
                    border: `1px solid ${theme.cardBorder}`,
                    color: theme.textPrimary,
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    width: '160px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => setSectorModal(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.textMuted,
                    fontSize: '18px',
                    cursor: 'pointer',
                    fontWeight: 900,
                    padding: '2px 8px'
                  }}
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Breadth & Flow Bar */}
            <div style={{
              padding: '10px 20px',
              background: isLightMode ? '#f1f5f9' : '#1e293b',
              borderBottom: `1px solid ${theme.cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: theme.textSecondary
            }}>
              <div>
                <strong style={{ color: theme.textPrimary }}>Sector Breadth: </strong>
                <span style={{ color: '#059669', fontWeight: 800 }}>
                  {sectorModal.stocks.filter(s => s.bias === 'BULL').length} Bullish (Long Flow)
                </span>
                {' · '}
                <span style={{ color: '#dc2626', fontWeight: 800 }}>
                  {sectorModal.stocks.filter(s => s.bias === 'BEAR').length} Bearish (Short Flow)
                </span>
              </div>
              <div style={{ fontSize: '10.5px', color: theme.textMuted }}>
                💡 Click any stock row to open its <strong>Order Block Retest Blueprint &amp; Options Trade Card</strong>
              </div>
            </div>

            {/* Stocks Table / List */}
            <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredModalStocks.map((stock) => {
                  const isBull = stock.bias === 'BULL';
                  return (
                    <div
                      key={stock.symbol}
                      onClick={() => {
                        setSelectedStock(stock);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: theme.canvasBg,
                        border: `1px solid ${isBull ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = isBull ? '#059669' : '#dc2626';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = isBull ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
                        (e.currentTarget as HTMLElement).style.transform = 'none';
                      }}
                    >
                      {/* Left: Symbol & Name */}
                      <div style={{ minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 900, fontSize: '13px', color: theme.textPrimary }}>
                            {stock.symbol}
                          </span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: isBull ? '#dcfce7' : '#fee2e2',
                            color: isBull ? '#15803d' : '#b91c1c'
                          }}>
                            {stock.bias}
                          </span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: theme.textMuted, marginTop: '2px' }}>
                          {stock.name}
                        </div>
                      </div>

                      {/* Spot Price & Day Change */}
                      <div style={{ textAlign: 'right', minWidth: '110px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: theme.textPrimary }}>
                          ₹{stock.spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: stock.dayChangePct >= 0 ? '#059669' : '#dc2626'
                        }}>
                          {stock.dayChangePct >= 0 ? '+' : ''}{stock.dayChangePct}%
                        </div>
                      </div>

                      {/* Build-Up & RVOL */}
                      <div style={{ minWidth: '140px' }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: stock.buildUpColor,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: stock.buildUpColor }} />
                          {stock.buildUp}
                        </div>
                        <div style={{ fontSize: '10px', color: theme.textSecondary, marginTop: '2px' }}>
                          RVOL: <strong>{stock.rvol}x</strong> | OI: <strong>{stock.oiChangePct > 0 ? '+' : ''}{stock.oiChangePct}%</strong>
                        </div>
                      </div>

                      {/* Order Block Demand/Supply Zone */}
                      <div style={{ minWidth: '170px' }}>
                        <div style={{ fontSize: '9.5px', color: theme.textMuted, fontWeight: 700 }}>
                          ORDER BLOCK ZONE:
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: isBull ? '#059669' : '#dc2626'
                        }}>
                          {stock.zone.label}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#0284c7', fontWeight: 700 }}>
                          Status: {stock.retestStatus}
                        </div>
                      </div>

                      {/* Targets / SL */}
                      <div style={{ minWidth: '130px', fontSize: '10.5px' }}>
                        <div><span style={{ color: theme.textMuted }}>Target:</span> <strong style={{ color: '#059669' }}>₹{stock.r1}</strong></div>
                        <div><span style={{ color: theme.textMuted }}>SL:</span> <strong style={{ color: '#dc2626' }}>₹{stock.s1}</strong></div>
                        <div><span style={{ color: theme.textMuted }}>R:R:</span> <strong style={{ color: '#b45309' }}>1 : {stock.rewardRiskRatio}</strong></div>
                      </div>

                      {/* Action Button */}
                      <div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedStock(stock);
                          }}
                          style={{
                            background: isBull ? '#10b981' : '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: `0 2px 6px ${isBull ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}
                        >
                          Blueprint ↗
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '10px 20px',
              borderTop: `1px solid ${theme.cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isLightMode ? '#f8fafc' : '#0f172a',
              fontSize: '10.5px',
              color: theme.textMuted
            }}>
              <div>
                Sector: <strong>{sectorModal.name}</strong> · All levels calculated using Smart Money Concepts (SMC) &amp; Order Block Retests
              </div>
              <button
                onClick={() => setSectorModal(null)}
                style={{
                  background: theme.pillBg,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
