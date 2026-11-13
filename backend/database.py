from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
# Load environment variables from backend/.env if present
user_env = Path.home() / ".smart_attendance" / ".env"
if user_env.exists():
    load_dotenv(user_env, override=False)
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)
else:
    load_dotenv()
DEFAULT_DB_FILE = BASE_DIR / "sql_app.db"

# Hybrid Database Architecture:
# - Local/Edge Dev & Pilot: SQLite with WAL mode & busy_timeout
# - Production Campus Rollout: PostgreSQL with robust connection pooling
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_DB_FILE.as_posix()}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///./"):
    SQLALCHEMY_DATABASE_URL = DEFAULT_SQLITE_URL

is_sqlite = "sqlite" in SQLALCHEMY_DATABASE_URL

if is_sqlite:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30}
    )
    # Enable WAL mode, NORMAL sync, and busy timeout on SQLite to prevent concurrency lock errors
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    # Production PostgreSQL connection configured for Supabase Pooled IPv4
    # (Supabase session-pooler limit is 15 clients, keep pool bounded to avoid EMAXCONNSESSION)
    try:
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            pool_size=10,
            max_overflow=4,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_timeout=10,
            connect_args={"connect_timeout": 5}
        )
        with engine.connect() as probe_conn:
            pass
    except Exception as db_err:
        print(f"\n[DATABASE FAILOVER] Remote PostgreSQL unavailable ({db_err}). Falling back to local SQLite ({DEFAULT_DB_FILE}) to keep system 100% operational!\n")
        SQLALCHEMY_DATABASE_URL = DEFAULT_SQLITE_URL
        is_sqlite = True
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False, "timeout": 30}
        )
        from sqlalchemy import event
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=10000")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_sqlite_columns():
    """
    Automatic self-healing column migration for SQLite development & pilot instances.
    Safely adds newly defined schema columns without dropping data.
    """
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        try:
            import sqlite3
            db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
            if os.path.exists(db_path):
                con = sqlite3.connect(db_path)
                try:
                    cur = con.cursor()
                    
                    # Check users
                    cur.execute("PRAGMA table_info(users)")
                    u_cols = [r[1] for r in cur.fetchall()]
                    if u_cols:
                        if "is_verified" not in u_cols:
                            cur.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1")
                        if "is_active" not in u_cols:
                            cur.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")

                    # Check teacher_profiles
                    cur.execute("PRAGMA table_info(teacher_profiles)")
                    tp_cols = [r[1] for r in cur.fetchall()]
                    if tp_cols:
                        if "phone_number" not in tp_cols:
                            cur.execute("ALTER TABLE teacher_profiles ADD COLUMN phone_number TEXT")

                    # Check student_profiles
                    cur.execute("PRAGMA table_info(student_profiles)")
                    st_cols = [r[1] for r in cur.fetchall()]
                    if st_cols:
                        if "photo_thumbnail" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN photo_thumbnail TEXT")
                        if "parent_email" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN parent_email TEXT")
                        if "phone" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN phone TEXT")
                        if "emergency_contact" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN emergency_contact TEXT")
                        if "biometric_consent" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN biometric_consent BOOLEAN DEFAULT 0")
                        if "consent_timestamp" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN consent_timestamp TIMESTAMP")
                        if "sub_batch" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN sub_batch TEXT DEFAULT 'A1'")
                        if "mentor_name" not in st_cols:
                            cur.execute("ALTER TABLE student_profiles ADD COLUMN mentor_name TEXT")

                    # Check attendance_logs
                    cur.execute("PRAGMA table_info(attendance_logs)")
                    att_cols = [r[1] for r in cur.fetchall()]
                    if att_cols:
                        if "confidence_score" not in att_cols:
                            cur.execute("ALTER TABLE attendance_logs ADD COLUMN confidence_score FLOAT")
                        if "status_tag" not in att_cols:
                            cur.execute("ALTER TABLE attendance_logs ADD COLUMN status_tag TEXT DEFAULT 'PRESENT'")
                        if "remarks" not in att_cols:
                            cur.execute("ALTER TABLE attendance_logs ADD COLUMN remarks TEXT")

                    # Check academic_sessions
                    cur.execute("PRAGMA table_info(academic_sessions)")
                    as_cols = [r[1] for r in cur.fetchall()]
                    if as_cols:
                        if "conducted_by_name" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN conducted_by_name TEXT")
                        if "custom_subject_name" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN custom_subject_name TEXT")
                        if "notes" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN notes TEXT")
                        if "section" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN section TEXT")
                        if "end_time" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN end_time TIMESTAMP")
                        if "duration_minutes" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN duration_minutes INTEGER DEFAULT 60")
                        if "credit_weight" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN credit_weight INTEGER DEFAULT 1")
                        if "sub_batch" not in as_cols:
                            cur.execute("ALTER TABLE academic_sessions ADD COLUMN sub_batch TEXT DEFAULT 'All'")

                    # Check grievances
                    cur.execute("PRAGMA table_info(grievances)")
                    gr_cols = [r[1] for r in cur.fetchall()]
                    if gr_cols:
                        if "document_url" not in gr_cols:
                            cur.execute("ALTER TABLE grievances ADD COLUMN document_url TEXT")
                        if "document_name" not in gr_cols:
                            cur.execute("ALTER TABLE grievances ADD COLUMN document_name TEXT")

                    # Check parent_notification_logs for idempotency_key
                    cur.execute("PRAGMA table_info(parent_notification_logs)")
                    pn_cols = [r[1] for r in cur.fetchall()]
                    if pn_cols:
                        if "idempotency_key" not in pn_cols:
                            cur.execute("ALTER TABLE parent_notification_logs ADD COLUMN idempotency_key TEXT")

                    # Ensure device_push_tokens table exists for mobile & web push notifications
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS device_push_tokens (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER,
                            token TEXT UNIQUE,
                            platform TEXT DEFAULT 'expo',
                            device_name TEXT,
                            updated_at TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users (id)
                        )
                    """)

                    # Ensure departments table exists for institutional department CRUD
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS departments (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            code TEXT UNIQUE,
                            name TEXT UNIQUE,
                            degree_type TEXT DEFAULT 'UG',
                            duration_years INTEGER DEFAULT 4,
                            total_semesters INTEGER DEFAULT 8,
                            sections TEXT DEFAULT 'A, B, C',
                            hod_name TEXT,
                            hod_email TEXT,
                            hod_phone TEXT,
                            color TEXT DEFAULT 'from-emerald-500 to-teal-600',
                            rank TEXT DEFAULT 'Academic Faculty',
                            description TEXT,
                            created_at TIMESTAMP
                        )
                    """)

                    # Check holidays
                    cur.execute("PRAGMA table_info(holidays)")
                    hol_cols = [r[1] for r in cur.fetchall()]
                    if hol_cols:
                        if "end_date" not in hol_cols:
                            cur.execute("ALTER TABLE holidays ADD COLUMN end_date TEXT")
                        if "event_type" not in hol_cols:
                            cur.execute("ALTER TABLE holidays ADD COLUMN event_type TEXT DEFAULT 'HOLIDAY'")

                    # Check timetable_slots
                    cur.execute("PRAGMA table_info(timetable_slots)")
                    ts_cols = [r[1] for r in cur.fetchall()]
                    if ts_cols:
                        if "duration_minutes" not in ts_cols:
                            cur.execute("ALTER TABLE timetable_slots ADD COLUMN duration_minutes INTEGER DEFAULT 60")
                        if "credit_weight" not in ts_cols:
                            cur.execute("ALTER TABLE timetable_slots ADD COLUMN credit_weight INTEGER DEFAULT 1")
                        if "sub_batch" not in ts_cols:
                            cur.execute("ALTER TABLE timetable_slots ADD COLUMN sub_batch TEXT DEFAULT 'All'")
                    con.commit()
                finally:
                    con.close()
        except Exception as e:
            print(f"SQLite column migration note: {e}")
    else:
        # PostgreSQL / Production DB self-healing column migration
        try:
            from sqlalchemy import text
            with engine.begin() as conn:
                pg_alters = [
                    "ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS photo_thumbnail TEXT;",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS parent_email TEXT;",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS phone TEXT;",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS biometric_consent BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP;",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS sub_batch VARCHAR DEFAULT 'A1';",
                    "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mentor_name VARCHAR;",
                    "ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS confidence_score FLOAT;",
                    "ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS status_tag VARCHAR DEFAULT 'PRESENT';",
                    "ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS remarks TEXT;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS conducted_by_name TEXT;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS custom_subject_name TEXT;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS notes TEXT;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS section VARCHAR;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS credit_weight INTEGER DEFAULT 1;",
                    "ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS sub_batch VARCHAR DEFAULT 'All';",
                    "ALTER TABLE grievances ADD COLUMN IF NOT EXISTS document_url TEXT;",
                    "ALTER TABLE grievances ADD COLUMN IF NOT EXISTS document_name TEXT;",
                    "ALTER TABLE parent_notification_logs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;",
                    "ALTER TABLE holidays ADD COLUMN IF NOT EXISTS end_date VARCHAR;",
                    "ALTER TABLE holidays ADD COLUMN IF NOT EXISTS event_type VARCHAR DEFAULT 'HOLIDAY';",
                    "ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;",
                    "ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS credit_weight INTEGER DEFAULT 1;",
                    "ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS sub_batch VARCHAR DEFAULT 'All';",
                ]
                for q in pg_alters:
                    try:
                        conn.execute(text(q))
                    except Exception:
                        pass
        except Exception as e:
            print(f"PostgreSQL column migration note: {e}")

# Zero import-time side-effects: ensure_sqlite_columns() is invoked explicitly in main.py startup event

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
