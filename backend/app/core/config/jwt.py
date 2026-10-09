from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_DEFAULT_JWT_SECRET = "synapse_super_secret_jwt_key_32bytes_min!"

INSECURE_JWT_SECRETS = {
    "",
    DEV_DEFAULT_JWT_SECRET,
    "change_this_to_a_random_32_byte_secret",
    "change_this_to_a_random_32_byte_secret_in_production",
    "secret",
    "changeme",
    "password",
    "admin",
}


class JWTSettings(BaseSettings):
    JWT_SECRET_KEY: str = Field(
        default=DEV_DEFAULT_JWT_SECRET,
        validation_alias="JWT_SECRET_KEY",
    )
    JWT_ALGORITHM: str = Field("HS256", validation_alias="JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        60, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    def validate_for_production(self) -> None:
        """
        Enforce strict JWT secret security requirements in production.
        Prevents usage of default dev keys or weak secrets.
        """
        key = (self.JWT_SECRET_KEY or "").strip()
        if not key or key in INSECURE_JWT_SECRETS:
            raise ValueError(
                "Production environment requires a custom, non-default JWT_SECRET_KEY. "
                "The development default key is not permitted in production."
            )
        if len(key.encode("utf-8")) < 32:
            raise ValueError(
                f"Production JWT_SECRET_KEY must be at least 32 bytes (256 bits) for HMAC-SHA256 security. "
                f"Current key has {len(key.encode('utf-8'))} bytes."
            )
