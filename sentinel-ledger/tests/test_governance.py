"""Mandatory governance sentinel tests — one per decision branch (spec §13)."""
import pytest
from backend.agents.governance_sentinel import governance_sentinel
from backend.core.schemas import Decision, TxRiskOutput, WalletRiskOutput, OPAResult, ZKProofBundle, Transaction
import time


def _base_tx(**kwargs) -> Transaction:
    defaults = dict(
        tx_id="TX-TEST", wallet_from="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        wallet_to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        amount_eur=500.0, token="ETH", chain="ethereum",
        timestamp=1715000000, velocity_24h=2, tx_count_7d=5, jurisdiction="FR",
    )
    defaults.update(kwargs)
    return Transaction(**defaults)


def _low_tx_risk() -> TxRiskOutput:
    return TxRiskOutput(risk_level="low", signals=["clean"], confidence=0.9,
                        structuring_score=0.0, velocity_score=0.0)


def _low_wallet_risk() -> WalletRiskOutput:
    return WalletRiskOutput(risk_level="low", reasons=["clean"], sanctions_match=False,
                            taint_score=0.0, confidence=0.9)


def _no_violations() -> OPAResult:
    return OPAResult(violations=[], allow=True, requires_sar=False)


def _base_state(**overrides) -> dict:
    state = {
        "tx": _base_tx(),
        "tx_risk": _low_tx_risk(),
        "wallet_risk": _low_wallet_risk(),
        "opa_result": _no_violations(),
        "injection_detected": False,
        "injection_reason": None,
        "llm_call_count": 0,
        "errors": [],
    }
    state.update(overrides)
    return state


@pytest.mark.asyncio
async def test_branch1_block_injection():
    """Branch 1: injection_detected=True → BLOCK_INJECTION."""
    state = _base_state(injection_detected=True, injection_reason="keyword: ignore")
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.BLOCK_INJECTION
    assert result["requires_hitl"] is True


@pytest.mark.asyncio
async def test_branch2_block_sanctions_zk_fail():
    """Branch 2: ZK proof type 'present' (wallet IS on sanctions list) → BLOCK_SANCTIONS."""
    # When proof type == 'present', verify_non_inclusion returns False
    zk = ZKProofBundle(
        amount_commit="aa" * 33, wallet_commit="bb" * 33,
        sanctions_proof={"type": "present", "candidate": "cc" * 32},
        merkle_root="dd" * 32, timestamp=time.time(),
    )
    state = _base_state(zk_bundle=zk)
    result = await governance_sentinel(state)
    # The sentinel catches the ZK fail — present type → verify_non_inclusion returns False
    assert result["governance_decision"] == Decision.BLOCK_SANCTIONS
    assert result["requires_hitl"] is True


@pytest.mark.asyncio
async def test_branch3_contradiction_opa_deny_llm_low():
    """Branch 3: OPA violations + tx_risk.risk_level='low' → ESCALATE (contradiction)."""
    state = _base_state(
        opa_result=OPAResult(violations=["Travel Rule triggered"], allow=False),
        tx_risk=TxRiskOutput(risk_level="low", signals=["clean"], confidence=0.9,
                             structuring_score=0.0, velocity_score=0.0),
    )
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.ESCALATE_HUMAN
    assert "contradiction" in result["governance_reason"]


@pytest.mark.asyncio
async def test_branch4_contradiction_sanctions_low_risk():
    """Branch 4: sanctions_match=True but risk_level='low' → ESCALATE (contradiction)."""
    state = _base_state(
        opa_result=_no_violations(),
        wallet_risk=WalletRiskOutput(risk_level="low", reasons=["??"], sanctions_match=True,
                                     taint_score=0.0, confidence=0.9),
    )
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.ESCALATE_HUMAN
    assert "contradiction" in result["governance_reason"]


@pytest.mark.asyncio
async def test_branch5_opa_violations():
    """Branch 5: OPA violations present → ESCALATE_HUMAN."""
    state = _base_state(
        opa_result=OPAResult(violations=["AML threshold: SAR required"], allow=False),
        tx_risk=TxRiskOutput(risk_level="medium", signals=["elevated"], confidence=0.8, structuring_score=0.0, velocity_score=0.0)
    )
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.ESCALATE_HUMAN
    assert "violation" in result["governance_reason"].lower()


@pytest.mark.asyncio
async def test_branch6_high_risk_level():
    """Branch 6: tx_risk.risk_level='high' → ESCALATE_HUMAN."""
    state = _base_state(
        tx_risk=TxRiskOutput(risk_level="high", signals=["anomalous"], confidence=0.85,
                             structuring_score=0.8, velocity_score=0.5),
    )
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.ESCALATE_HUMAN


@pytest.mark.asyncio
async def test_branch7_amount_threshold():
    """Branch 7: amount_eur > HITL threshold → ESCALATE_HUMAN."""
    state = _base_state(tx=_base_tx(amount_eur=15000.0))
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.ESCALATE_HUMAN
    assert "amount" in result["governance_reason"].lower()


@pytest.mark.asyncio
async def test_branch8_velocity_threshold():
    """Branch 8: velocity_24h > 20 → ESCALATE_HUMAN."""
    state = _base_state(tx=_base_tx(velocity_24h=25))
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.ESCALATE_HUMAN
    assert "velocity" in result["governance_reason"].lower()


@pytest.mark.asyncio
async def test_branch9_confidence_floor():
    """Branch 9: min confidence < 0.5 → ESCALATE_HUMAN."""
    state = _base_state(
        tx_risk=TxRiskOutput(risk_level="low", signals=["uncertain"], confidence=0.4,
                             structuring_score=0.0, velocity_score=0.0),
    )
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.ESCALATE_HUMAN
    assert "confidence" in result["governance_reason"].lower()


@pytest.mark.asyncio
async def test_branch10_auto_approve():
    """Branch 10: no triggers fired → AUTO_APPROVE."""
    state = _base_state()  # clean tx, all defaults
    result = await governance_sentinel(state)
    assert result["governance_decision"] == Decision.AUTO_APPROVE
    assert result["requires_hitl"] is False
