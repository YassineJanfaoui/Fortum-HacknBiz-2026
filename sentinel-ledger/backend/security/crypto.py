"""Pedersen commitment scheme on secp256k1 — hides values cryptographically."""
import hashlib
import secrets

from ecdsa import SECP256k1, ellipticcurve

CURVE = SECP256k1.curve
G = SECP256k1.generator
N = SECP256k1.order
P = CURVE.p()


def _hash_to_point(seed: bytes) -> ellipticcurve.PointJacobi:
    """Hash-to-curve via try-and-increment (deterministic)."""
    for counter in range(1000):
        h = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        x = int.from_bytes(h, "big") % P
        y_sq = (pow(x, 3, P) + 7) % P
        y = pow(y_sq, (P + 1) // 4, P)
        if pow(y, 2, P) == y_sq:
            return ellipticcurve.PointJacobi(CURVE, x, y, 1, N)
    raise RuntimeError("Failed to hash to curve point after 1000 attempts")


# Second generator H (nothing-up-my-sleeve)
H = _hash_to_point(b"sentinel_pedersen_H_v1")


def random_scalar() -> int:
    """Return a uniformly random scalar in [1, N-1]."""
    return secrets.randbelow(N - 1) + 1


def _point_to_compressed(p) -> bytes:
    """Serialize a curve point as 33-byte compressed form."""
    x = p.x()
    y = p.y()
    prefix = b"\x02" if y % 2 == 0 else b"\x03"
    return prefix + x.to_bytes(32, "big")


def pedersen_commit(value: int, randomness: int) -> bytes:
    """
    Compute commitment C = value*G + randomness*H.
    Returns 33-byte compressed point.
    """
    if not (0 <= value < N):
        value = value % N
    if not (0 < randomness < N):
        raise ValueError(f"randomness must be in (0, N): got {randomness}")
    point = value * G + randomness * H
    return _point_to_compressed(point)


def pedersen_verify(commitment: bytes, value: int, randomness: int) -> bool:
    """Return True iff (value, randomness) correctly opens commitment."""
    try:
        expected = pedersen_commit(value, randomness)
        return secrets.compare_digest(commitment, expected)
    except Exception:
        return False
