from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MailSettings(BaseSettings):
    SMTP_HOST: str = Field("smtp.gmail.com", validation_alias="SMTP_HOST")
    SMTP_PORT: int = Field(587, validation_alias="SMTP_PORT")
    SMTP_USERNAME: str = Field("", validation_alias="SMTP_USERNAME")
    SMTP_PASSWORD: str = Field("", validation_alias="SMTP_PASSWORD")
    SMTP_FROM: str = Field("", validation_alias="SMTP_FROM")

    MAIL_USERNAME: str = Field("", validation_alias="MAIL_USERNAME")
    MAIL_PASSWORD: str = Field("", validation_alias="MAIL_PASSWORD")
    MAIL_FROM: str = Field("", validation_alias="MAIL_FROM")
    MAIL_PORT: int = Field(0, validation_alias="MAIL_PORT")
    MAIL_SERVER: str = Field("", validation_alias="MAIL_SERVER")
    MAIL_STARTTLS: bool = Field(True, validation_alias="MAIL_STARTTLS")
    MAIL_SSL_TLS: bool = Field(False, validation_alias="MAIL_SSL_TLS")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def host(self) -> str:
        return self.MAIL_SERVER or self.SMTP_HOST or "smtp.gmail.com"

    @property
    def port(self) -> int:
        return self.MAIL_PORT or self.SMTP_PORT or 587

    @property
    def username(self) -> str:
        return self.MAIL_USERNAME or self.SMTP_USERNAME

    @property
    def password(self) -> str:
        return self.MAIL_PASSWORD or self.SMTP_PASSWORD

    @property
    def from_address(self) -> str:
        return self.MAIL_FROM or self.SMTP_FROM or self.username or "noreply@synapse.com"

