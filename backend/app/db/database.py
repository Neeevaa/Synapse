import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

logger = logging.getLogger("app")

db_url = settings.db.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        db_url,
        echo=False,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as err:
    logger.warning(
        f"Primary database connection failed for URL '{db_url}': {err}. "
        "Falling back to local SQLite database 'sqlite:///./synapse.db' for seamless development."
    )
    fallback_url = "sqlite:///./synapse.db"
    engine = create_engine(
        fallback_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )
    from app.models.base import Base
    Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)