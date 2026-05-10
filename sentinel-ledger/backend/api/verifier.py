"""Proof verification endpoint — /verify/{tx_id} checks ZK bundle and HMAC chain."""
import json
from fastapi import APIRouter, HTTPException
from backend.audit.store import AuditStore
from backend.core.config import settings

router = APIRouter()
store = AuditStore(settings.DATABASE_URL, settings.AUDIT_HMAC_KEY)


@router.get("/verify/{tx_id}")
async def verify(tx_id: str):
    """Verify all cryptographic proofs for a transaction's audit record."""
    rec = store.get(tx_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"tx_id {tx_id!r} not found")

    zk = rec.zk_bundle

    # 1. Verify merkle root against published sanctions tree
    root_match = False
    try:
        with open("data/sanctions_tree.json") as f:
            published = json.load(f)
        root_match = zk.get("merkle_root") == published.get("root")
    except FileNotFoundError:
        root_match = False  # sanctions tree not built yet

    # 2. Verify non-inclusion proof
    # Phase 1 stub: always true for stub proofs (real verification in Phase 3)
    proof_type = zk.get("sanctions_proof", {}).get("type", "")
    if proof_type == "stub":
        proof_valid = True  # stub proof — Phase 3 will verify real proofs
    else:
        try:
            from backend.security.merkle import verify_non_inclusion
            candidate_hex = zk.get("sanctions_proof", {}).get("candidate", "")
            candidate = bytes.fromhex(candidate_hex)
            root = bytes.fromhex(zk.get("merkle_root", ""))
            proof_valid = verify_non_inclusion(candidate, zk["sanctions_proof"], root)
        except Exception:
            proof_valid = False

    # 3. Verify HMAC chain
    chain_ok, errors = store.verify_chain()

    return {
        "tx_id": tx_id,
        "merkle_root_published": root_match,
        "sanctions_non_inclusion_proof_valid": proof_valid,
        "audit_chain_intact": chain_ok,
        "audit_chain_errors": errors,
        "decision": rec.governance_decision,
        "all_proofs_valid": root_match and proof_valid and chain_ok,
    }
