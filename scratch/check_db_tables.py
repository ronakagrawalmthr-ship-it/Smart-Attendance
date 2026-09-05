import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import database
import models
from sqlalchemy import inspect, text

db = database.SessionLocal()
inspector = inspect(database.engine)
tables = sorted(inspector.get_table_names())

print("="*60)
print(f"DATABASE PATH: {database.SQLALCHEMY_DATABASE_URL}")
print("ACTIVE DATABASE TABLES & PERSISTED RECORD COUNTS:")
print("="*60)
for t in tables:
    count = db.execute(text(f'SELECT COUNT(1) FROM "{t}"')).scalar()
    print(f"• {t:<22} : {count:>5} records")
print("="*60)
