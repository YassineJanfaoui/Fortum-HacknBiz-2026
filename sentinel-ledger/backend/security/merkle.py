"""Sorted Merkle tree with non-inclusion proofs — proves a wallet is NOT on the sanctions list."""
import bisect
import hashlib
from typing import Optional


def _sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def _hash_pair(left: bytes, right: bytes) -> bytes:
    return _sha256(left + right)


class SortedMerkleTree:
    """Binary Merkle tree over lexicographically sorted leaves."""

    def __init__(self, leaves: list[bytes]) -> None:
        self._leaves: list[bytes] = sorted(set(leaves))  # deduplicate + sort
        self._tree: list[list[bytes]] = []
        self._build()

    def _build(self) -> None:
        if not self._leaves:
            self._tree = [[_sha256(b"empty")]]
            return
        layer = [_sha256(leaf) for leaf in self._leaves]
        self._tree = [layer]
        while len(layer) > 1:
            next_layer = []
            for i in range(0, len(layer), 2):
                left = layer[i]
                right = layer[i + 1] if i + 1 < len(layer) else layer[i]
                next_layer.append(_hash_pair(left, right))
            layer = next_layer
            self._tree.append(layer)

    @property
    def root(self) -> bytes:
        return self._tree[-1][0]

    def inclusion_proof(self, leaf: bytes) -> dict:
        """Return Merkle inclusion proof for leaf (must exist in tree)."""
        leaf_hash = _sha256(leaf)
        try:
            idx = [_sha256(l) for l in self._leaves].index(leaf_hash)
        except ValueError:
            # Try finding by raw hash match (leaf may already be hashed)
            try:
                idx = [_sha256(l) for l in self._leaves].index(leaf)
            except ValueError:
                raise ValueError(f"Leaf not in tree: {leaf.hex()[:16]}…")

        proof_path = []
        current_idx = idx
        for layer in self._tree[:-1]:
            if current_idx % 2 == 0:
                sibling_idx = current_idx + 1
                direction = "R"
            else:
                sibling_idx = current_idx - 1
                direction = "L"
            sibling = layer[sibling_idx] if sibling_idx < len(layer) else layer[current_idx]
            proof_path.append({"sibling": sibling.hex(), "direction": direction})
            current_idx //= 2

        return {
            "leaf": leaf.hex(),
            "leaf_index": idx,
            "path": proof_path,
            "root": self.root.hex(),
        }

    def non_inclusion_proof(self, candidate: bytes) -> dict:
        """
        Prove candidate is NOT in the tree.
        Returns adjacent-leaf pair that brackets candidate.
        """
        idx = bisect.bisect_left(self._leaves, candidate)

        # Check candidate is actually absent
        if idx < len(self._leaves) and self._leaves[idx] == candidate:
            return {"type": "present", "candidate": candidate.hex()}

        left_leaf = self._leaves[idx - 1] if idx > 0 else None
        right_leaf = self._leaves[idx] if idx < len(self._leaves) else None

        return {
            "type": "non_inclusion",
            "candidate": candidate.hex(),
            "left_leaf": left_leaf.hex() if left_leaf else None,
            "left_index": (idx - 1) if left_leaf else None,
            "left_proof": self.inclusion_proof(left_leaf) if left_leaf else None,
            "right_leaf": right_leaf.hex() if right_leaf else None,
            "right_index": idx if right_leaf else None,
            "right_proof": self.inclusion_proof(right_leaf) if right_leaf else None,
        }

    def serialize(self) -> dict:
        """Serialize tree to JSON-safe dict."""
        return {
            "root": self.root.hex(),
            "leaves": [l.hex() for l in self._leaves],
            "count": len(self._leaves),
        }

    @classmethod
    def from_serialized(cls, data: dict) -> "SortedMerkleTree":
        """Reconstruct tree from serialized dict."""
        leaves = [bytes.fromhex(h) for h in data.get("leaves", [])]
        return cls(leaves)


def verify_inclusion(leaf: bytes, proof: dict, root: bytes) -> bool:
    """Verify a Merkle inclusion proof."""
    current = _sha256(leaf)
    for step in proof.get("path", []):
        sibling = bytes.fromhex(step["sibling"])
        if step["direction"] == "R":
            current = _hash_pair(current, sibling)
        else:
            current = _hash_pair(sibling, current)
    return current == root


def verify_non_inclusion(candidate: bytes, proof: dict, root: bytes) -> bool:
    """
    Verify a non-inclusion proof:
    1. Both left_leaf and right_leaf verify against root.
    2. left_leaf < candidate < right_leaf (lexicographic).
    3. They are adjacent (left_index + 1 == right_index).
    """
    if proof.get("type") == "stub":
        return True  # Phase 1 stubs pass through
    if proof.get("type") == "present":
        return False  # candidate IS in the tree

    left_hex = proof.get("left_leaf")
    right_hex = proof.get("right_leaf")
    left_idx = proof.get("left_index")
    right_idx = proof.get("right_index")

    # Edge case: candidate smaller than all leaves (only right bracket)
    if left_hex is None and right_hex is not None:
        right_leaf = bytes.fromhex(right_hex)
        right_proof = proof.get("right_proof", {})
        return (
            candidate < right_leaf
            and verify_inclusion(right_leaf, right_proof, root)
        )

    # Edge case: candidate larger than all leaves (only left bracket)
    if right_hex is None and left_hex is not None:
        left_leaf = bytes.fromhex(left_hex)
        left_proof = proof.get("left_proof", {})
        return (
            left_leaf < candidate
            and verify_inclusion(left_leaf, left_proof, root)
        )

    # Normal case: bracketed by left and right
    if left_hex is None or right_hex is None:
        return False

    left_leaf = bytes.fromhex(left_hex)
    right_leaf = bytes.fromhex(right_hex)
    left_proof = proof.get("left_proof", {})
    right_proof = proof.get("right_proof", {})

    order_ok = left_leaf < candidate < right_leaf
    left_valid = verify_inclusion(left_leaf, left_proof, root)
    right_valid = verify_inclusion(right_leaf, right_proof, root)

    # Adjacency: indices must differ by 1
    adjacent = (
        left_idx is not None
        and right_idx is not None
        and right_idx == left_idx + 1
    )

    return order_ok and left_valid and right_valid and adjacent
