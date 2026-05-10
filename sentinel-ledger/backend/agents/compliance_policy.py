"""Compliance policy agent — evaluates transactions against AML rules via OPA."""
import json
import logging
import subprocess
import sys
from pathlib import Path

from backend.core.schemas import OPAResult
from backend.core.state import AgentState

logger = logging.getLogger(__name__)

# Resolve paths relative to this file: backend/agents/ → sentinel-ledger/
_REPO_ROOT = Path(__file__).resolve().parents[2]
_POLICY_PATH = _REPO_ROOT / "backend" / "policy" / "aml_rules.rego"

# OPA binary: prefer project-local opa.exe (Windows), fall back to PATH
_OPA_LOCAL = _REPO_ROOT / "opa.exe"
_OPA_BIN = str(_OPA_LOCAL) if _OPA_LOCAL.exists() else "opa"


def _build_opa_input(state: AgentState) -> dict:
    """Extract relevant fields for OPA evaluation."""
    tx = state["tx"]
    tx_risk = state.get("tx_risk")
    wallet_risk = state.get("wallet_risk")

    return {
        "amount_eur": tx.amount_eur,
        "jurisdiction": tx.jurisdiction,
        "structuring_score": tx_risk.structuring_score if tx_risk else 0.0,
        "velocity_score": tx_risk.velocity_score if tx_risk else 0.0,
        "sanctions_match": wallet_risk.sanctions_match if wallet_risk else False,
        "taint_score": wallet_risk.taint_score if wallet_risk else 0.0,
    }


def _run_opa(opa_input: dict) -> dict:
    """
    Shell out to OPA and return the parsed result dict.
    Uses --stdin-input (-I) so no temp files needed (works on Windows).
    """
    input_json = json.dumps(opa_input)

    try:
        result = subprocess.run(
            [
                _OPA_BIN, "eval",
                "--data", str(_POLICY_PATH),
                "--stdin-input",
                "--format", "json",
                "data.aml",
            ],
            input=input_json,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except FileNotFoundError:
        logger.error(
            "OPA binary not found at %s. Install OPA or set OPA_PATH env var.", _OPA_BIN
        )
        return _fallback_python_eval(opa_input)
    except subprocess.TimeoutExpired:
        logger.error("OPA evaluation timed out")
        return _fallback_python_eval(opa_input)
    except Exception as exc:
        logger.error("OPA subprocess error: %s", exc)
        return _fallback_python_eval(opa_input)

    if result.returncode != 0:
        logger.error("OPA exited %d: %s", result.returncode, result.stderr[:300])
        return _fallback_python_eval(opa_input)

    try:
        parsed = json.loads(result.stdout)
        # OPA output: {"result": [{"expressions": [{"value": {...}, ...}]}]}
        value = parsed["result"][0]["expressions"][0]["value"]
        return value
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.error("Failed to parse OPA output: %s | raw: %s", exc, result.stdout[:300])
        return _fallback_python_eval(opa_input)


def _fallback_python_eval(inp: dict) -> dict:
    """
    Pure-Python fallback replicating the Rego rules exactly.
    Used when OPA binary is unavailable (Risk Register §12 mitigation).
    """
    violations = []

    if inp["amount_eur"] >= 10000:
        violations.append(f"AML threshold: SAR required for amount EUR {inp['amount_eur']}")
    elif inp["amount_eur"] >= 1000:
        violations.append(f"Travel Rule: transfer info required for amount EUR {inp['amount_eur']}")

    if inp.get("structuring_score", 0) > 0.7:
        violations.append(f"Structuring pattern detected (score={inp['structuring_score']})")

    if inp.get("sanctions_match"):
        violations.append("Wallet matches sanctions list")

    if inp.get("taint_score", 0) > 0.3:
        violations.append(f"Taint score {inp['taint_score']} exceeds 0.3 threshold")

    sanctioned_jurisdictions = {"IR", "KP", "SY", "CU", "RU"}
    if inp.get("jurisdiction") in sanctioned_jurisdictions:
        violations.append(f"Sanctioned jurisdiction: {inp['jurisdiction']}")

    requires_sar = inp["amount_eur"] >= 10000 or inp.get("sanctions_match", False)
    allow = len(violations) == 0

    return {
        "deny": violations,
        "allow": allow,
        "requires_sar": requires_sar,
    }


async def compliance_policy_agent(state: AgentState) -> AgentState:
    """Evaluate AML compliance rules via OPA and write OPAResult to state."""
    opa_input = _build_opa_input(state)
    opa_out = _run_opa(opa_input)

    # OPA returns deny as a set/array of reasons
    violations = opa_out.get("deny", [])
    if isinstance(violations, dict):
        # OPA sometimes returns deny as {reason: true} dict
        violations = list(violations.keys())
    violations = [str(v) for v in violations]

    # OPA v1 omits 'allow' when deny is non-empty — derive it
    allow = opa_out.get("allow", len(violations) == 0)
    requires_sar = bool(opa_out.get("requires_sar", False))

    state["opa_result"] = OPAResult(
        violations=violations,
        allow=allow,
        requires_sar=requires_sar,
    )

    logger.info(
        "OPA eval for %s: allow=%s violations=%d",
        state["tx"].tx_id,
        allow,
        len(violations),
    )
    return state
