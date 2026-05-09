"""
Input validation layer for the ID Detector Agent.

Enforces strict security checks before any image data reaches the AI model:
- File extension whitelist
- Magic-byte verification (prevents extension spoofing)
- File size limits
- Empty/corrupt file detection
"""

from __future__ import annotations

import logging
from pathlib import Path

from . import config
from .exceptions import FileTooLargeError, InvalidFileError, UnsupportedFormatError

logger = logging.getLogger(__name__)


def validate_file(
    source: str | Path | bytes,
    *,
    max_size_bytes: int | None = None,
    allowed_extensions: set[str] | None = None,
) -> tuple[bytes, str]:
    """
    Validate an input file and return sanitized (bytes, mime_type).

    Parameters
    ----------
    source : str | Path | bytes
        A file path or raw bytes to validate.
    max_size_bytes : int | None
        Override the default max file size. Uses config default if None.
    allowed_extensions : set[str] | None
        Override the allowed extensions. Uses config default if None.

    Returns
    -------
    tuple[bytes, str]
        Validated file bytes and detected MIME type.

    Raises
    ------
    InvalidFileError
        If the file is empty, unreadable, or corrupt.
    FileTooLargeError
        If the file exceeds the size limit.
    UnsupportedFormatError
        If the file type is not allowed.
    """
    max_size = max_size_bytes or config.MAX_FILE_SIZE_BYTES
    extensions = allowed_extensions or config.ALLOWED_EXTENSIONS

    # --- Read bytes ---
    if isinstance(source, (str, Path)):
        file_path = Path(source)
        _validate_extension(file_path, extensions)
        data = _read_file(file_path)
    elif isinstance(source, bytes):
        data = source
    else:
        raise InvalidFileError(
            f"Invalid source type: {type(source).__name__}. Expected str, Path, or bytes."
        )

    # --- Size check ---
    if len(data) == 0:
        raise InvalidFileError("File is empty (0 bytes).")

    if len(data) > max_size:
        raise FileTooLargeError(file_size_bytes=len(data), max_size_bytes=max_size)

    # --- Magic-byte detection ---
    mime_type = _detect_mime_type(data)

    logger.info(
        "File validated: size=%d bytes, mime_type=%s",
        len(data),
        mime_type,
    )
    return data, mime_type


def _validate_extension(file_path: Path, allowed: set[str]) -> None:
    """Check file extension against the whitelist."""
    ext = file_path.suffix.lower()
    if ext not in allowed:
        raise UnsupportedFormatError(
            detected_type=ext,
            allowed_types=sorted(allowed),
        )


def _read_file(file_path: Path) -> bytes:
    """Safely read a file from disk."""
    path = file_path.resolve()

    if not path.exists():
        raise InvalidFileError(f"File not found: {path}")
    if not path.is_file():
        raise InvalidFileError(f"Path is not a file: {path}")

    try:
        return path.read_bytes()
    except PermissionError as exc:
        raise InvalidFileError(f"Permission denied: {path}") from exc
    except OSError as exc:
        raise InvalidFileError(f"Cannot read file: {path} — {exc}") from exc


def _detect_mime_type(data: bytes) -> str:
    """
    Detect MIME type via magic bytes.

    This prevents extension-spoofing attacks where a malicious file
    is given an image extension.
    """
    for mime_type, (offset, magic) in config.MAGIC_BYTES.items():
        if data[offset: offset + len(magic)] == magic:
            return mime_type

    raise UnsupportedFormatError(
        detected_type="unknown (magic bytes mismatch)",
        allowed_types=sorted(config.MAGIC_BYTES.keys()),
    )
