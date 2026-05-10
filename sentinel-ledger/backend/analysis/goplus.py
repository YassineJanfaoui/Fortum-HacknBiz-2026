"""GoPlus Security API — address risk scoring (no API key required)."""
import logging

import httpx

logger = logging.getLogger(__name__)

_API_BASE = "https://api.gopluslabs.io/api/v1/address_security"

# Risk flag fields that indicate malicious activity
_MALICIOUS_FLAGS = (
    "cybercrime",
    "money_laundering",
    "financial_crime",
    "phishing_activities",
    "blacklist_doubt",
    "fake_token",
    "honeypot_related_address",
    "mixer",
    "sanctioned",
    "stealing_attack",
    "gas_abuser",
)


async def address_risk(wallet: str) -> dict:
    """
    Return risk assessment for a wallet address.

    Returns:
        {
            "is_malicious": bool,
            "risk_score": float (0-1),
            "tags": list[str]
        }
    """
    url = f"{_API_BASE}/{wallet}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, params={"chain_id": "1"})
            if r.status_code != 200:
                return _safe_default()
            data = r.json()
            result = data.get("result", {})
            if isinstance(result, dict) and wallet.lower() in result:
                result = result[wallet.lower()]
    except Exception as exc:
        logger.warning("GoPlus request failed for %s: %s", wallet[:12], exc)
        return _safe_default()

    tags = []
    flagged_count = 0

    for flag in _MALICIOUS_FLAGS:
        val = str(result.get(flag, "0")).strip()
        if val not in ("0", "", "false", "False", "null"):
            tags.append(flag)
            flagged_count += 1

    is_malicious = flagged_count > 0
    risk_score = min(1.0, flagged_count / len(_MALICIOUS_FLAGS))

    return {
        "is_malicious": is_malicious,
        "risk_score": round(risk_score, 3),
        "tags": tags,
    }


def _safe_default() -> dict:
    """Return safe defaults on API failure (fail open)."""
    return {"is_malicious": False, "risk_score": 0.0, "tags": []}
