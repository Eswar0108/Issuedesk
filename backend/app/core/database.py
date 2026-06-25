"""
Database connection module.

Sets up SQLAlchemy engine and session factory for PostgreSQL.
Uses settings from config.py to establish the database connection.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# ── Database Engine ──────────────────────────────────────────
# Creates the connection pool to PostgreSQL
# PostgreSQL handles multi-threading natively, so no extra args needed
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Verifies connection is alive before using it
    pool_size=5,             # Number of persistent connections in pool
    max_overflow=10          # Extra connections allowed when pool is full
)

# ── Session Factory ──────────────────────────────────────────
# Creates new database sessions for each request
# autocommit=False: We manually control when to save changes (commit)
# autoflush=False: We control when changes are sent to the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Declarative Base ─────────────────────────────────────────
# All database models inherit from this class
# SQLAlchemy uses it to map Python classes to database tables
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session.
    
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            ...
    
    Yields:
        Session: A SQLAlchemy database session
    
    Note:
        Using yield ensures the session is properly closed
        even if an exception occurs during request handling.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()