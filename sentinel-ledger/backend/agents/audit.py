"""Audit agent — signs and writes the final record to the HMAC-chained SQLite store."""
import hashlib
import json
import logging
import time

from backend.audit.store import AuditStore
from backend.core.config import settings
from backend.core.schemas import AuditRecord, Decision
from backend.core.state import AgentState

logger = logging.getLogger(__name__)

_store: AuditStore | None = None


def _get_store() -> AuditStore:
    global _store
    if _store is None:
        _store = AuditStore(settings.DATABASE_URL, settings.AUDIT_HMAC_KEY)
    return _store


async def audit_agent(state: AgentState) -> AgentState:
    """Build AuditRecord from final state, sign, and append to audit chain."""
    store = _get_store()
    tx = state["tx"]

    raw = state.get("raw_inputs", {})
    inputs_hash = hashlib.sha256(
        json.dumps(raw, sort_keys=True, default=str).encode()
    ).hexdigest()

    zk = state.get("zk_bundle")
    zk_dict = zk.model_dump() if zk else {}

    tx_risk = state.get("tx_risk")
    wallet_risk = state.get("wallet_risk")
    opa_result = state.get("opa_result")

    gov_decision = state.get("governance_decision", Decision.AUTO_APPROVE)
    gov_str = gov_decision.value if hasattr(gov_decision, "value") else str(gov_decision)

    record = AuditRecord(
        tx_id=tx.tx_id,
        timestamp=time.time(),
        tx_summary={
            "wallet_from": tx.wallet_from,
            "wallet_to": tx.wallet_to,
            "amount_eur": tx.amount_eur,
            "token": tx.token,
            "chain": tx.chain,
            "jurisdiction": tx.jurisdiction,
            "velocity_24h": tx.velocity_24h,
            "tx_count_7d": tx.tx_count_7d,
        },
        inputs_hash=inputs_hash,
        agent_outputs={
            "tx_risk": tx_risk.model_dump() if tx_risk else None,
            "wallet_risk": wallet_risk.model_dump() if wallet_risk else None,
            "opa_result": opa_result.model_dump() if opa_result else None,
            "injection_detected": state.get("injection_detected", False),
            "injection_reason": state.get("injection_reason"),
            "llm_call_count": state.get("llm_call_count", 0),
        },
        governance_decision=gov_str,
        governance_reason=state.get("governance_reason", ""),
        requires_hitl=state.get("requires_hitl", False),
        explanation=state.get("explanation", ""),
        zk_bundle=zk_dict,
        prev_record_hash=store.latest_hash(),
        signature="",
    )

    record = store.append(record)
    state["audit_record"] = record
    logger.info("Audit record written for %s: decision=%s", tx.tx_id, gov_str)
    return state
