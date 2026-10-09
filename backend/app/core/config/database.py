import re
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str | None) -> str:
    """
    Normalizes database URLs to ensure driver consistency with psycopg2-binary.
    Handles Render hosted PostgreSQL formats:
      - postgres:// -> postgresql+psycopg2://
      - postgresql:// -> postgresql+psycopg2://
      - postgresql+psycopg:// -> postgresql+psycopg2://
    Preserves SQLite URLs (e.g. sqlite:///... or sqlite://).
    """
    if not url:
        return ""
    trimmed = url.strip()
    if trimmed.startswith("postgres://"):
        return "postgresql+psycopg2://" + trimmed[len("postgres://"):]
    if trimmed.startswith("postgresql://"):
        return "postgresql+psycopg2://" + trimmed[len("postgresql://"):]
    if trimmed.startswith("postgresql+psycopg://"):
        return "postgresql+psycopg2://" + trimmed[len("postgresql+psycopg://"):]
    return trimmed


def mask_database_url(url: str | None) -> str:
    """
    Masks credentials in database URL for safe logging and error reporting.
    Never prints user password in logs or exceptions.
    """
    if not url:
        return "<empty>"
    try:
        from sqlalchemy.engine import make_url
        parsed = make_url(url)
        return parsed.render_as_string(hide_password=True)
    except Exception:
        return re.sub(r"://([^:@]+):([^@]+)@", r"://\1:***@", str(url))


class DatabaseSettings(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/synapse",
        validation_alias="DATABASE_URL",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        return normalize_database_url(v)

    @property
    def normalized_url(self) -> str:
        return normalize_database_url(self.DATABASE_URL)
