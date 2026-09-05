from sqlalchemy import create_engine, pool
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from pathlib import Path
import logging

logger = logging.getLogger("forgr.database")

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = os.getenv("FORGR_DATABASE_URL", f"sqlite:///{BASE_DIR / 'forgr.db'}")
ENV = os.getenv("FORGR_ENV", "development").lower()

# Database connection pooling configuration for production
engine_options = {
    "echo": ENV == "development",  # Log SQL statements in development only
}

if DATABASE_URL.startswith("sqlite"):
    # SQLite: use NullPool for compatibility with in-memory or file-based databases
    engine_options["connect_args"] = {"check_same_thread": False}
    engine_options["poolclass"] = pool.NullPool
elif DATABASE_URL.startswith("postgresql"):
    # PostgreSQL: use QueuePool with production configuration
    engine_options["poolclass"] = pool.QueuePool
    engine_options["pool_size"] = int(os.getenv("FORGR_DB_POOL_SIZE", "20"))
    engine_options["max_overflow"] = int(os.getenv("FORGR_DB_MAX_OVERFLOW", "40"))
    engine_options["pool_recycle"] = int(os.getenv("FORGR_DB_POOL_RECYCLE", "1800"))
    engine_options["pool_pre_ping"] = True  # Verify connections before use
else:
    # Default for other databases
    engine_options["pool_pre_ping"] = True
    engine_options["pool_recycle"] = 1800

# Log configuration details in production
if ENV == "production":
    logger.info(f"Database: {DATABASE_URL.split('@')[0] if '@' in DATABASE_URL else 'SQLite'}")
    if DATABASE_URL.startswith("postgresql"):
        logger.info(f"Pool size: {engine_options.get('pool_size')}, Max overflow: {engine_options.get('max_overflow')}")

engine = create_engine(DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()