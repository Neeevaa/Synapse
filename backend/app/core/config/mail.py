from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MailSettings(BaseSettings):
    MAIL_USERNAME: str = Field("", validation_alias="MAIL_USERNAME")
    MAIL_PASSWORD: str = Field("", validation_alias="MAIL_PASSWORD")
    MAIL_FROM: str = Field("", validation_alias="MAIL_FROM")
    MAIL_PORT: int = Field(587, validation_alias="MAIL_PORT")
    MAIL_SERVER: str = Field("", validation_alias="MAIL_SERVER")
    MAIL_STARTTLS: bool = Field(True, validation_alias="MAIL_STARTTLS")
    MAIL_SSL_TLS: bool = Field(False, validation_alias="MAIL_SSL_TLS")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )
