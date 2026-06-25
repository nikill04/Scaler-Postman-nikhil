"""
Database connection setup using SQLAlchemy with SQLite.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

DATABASE_URL = "sqlite:///./postman_clone.db"

# connect_args is SQLite-specific: allows the same connection to be used
# in multiple threads (FastAPI uses threads per request).
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """Create all tables if they don't exist yet."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    FastAPI dependency that provides a database session per request.
    Always closes the session when the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
