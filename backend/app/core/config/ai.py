from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseSettings):
    LLM_PROVIDER: str = Field("mock", validation_alias="LLM_PROVIDER")
    OLLAMA_BASE_URL: str = Field("http://localhost:11434", validation_alias="OLLAMA_BASE_URL")
    OLLAMA_MODEL: str = Field("qwen3-4b-instruct-2507", validation_alias="OLLAMA_MODEL")
    OPENAI_API_KEY: str = Field("", validation_alias="OPENAI_API_KEY")
    OPENAI_MODEL: str = Field("gpt-4o-mini", validation_alias="OPENAI_MODEL")
    GEMINI_API_KEY: str = Field("", validation_alias="GEMINI_API_KEY")
    GEMINI_MODEL: str = Field("gemini-2.5-flash", validation_alias="GEMINI_MODEL")
    EMBEDDING_PROVIDER: str = Field("mock", validation_alias="EMBEDDING_PROVIDER")
    EMBEDDING_DIMENSION: int = Field(1536, validation_alias="EMBEDDING_DIMENSION")

    GOOGLE_API_KEY: str = Field("", validation_alias="GOOGLE_API_KEY")
    GROQ_API_KEY: str = Field("", validation_alias="GROQ_API_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )
