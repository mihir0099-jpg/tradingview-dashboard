import sqlite3
conn = sqlite3.connect(r'C:\Users\mihir\OneDrive\Documents\NinjaTrader 8\db\NinjaTrader.sqlite')
c = conn.cursor()
c.execute('SELECT * FROM Instruments WHERE MasterInstrument IN (699839150754255, 699839150753969)')
for r in c.fetchall():
    print(r)