import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT name FROM sqlite_master WHERE type=\'table\';')
print('Tables:', [r[0] for r in c.fetchall()[:15]])
c.execute('SELECT Name FROM Instruments WHERE Name LIKE \'%NIFTY%\' OR Name LIKE \'%BANK%\'')
print('Instruments:', c.fetchall())
c.execute('SELECT Name FROM MasterInstruments WHERE Name LIKE \'%NIFTY%\' OR Name LIKE \'%BANK%\'')
print('MasterInstruments:', c.fetchall())