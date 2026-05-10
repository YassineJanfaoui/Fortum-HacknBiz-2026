"""Audit store integrity tests for chain continuity and HITL filtering."""
import sqlite3
import time

from backend.audit.store import AuditStore
from backend.core.schemas import AuditRecord


def _record(tx_id: str, prev_hash: str, requires_hitl: bool) -> AuditRecord:
    return AuditRecord(
        tx_id=tx_id,
        timestamp=time.time(),
        tx_summary={"amount_eur": 1000.0, "token": "ETH"},
        inputs_hash="ab" * 32,
        agent_outputs={},
        governance_decision="ESCALATE_HUMAN" if requires_hitl else "AUTO_APPROVE",
        governance_reason="test",
        requires_hitl=requires_hitl,
        explanation="test",
        zk_bundle={},
        prev_record_hash=prev_hash,
        signature="",
    )


def test_verify_chain_rejects_broken_prev_hash(tmp_path):
    db_url = f"sqlite:///{tmp_path / 'audit.db'}"
    store = AuditStore(db_url, b"k" * 32)
    first = store.append(_record("TX-1", store.latest_hash(), requires_hitl=False))
    second = store.append(_record("TX-2", store.latest_hash(), requires_hitl=False))

    assert first.signature
    assert second.signature
    ok, errors = store.verify_chain()
    assert ok, errors

    with sqlite3.connect(tmp_path / "audit.db") as conn:
        conn.execute(
            "UPDATE audit_records SET record_json = replace(record_json, ?, ?) WHERE tx_id = ?",
            (second.prev_record_hash, "f" * 64, "TX-2"),
        )

    ok, errors = store.verify_chain()
    assert not ok
    assert any("prev hash mismatch" in error for error in errors)


def test_pending_hitl_only_returns_unresolved_required_reviews(tmp_path):
    db_url = f"sqlite:///{tmp_path / 'audit.db'}"
    store = AuditStore(db_url, b"k" * 32)
    store.append(_record("TX-CLEAN", store.latest_hash(), requires_hitl=False))
    pending = store.append(_record("TX-PENDING", store.latest_hash(), requires_hitl=True))
    resolved = store.append(_record("TX-RESOLVED", store.latest_hash(), requires_hitl=True))
    resolved.human_decision = "APPROVED"
    store.append_human_decision(resolved)

    records = store.pending_hitl()
    assert [record.tx_id for record in records] == [pending.tx_id]
