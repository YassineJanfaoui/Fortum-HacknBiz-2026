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
from backend.analysis.flow_tracer import trace_wallet_flows
from backend.analysis.wallet_intelligence import scan_wallet
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


@app.get("/audit/verify")
async def audit_verify():
    """Verify the full tamper-evident audit chain."""
    ok, errors = store.verify_chain()
    return {"ok": ok, "errors": errors}


@app.get("/hitl/pending")
async def hitl_pending():
    """List transactions pending human review."""
    records = store.pending_hitl()
    return [r.model_dump() for r in records]


@app.get("/dashboard/summary")
async def dashboard_summary():
    """Return compact operational metrics for dashboard clients."""
    records = store.all_records(limit=500, offset=0)
    total = len(records)
    decisions: dict[str, int] = {}
    total_amount = 0.0
    high_risk = 0
    pending_hitl = 0

    for record in records:
        decisions[record.governance_decision] = decisions.get(record.governance_decision, 0) + 1
        total_amount += float(record.tx_summary.get("amount_eur", 0) or 0)
        if record.requires_hitl and record.human_decision is None:
            pending_hitl += 1
        if record.governance_decision.startswith("BLOCK") or record.requires_hitl:
            high_risk += 1

    chain_ok, chain_errors = store.verify_chain()
    return {
        "total_transactions": total,
        "total_amount_eur": round(total_amount, 2),
        "pending_hitl": pending_hitl,
        "high_risk_transactions": high_risk,
        "decisions": decisions,
        "audit_chain_ok": chain_ok,
        "audit_chain_errors": chain_errors,
        "recent": [r.model_dump() for r in records[:10]],
    }


@app.get("/wallet/{address}/intelligence")
async def wallet_intelligence(address: str, limit: int = 250):
    """Run live wallet intelligence using Etherscan account APIs and deterministic heuristics."""
    if not address.startswith("0x") or len(address) != 42:
        raise HTTPException(status_code=400, detail="address must be a 42-character EVM address")
    try:
        return await scan_wallet(address, limit=limit)
    except Exception as exc:
        logger.exception("Wallet intelligence failed for address=%s", address)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/wallet/{address}/trace")
async def wallet_trace(address: str, depth: int = 3, fanout: int = 6, limit: int = 60):
    """Follow likely outbound fund movement paths across multiple blockchain hops."""
    if not address.startswith("0x") or len(address) != 42:
        raise HTTPException(status_code=400, detail="address must be a 42-character EVM address")
    try:
        return await trace_wallet_flows(address, depth=depth, fanout=fanout, limit=limit)
    except Exception as exc:
        logger.exception("Wallet trace failed for address=%s", address)
        raise HTTPException(status_code=500, detail=str(exc))


# Mount the verifier router
from backend.api.verifier import router as verifier_router  # noqa: E402
app.include_router(verifier_router)
