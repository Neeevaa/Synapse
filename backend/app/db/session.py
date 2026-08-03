from typing import Generator
from sqlalchemy.orm import Session
from app.db.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Dependency generator that yields a database session.
    Ensures that the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
