import os
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.config.database import DatabaseSettings
from app.core.config.jwt import JWTSettings
from app.core.config.mail import MailSettings
from app.core.config.ai import AISettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Synapse"
    ENVIRONMENT: str = Field("development", validation_alias="ENVIRONMENT")
    FRONTEND_URL: str = Field("http://localhost:3000", validation_alias="FRONTEND_URL")

    # OAuth Credentials (loaded securely from environment)
    GOOGLE_CLIENT_ID: str = Field("", validation_alias="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field("", validation_alias="GOOGLE_CLIENT_SECRET")

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = Field("", validation_alias="RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET: str = Field("", validation_alias="RAZORPAY_KEY_SECRET")
    RAZORPAY_WEBHOOK_SECRET: str = Field("", validation_alias="RAZORPAY_WEBHOOK_SECRET")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        env = (os.getenv("ENVIRONMENT") or os.getenv("ENV") or self.ENVIRONMENT).strip().lower()
        return env in ("production", "prod")

    def __init__(self, **values):
        super().__init__(**values)
        # Use direct dict updates to bypass Pydantic custom setattr checks for non-schema fields
        self.__dict__["db"] = DatabaseSettings()
        self.__dict__["jwt"] = JWTSettings()
        self.__dict__["mail"] = MailSettings()
        self.__dict__["ai"] = AISettings()


settings = Settings()
