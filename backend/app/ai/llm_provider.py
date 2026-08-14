from abc import ABC, abstractmethod
import json
from typing import Type, TypeVar, Tuple
from pydantic import BaseModel

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)


class ConfigurationError(Exception):
    """Raised when LLM provider configuration is invalid."""
    pass


class BaseLLMProvider(ABC):
    @abstractmethod
    def get_model_name(self) -> str:
        pass

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[T],
    ) -> Tuple[T, dict]:
        """
        Returns a tuple of (validated_pydantic_object, raw_json_dict).
        raw_json_dict is stored strictly internally for DB research logging.
        """
        pass


class MockLLMProvider(BaseLLMProvider):
    """
    Deterministic local LLM provider returning structured JSON findings for tests and offline dev.
    """

    def get_model_name(self) -> str:
        return "mock-deterministic-v1"

    def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[T],
    ) -> Tuple[T, dict]:
        # Deterministic mock JSON payload matching ReviewOutputSchema
        mock_raw_data = {
            "findings": [
                {
                    "severity": "HIGH",
                    "issue_type": "INCONSISTENCY",
                    "title": "OAuth2 Token Expiry Mismatch",
                    "description": "Requirement specifies 60-minute token expiry, but recent technical review meeting decided on 15-minute expiry with refresh rotation.",
                    "evidence": "Meeting notes from Security Sync explicitly state: 'Access tokens must expire in 15 minutes to reduce window of compromise.'",
                    "recommendation": "Update requirement token expiry value from 60 minutes to 15 minutes and document refresh token rotation logic.",
                    "source_references": ["MTG-Security Sync"],
                },
                {
                    "severity": "MEDIUM",
                    "issue_type": "MISSING_EDGE_CASE",
                    "title": "Unspecified User Behavior on Session Revocation",
                    "description": "The specification does not describe active websocket session disconnect behavior when user revokes permissions.",
                    "evidence": "Supporting project context was unavailable for this finding.",
                    "recommendation": "Add explicit acceptance criteria defining immediate WebSocket teardown on session revocation.",
                    "source_references": [],
                },
            ]
        }

        validated_object = response_schema.model_validate(mock_raw_data)
        return validated_object, mock_raw_data


import os


class OpenAILLMProvider(BaseLLMProvider):
    """
    OpenAI structured output LLM provider using configured OPENAI_MODEL (default: gpt-4o-mini).
    """

    def get_model_name(self) -> str:
        return os.getenv("OPENAI_MODEL") if "OPENAI_MODEL" in os.environ else getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[T],
    ) -> Tuple[T, dict]:
        api_key = os.getenv("OPENAI_API_KEY") if "OPENAI_API_KEY" in os.environ else getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            raise ConfigurationError("OPENAI_API_KEY is not configured.")

        import openai
        client = openai.OpenAI(api_key=api_key)

        model_name = self.get_model_name()

        try:
            completion = client.beta.chat.completions.parse(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt},
                ],
                response_format=response_schema,
            )
            parsed_object = completion.choices[0].message.parsed
            raw_content = completion.choices[0].message.content or "{}"
            raw_dict = json.loads(raw_content)
            return parsed_object, raw_dict
        except openai.NotFoundError as e:
            raise ConfigurationError(f"OpenAI model '{model_name}' is not available to the configured API key: {e}") from e
        except openai.AuthenticationError as e:
            raise ConfigurationError(f"OpenAI API key authentication failed: {e}") from e
        except openai.RateLimitError as e:
            raise ConfigurationError(f"OpenAI API rate limit or quota balance exhausted: {e}") from e
        except openai.APIError as e:
            raise ConfigurationError(f"OpenAI API call failed: {e}") from e



class GeminiLLMProvider(BaseLLMProvider):
    """
    Google Gemini structured output LLM provider using gemini-2.5-flash.
    """

    def get_model_name(self) -> str:
        return "gemini-2.5-flash"

    def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[T],
    ) -> Tuple[T, dict]:
        api_key = os.getenv("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", ""))
        if not api_key:
            raise ConfigurationError("GEMINI_API_KEY is not configured.")

        raw_text = ""
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)
            full_prompt = f"{system_instruction}\n\n{prompt}\n\nPlease respond in JSON matching schema: {response_schema.model_json_schema()}"
            response = client.models.generate_content(
                model=self.get_model_name(),
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            raw_text = response.text or "{}"
        except Exception:
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=api_key)
            model = genai_legacy.GenerativeModel(
                model_name=self.get_model_name(),
                system_instruction=system_instruction,
                generation_config={"response_mime_type": "application/json"},
            )
            full_prompt = f"{prompt}\n\nPlease respond in JSON matching schema: {response_schema.model_json_schema()}"
            res = model.generate_content(full_prompt)
            raw_text = res.text or "{}"

        clean_text = raw_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        raw_dict = json.loads(clean_text)
        validated_object = response_schema.model_validate(raw_dict)

        return validated_object, raw_dict



def get_llm_provider() -> BaseLLMProvider:
    provider_type = (os.getenv("LLM_PROVIDER") if "LLM_PROVIDER" in os.environ else getattr(settings, "LLM_PROVIDER", "mock")).lower().strip()
    if provider_type == "openai":
        provider = OpenAILLMProvider()
        key = os.getenv("OPENAI_API_KEY") if "OPENAI_API_KEY" in os.environ else getattr(settings, "OPENAI_API_KEY", "")
        if not key:
            raise ConfigurationError("OPENAI_API_KEY is missing for OpenAI LLM Provider.")
        return provider
    elif provider_type == "gemini":
        provider = GeminiLLMProvider()
        key = os.getenv("GEMINI_API_KEY") if "GEMINI_API_KEY" in os.environ else getattr(settings, "GEMINI_API_KEY", "")
        if not key:
            raise ConfigurationError("GEMINI_API_KEY is missing for Gemini LLM Provider.")
        return provider
    elif provider_type == "mock":
        return MockLLMProvider()
    else:
        raise ConfigurationError(f"Unsupported LLM_PROVIDER: '{provider_type}'. Must be 'mock', 'openai', or 'gemini'.")


def get_provider_diagnostics() -> dict:
    """
    Safe diagnostic function returning active provider metadata.
    Never exposes API keys, prompts, context, or raw responses.
    """
    provider = get_llm_provider()
    model = provider.get_model_name()
    is_mock = isinstance(provider, MockLLMProvider)

    if isinstance(provider, OpenAILLMProvider):
        provider_name = "openai"
    elif isinstance(provider, GeminiLLMProvider):
        provider_name = "gemini"
    elif isinstance(provider, MockLLMProvider):
        provider_name = "mock"
    else:
        provider_name = provider.__class__.__name__

    return {
        "provider": provider_name,
        "model": model,
        "is_mock": is_mock,
    }



