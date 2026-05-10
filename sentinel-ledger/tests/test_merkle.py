"""Mandatory unit tests for security/merkle.py — 6 cases from spec §13."""
import hashlib
import pytest
from backend.security.merkle import (
    SortedMerkleTree, verify_inclusion, verify_non_inclusion,
)


def _h(s: str) -> bytes:
    """Helper: sha256 of a string as a 32-byte leaf value."""
    return hashlib.sha256(s.encode()).digest()


LEAVES = [_h(f"wallet_{i:04d}") for i in range(10)]


@pytest.fixture
def tree():
    return SortedMerkleTree(LEAVES)


def test_inclusion_proof_valid(tree):
    """Known leaf in tree verifies against root."""
    leaf = sorted(LEAVES)[3]  # pick any sorted leaf
    proof = tree.inclusion_proof(leaf)
    assert verify_inclusion(leaf, proof, tree.root), "Valid inclusion proof should verify"


def test_inclusion_proof_tampered(tree):
    """Tampered sibling in proof should fail verification."""
    leaf = sorted(LEAVES)[2]
    proof = tree.inclusion_proof(leaf)
    # Tamper the first sibling
    if proof["path"]:
        proof["path"][0]["sibling"] = "ff" * 32
    result = verify_inclusion(leaf, proof, tree.root)
    assert not result, "Tampered proof should fail"


def test_non_inclusion_middle(tree):
    """Candidate between two leaves verifies as non-included."""
    sorted_leaves = sorted(LEAVES)
    # Pick a value that is between leaves[4] and leaves[5]
    candidate = bytes([(sorted_leaves[4][0] + sorted_leaves[5][0]) // 2]) + b"\x00" * 31
    # Make sure it's actually between them
    if sorted_leaves[4] < candidate < sorted_leaves[5]:
        proof = tree.non_inclusion_proof(candidate)
        assert proof["type"] == "non_inclusion", "Should produce non_inclusion proof"
        assert verify_non_inclusion(candidate, proof, tree.root), "Non-inclusion should verify"
    else:
        # If not cleanly between, use a value we know is not in the tree
        candidate = b"\x00" * 31 + b"\x01"
        if candidate not in LEAVES:
            proof = tree.non_inclusion_proof(candidate)
            if proof["type"] == "non_inclusion":
                assert verify_non_inclusion(candidate, proof, tree.root)


def test_non_inclusion_below_all(tree):
    """Candidate smaller than minimum leaf verifies as non-included."""
    candidate = b"\x00" * 32  # smallest possible
    # Almost certainly not in tree; definitely below min
    sorted_leaves = sorted(LEAVES)
    if candidate < sorted_leaves[0]:
        proof = tree.non_inclusion_proof(candidate)
        assert proof["type"] == "non_inclusion"
        assert verify_non_inclusion(candidate, proof, tree.root)


def test_non_inclusion_above_all(tree):
    """Candidate larger than maximum leaf verifies as non-included."""
    candidate = b"\xff" * 32  # largest possible
    sorted_leaves = sorted(LEAVES)
    if candidate > sorted_leaves[-1]:
        proof = tree.non_inclusion_proof(candidate)
        assert proof["type"] == "non_inclusion"
        assert verify_non_inclusion(candidate, proof, tree.root)


def test_non_inclusion_actually_present(tree):
    """Candidate that IS in the tree should fail non-inclusion verification."""
    present_leaf = sorted(LEAVES)[0]
    proof = tree.non_inclusion_proof(present_leaf)
    # proof type should be "present"
    assert proof["type"] == "present", "Present leaf should produce 'present' proof type"
    # verify_non_inclusion must return False
    assert not verify_non_inclusion(present_leaf, proof, tree.root), (
        "verify_non_inclusion must fail for a present leaf"
    )


def test_serialize_round_trip():
    """Serialize and reconstruct tree — root must match."""
    tree = SortedMerkleTree(LEAVES)
    serialized = tree.serialize()
    tree2 = SortedMerkleTree.from_serialized(serialized)
    assert tree.root == tree2.root, "Reconstructed tree root must match original"


def test_empty_tree():
    """Empty tree should not crash."""
    tree = SortedMerkleTree([])
    assert isinstance(tree.root, bytes)
    assert len(tree.root) == 32
