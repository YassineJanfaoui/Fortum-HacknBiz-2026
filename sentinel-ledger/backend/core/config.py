"""Load environment variables and expose typed constants for the application."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the sentinel-ledger/ directory (or parent if running from inside)
_here = Path(__file__).resolve()
for _candidate in [_here.parents[2], _here.parents[3]]:
    _env = _candidate / ".env"
    if _env.exists():
        load_dotenv(_env)
        break
else:
    load_dotenv()


def _require(name: str) -> str:
    val = os.environ.get(name, "")
    if not val or val.startswith("REPLACE_ME"):
        raise RuntimeError(f"Required env var {name!r} is missing or unset in .env")
    return val


def _hex_bytes(name: str) -> bytes:
    val = _require(name)
    try:
        return bytes.fromhex(val)
    except ValueError:
        raise RuntimeError(f"Env var {name!r} must be a hex string")


class Settings:
    """All application settings loaded from environment variables."""

    # API Keys
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    ETHERSCAN_API_KEY: str = os.environ.get("ETHERSCAN_API_KEY", "")

    # Secrets
    PSEUDONYM_MASTER_SALT: bytes = _hex_bytes("PSEUDONYM_MASTER_SALT")
    AUDIT_HMAC_KEY: bytes = _hex_bytes("AUDIT_HMAC_KEY")

    # Storage
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./sentinel_audit.db")

    # Behavior
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    LLM_TIMEOUT_SECONDS: int = int(os.environ.get("LLM_TIMEOUT_SECONDS", "10"))
    MAX_LLM_CALLS_PER_TX: int = int(os.environ.get("MAX_LLM_CALLS_PER_TX", "4"))

    # OPA binary path (project-local on Windows; falls back to system PATH name)
    OPA_PATH: str = os.environ.get("OPA_PATH", "./opa.exe")

    # Business constants
    EU_TFR_THRESHOLD_EUR: float = 1000.0
    EU_AML_SAR_THRESHOLD_EUR: float = 10000.0
    HITL_AMOUNT_THRESHOLD_EUR: float = 10000.0
    CONFIDENCE_FLOOR: float = 0.5
    VELOCITY_HITL_THRESHOLD: int = 20

    # Gemini model to use
    GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")


settings = Settings()
