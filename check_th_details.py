import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT name FROM sqlite_master WHERE type=\'table\' AND name LIKE \'%Hour%\'')
print('TradingHours tables:', c.fetchall())