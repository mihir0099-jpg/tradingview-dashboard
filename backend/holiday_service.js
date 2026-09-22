// ==============================================================================
// holiday_service.js - Official Online NSE Trading Holidays Engine
// Automatically fetches official market holidays from NSE:
// https://www.nseindia.com/api/holiday-master?type=trading
// Parses FO (Futures & Options) and CM (Capital Markets) holiday schedules.
// Provides offline fallback & daily automated background refresh.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, 'data', 'nse_holidays_online.json');
const NSE_HOLIDAY_URL = 'https://www.nseindia.com/api/holiday-master?type=trading';

// Built-in verified NSE Trading Holidays calendar (2025 – 2027)
const FALLBACK_HOLIDAYS = [
  // 2025
  { date: '2025-01-26', weekday: 'Sunday', description: 'Republic Day' },
  { date: '2025-02-26', weekday: 'Wednesday', description: 'Mahashivratri' },
  { date: '2025-03-14', weekday: 'Friday', description: 'Holi' },
  { date: '2025-03-31', weekday: 'Monday', description: 'Id-Ul-Fitr' },
  { date: '2025-04-10', weekday: 'Thursday', description: 'Mahavir Jayanti' },
  { date: '2025-04-14', weekday: 'Monday', description: 'Dr. Baba Saheb Ambedkar Jayanti' },
  { date: '2025-04-18', weekday: 'Friday', description: 'Good Friday' },
  { date: '2025-05-01', weekday: 'Thursday', description: 'Maharashtra Day' },
  { date: '2025-08-15', weekday: 'Friday', description: 'Independence Day' },
  { date: '2025-08-27', weekday: 'Wednesday', description: 'Ganesh Chaturthi' },
  { date: '2025-10-02', weekday: 'Thursday', description: 'Mahatma Gandhi Jayanti' },
  { date: '2025-10-21', weekday: 'Tuesday', description: 'Diwali Laxmi Pujan' },
  { date: '2025-10-22', weekday: 'Wednesday', description: 'Diwali Balipratipada' },
  { date: '2025-11-05', weekday: 'Wednesday', description: 'Prakash Gurpurb Sri Guru Nanak Dev' },
  { date: '2025-12-25', weekday: 'Thursday', description: 'Christmas' },
  // 2026
  { date: '2026-01-15', weekday: 'Thursday', description: 'Municipal Corporation Election - Maharashtra' },
  { date: '2026-01-26', weekday: 'Monday', description: 'Republic Day' },
  { date: '2026-02-15', weekday: 'Sunday', description: 'Mahashivratri' },
  { date: '2026-03-03', weekday: 'Tuesday', description: 'Holi' },
  { date: '2026-03-20', weekday: 'Friday', description: 'Id-Ul-Fitr (Ramzan Id)' },
  { date: '2026-03-26', weekday: 'Thursday', description: 'Ram Navami' },
  { date: '2026-03-31', weekday: 'Tuesday', description: 'Mahavir Jayanti' },
  { date: '2026-04-03', weekday: 'Friday', description: 'Good Friday' },
  { date: '2026-04-14', weekday: 'Tuesday', description: 'Dr. Baba Saheb Ambedkar Jayanti' },
  { date: '2026-05-01', weekday: 'Friday', description: 'Maharashtra Day' },
  { date: '2026-05-27', weekday: 'Wednesday', description: 'Bakri Id (Id-Ul-Zuha)' },
  { date: '2026-06-26', weekday: 'Friday', description: 'Muharram' },
  { date: '2026-08-15', weekday: 'Saturday', description: 'Independence Day' },
  { date: '2026-09-14', weekday: 'Monday', description: 'Ganesh Chaturthi' },
  { date: '2026-10-02', weekday: 'Friday', description: 'Mahatma Gandhi Jayanti' },
  { date: '2026-10-20', weekday: 'Tuesday', description: 'Dussehra' },
  { date: '2026-11-08', weekday: 'Sunday', description: 'Diwali (Laxmi Pujan)' },
  { date: '2026-11-10', weekday: 'Tuesday', description: 'Diwali (Balipratipada)' },
  { date: '2026-11-24', weekday: 'Tuesday', description: 'Guru Nanak Jayanti' },
  { date: '2026-12-25', weekday: 'Friday', description: 'Christmas' },
  // 2027
  { date: '2027-01-26', weekday: 'Tuesday', description: 'Republic Day' },
  { date: '2027-03-22', weekday: 'Monday', description: 'Holi' },
  { date: '2027-03-26', weekday: 'Friday', description: 'Good Friday' },
  { date: '2027-04-14', weekday: 'Wednesday', description: 'Dr. Baba Saheb Ambedkar Jayanti' },
  { date: '2027-05-01', weekday: 'Saturday', description: 'Maharashtra Day' },
  { date: '2027-08-15', weekday: 'Sunday', description: 'Independence Day' },
  { date: '2027-10-02', weekday: 'Saturday', description: 'Mahatma Gandhi Jayanti' },
  { date: '2027-12-25', weekday: 'Saturday', description: 'Christmas' }
];

