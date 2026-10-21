import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT i.Id, m.Name, i.Exchange, i.Expiry FROM Instruments i JOIN MasterInstruments m ON i.MasterInstrument = m.Id WHERE m.Name = \'NIFTY\' OR m.Name LIKE \'BANKNIFTY%\'')
for r in c.fetchall()[:20]:
    print(r)