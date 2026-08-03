import re

EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"


def validate_email_format(email: str) -> bool:
    """
    Checks if an email is formatted correctly.
    """
    return bool(re.match(EMAIL_REGEX, email.strip().lower()))
