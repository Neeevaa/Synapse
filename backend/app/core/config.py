import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()


class JWTSettings:
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "synapse_super_secret_jwt_key_32bytes_min!")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


class DatabaseSettings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:ryan@localhost:5432/synapse")


class Settings(BaseSettings):
    PROJECT_NAME: str = "Synapse"
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "") 
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "1536"))
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "mock")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3-4b-instruct-2507")
    OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "").strip()
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip()

    jwt: JWTSettings = JWTSettings()
    db: DatabaseSettings = DatabaseSettings()

    model_config = SettingsConfigDict(
        env_file=str(env_path) if env_path.exists() else ".env",
        extra="ignore",
    )


settings = Settings()
