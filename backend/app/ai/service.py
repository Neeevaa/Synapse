import logging
from app.core.config import settings

logger = logging.getLogger("app")


class AIService:
    def __init__(self) -> None:
        # Placeholders for generative-ai clients utilizing settings.ai credentials
        pass

    def generate_summary(self, text: str) -> str:
        """
        Generates a summary of the input text using configured LLM provider.
        """
        logger.info(
            "AI Service generating summary",
            extra={"extra_info": {"text_length": len(text)}},
        )
        return f"AI Summary: {text[:50]}..."

    def generate_action_items(self, text: str) -> list[str]:
        """
        Generates action items from meeting scripts or transcripts.
        """
        logger.info(
            "AI Service generating action items",
            extra={"extra_info": {"text_length": len(text)}},
        )
        return [
            "Action Item 1: Review requirements",
            "Action Item 2: Build migrations",
        ]


ai_service = AIService()
