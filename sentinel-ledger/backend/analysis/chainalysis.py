"""Chainalysis public sanctions API — single-address screening."""
import logging

import httpx

logger = logging.getLogger(__name__)

_API_BASE = "https://public.chainalysis.com/api/v1/address"


async def is_sanctioned(wallet: str) -> bool:
    """Return True if the wallet appears on the Chainalysis sanctions list."""
    url = f"{_API_BASE}/{wallet}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                return len(data.get("identifications", [])) > 0
            # 404 = not found (not sanctioned)
            return False
    except Exception as exc:
        logger.warning("Chainalysis check failed for %s: %s", wallet[:12], exc)
        return False  # fail open — do not block on API failure