// In-memory holiday map keyed by YYYY-MM-DD
const holidayMap = new Map();
let lastOnlineFetchTime = null;
let lastOnlineFetchSuccess = false;

// Month dictionary for parsing NSE date strings like '15-Jan-2026'
const MONTHS = {
  'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
  'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
};

/**
 * Normalizes NSE tradingDate string (e.g. '15-Jan-2026') to ISO format 'YYYY-MM-DD'
 */
function parseNseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, '0');
    const mon = parts[1].toUpperCase();
    const mm = MONTHS[mon] || '01';
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

/**
 * Loads cached holidays from disk or initializes with fallback
 */
function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.holidays) && data.holidays.length > 0) {
        holidayMap.clear();
        for (const h of data.holidays) {
          if (h.date) holidayMap.set(h.date, h);
        }
        lastOnlineFetchTime = data.lastFetchedAt || null;
        lastOnlineFetchSuccess = true;
        console.log(`[HolidayService] Loaded ${holidayMap.size} NSE trading holidays from cache.`);
        return;
      }
    }
  } catch (err) {
    console.warn('[HolidayService] Error reading holiday cache:', err.message);
  }

  // Seed with comprehensive fallback
  holidayMap.clear();
  for (const h of FALLBACK_HOLIDAYS) {
    holidayMap.set(h.date, h);
  }
  console.log(`[HolidayService] Seeded ${holidayMap.size} baseline verified NSE trading holidays.`);
}

/**
 * Fetches official NSE trading holidays online from NSE API
 */
export async function fetchOnlineNseHolidays() {
  return new Promise((resolve) => {
    console.log('[HolidayService] 🌐 Fetching live official NSE trading holidays online...');
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.nseindia.com/'
    };

    const req = https.get(NSE_HOLIDAY_URL, { headers, timeout: 7000 }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          const foHolidays = parsed.FO || [];
          const cmHolidays = parsed.CM || [];
          const combined = [...foHolidays, ...cmHolidays];

          if (combined.length > 0) {
            const seen = new Set();
            const cleanList = [];

            for (const item of combined) {
              const iso = parseNseDate(item.tradingDate);
              if (iso && !seen.has(iso)) {
                seen.add(iso);
                const hObj = {
                  date: iso,
                  rawDate: item.tradingDate,
                  weekday: item.weekDay || '',
                  description: item.description || 'NSE Trading Holiday',
                  morning_session: item.morning_session || null,
                  evening_session: item.evening_session || null
                };
                cleanList.push(hObj);
                holidayMap.set(iso, hObj);
              }
            }

            for (const fb of FALLBACK_HOLIDAYS) {
              if (!holidayMap.has(fb.date)) {
                holidayMap.set(fb.date, fb);
                cleanList.push(fb);
              }
            }

            cleanList.sort((a, b) => a.date.localeCompare(b.date));

            fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
            fs.writeFileSync(CACHE_FILE, JSON.stringify({
              lastFetchedAt: new Date().toISOString(),
              totalCount: cleanList.length,
              holidays: cleanList
            }, null, 2), 'utf8');

            lastOnlineFetchTime = new Date().toISOString();
            lastOnlineFetchSuccess = true;
            console.log(`[HolidayService] ✅ Successfully updated ${cleanList.length} NSE trading holidays online.`);
            return resolve(cleanList);
          }
        } catch (parseErr) {
          console.warn('[HolidayService] Failed to parse online response:', parseErr.message);
        }
        resolve(getAllHolidays());
      });
    });

    req.on('error', (err) => {
      console.warn('[HolidayService] Online fetch failed (using local verified calendar):', err.message);
      resolve(getAllHolidays());
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[HolidayService] Online fetch timed out (using local verified calendar).');
      resolve(getAllHolidays());
    });
  });
}

