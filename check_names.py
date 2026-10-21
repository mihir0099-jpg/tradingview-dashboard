import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT Id, Name, Description, TickSize, PointValue FROM MasterInstruments WHERE Name LIKE \'%NIFTY%\' OR Name LIKE \'%BANK%\'')
print('Found MasterInstruments:', c.fetchall())