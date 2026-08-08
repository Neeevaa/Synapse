import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class JWTSettings:
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "synapse_super_secret_jwt_key_32bytes_min!")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


class DatabaseSettings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/synapse")


class Settings(BaseSettings):
    PROJECT_NAME: str = "Synapse"
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    jwt: JWTSettings = JWTSettings()
    db: DatabaseSettings = DatabaseSettings()

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
