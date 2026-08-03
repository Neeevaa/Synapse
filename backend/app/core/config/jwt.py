from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class JWTSettings(BaseSettings):
    JWT_SECRET_KEY: str = Field(
        default="synapse_super_secret_jwt_key_32bytes_min!",
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
