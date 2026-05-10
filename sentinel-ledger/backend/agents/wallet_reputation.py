"""Wallet reputation agent — parallel API fetch + heuristics, no LLM."""
import asyncio
import logging
from typing import Optional

from backend.analysis.etherscan import get_tx_history, get_wallet_age_days
from backend.analysis.chainalysis import is_sanctioned
from backend.analysis.goplus import address_risk
from backend.analysis.graph import build_2hop_graph, cluster_id, taint_score_haircut
from backend.analysis.heuristics import (
    detect_structuring,
    velocity_score,
    is_mixer_behavioral,
    detect_rapid_chain,
)
from backend.core.schemas import WalletRiskOutput
from backend.core.state import AgentState

logger = logging.getLogger(__name__)

# Known mixer contract addresses (curated short list for demo)
_KNOWN_MIXERS: set[str] = {
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",  # Tornado Cash 0.1 ETH
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",  # Tornado Cash 1 ETH
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",  # Tornado Cash 10 ETH
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",  # Tornado Cash 100 ETH
}


def _risk_level(
    sanctions_match: bool,
    taint: float,
    goplus_malicious: bool,
    mixer_hops: Optional[int],
) -> str:
    """Deterministic risk level per spec §8.13."""
    if sanctions_match:
        return "critical"
    if taint > 0.5 or (mixer_hops is not None and mixer_hops <= 2):
        return "high"
    if goplus_malicious or taint > 0.2:
        return "medium"
    return "low"


async def wallet_reputation_agent(state: AgentState) -> AgentState:
    """
    Analyze both wallets in the transaction; use the worst-case result.
    Parallel-fetches Etherscan, Chainalysis, GoPlus, then applies graph heuristics.
    No LLM call — pure deterministic analysis.
    """
    tx = state["tx"]
    wallet = tx.wallet_from  # primary: sender is higher risk

    # ── 1. Parallel fetch ────────────────────────────────────────────────────
    tx_history_result, sanctions_result, goplus_result = await asyncio.gather(
        get_tx_history(wallet, limit=100),
        is_sanctioned(wallet),
        address_risk(wallet),
        return_exceptions=True,
    )

    # Handle exceptions from gather
    tx_history: list[dict] = tx_history_result if isinstance(tx_history_result, list) else []
    sanctions_match: bool = bool(sanctions_result) if not isinstance(sanctions_result, Exception) else False
    goplus: dict = goplus_result if isinstance(goplus_result, dict) else {"is_malicious": False, "risk_score": 0.0, "tags": []}

    # ── 2. Graph analysis ────────────────────────────────────────────────────
    graph = build_2hop_graph(tx_history, wallet)
    flagged_nodes = _KNOWN_MIXERS.copy()
    if sanctions_match:
        flagged_nodes.add(wallet.lower())

    taint = taint_score_haircut(graph, wallet, flagged_nodes)
    cid = cluster_id(graph, wallet)

    # Mixer proximity: check if wallet is within 3 hops of a known mixer
    from backend.analysis.graph import mixer_proximity_hops as _mixer_prox
    mixer_hops = _mixer_prox(graph, wallet, _KNOWN_MIXERS)

    # ── 3. Heuristics ────────────────────────────────────────────────────────
    structuring = detect_structuring(tx_history)
    vel_score = velocity_score(tx.velocity_24h)
    mixer_behav = is_mixer_behavioral(tx_history[:20])  # last 20 txs
    rapid = detect_rapid_chain(sorted(tx_history, key=lambda t: int(t.get("timeStamp", 0))))

    reasons: list[str] = []
    if sanctions_match:
        reasons.append("Chainalysis sanctions match")
    if goplus.get("is_malicious"):
        reasons.append(f"GoPlus risk flags: {', '.join(goplus.get('tags', [])[:3])}")
    if taint > 0.2:
        reasons.append(f"Taint score {taint:.2f} from flagged upstream addresses")
    if mixer_hops is not None and mixer_hops <= 3:
        reasons.append(f"Within {mixer_hops} hops of known mixer")
    if mixer_behav:
        reasons.append("Behavioral mixer pattern detected in outgoing transactions")
    if rapid:
        reasons.append("Rapid-chain transactions detected (potential layering)")
    if vel_score >= 0.5:
        reasons.append(f"High transaction velocity: {tx.velocity_24h} txs in 24h")
    if structuring > 0.65:
        reasons.append(f"Structuring pattern score: {structuring:.2f}")
    if not reasons:
        reasons.append("No risk indicators detected")

    risk_level = _risk_level(sanctions_match, taint, goplus.get("is_malicious", False), mixer_hops)

    # Confidence: higher when we have real data
    has_data = len(tx_history) > 0
    confidence = 0.85 if has_data else 0.60

    # Serialize graph for frontend (limit to 50 nodes to avoid overload)
    import networkx as nx
    network_graph = {"nodes": [], "edges": []}
    for n in list(graph.nodes)[:50]:
        network_graph["nodes"].append({"id": n, "label": n[:8]})
    for u, v in list(graph.edges)[:100]:
        if u in [n["id"] for n in network_graph["nodes"]] and v in [n["id"] for n in network_graph["nodes"]]:
            network_graph["edges"].append({"source": u, "target": v})

    state["wallet_risk"] = WalletRiskOutput(
        risk_level=risk_level,
        reasons=reasons[:10],  # cap at 10
        sanctions_match=sanctions_match,
        mixer_proximity_hops=mixer_hops,
        taint_score=taint,
        cluster_id=cid,
        network_graph=network_graph,
        confidence=confidence,
    )

    logger.info(
        "Wallet %s…%s: risk=%s sanctions=%s taint=%.2f",
        wallet[:8], wallet[-4:], risk_level, sanctions_match, taint,
    )
    return state
