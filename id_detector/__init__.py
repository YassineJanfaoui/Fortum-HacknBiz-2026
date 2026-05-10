"""
ID Detector Agent — AI-powered identification document detection.

Uses a local CLIP model (no cloud APIs, no data leaves your device) to analyze
images (JPEG, PNG) and PDFs to determine whether they contain identification
documents, with confidence scoring and risk flag detection.

Usage
-----
    from id_detector import IDDetectorAgent, IDDetectionResult

    agent = IDDetectorAgent()  # no API key needed — runs locally
    result = agent.detect("path/to/image.jpg")
    print(result.to_json())
"""

from .agent import IDDetectorAgent
from .exceptions import (
    DetectionError,
    FileTooLargeError,
    IDDetectorError,
    InvalidFileError,
    UnsupportedFormatError,
)
from .schemas import DocumentType, IDDetectionResult
from .storage import DecryptionError, EncryptionKeyMissingError, SecureStorage, StorageError

__all__ = [
    "IDDetectorAgent",
    "IDDetectionResult",
    "DocumentType",
    "IDDetectorError",
    "InvalidFileError",
    "FileTooLargeError",
    "UnsupportedFormatError",
    "DetectionError",
    "SecureStorage",
    "StorageError",
    "EncryptionKeyMissingError",
    "DecryptionError",
]

__version__ = "2.1.0"
