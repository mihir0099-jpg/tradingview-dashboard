import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('PRAGMA table_info(Instruments);')
print('Instruments cols:', [r[1] for r in c.fetchall()])
c.execute('PRAGMA table_info(MasterInstruments);')
print('MasterInstruments cols:', [r[1] for r in c.fetchall()])