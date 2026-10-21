import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT Id, Name, Description FROM MasterInstruments WHERE Name LIKE \'%BANKNIFTY%\'')
for r in c.fetchall():
    print(r)