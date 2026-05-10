"""Rich seed script to populate the audit store with tens of transactions and dynamic network graphs."""
import time
import hashlib
import random
import json
from backend.audit.store import AuditStore
from backend.core.config import settings
from backend.core.schemas import AuditRecord, Decision

def _generate_mock_txs(wallet: str) -> list[dict]:
    random.seed(wallet)
    mock_txs = []
    now = int(time.time())
    
    hop1_wallets = [f"0xHop1_{i:04x}{wallet[-6:]}" for i in range(8)]
    for h1 in hop1_wallets:
        for _ in range(random.randint(1, 3)):
            is_inbound = random.choice([True, False])
            mock_txs.append({
                "from": h1 if is_inbound else wallet,
                "to": wallet if is_inbound else h1,
                "value": str(random.randint(10000000000000000, 500000000000000000)),
                "timeStamp": str(now - random.randint(1000, 86400 * 30))
            })
    
    for h1 in hop1_wallets:
        hop2_wallets = [f"0xHop2_{i:04x}{h1[-6:]}" for i in range(3)]
        for h2 in hop2_wallets:
            for _ in range(random.randint(1, 2)):
                is_inbound = random.choice([True, False])
                mock_txs.append({
                    "from": h2 if is_inbound else h1,
                    "to": h1 if is_inbound else h2,
                    "value": str(random.randint(10000000000000000, 200000000000000000)),
                    "timeStamp": str(now - random.randint(1000, 86400 * 30))
                })
    return mock_txs

def _serialize_graph(tx_history, wallet):
    # Simple graph serialization logic from wallet_reputation.py
    nodes_set = {wallet}
    edges = []
    for tx in tx_history:
        u, v = tx["from"], tx["to"]
        nodes_set.add(u)
        nodes_set.add(v)
        edges.append({"source": u, "target": v})
    
    nodes = [{"id": n, "label": n[:8]} for n in list(nodes_set)[:50]]
    nodes_ids = {n["id"] for n in nodes}
    final_edges = [e for e in edges if e["source"] in nodes_ids and e["target"] in nodes_ids][:100]
    return {"nodes": nodes, "edges": final_edges}

def seed():
    store = AuditStore(settings.DATABASE_URL, settings.AUDIT_HMAC_KEY)
    now = time.time()
    
    scenarios = [
        ("AUTO_APPROVE", "Normal business payment", "low"),
        ("ESCALATE_HUMAN", "High value transfer", "high"),
        ("BLOCK_INJECTION", "Suspicious memo instructions", "high"),
        ("BLOCK_SANCTIONS", "Target wallet flagged on watchlists", "critical"),
    ]

    for i in range(1, 31): # 30 transactions
        tx_id = f"TX-REAL-SCENARIO-{i:03d}"
        wallet_from = f"0xSender_{hashlib.sha256(tx_id.encode()).hexdigest()[:10]}"
        wallet_to = f"0xReceiver_{hashlib.sha256((tx_id+'to').encode()).hexdigest()[:10]}"
        
        decision, reason, risk_level = random.choice(scenarios)
        
        tx_history = _generate_mock_txs(wallet_from)
        network_graph = _serialize_graph(tx_history, wallet_from)
        
        agent_outputs = {
            "wallet_risk": {
                "risk_level": risk_level,
                "reasons": [reason],
                "sanctions_match": decision == "BLOCK_SANCTIONS",
                "mixer_proximity_hops": random.randint(1, 5) if risk_level != "low" else None,
                "taint_score": random.uniform(0.1, 0.9) if risk_level != "low" else 0.05,
                "cluster_id": f"cluster_{wallet_from[:6]}",
                "network_graph": network_graph,
                "confidence": 0.92
            },
            "tx_risk": {
                "risk_level": "low" if decision == "AUTO_APPROVE" else "medium",
                "signals": ["Frequent transfer partner"] if decision == "AUTO_APPROVE" else ["Anomalous time of day"],
                "confidence": 0.88,
                "structuring_score": 0.1,
                "velocity_score": 0.2
            }
        }
        
        if decision == "BLOCK_INJECTION":
            agent_outputs["injection_detected"] = True
            agent_outputs["injection_reason"] = "Detected forbidden keywords: 'ignore'"

        record = AuditRecord(
            tx_id=tx_id,
            timestamp=now - random.randint(0, 86400 * 7),
            inputs_hash=hashlib.sha256(tx_id.encode()).hexdigest(),
            agent_outputs=agent_outputs,
            governance_decision=decision,
            governance_reason=reason,
            explanation=f"Simulated real-world analysis for scenario {i}.",
            zk_bundle={
                "amount_commit": hashlib.sha256(b"amount").hexdigest(),
                "wallet_commit": hashlib.sha256(wallet_from.encode()).hexdigest(),
                "merkle_root": "701987a0ea0f408da13c09a55eb22578db52180cadb671fef7bcbfd1aea5b12d",
                "sanctions_proof": {"type": "non_inclusion"},
                "timestamp": now
            },
            prev_record_hash=store.latest_hash(),
            signature="",
        )
        store.append(record)

    print(f"Successfully seeded 30 rich historical records with dynamic graphs.")

if __name__ == "__main__":
    seed()
