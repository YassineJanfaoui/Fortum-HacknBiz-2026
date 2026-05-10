"""ZK compliance agent — Pedersen commitments + sanctions Merkle non-inclusion proof."""
import hashlib
import json
import logging
import time
from pathlib import Path

from backend.core.schemas import ZKProofBundle
from backend.core.state import AgentState
from backend.security.crypto import pedersen_commit, random_scalar
from backend.security.merkle import SortedMerkleTree

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[2]
_TREE_PATH = _REPO_ROOT / "data" / "sanctions_tree.json"

# Lazy-load sanctions tree on first use
_SANCTIONS_TREE: SortedMerkleTree | None = None


def _load_tree() -> SortedMerkleTree | None:
    global _SANCTIONS_TREE
    if _SANCTIONS_TREE is not None:
        return _SANCTIONS_TREE
    if not _TREE_PATH.exists():
        logger.warning("Sanctions tree not found at %s — run scripts/build_sanctions.py", _TREE_PATH)
        return None
    try:
        with open(_TREE_PATH) as f:
            data = json.load(f)
        _SANCTIONS_TREE = SortedMerkleTree.from_serialized(data)
        logger.info("Loaded sanctions tree: %d leaves, root=%s…", len(data.get("leaves", [])), data.get("root", "")[:16])
        return _SANCTIONS_TREE
    except Exception as exc:
        logger.error("Failed to load sanctions tree: %s", exc)
        return None


async def zk_compliance_agent(state: AgentState) -> AgentState:
    """
    Generate Pedersen commitments for amount and wallet,
    and produce a Merkle non-inclusion proof for the sender wallet.
    """
    tx = state["tx"]

    # Pedersen commitments
    amount_cents = int(tx.amount_eur * 100)
    r_amt = random_scalar()
    r_wal = random_scalar()
    wallet_hash = hashlib.sha256(tx.wallet_from.encode()).digest()
    wallet_int = int.from_bytes(wallet_hash, "big")

    amt_commit = pedersen_commit(amount_cents, r_amt)
    wal_commit = pedersen_commit(wallet_int, r_wal)

    # NOTE: openings (r_amt, r_wal) are discarded — storing them would deanonymize.
    # In production they'd be stored encrypted under an auditor key.

    # Sanctions non-inclusion proof
    tree = _load_tree()
    if tree is not None:
        proof = tree.non_inclusion_proof(wallet_hash)
        merkle_root = tree.root.hex()
    else:
        # Fallback stub when tree not built
        proof = {
            "type": "stub",
            "candidate": wallet_hash.hex(),
            "note": "Run scripts/build_sanctions.py to build real tree",
        }
        merkle_root = hashlib.sha256(b"stub_sanctions_tree").hexdigest()

    state["zk_bundle"] = ZKProofBundle(
        amount_commit=amt_commit.hex(),
        wallet_commit=wal_commit.hex(),
        sanctions_proof=proof,
        merkle_root=merkle_root,
        timestamp=time.time(),
    )
    return state
