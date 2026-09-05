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

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
