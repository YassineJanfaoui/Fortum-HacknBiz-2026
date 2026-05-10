"""AgentState TypedDict — shared mutable state threaded through the LangGraph pipeline."""
from typing import TypedDict, Optional
from backend.core.schemas import (
    Transaction, TxRiskOutput, WalletRiskOutput,
    OPAResult, ZKProofBundle, Decision, AuditRecord,
)


class AgentState(TypedDict, total=False):
    # Inputs
    tx: Transaction
    raw_inputs: dict        # untouched original payload, for audit
    canary_token: str       # injected per request, used to detect leakage
    pseudonyms: dict        # {raw_wallet: pseudonym}

    # Agent outputs
    tx_risk: TxRiskOutput
    wallet_risk: WalletRiskOutput
    opa_result: OPAResult
    zk_bundle: ZKProofBundle
    explanation: str

    # Governance
    injection_detected: bool
    injection_reason: Optional[str]
    governance_decision: Decision
    governance_reason: str
    requires_hitl: bool

    # Audit
    audit_record: AuditRecord

    # Operational
    llm_call_count: int
    errors: list[str]
