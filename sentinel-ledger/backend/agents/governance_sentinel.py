"""Governance Sentinel — deterministic FSM, the single decision authority in the pipeline."""
import hashlib
import logging

from backend.core.config import settings
from backend.core.schemas import Decision
from backend.core.state import AgentState

logger = logging.getLogger(__name__)


async def governance_sentinel(state: AgentState) -> AgentState:
    """
    Deterministic state machine. Six decision branches, evaluated in priority order.
    No LLM — this is the keystone that bounds all AI output.
    """

    # ── Branch 1: Hard block — injection detected ───────────────────────────
    if state.get("injection_detected"):
        state["governance_decision"] = Decision.BLOCK_INJECTION
        state["governance_reason"] = state.get("injection_reason") or "injection detected"
        state["requires_hitl"] = True
        logger.warning("BLOCK_INJECTION for %s: %s", state["tx"].tx_id, state["governance_reason"])
        return state

    # ── Branch 2: Hard block — sanctions ZK proof invalid ───────────────────
    zk = state.get("zk_bundle")
    if zk and zk.sanctions_proof.get("type") != "stub":
        try:
            from backend.security.merkle import verify_non_inclusion
            wallet_hash = hashlib.sha256(state["tx"].wallet_from.encode()).digest()
            root = bytes.fromhex(zk.merkle_root)
            if not verify_non_inclusion(wallet_hash, zk.sanctions_proof, root):
                state["governance_decision"] = Decision.BLOCK_SANCTIONS
                state["governance_reason"] = "sanctions non-inclusion proof failed (wallet may be sanctioned)"
                state["requires_hitl"] = True
                return state
        except Exception as exc:
            logger.error("ZK proof verification error: %s", exc)

    # ── Branch 3: Contradiction — OPA denies but LLM says low risk ──────────
    opa = state.get("opa_result")
    tx_risk = state.get("tx_risk")
    wallet_risk = state.get("wallet_risk")

    if opa and opa.violations and tx_risk and tx_risk.risk_level == "low":
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = "contradiction: OPA denies but LLM assessed low risk"
        state["requires_hitl"] = True
        return state

    # ── Branch 4: Contradiction — sanctions match but risk_level low ─────────
    if wallet_risk and wallet_risk.sanctions_match and wallet_risk.risk_level == "low":
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = "contradiction: sanctions match but wallet risk_level is low"
        state["requires_hitl"] = True
        return state

    # ── Branch 5: OPA violations present ────────────────────────────────────
    if opa and opa.violations:
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = f"policy violations: {'; '.join(opa.violations[:3])}"
        state["requires_hitl"] = True
        return state

    # ── Branch 6: Elevated risk level ───────────────────────────────────────
    if (tx_risk and tx_risk.risk_level == "high") or \
       (wallet_risk and wallet_risk.risk_level in ("high", "critical")):
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = "elevated risk level detected"
        state["requires_hitl"] = True
        return state

    # ── Branch 7: Amount threshold ───────────────────────────────────────────
    tx = state["tx"]
    if tx.amount_eur > settings.HITL_AMOUNT_THRESHOLD_EUR:
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = f"amount EUR {tx.amount_eur} exceeds HITL threshold {settings.HITL_AMOUNT_THRESHOLD_EUR}"
        state["requires_hitl"] = True
        return state

    # ── Branch 8: Velocity threshold ────────────────────────────────────────
    if tx.velocity_24h > settings.VELOCITY_HITL_THRESHOLD:
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = f"velocity {tx.velocity_24h} exceeds threshold {settings.VELOCITY_HITL_THRESHOLD}"
        state["requires_hitl"] = True
        return state

    # ── Branch 9: Confidence floor ───────────────────────────────────────────
    confs = []
    if tx_risk:
        confs.append(tx_risk.confidence)
    if wallet_risk:
        confs.append(wallet_risk.confidence)
    if confs and min(confs) < settings.CONFIDENCE_FLOOR:
        state["governance_decision"] = Decision.ESCALATE_HUMAN
        state["governance_reason"] = f"min confidence {min(confs):.2f} below floor {settings.CONFIDENCE_FLOOR}"
        state["requires_hitl"] = True
        return state

    # ── Branch 10: Default — approve ────────────────────────────────────────
    state["governance_decision"] = Decision.AUTO_APPROVE
    state["governance_reason"] = "no triggers fired"
    state["requires_hitl"] = False
    return state
