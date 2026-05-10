"""Sentinel Ledger FastAPI backend — main application with /analyze, /operator, /audit endpoints."""
import hashlib
import json
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.core.schemas import Transaction
from backend.core.graph import build_graph
from backend.core.config import settings
from backend.audit.store import AuditStore
from backend.security.guard import detect_injection, normalize_text, make_canary
from backend.security.pseudonymizer import pseudonymize_wallet


logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Sentinel Ledger",
    version="1.0.0",
    description="Multi-agent AML/fraud-detection governance platform for NORDA Bank",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build graph once at startup — reused for every request
graph = build_graph()
store = AuditStore(settings.DATABASE_URL, settings.AUDIT_HMAC_KEY)


@app.get("/")
async def root():
    """Health check."""
    return {"status": "ok", "service": "sentinel-ledger", "version": "1.0.0"}


@app.post("/analyze")
async def analyze(tx: Transaction):
    """Run the full AML analysis pipeline on a transaction."""
    # Pre-pipeline injection scan using real guard module
    injection_detected = False
    injection_reason = None
    if tx.memo:
        normalized = normalize_text(tx.memo)
        ok, reason = detect_injection(normalized)
        if not ok:
            injection_detected = True
            injection_reason = reason

    # Real per-request canary token
    canary = make_canary()

    # Real HKDF per-transaction pseudonyms
    pseudonyms = {
        tx.wallet_from: pseudonymize_wallet(tx.wallet_from, tx.tx_id, settings.PSEUDONYM_MASTER_SALT),
        tx.wallet_to: pseudonymize_wallet(tx.wallet_to, tx.tx_id, settings.PSEUDONYM_MASTER_SALT),
    }


    initial_state = {
        "tx": tx,
        "raw_inputs": tx.model_dump(),
        "canary_token": canary,
        "pseudonyms": pseudonyms,
        "injection_detected": injection_detected,
        "injection_reason": injection_reason,
        "llm_call_count": 0,
        "errors": [],
    }

    try:
        final_state = await graph.ainvoke(initial_state)
    except Exception as e:
        logger.exception("Pipeline error for tx_id=%s", tx.tx_id)
        raise HTTPException(status_code=500, detail=str(e))

    decision_val = final_state["governance_decision"]
    decision_str = decision_val.value if hasattr(decision_val, "value") else str(decision_val)

    return {
        "tx_id": tx.tx_id,
        "governance_decision": decision_str,
        "governance_reason": final_state.get("governance_reason", ""),
        "requires_hitl": final_state.get("requires_hitl", False),
        "explanation": final_state.get("explanation", ""),
        "tx_risk": final_state["tx_risk"].model_dump() if final_state.get("tx_risk") else None,
        "wallet_risk": final_state["wallet_risk"].model_dump() if final_state.get("wallet_risk") else None,
        "opa_result": final_state["opa_result"].model_dump() if final_state.get("opa_result") else None,
        "zk_bundle": final_state["zk_bundle"].model_dump() if final_state.get("zk_bundle") else None,
    }


@app.post("/operator/approve/{tx_id}")
async def approve(tx_id: str, operator_id: str = "demo_operator"):
    """Human operator approves an ESCALATE_HUMAN transaction."""
    rec = store.get(tx_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"tx_id {tx_id!r} not found")
    rec.human_decision = "APPROVED"
    rec.human_actor_id = operator_id
    store.append_human_decision(rec)
    return {"ok": True, "decision": "APPROVED"}


@app.post("/operator/reject/{tx_id}")
async def reject(tx_id: str, operator_id: str = "demo_operator"):
    """Human operator rejects an ESCALATE_HUMAN transaction."""
    rec = store.get(tx_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"tx_id {tx_id!r} not found")
    rec.human_decision = "REJECTED"
    rec.human_actor_id = operator_id
    store.append_human_decision(rec)
    return {"ok": True, "decision": "REJECTED"}


@app.get("/audit/{tx_id}")
async def audit(tx_id: str):
    """Retrieve the audit record for a transaction."""
    rec = store.get(tx_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"tx_id {tx_id!r} not found")
    return rec.model_dump()


@app.get("/audit")
async def audit_list(limit: int = 50, offset: int = 0):
    """List all audit records (newest first)."""
    records = store.all_records(limit=limit, offset=offset)
    return [r.model_dump() for r in records]


@app.get("/hitl/pending")
async def hitl_pending():
    """List transactions pending human review."""
    records = store.pending_hitl()
    return [r.model_dump() for r in records]


# Mount the verifier router
from backend.api.verifier import router as verifier_router  # noqa: E402
app.include_router(verifier_router)
