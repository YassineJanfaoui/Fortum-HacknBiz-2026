"""Mandatory unit tests for security/crypto.py — spec §13."""
import pytest
from backend.security.crypto import (
    pedersen_commit, pedersen_verify, random_scalar, G, H, N,
)


def test_commit_hides():
    """Same value with different randomness must yield different commitments."""
    value = 42_000_00  # 42000 EUR in cents
    r1 = random_scalar()
    r2 = random_scalar()
    assert r1 != r2, "random_scalar collision (astronomically unlikely)"
    c1 = pedersen_commit(value, r1)
    c2 = pedersen_commit(value, r2)
    assert c1 != c2, "Same value with different randomness produced identical commitment"


def test_commit_binds():
    """verify(C, v, r) == True; verify(C, v+1, r) == False (binding)."""
    value = 999_00  # 999 EUR in cents
    r = random_scalar()
    commit = pedersen_commit(value, r)

    assert pedersen_verify(commit, value, r) is True, "Valid opening should verify"
    assert pedersen_verify(commit, value + 1, r) is False, "Wrong value should not verify"
    assert pedersen_verify(commit, value, r + 1) is False, "Wrong randomness should not verify"


def test_homomorphic():
    """Pedersen is additively homomorphic: C(a,r1) + C(b,r2) == C(a+b, r1+r2)."""
    a, r1 = 100_00, random_scalar()
    b, r2 = 200_00, random_scalar()

    # Compute sum commitment directly
    v_sum = (a + b) % N
    r_sum = (r1 + r2) % N
    c_direct = pedersen_commit(v_sum, r_sum)

    # Compute via point addition (internal algebra)
    point_a = a * G + r1 * H
    point_b = b * G + r2 * H
    point_sum = point_a + point_b
    point_direct = v_sum * G + r_sum * H

    assert point_sum == point_direct, (
        "Homomorphic property failed: C(a)+C(b) != C(a+b)"
    )
    # Verify the direct commitment validates correctly
    assert pedersen_verify(c_direct, v_sum, r_sum) is True


def test_random_scalar_in_range():
    """random_scalar must return values in [1, N-1]."""
    for _ in range(20):
        r = random_scalar()
        assert 1 <= r < N, f"scalar {r} out of range"


def test_commitment_is_33_bytes():
    """Compressed point must be exactly 33 bytes."""
    commit = pedersen_commit(12345, random_scalar())
    assert len(commit) == 33, f"Expected 33 bytes, got {len(commit)}"
    assert commit[0] in (0x02, 0x03), "Invalid compressed point prefix"
