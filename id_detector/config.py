"""
Centralized configuration for the ID Detector Agent.

All settings are loaded from environment variables with sensible defaults.
This keeps the agent configurable without code changes, following 12-factor app principles.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (walks up from this file's directory)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


# --- File Validation ---
MAX_FILE_SIZE_MB: int = int(os.getenv("ID_DETECTOR_MAX_FILE_SIZE_MB", "10"))
MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".pdf"}

ALLOWED_MIME_TYPES: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
}

# Magic bytes for file type verification
# Maps MIME type -> (offset, expected_bytes)
MAGIC_BYTES: dict[str, tuple[int, bytes]] = {
    "image/jpeg": (0, b"\xff\xd8\xff"),
    "image/png": (0, b"\x89PNG"),
    "application/pdf": (0, b"%PDF"),
}

# --- Image Preprocessing ---
MAX_IMAGE_DIMENSION: int = int(os.getenv("ID_DETECTOR_MAX_IMAGE_DIM", "1024"))

# --- CLIP Model (Local) ---
CLIP_MODEL_NAME: str = os.getenv("ID_DETECTOR_CLIP_MODEL", "openai/clip-vit-base-patch32")
ID_THRESHOLD: float = float(os.getenv("ID_DETECTOR_THRESHOLD", "0.55"))
AUTHENTICITY_THRESHOLD: float = float(os.getenv("ID_DETECTOR_AUTH_THRESHOLD", "0.55"))

# --- Logging ---
LOG_LEVEL: str = os.getenv("ID_DETECTOR_LOG_LEVEL", "INFO")

# --- Secure Storage (Encryption at Rest) ---
ENCRYPTION_KEY: str | None = os.getenv("ENCRYPTION_KEY")
STORAGE_DIR: str = os.getenv("ID_DETECTOR_STORAGE_DIR", "secure_storage")
