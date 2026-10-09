import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.config.database import normalize_database_url, mask_database_url

logger = logging.getLogger("app")

is_production = settings.is_production
raw_db_url = settings.db.DATABASE_URL
db_url = normalize_database_url(raw_db_url)

if is_production:
    # 1. Require a valid PostgreSQL database URL in production
    if not (db_url.startswith("postgresql+psycopg2://") or db_url.startswith("postgresql://")):
        masked_url = mask_database_url(db_url)
        raise RuntimeError(
            f"Production environment requires a valid PostgreSQL database URL. Received: '{masked_url}'. "
            "Please configure DATABASE_URL with a valid PostgreSQL connection string."
        )

    # 2. Validate JWT secret strength for production
    settings.jwt.validate_for_production()

    # 3. Connect to production PostgreSQL. Never fall back to SQLite.
    try:
        engine = create_engine(
            db_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        # Test connection
        with engine.connect() as conn:
            logger.info("Successfully established connection to production PostgreSQL database.")
    except Exception as err:
        masked_url = mask_database_url(db_url)
        logger.critical(
            "Production PostgreSQL database connection failed for URL '%s': %s. Aborting startup.",
            masked_url,
            err,
        )
        raise RuntimeError(
            f"Production PostgreSQL connection failed: {err}. "
            "SQLite fallback is strictly prohibited in production."
        ) from err

    # 4. In production, never auto-create schema via Base.metadata.create_all().
    # Schema creation and evolution must be managed strictly via Alembic migrations.

else:
    # Development / Testing environment: preserve smooth local developer experience
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
        masked_url = mask_database_url(db_url)
        logger.warning(
            f"Primary database connection failed for URL '{masked_url}': {err}. "
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