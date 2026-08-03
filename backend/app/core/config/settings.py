from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.config.database import DatabaseSettings
from app.core.config.jwt import JWTSettings
from app.core.config.mail import MailSettings
from app.core.config.ai import AISettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Synapse"
    GOOGLE_CLIENT_ID: str = "739603254405-bh9v6k5kaccp7duuoasp4sfgnufsnkqe.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "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"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    def __init__(self, **values):
        super().__init__(**values)
        # Use direct dict updates to bypass Pydantic custom setattr checks for non-schema fields
        self.__dict__["db"] = DatabaseSettings()
        self.__dict__["jwt"] = JWTSettings()
        self.__dict__["mail"] = MailSettings()
        self.__dict__["ai"] = AISettings()


settings = Settings()
