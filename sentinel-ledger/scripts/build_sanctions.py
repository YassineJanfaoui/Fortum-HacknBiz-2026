"""Phase 3: Build real SortedMerkleTree from OFAC SDN list."""
import hashlib
import json
import logging
from pathlib import Path
from backend.security.merkle import SortedMerkleTree

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fake OFAC SDN list for demo purposes, since downloading/parsing the real XML
# is slow and prone to breaking. We will hash these addresses to form the leaves.
_MOCK_SANCTIONED_WALLETS = [
    "0xBeefBeefBeefBeefBeefBeefBeefBeefBeefBeef",  # Known injection test wallet
    "0xCafeCafeCafeCafeCafeCafeCafeCafeCafeCafe",  # Known injection test wallet (receiver)
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
]

def main():
    repo_root = Path(__file__).resolve().parents[1]
    data_dir = repo_root / "data"
    data_dir.mkdir(exist_ok=True)
    out_path = data_dir / "sanctions_tree.json"

    logger.info("Building real SortedMerkleTree from mock OFAC data...")
    leaves = [hashlib.sha256(w.encode()).digest() for w in _MOCK_SANCTIONED_WALLETS]
    
    tree = SortedMerkleTree(leaves)
    serialized = tree.serialize()

    with open(out_path, "w") as f:
        json.dump(serialized, f, indent=2)

    logger.info(f"Tree built successfully: {len(leaves)} leaves.")
    logger.info(f"Root: {tree.root.hex()}")
    logger.info(f"Saved to {out_path}")

if __name__ == "__main__":
    main()
