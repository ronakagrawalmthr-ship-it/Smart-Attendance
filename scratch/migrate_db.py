import sqlite3
import os

DB_PATH = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\backend\sql_app.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check columns in attendance_logs
    cursor.execute("PRAGMA table_info(attendance_logs)")
    cols = [col[1] for col in cursor.fetchall()]
    print("Existing cols in attendance_logs:", cols)

    if "status_tag" not in cols:
        cursor.execute("ALTER TABLE attendance_logs ADD COLUMN status_tag TEXT DEFAULT 'PRESENT'")
        print("Added status_tag to attendance_logs")

    if "remarks" not in cols:
        cursor.execute("ALTER TABLE attendance_logs ADD COLUMN remarks TEXT")
        print("Added remarks to attendance_logs")

    # Check columns in academic_sessions
    cursor.execute("PRAGMA table_info(academic_sessions)")
    sess_cols = [col[1] for col in cursor.fetchall()]
    print("Existing cols in academic_sessions:", sess_cols)

    if "semester" not in sess_cols:
        cursor.execute("ALTER TABLE academic_sessions ADD COLUMN semester INTEGER")
        print("Added semester to academic_sessions")

    if "conducted_by_name" not in sess_cols:
        cursor.execute("ALTER TABLE academic_sessions ADD COLUMN conducted_by_name TEXT")
        print("Added conducted_by_name to academic_sessions")

    if "custom_subject_name" not in sess_cols:
        cursor.execute("ALTER TABLE academic_sessions ADD COLUMN custom_subject_name TEXT")
        print("Added custom_subject_name to academic_sessions")

    if "notes" not in sess_cols:
        cursor.execute("ALTER TABLE academic_sessions ADD COLUMN notes TEXT")
        print("Added notes to academic_sessions")

    conn.commit()
    conn.close()

    # Also run create_all using SQLAlchemy
    import sys
    sys.path.append(r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\backend")
    from database import engine, Base
    import models
    Base.metadata.create_all(bind=engine)
    print("All SQLAlchemy tables verified and created successfully.")

if __name__ == "__main__":
    migrate()
