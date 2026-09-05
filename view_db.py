import sys
import os

# Add backend to path and configure db path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)
db_file = os.path.join(backend_dir, 'sql_app.db').replace('\\', '/')
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"

import database
import models
from sqlalchemy import text, inspect

def format_table(headers, rows):
    if not rows:
        return "  (No records found)\n"
    
    # Calculate column widths
    col_widths = [len(str(h)) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            val_str = str(val) if val is not None else "NULL"
            if len(val_str) > 40:
                val_str = val_str[:37] + "..."
            col_widths[i] = max(col_widths[i], len(val_str))
            
    header_line = " | ".join(f"{h:<{col_widths[i]}}" for i, h in enumerate(headers))
    sep_line = "-+-".join("-" * col_widths[i] for i in range(len(headers)))
    
    lines = [header_line, sep_line]
    for row in rows:
        row_str = " | ".join(
            f"{(str(val)[:37] + '...' if val is not None and len(str(val)) > 40 else (str(val) if val is not None else 'NULL')):<{col_widths[i]}}"
            for i, val in enumerate(row)
        )
        lines.append(row_str)
        
    return "\n".join(lines) + "\n"

def view_table(table_name, limit=20):
    db = database.SessionLocal()
    try:
        res = db.execute(text(f'SELECT * FROM "{table_name}" LIMIT {limit}')).mappings()
        rows = [list(r.values()) for r in res]
        if rows:
            headers = list(res._metadata.keys)
        else:
            inspector = inspect(database.engine)
            headers = [c['name'] for c in inspector.get_columns(table_name)]
            
        print(f"\nTABLE: [{table_name}] (Showing up to {limit} rows)")
        print("=" * 80)
        print(format_table(headers, rows))
    except Exception as e:
        print(f"Error querying {table_name}: {e}")
    finally:
        db.close()

def main():
    db = database.SessionLocal()
    inspector = inspect(database.engine)
    all_tables = sorted(inspector.get_table_names())
    
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else None
    
    alias_map = {
        "student": "student_profiles",
        "students": "student_profiles",
        "attendance": "attendance_logs",
        "logs": "attendance_logs",
        "session": "academic_sessions",
        "sessions": "academic_sessions",
        "classes": "academic_sessions",
        "user": "users",
        "users": "users",
        "grievance": "grievances",
        "grievances": "grievances",
        "subject": "subjects",
        "subjects": "subjects",
        "teacher": "teacher_profiles",
        "teachers": "teacher_profiles",
        "faculty": "teacher_profiles",
        "audit": "audit_logs",
    }

    if not arg or arg in ["help", "-h", "--help"]:
        print("\n" + "=" * 70)
        print("SMART ATTENDANCE — DATABASE DATA VIEWER")
        print("=" * 70)
        print(f"Database File: backend/sql_app.db\n")
        print("Available Tables:")
        for t in all_tables:
            count = db.execute(text(f'SELECT COUNT(1) FROM "{t}"')).scalar()
            print(f"  • {t:<22} ({count} records)")
            
        print("\nUsage Commands:")
        print("  python view_db.py attendance   # View live attendance marks & verification times")
        print("  python view_db.py students     # View enrolled students & roll numbers")
        print("  python view_db.py sessions     # View academic lectures & class timetables")
        print("  python view_db.py users        # View user accounts and roles")
        print("  python view_db.py grievances   # View student grievance disputes & HOD decisions")
        print("  python view_db.py subjects     # View registered subjects")
        print("  python view_db.py all          # View a preview of all tables")
        print("=" * 70 + "\n")
        db.close()
        return

    if arg == "all":
        for t in all_tables:
            view_table(t, limit=5)
        db.close()
        return

    target_table = alias_map.get(arg, arg)
    if target_table in all_tables:
        view_table(target_table, limit=50)
    else:
        print(f"Unknown table '{arg}'. Available tables: {', '.join(all_tables)}")
        
    db.close()

if __name__ == "__main__":
    main()
