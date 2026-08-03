import re
import uuid


def slugify(text: str) -> str:
    """
    Standard slugify helper to convert any string to a URL-friendly slug.
    """
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text


def generate_uuid() -> uuid.UUID:
    """
    Generates a secure UUID v4.
    """
    return uuid.uuid4()
