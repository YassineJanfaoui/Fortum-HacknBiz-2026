"""Agent function stubs — return hardcoded valid data. Replaced by real impls in Phases 2-3."""
import hashlib
import time
from backend.core.state import AgentState
from backend.core.schemas import (
    TxRiskOutput, WalletRiskOutput, OPAResult,
    ZKProofBundle, Decision,
)


async def stub_transaction_intelligence(state: AgentState) -> AgentState:
    """Stub: always returns low-risk, no signals."""
    state["tx_risk"] = TxRiskOutput(
        risk_level="low",
        signals=["stub: no real analysis yet"],
        confidence=0.9,
        structuring_score=0.0,
        velocity_score=0.0,
    )
    return state


async def stub_wallet_reputation(state: AgentState) -> AgentState:
    """Stub: always returns low-risk wallet."""
    state["wallet_risk"] = WalletRiskOutput(
        risk_level="low",
        reasons=["stub: no real analysis yet"],
        sanctions_match=False,
        mixer_proximity_hops=None,
        taint_score=0.0,
        cluster_id=None,
        confidence=0.9,
    )
    return state


async def stub_zk_compliance(state: AgentState) -> AgentState:
    """Stub: returns fake but structurally valid ZK bundle."""
    tx = state["tx"]
    wallet_hash = hashlib.sha256(tx.wallet_from.encode()).digest()
    # Stub merkle root = sha256 of "stub"
    stub_root = hashlib.sha256(b"stub_sanctions_tree").hexdigest()
    # Fake Pedersen commit = sha256 of amount
    amt_commit = hashlib.sha256(str(tx.amount_eur).encode()).hexdigest()
    wal_commit = hashlib.sha256(tx.wallet_from.encode()).hexdigest()
    state["zk_bundle"] = ZKProofBundle(
        amount_commit=amt_commit,
        wallet_commit=wal_commit,
        sanctions_proof={
            "type": "stub",
            "candidate": wallet_hash.hex(),
            "note": "Real proof generated in Phase 3",
        },
        merkle_root=stub_root,
        timestamp=time.time(),
    )
    return state


async def stub_compliance_policy(state: AgentState) -> AgentState:
    """Stub: runs basic threshold checks without OPA (replaced in Phase 2)."""
    tx = state["tx"]
    violations = []
    requires_sar = False

    if tx.amount_eur >= 10000:
        violations.append(
            f"AML threshold: SAR required for amount EUR {tx.amount_eur}"
        )
        requires_sar = True
    elif tx.amount_eur >= 1000:
        violations.append(
            f"Travel Rule: transfer info required for amount EUR {tx.amount_eur}"
        )

    sanctioned_jurisdictions = {"IR", "KP", "SY", "CU", "RU"}
    if tx.jurisdiction in sanctioned_jurisdictions:
        violations.append(f"Sanctioned jurisdiction: {tx.jurisdiction}")

    state["opa_result"] = OPAResult(
        violations=violations,
        allow=len(violations) == 0,
        requires_sar=requires_sar,
    )
    return state


async def stub_explainability(state: AgentState) -> AgentState:
    """Stub: generates a templated explanation (no LLM call yet)."""
    tx = state.get("tx")
    tx_risk = state.get("tx_risk")
    wallet_risk = state.get("wallet_risk")
    opa = state.get("opa_result")

    parts = [f"Transaction {tx.tx_id} of EUR {tx.amount_eur:.2f} analyzed."]
    if tx_risk:
        parts.append(f"Transaction risk: {tx_risk.risk_level} (confidence {tx_risk.confidence:.0%}).")
    if wallet_risk:
        parts.append(f"Wallet risk: {wallet_risk.risk_level}.")
    if opa and opa.violations:
        parts.append(f"Policy violations: {'; '.join(opa.violations[:3])}.")
    parts.append("This case requires human review before any action is taken.")
    state["explanation"] = " ".join(parts)
    return state


async def stub_governance_sentinel(state: AgentState) -> AgentState:
    """Stub governance — real deterministic FSM implemented in Phase 3."""
    from backend.core.config import settings

    # Hard block: injection
    if state.get("injection_detected"):
        state["governance_decision"] = Decision.BLOCK_INJECTION
        state["governance_reason"] = state.get("injection_reason", "injection detected")
        state["requires_hitl"] = True
        return state

    opa = state.get("opa_result")
    tx = state["tx"]

    if opa and opa.violations:
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = f"policy violations: {'; '.join(opa.violations[:2])}"
        state["requires_hitl"] = True
        return state

    if tx.amount_eur > settings.HITL_AMOUNT_THRESHOLD_EUR:
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = f"amount EUR {tx.amount_eur} > HITL threshold"
        state["requires_hitl"] = True
        return state

    state["governance_decision"] = Decision.AUTO_APPROVE
    state["governance_reason"] = "no triggers fired"
    state["requires_hitl"] = False
    return state


async def stub_audit(state: AgentState) -> AgentState:
    """Stub: records audit to SQLite via AuditStore."""
    import hashlib, json, time as _time
    from backend.audit.store import AuditStore
    from backend.core.config import settings
    from backend.core.schemas import AuditRecord

    store = AuditStore(settings.DATABASE_URL, settings.AUDIT_HMAC_KEY)

    raw = state.get("raw_inputs", {})
    inputs_hash = hashlib.sha256(
        json.dumps(raw, sort_keys=True, default=str).encode()
    ).hexdigest()

    zk = state.get("zk_bundle")
    zk_dict = zk.model_dump() if zk else {}

    tx_risk = state.get("tx_risk")
    wallet_risk = state.get("wallet_risk")
    opa_result = state.get("opa_result")

    record = AuditRecord(
        tx_id=state["tx"].tx_id,
        timestamp=_time.time(),
        inputs_hash=inputs_hash,
        agent_outputs={
            "tx_risk": tx_risk.model_dump() if tx_risk else None,
            "wallet_risk": wallet_risk.model_dump() if wallet_risk else None,
            "opa_result": opa_result.model_dump() if opa_result else None,
        },
        governance_decision=str(state.get("governance_decision", Decision.AUTO_APPROVE)),
        governance_reason=state.get("governance_reason", ""),
        explanation=state.get("explanation", ""),
        zk_bundle=zk_dict,
        prev_record_hash=store.latest_hash(),
        signature="",  # filled in by store.append
    )

    record = store.append(record)
    state["audit_record"] = record
    return state
