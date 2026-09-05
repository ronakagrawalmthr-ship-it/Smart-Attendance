import sqlite3

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

tables = [row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall() if not row[0].startswith('sqlite_')]
print("DATABASE AUDIT:")
for t in sorted(tables):
    count = cursor.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f" - {t}: {count} records")
