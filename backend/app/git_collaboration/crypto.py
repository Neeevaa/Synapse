import logging
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings
from app.common.exceptions import BaseBusinessException

logger = logging.getLogger(__name__)


def get_fernet_cipher() -> Fernet:
    """
    Returns an authenticated Fernet cipher initialized with CREDENTIAL_ENCRYPTION_KEY.
    Strictly validates the key format; never generates or silently replaces keys at runtime.
    """
    key = settings.CREDENTIAL_ENCRYPTION_KEY.strip()
    if not key:
        raise BaseBusinessException(
            "CREDENTIAL_ENCRYPTION_KEY is not configured in backend environment. "
            "Please configure a 32-byte url-safe base64 Fernet key.",
            status_code=500,
        )

    try:
        key_bytes = key.encode("utf-8")
        cipher = Fernet(key_bytes)
        return cipher
    except Exception as exc:
        logger.error("Failed to initialize Fernet cipher: Invalid key format.")
        raise BaseBusinessException(
            "Invalid CREDENTIAL_ENCRYPTION_KEY format. Must be 32 url-safe base64-encoded bytes (Fernet key).",
            status_code=500,
        ) from exc


def encrypt_secret(secret_text: str) -> str:
    """
    Encrypts a secret string using Fernet authenticated symmetric encryption.
    """
    if not secret_text:
        raise ValueError("Secret text cannot be empty.")
    cipher = get_fernet_cipher()
    encrypted_bytes = cipher.encrypt(secret_text.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_secret(encrypted_text: str) -> str:
    """
    Decrypts a Fernet-encrypted ciphertext string.
    Raises BaseBusinessException if the ciphertext or key is invalid/tampered.
    """
    if not encrypted_text:
        raise ValueError("Ciphertext cannot be empty.")
    cipher = get_fernet_cipher()
    try:
        decrypted_bytes = cipher.decrypt(encrypted_text.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken as exc:
        logger.error("Failed to decrypt secret: InvalidToken (key mismatch or corrupted data).")
        raise BaseBusinessException(
            "Decryption failed: Token is invalid, corrupted, or encryption key changed.",
            status_code=500,
        ) from exc
