from abc import ABC, abstractmethod
import math
import hashlib
from app.core.config import settings


class ConfigurationError(Exception):
    """Raised when embedding provider or dimension configuration is invalid."""
    pass


class BaseEmbeddingProvider(ABC):
    @abstractmethod
    def get_model_name(self) -> str:
        pass

    @abstractmethod
    def get_dimension(self) -> int:
        pass

    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        pass

    def validate_dimension(self, vectors: list[list[float]]):
        expected_dim = getattr(settings, "EMBEDDING_DIMENSION", 1536)
        provider_dim = self.get_dimension()

        if provider_dim != expected_dim:
            raise ConfigurationError(
                f"Embedding provider dimension mismatch: provider '{self.get_model_name()}' "
                f"configured dimension is {provider_dim}, but system settings EMBEDDING_DIMENSION is {expected_dim}."
            )

        for idx, vec in enumerate(vectors):
            if len(vec) != expected_dim:
                raise ConfigurationError(
                    f"Generated embedding vector at index {idx} has length {len(vec)}, "
                    f"which does not match expected dimension {expected_dim}."
                )


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """
    Deterministic local vector generator for testing and offline development.
    Generates reproducible unit-normalized float vectors.
    """

    def get_model_name(self) -> str:
        return "mock-deterministic-v1"

    def get_dimension(self) -> int:
        return getattr(settings, "EMBEDDING_DIMENSION", 1536)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        dim = self.get_dimension()
        results = []

        for text in texts:
            # Generate deterministic values based on text hash
            h = hashlib.sha256(text.encode("utf-8")).digest()
            vec = []
            for i in range(dim):
                byte_val = h[i % len(h)]
                # Produce pseudo-random value between -1.0 and 1.0
                val = ((byte_val + i * 31) % 256) / 128.0 - 1.0
                vec.append(val)

            # L2 Normalize
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            norm_vec = [x / norm for x in vec]
            results.append(norm_vec)

        self.validate_dimension(results)
        return results


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """
    OpenAI embeddings provider using text-embedding-3-small (1536-dim).
    """

    def get_model_name(self) -> str:
        return "text-embedding-3-small"

    def get_dimension(self) -> int:
        return 1536

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            raise ConfigurationError("OPENAI_API_KEY is not configured.")

        import openai
        client = openai.OpenAI(api_key=api_key)
        response = client.embeddings.create(
            input=texts,
            model=self.get_model_name(),
        )
        vectors = [data.embedding for data in response.data]
        self.validate_dimension(vectors)
        return vectors


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """
    Google Gemini embeddings provider using text-embedding-004.
    """

    def get_model_name(self) -> str:
        return "text-embedding-004"

    def get_dimension(self) -> int:
        return 768

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            raise ConfigurationError("GEMINI_API_KEY is not configured.")

        # Real Gemini API call if configured
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        vectors = []
        for t in texts:
            res = genai.embed_content(
                model="models/text-embedding-004",
                content=t,
            )
            vectors.append(res["embedding"])

        self.validate_dimension(vectors)
        return vectors


def get_embedding_provider() -> BaseEmbeddingProvider:
    provider_type = getattr(settings, "EMBEDDING_PROVIDER", "mock").lower().strip()
    if provider_type == "openai":
        provider = OpenAIEmbeddingProvider()
    elif provider_type == "gemini":
        provider = GeminiEmbeddingProvider()
    else:
        provider = MockEmbeddingProvider()

    expected_dim = getattr(settings, "EMBEDDING_DIMENSION", 1536)
    if provider.get_dimension() != expected_dim:
        raise ConfigurationError(
            f"Active embedding provider '{provider.get_model_name()}' returns {provider.get_dimension()} dimensions, "
            f"but system setting EMBEDDING_DIMENSION is {expected_dim}."
        )

    return provider
