import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT * FROM MasterInstruments WHERE Id = 14 OR Id = 54 OR Name = \'NIFTY\' OR Name = \'BANKNIFTY\'')
for r in c.fetchall():
    print(r)