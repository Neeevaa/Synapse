from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseSettings):
    GOOGLE_API_KEY: str = Field("", validation_alias="GOOGLE_API_KEY")
    GROQ_API_KEY: str = Field("", validation_alias="GROQ_API_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )
