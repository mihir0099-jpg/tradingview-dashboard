import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT Id, Name, TradingHours FROM MasterInstruments WHERE Name IN (\'^BANKNIFTY\', \'BANKNIFTY\', \'BANKNIFTY_I\', \'NIFTY\', \'NIFTY_I\')')
for r in c.fetchall():
    print(r)