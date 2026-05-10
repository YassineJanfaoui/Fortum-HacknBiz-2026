"""Explainability agent — two-LLM separation: only sees structured agent outputs, never raw memo."""
import logging

from backend.core.state import AgentState
from backend.security.safe_llm import safe_llm_text_call

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a compliance reporting assistant for NORDA Bank.
You receive ONLY structured risk findings — no raw user input.
Produce a clear narrative explanation for a human compliance officer.

Rules:
- Never use the words 'criminal', 'guilty', 'fraud' as conclusions.
- Use 'anomalous', 'suspicious', 'consistent with patterns observed in...'.
- List specific evidence; never make unsupported claims.
- End with: 'This case requires human review before any action is taken.'
- Maximum 150 words.

Return ONLY the narrative text, no JSON."""


async def explainability_agent(state: AgentState) -> AgentState:
    """
    Generate a plain-language compliance narrative from structured agent outputs.
    This LLM NEVER sees the original tx.memo — that is the two-LLM separation.
    """
    tx_risk = state.get("tx_risk")
    wallet_risk = state.get("wallet_risk")
    opa = state.get("opa_result")
    tx = state["tx"]
    canary = state.get("canary_token", "")

    findings = {
        "tx_id": tx.tx_id,
        "amount_eur": tx.amount_eur,
        "jurisdiction": tx.jurisdiction,
        "tx_risk": tx_risk.model_dump() if tx_risk else None,
        "wallet_risk": wallet_risk.model_dump() if wallet_risk else None,
        "opa_violations": opa.violations if opa else [],
        "requires_sar": opa.requires_sar if opa else False,
        "injection_detected": state.get("injection_detected", False),
    }

    try:
        explanation = await safe_llm_text_call(
            system_prompt=_SYSTEM_PROMPT,
            structured_inputs=findings,
            canary=canary,
            state=state,
        )
    except Exception as exc:
        logger.error("Explainability LLM failed for %s: %s", tx.tx_id, exc)
        # Build deterministic fallback explanation
        parts = [f"Transaction {tx.tx_id} of EUR {tx.amount_eur:.2f} from jurisdiction {tx.jurisdiction}."]
        if tx_risk:
            parts.append(f"Transaction risk: {tx_risk.risk_level} (confidence {tx_risk.confidence:.0%}).")
        if opa and opa.violations:
            parts.append(f"Policy violations: {'; '.join(opa.violations[:2])}.")
        if state.get("injection_detected"):
            parts.append("WARNING: Prompt injection attempt detected in transaction memo.")
        parts.append("This case requires human review before any action is taken.")
        explanation = " ".join(parts)

    state["explanation"] = explanation
    return state
