from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_FILE = BASE_DIR / "sql_app.db"

# For development, we'll use a local sqlite database or a mock postgres URI
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_DB_FILE.as_posix()}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///./"):
    SQLALCHEMY_DATABASE_URL = DEFAULT_SQLITE_URL

# In a real environment with PostgreSQL:
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@postgresserver/db"

is_sqlite = "sqlite" in SQLALCHEMY_DATABASE_URL

if is_sqlite:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30}
    )
    # Enable WAL mode and foreign keys on SQLite connections to support high concurrency
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
    # Production PostgreSQL connection with robust connection pooling
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_sqlite_columns():
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        try:
            import sqlite3
            db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
            if os.path.exists(db_path):
                con = sqlite3.connect(db_path)
                cur = con.cursor()
                
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

                # Check attendance_logs
                cur.execute("PRAGMA table_info(attendance_logs)")
                att_cols = [r[1] for r in cur.fetchall()]
                if att_cols:
                    if "confidence_score" not in att_cols:
                        cur.execute("ALTER TABLE attendance_logs ADD COLUMN confidence_score FLOAT")

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

                con.commit()
                con.close()
        except Exception as e:
            print(f"SQLite column migration note: {e}")

ensure_sqlite_columns()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
