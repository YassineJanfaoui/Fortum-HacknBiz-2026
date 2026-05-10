"""Per-transaction HKDF-derived wallet pseudonyms — same wallet, different tx → different pseudonym."""
import hashlib
import hmac


def _hkdf_extract(salt: bytes, ikm: bytes) -> bytes:
    return hmac.new(salt, ikm, hashlib.sha256).digest()


def _hkdf_expand(prk: bytes, info: bytes, length: int = 32) -> bytes:
    return hmac.new(prk, info + b"\x01", hashlib.sha256).digest()[:length]


def pseudonymize_wallet(wallet: str, tx_id: str, master_salt: bytes) -> str:
    """
    HKDF(master_salt, info=tx_id) → key; HMAC(key, wallet) → pseudonym.
    Same (wallet, tx_id) always yields the same pseudonym.
    Different tx_id yields a different pseudonym for the same wallet.
    """
    prk = _hkdf_extract(master_salt, tx_id.encode())
    key = _hkdf_expand(prk, b"sentinel_pseudonym_v1")
    pseud = hmac.new(key, wallet.encode(), hashlib.sha256).hexdigest()[:24]
    return f"PSEUDO_{pseud}"
