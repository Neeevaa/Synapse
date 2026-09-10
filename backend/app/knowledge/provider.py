from abc import ABC, abstractmethod
import math
import hashlib
import os
import json
import urllib.request
import urllib.error
from app.core.config import settings


class ConfigurationError(Exception):
    """Raised when embedding provider or dimension configuration is invalid."""
    pass


def _get_ai_setting(field: str, default=None):
    ai_settings = getattr(settings, "ai", settings)
    return getattr(ai_settings, field, getattr(settings, field, default))


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
        expected_dim = int(os.getenv("EMBEDDING_DIMENSION") or _get_ai_setting("EMBEDDING_DIMENSION", 1536))
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
        return int(os.getenv("EMBEDDING_DIMENSION") or _get_ai_setting("EMBEDDING_DIMENSION", 1536))

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
        api_key = os.getenv("OPENAI_API_KEY") or _get_ai_setting("OPENAI_API_KEY", "")
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
        api_key = os.getenv("GEMINI_API_KEY") or _get_ai_setting("GEMINI_API_KEY", "")
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


class OllamaEmbeddingProvider(BaseEmbeddingProvider):
    """
    Local Ollama embedding provider using nomic-embed-text (768-dim) or configured model.
    Communicates directly with local Ollama instance via HTTP API.
    """

    def get_model_name(self) -> str:
        return os.getenv("OLLAMA_EMBEDDING_MODEL") or _get_ai_setting("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

    def get_base_url(self) -> str:
        url = os.getenv("OLLAMA_BASE_URL") or _get_ai_setting("OLLAMA_BASE_URL", "http://localhost:11434")
        return url.rstrip("/")

    def get_dimension(self) -> int:
        model = self.get_model_name()
        if "nomic-embed-text" in model:
            return 768
        return int(os.getenv("EMBEDDING_DIMENSION") or _get_ai_setting("EMBEDDING_DIMENSION", 768))

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        base_url = self.get_base_url()
        model_name = self.get_model_name()
        endpoint = f"{base_url}/api/embed"

        payload = {
            "model": model_name,
            "input": texts,
        }

        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                resp_bytes = response.read()
                resp_json = json.loads(resp_bytes.decode("utf-8"))
                vectors = resp_json.get("embeddings", [])
        except urllib.error.HTTPError as e:
            # Fallback to /api/embeddings in a loop if /api/embed is not available
            if e.code == 404:
                vectors = []
                for t in texts:
                    single_req = urllib.request.Request(
                        f"{base_url}/api/embeddings",
                        data=json.dumps({"model": model_name, "prompt": t}).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with urllib.request.urlopen(single_req, timeout=60) as s_resp:
                        s_json = json.loads(s_resp.read().decode("utf-8"))
                        vectors.append(s_json.get("embedding", []))
            else:
                err_msg = ""
                try:
                    err_msg = e.read().decode("utf-8")
                except Exception:
                    pass
                raise ConfigurationError(
                    f"Ollama embedding request failed for model '{model_name}' (HTTP {e.code}): {err_msg or e.reason}"
                ) from e
        except Exception as e:
            raise ConfigurationError(
                f"Failed to connect to local Ollama at '{base_url}': {e}. "
                "Ensure Ollama is running and model is available."
            ) from e

        # Ensure L2 normalization
        normalized_vectors = []
        for vec in vectors:
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            normalized_vectors.append([x / norm for x in vec])

        self.validate_dimension(normalized_vectors)
        return normalized_vectors


def get_embedding_provider() -> BaseEmbeddingProvider:
    provider_type = (os.getenv("EMBEDDING_PROVIDER") or _get_ai_setting("EMBEDDING_PROVIDER", "mock")).lower().strip()
    if provider_type == "openai":
        provider = OpenAIEmbeddingProvider()
    elif provider_type == "gemini":
        provider = GeminiEmbeddingProvider()
    elif provider_type in ("ollama", "local"):
        provider = OllamaEmbeddingProvider()
    elif provider_type == "mock":
        provider = MockEmbeddingProvider()
    else:
        raise ConfigurationError(f"Unsupported EMBEDDING_PROVIDER: '{provider_type}'. Must be 'ollama', 'openai', 'gemini', or 'mock'.")

    expected_dim = int(os.getenv("EMBEDDING_DIMENSION") or _get_ai_setting("EMBEDDING_DIMENSION", 1536))
    if provider.get_dimension() != expected_dim:
        raise ConfigurationError(
            f"Active embedding provider '{provider.get_model_name()}' returns {provider.get_dimension()} dimensions, "
            f"but system setting EMBEDDING_DIMENSION is {expected_dim}."
        )

    return provider

