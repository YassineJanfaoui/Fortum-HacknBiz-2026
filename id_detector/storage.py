"""
Secure Storage Module for the ID Detector Agent.

Provides encryption at rest for authentic identification documents.
Uses symmetric encryption (Fernet/AES-128-CBC) via the cryptography package.
Keys must be securely managed via environment variables.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from . import config
from .exceptions import IDDetectorError

logger = logging.getLogger(__name__)


class StorageError(IDDetectorError):
    """Base exception for storage and encryption errors."""
    pass


class EncryptionKeyMissingError(StorageError):
    """Raised when the ENCRYPTION_KEY is not set but storage is requested."""
    pass


class DecryptionError(StorageError):
    """Raised when an encrypted file cannot be decrypted (wrong key or corrupted)."""
    pass


class SecureStorage:
    """
    Handles secure encryption, decryption, and storage of ID images.
    """

    def __init__(self, key: str | bytes | None = None, storage_dir: str | Path | None = None):
        """
        Initialize Secure Storage.

        Parameters
        ----------
        key : str | bytes | None
            The Fernet encryption key. Falls back to config.ENCRYPTION_KEY.
        storage_dir : str | Path | None
            Directory to store encrypted files. Falls back to config.STORAGE_DIR.
        """
        self._key = key or config.ENCRYPTION_KEY
        if not self._key:
            raise EncryptionKeyMissingError(
                message="No encryption key provided for secure storage.",
                detail="Ensure ENCRYPTION_KEY is set in your .env file. "
                       "You can generate one using `SecureStorage.generate_key()`."
            )
        
        try:
            self._fernet = Fernet(self._key)
        except ValueError as exc:
            raise StorageError(
                message="Invalid encryption key format.",
                detail=str(exc)
            ) from exc

        self._storage_dir = Path(storage_dir or config.STORAGE_DIR).resolve()
        self._ensure_storage_dir()

    def _ensure_storage_dir(self) -> None:
        """Create the storage directory with restricted permissions if it doesn't exist."""
        if not self._storage_dir.exists():
            # Try to create directory with restricted permissions (0o700)
            # This is most effective on Unix-like systems.
            self._storage_dir.mkdir(parents=True, exist_ok=True)
            try:
                os.chmod(self._storage_dir, 0o700)
                logger.info("Created secure storage directory: %s", self._storage_dir)
            except OSError as e:
                logger.warning("Could not set restricted permissions on storage dir: %s", e)

    def encrypt_and_save(self, image_bytes: bytes, metadata_prefix: str = "id") -> Path:
        """
        Encrypt the raw image bytes and save to disk.

        Parameters
        ----------
        image_bytes : bytes
            The raw image bytes to encrypt.
        metadata_prefix : str
            A prefix for the generated filename (e.g., 'id', 'passport').

        Returns
        -------
        Path
            The absolute path to the newly created encrypted file.
        """
        try:
            encrypted_data = self._fernet.encrypt(image_bytes)
        except Exception as exc:
            raise StorageError(f"Encryption failed: {exc}") from exc

        # Generate a random UUID filename to obscure the contents
        filename = f"{metadata_prefix}_{uuid.uuid4().hex}.enc"
        file_path = self._storage_dir / filename

        try:
            file_path.write_bytes(encrypted_data)
            # Restrict file permissions to the owner only
            os.chmod(file_path, 0o600)
            logger.info("Successfully encrypted and saved image to: %s", file_path.name)
            return file_path
        except IOError as exc:
            raise StorageError(f"Failed to write encrypted file to disk: {exc}") from exc

    def load_and_decrypt(self, file_path: str | Path) -> bytes:
        """
        Load an encrypted file from disk and decrypt it in memory.

        Parameters
        ----------
        file_path : str | Path
            Path to the `.enc` file.

        Returns
        -------
        bytes
            The decrypted, original image bytes.
        """
        path = Path(file_path).resolve()
        if not path.exists():
            raise StorageError(f"Encrypted file not found: {path}")

        try:
            encrypted_data = path.read_bytes()
        except IOError as exc:
            raise StorageError(f"Failed to read encrypted file: {exc}") from exc

        try:
            decrypted_data = self._fernet.decrypt(encrypted_data)
            logger.info("Successfully decrypted file: %s", path.name)
            return decrypted_data
        except InvalidToken as exc:
            raise DecryptionError(
                message="Failed to decrypt file. The key may be incorrect or the file corrupted.",
                detail=str(exc)
            ) from exc

    @staticmethod
    def generate_key() -> str:
        """Generate a new Fernet encryption key (base64-encoded)."""
        return Fernet.generate_key().decode("utf-8")