export function isNseHoliday(dateStr) {
  if (!dateStr) return false;
  return holidayMap.has(dateStr);
}

export function getHolidayDetails(dateStr) {
  if (!dateStr) return null;
  return holidayMap.get(dateStr) || null;
}

export function getAllHolidays() {
  return Array.from(holidayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function getNextUpcomingHoliday() {
  const todayStr = getISTDateStr();
  const all = getAllHolidays();
  return all.find(h => h.date >= todayStr) || null;
}

export function getISTDateStr() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getLiveMarketSession() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));

  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const dayOfWeek = ist.getDay(); // 0 = Sun, 6 = Sat

  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
  const holiday = holidayMap.get(dateStr) || null;
  const isHoliday = !!holiday;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  const marketOpenMinutes = 9 * 60 + 15;   // 09:15 AM IST
  const entryCloseMinutes = 15 * 60;       // 03:00 PM IST (Cutoff for taking NEW entries to avoid EOD churn)
  const marketCloseMinutes = 15 * 60 + 15; // 03:15 PM IST (Intraday cutoff)
  const eodSquareOffMinutes = 15 * 60 + 15;// 03:15 PM IST

  const isTradingDay = !isWeekend && !isHoliday;
  const isMarketHours = isTradingDay && (timeMinutes >= marketOpenMinutes && timeMinutes < marketCloseMinutes);
  const isNewEntryAllowed = isTradingDay && (timeMinutes >= marketOpenMinutes && timeMinutes < entryCloseMinutes);
  const isEODExit = isTradingDay && (timeMinutes >= eodSquareOffMinutes);

  let statusReason = 'OPEN';
  let statusMessage = 'Market is OPEN for Trading (09:15 AM – 03:00 PM IST for new entries).';

  if (isWeekend) {
    statusReason = 'WEEKEND_OFF';
    statusMessage = `Market is CLOSED (Weekend - ${dayOfWeek === 6 ? 'Saturday' : 'Sunday'}).`;
  } else if (isHoliday) {
    statusReason = 'HOLIDAY_OFF';
    statusMessage = `Market is CLOSED (NSE Holiday: ${holiday.description}).`;
  } else if (timeMinutes < marketOpenMinutes) {
    statusReason = 'PRE_MARKET';
    const remainingMins = marketOpenMinutes - timeMinutes;
    statusMessage = `Market is in PRE-MARKET. Opens at 09:15 AM IST (in ${remainingMins} min).`;
  } else if (timeMinutes >= marketCloseMinutes) {
    statusReason = 'POST_MARKET';
    statusMessage = 'Market is CLOSED (Post-Market after 03:15 PM IST).';
  } else if (timeMinutes >= entryCloseMinutes) {
    statusReason = 'EOD_CLOSING';
    statusMessage = 'Market in EOD CLOSING (03:00 – 03:15 PM IST: Managing exits only, no new entries).';
  }

  return {
    istTime: ist.toLocaleTimeString('en-IN', { hour12: false }),
    istDate: dateStr,
    dayOfWeek,
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
    isWeekend,
    isHoliday,
    holidayDetails: holiday,
    isTradingDay,
    isMarketHours,
    isNewEntryAllowed,
    isEODExit,
    statusReason,
    statusMessage,
    nextHoliday: getNextUpcomingHoliday()
  };
}

export function initHolidayService() {
  loadDiskCache();
  fetchOnlineNseHolidays().catch(() => {});
  setInterval(() => {
    fetchOnlineNseHolidays().catch(() => {});
  }, 24 * 60 * 60 * 1000);
}

// Initial sync on module load
loadDiskCache();
