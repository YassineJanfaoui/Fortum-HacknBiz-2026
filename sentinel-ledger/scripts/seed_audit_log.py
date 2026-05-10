"""Seed script to pre-populate the SQLite audit store with fake historical records."""
import time
import hashlib
from backend.audit.store import AuditStore
from backend.core.config import settings
from backend.core.schemas import AuditRecord, Decision

def seed():
    store = AuditStore(settings.DATABASE_URL, settings.AUDIT_HMAC_KEY)
    
    # Check if already seeded to avoid duplicates
    if len(store.all_records(limit=1)) > 0:
        print("Audit store already contains records. Skipping seed.")
        return

    now = time.time()
    
    historical_data = [
        {
            "tx_id": "TX-HIST-001",
            "decision": "AUTO_APPROVE",
            "reason": "no triggers fired",
            "time_offset": 86400 * 5,
        },
        {
            "tx_id": "TX-HIST-002",
            "decision": "ESCALATE_HUMAN",
            "reason": "amount EUR 15000.0 exceeds HITL threshold 10000.0",
            "time_offset": 86400 * 4,
        },
        {
            "tx_id": "TX-HIST-003",
            "decision": "AUTO_APPROVE",
            "reason": "no triggers fired",
            "time_offset": 86400 * 3,
        },
        {
            "tx_id": "TX-HIST-004",
            "decision": "BLOCK_INJECTION",
            "reason": "keyword: ignore",
            "time_offset": 86400 * 2,
        },
        {
            "tx_id": "TX-HIST-005",
            "decision": "BLOCK_SANCTIONS",
            "reason": "sanctions non-inclusion proof failed (wallet may be sanctioned)",
            "time_offset": 86400 * 1,
        },
        {
            "tx_id": "TX-HIST-006",
            "decision": "AUTO_APPROVE",
            "reason": "no triggers fired",
            "time_offset": 3600 * 5,
        },
        {
            "tx_id": "TX-HIST-007",
            "decision": "ESCALATE_HUMAN",
            "reason": "velocity 25 exceeds threshold 20",
            "time_offset": 3600 * 1,
        }
    ]

    for item in historical_data:
        inputs_hash = hashlib.sha256(item["tx_id"].encode()).hexdigest()
        
        # Determine the status and enum correctly
        gov_decision = item["decision"]
        
        record = AuditRecord(
            tx_id=item["tx_id"],
            timestamp=now - item["time_offset"],
            inputs_hash=inputs_hash,
            agent_outputs={},
            governance_decision=gov_decision,
            governance_reason=item["reason"],
            explanation="Historical record pre-seeded for demo purposes.",
            zk_bundle={
                "amount_commit": "02" + "1a" * 32,
                "wallet_commit": "03" + "2b" * 32,
                "merkle_root": "701987a0ea0f408da13c09a55eb22578db52180cadb671fef7bcbfd1aea5b12d",
                "sanctions_proof": {"type": "non_inclusion"} if "BLOCK" not in gov_decision else {"type": "present"}
            },
            prev_record_hash=store.latest_hash(),
            signature="",
        )
        
        r = store.append(record)
        
        # Mark some ESCALATE_HUMAN as processed
        if gov_decision == "ESCALATE_HUMAN" and item["tx_id"] == "TX-HIST-002":
            r.human_decision = "APPROVED"
            r.human_actor_id = "compliance_officer_jane"
            store.append_human_decision(r)

    print(f"Successfully seeded {len(historical_data)} historical records.")

if __name__ == "__main__":
    seed()
