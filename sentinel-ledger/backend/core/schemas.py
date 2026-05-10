"""All Pydantic data models for inputs, agent outputs, decisions, and audit records."""
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, List
from enum import Enum
import re


# ============ INPUT ============

class Transaction(BaseModel):
    tx_id: str = Field(..., min_length=1, max_length=64)
    wallet_from: str = Field(..., min_length=10, max_length=64)
    wallet_to: str = Field(..., min_length=10, max_length=64)
    amount_eur: float = Field(..., ge=0, le=1_000_000_000)
    token: str = Field("ETH", max_length=20)
    chain: str = Field("ethereum", max_length=20)
    timestamp: int = Field(..., ge=0)
    velocity_24h: int = Field(0, ge=0, le=10000)
    tx_count_7d: int = Field(0, ge=0, le=100000)
    jurisdiction: str = Field("FR", min_length=2, max_length=3)
    memo: Optional[str] = Field(None, max_length=500)  # untrusted


# ============ AGENT OUTPUTS ============

class TxRiskOutput(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    signals: List[str] = Field(..., max_length=20)
    confidence: float = Field(..., ge=0.0, le=1.0)
    structuring_score: float = Field(0.0, ge=0.0, le=1.0)
    velocity_score: float = Field(0.0, ge=0.0, le=1.0)

    @field_validator("signals")
    @classmethod
    def signals_no_pii(cls, v: List[str]) -> List[str]:
        """Crude PII guard; replace with Presidio if available."""
        patterns = [r"\b\d{4}[- ]?\d{4}\b", r"\b[\w._%+-]+@[\w.-]+\.\w+\b"]
        for s in v:
            for p in patterns:
                if re.search(p, s):
                    raise ValueError(f"PII suspected in signal: {s[:30]}...")
        return v


class WalletRiskOutput(BaseModel):
    risk_level: Literal["low", "medium", "high", "critical"]
    reasons: List[str] = Field(..., max_length=20)
    sanctions_match: bool = False
    mixer_proximity_hops: Optional[int] = Field(None, ge=0, le=10)
    taint_score: float = Field(0.0, ge=0.0, le=1.0)
    cluster_id: Optional[str] = None
    network_graph: Optional[dict] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class OPAResult(BaseModel):
    violations: List[str]
    allow: bool
    requires_sar: bool = False


class ZKProofBundle(BaseModel):
    amount_commit: str       # hex (compressed point, 33 bytes → 66 hex)
    wallet_commit: str       # hex
    sanctions_proof: dict    # serialized non-inclusion proof
    merkle_root: str         # hex (32 bytes)
    timestamp: float


class Decision(str, Enum):
    AUTO_APPROVE = "AUTO_APPROVE"
    ESCALATE_HUMAN = "ESCALATE_HUMAN"
    BLOCK_INJECTION = "BLOCK_INJECTION"
    BLOCK_SANCTIONS = "BLOCK_SANCTIONS"
    BLOCK_INVALID_PROOF = "BLOCK_INVALID_PROOF"


class AuditRecord(BaseModel):
    tx_id: str
    timestamp: float
    inputs_hash: str        # sha256 of raw inputs
    agent_outputs: dict     # all agent outputs (jsonable)
    governance_decision: str
    governance_reason: str
    explanation: str
    zk_bundle: dict
    human_decision: Optional[str] = None
    human_actor_id: Optional[str] = None
    prev_record_hash: str
    signature: str          # HMAC-SHA256 hex


# ============ API RESPONSE MODELS ============

class AnalyzeResponse(BaseModel):
    tx_id: str
    governance_decision: str
    governance_reason: str
    requires_hitl: bool
    explanation: str
    tx_risk: Optional[dict] = None
    wallet_risk: Optional[dict] = None
    opa_result: Optional[dict] = None
    zk_bundle: Optional[dict] = None


class VerifyResponse(BaseModel):
    tx_id: str
    merkle_root_published: bool
    sanctions_non_inclusion_proof_valid: bool
    audit_chain_intact: bool
    audit_chain_errors: List[str]
    decision: str
    all_proofs_valid: bool


class HumanDecisionResponse(BaseModel):
    ok: bool
    decision: str
