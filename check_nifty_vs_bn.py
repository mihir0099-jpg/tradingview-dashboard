import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT Id, Name, Description, InstrumentType, TickSize, PointValue, TradingHours FROM MasterInstruments WHERE Name IN (\'NIFTY_I\', \'BANKNIFTY_I\', \'NIFTY\', \'BANKNIFTY\')')
for r in c.fetchall():
    print(r)