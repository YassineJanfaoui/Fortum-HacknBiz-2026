"""Injection defense — NFKC normalization, pattern matching, canary spotlighting."""
import re
import secrets
import unicodedata
from typing import Optional

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+|any\s+)?(previous|prior|above|aml|policy|rules?|instructions?)",
    r"(bypass|disable|override|skip|disregard)\s+(policy|rules?|compliance|aml|filter|guard|check)",
    r"approve\s+(this|the|all)\s+(transfer|transaction|tx|payment)",
    r"you\s+are\s+now|pretend\s+to\s+be|act\s+as|new\s+persona|system\s*:",
    r"<\s*/?s*(system|instruction|prompt|admin)\s*>",
    r"\bDAN\b|\bjailbreak\b",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


def normalize_text(text: str) -> str:
    """Apply NFKC Unicode normalization."""
    return unicodedata.normalize("NFKC", text)


def make_canary() -> str:
    """Generate a fresh 8-byte hex canary token."""
    return secrets.token_hex(8)


def spotlight(untrusted: str, canary: str) -> str:
    """Wrap untrusted text in canary-tagged delimiters."""
    return f"<UNTRUSTED-{canary}>{untrusted}</UNTRUSTED-{canary}>"


def detect_injection(text: str, max_length: int = 500) -> tuple[bool, Optional[str]]:
    """
    Return (is_safe, reason_if_unsafe).

    Checks:
    1. Empty / None → safe
    2. Length > max_length → unsafe
    3. Non-Latin characters in instruction-like context → unsafe
    4. Pattern match against known injection strings → unsafe
    """
    if not text:
        return True, None

    if len(text) > max_length:
        return False, f"length>{max_length}"

    norm = normalize_text(text)

    # Reject non-Latin script characters (Cyrillic homoglyphs, Arabic, etc.)
    allowed_non_ascii = set(" \n\t.,;:!?()-_'\"@#$%&*+=/<>[]{}|~^`\\")
    for ch in norm:
        if ord(ch) > 0x024F and ch not in allowed_non_ascii:
            return False, f"non-latin char: {hex(ord(ch))}"

    lower = norm.lower()
    for compiled, raw in zip(_COMPILED, INJECTION_PATTERNS):
        if compiled.search(lower):
            return False, f"pattern match: {raw[:40]}"

    return True, None
