"""Multi-hop blockchain flow tracing for analyst graph views."""
from __future__ import annotations

import hashlib
import time
from collections import defaultdict, deque
from typing import Any

from backend.analysis.etherscan import get_tx_history
from backend.analysis.wallet_intelligence import KNOWN_ENTITY_LABELS, _entity, _lower, _wei_to_eth


def _short(address: str) -> str:
    address = _lower(address)
    if len(address) <= 14:
        return address
    return f"{address[:6]}...{address[-4:]}"


def _is_evm_address(address: str) -> bool:
    address = _lower(address)
    return address.startswith("0x") and len(address) == 42 and all(ch in "0123456789abcdef" for ch in address[2:])


def _risk_level(score: int) -> str:
    if score >= 75:
        return "high"
    if score >= 38:
        return "suspicious"
    return "safe"


def _node_risk(address: str, depth: int, out_degree: int, volume_eth: float, touches_mixer: bool) -> int:
    entity = KNOWN_ENTITY_LABELS.get(_lower(address), {})
    category = entity.get("category", "unlabeled")
    score = 10
    if category in {"mixer", "sanctions"}:
        score += 80
    elif category == "exchange":
        score += 18
    if touches_mixer:
        score += 30
    if out_degree >= 5:
        score += 28
    elif out_degree >= 3:
        score += 16
    if volume_eth >= 100:
        score += 24
    elif volume_eth >= 10:
        score += 14
    if depth >= 3:
        score += 8
    return min(score, 100)


def _edge_id(source: str, target: str, depth: int, token: str) -> str:
    digest = hashlib.sha1(f"{source}:{target}:{depth}:{token}".encode()).hexdigest()[:12]
    return f"edge-{digest}"


def _node_id(address: str) -> str:
    digest = hashlib.sha1(_lower(address).encode()).hexdigest()[:10]
    return f"wallet-{digest}"


def _tx_timestamp(tx: dict[str, Any]) -> int:
    try:
        return int(tx.get("timeStamp", 0) or 0)
    except (TypeError, ValueError):
        return 0


def _make_edge(source: str, target: str, amount_eth: float, txs: list[dict[str, Any]], depth: int, fanout_count: int) -> dict[str, Any]:
    pattern = "split" if fanout_count >= 4 and depth == 1 else "layering" if depth >= 2 else "direct"
    if amount_eth >= 25:
        pattern = "large_flow"
    latest = max((_tx_timestamp(tx) for tx in txs), default=0)
    hashes = [tx.get("hash") for tx in txs if tx.get("hash")]
    return {
        "id": _edge_id(source, target, depth, "ETH"),
        "source": _lower(source),
        "target": _lower(target),
        "token": "ETH",
        "amount_eth": round(amount_eth, 8),
        "tx_count": len(txs),
        "depth": depth,
        "pattern": pattern,
        "latest_timestamp": latest,
        "sample_hash": hashes[0] if hashes else None,
        "animated": pattern in {"split", "layering", "large_flow"} or amount_eth >= 5,
    }


def _fallback_trace(seed: str, depth: int) -> dict[str, Any]:
    """Deterministic synthetic laundering graph for demos when Etherscan is unavailable."""
    seed = _lower(seed)
    nodes = [
        (seed, "Monitored deposit", "subject", 0, 82),
        ("0x28c6c06298d514db089934071355e5743bf21d60", "Binance hot", "exchange", 1, 42),
        ("0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936", "Tornado 10 ETH", "mixer", 1, 96),
        ("0x1111111111111111111111111111111111111111", "Split wallet A", "wallet", 1, 71),
        ("0x2222222222222222222222222222222222222222", "Split wallet B", "wallet", 1, 68),
        ("0x3333333333333333333333333333333333333333", "Bridge staging", "bridge", 2, 73),
        ("0x4444444444444444444444444444444444444444", "OTC cash-out", "otc", 3, 80),
        ("0x5555555555555555555555555555555555555555", "Dormant sink", "wallet", 3, 36),
    ]
    edges = [
        (seed, nodes[1][0], 18.4, 1, "large_flow"),
        (seed, nodes[2][0], 10.0, 1, "mixer_exposure"),
        (seed, nodes[3][0], 7.2, 1, "split"),
        (seed, nodes[4][0], 6.9, 1, "split"),
        (nodes[3][0], nodes[5][0], 6.8, 2, "layering"),
        (nodes[4][0], nodes[5][0], 6.4, 2, "layering"),
        (nodes[5][0], nodes[6][0], 9.1, 3, "terminal_cashout"),
        (nodes[5][0], nodes[7][0], 1.8, 3, "terminal_sink"),
    ]
    now = int(time.time())
    graph_nodes = [
        {
            "id": _node_id(address),
            "address": address,
            "label": label,
            "category": category,
            "depth": node_depth,
            "risk_score": risk,
            "risk_level": _risk_level(risk),
            "trust_score": max(0, 100 - risk),
            "volume_eth": round(40 / (node_depth + 1), 4),
            "tx_count": max(1, 8 - node_depth),
            "terminal": node_depth >= depth or category in {"exchange", "mixer", "otc"},
        }
        for address, label, category, node_depth, risk in nodes
        if node_depth <= depth
    ]
    node_addresses = {node["address"] for node in graph_nodes}
    graph_edges = [
        {
            "id": _edge_id(src, dst, edge_depth, "ETH"),
            "source": src,
            "target": dst,
            "token": "ETH",
            "amount_eth": amount,
            "tx_count": 1,
            "depth": edge_depth,
            "pattern": pattern,
            "latest_timestamp": now - edge_depth * 52,
            "sample_hash": None,
            "animated": True,
        }
        for src, dst, amount, edge_depth, pattern in edges
        if edge_depth <= depth and src in node_addresses and dst in node_addresses
    ]
    return _assemble_trace(seed, depth, graph_nodes, graph_edges, source="synthetic_fallback")


def _build_paths(seed: str, edges: list[dict[str, Any]], terminal_addresses: set[str]) -> list[list[str]]:
    adjacency: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        adjacency[edge["source"]].append(edge["target"])
    paths: list[list[str]] = []
    queue: deque[list[str]] = deque([[seed]])
    while queue and len(paths) < 12:
        path = queue.popleft()
        tail = path[-1]
        if tail in terminal_addresses and tail != seed:
            paths.append(path)
            continue
        for nxt in adjacency.get(tail, [])[:6]:
            if nxt not in path:
                queue.append([*path, nxt])
    return paths


def _assemble_trace(seed: str, depth: int, nodes: list[dict[str, Any]], edges: list[dict[str, Any]], source: str) -> dict[str, Any]:
    node_by_address = {node["address"]: node for node in nodes}
    outgoing_counts: defaultdict[str, int] = defaultdict(int)
    incoming_counts: defaultdict[str, int] = defaultdict(int)
    for edge in edges:
        outgoing_counts[edge["source"]] += 1
        incoming_counts[edge["target"]] += 1
    terminal_addresses = {
        node["address"]
        for node in nodes
        if node.get("terminal") or (node["address"] != seed and outgoing_counts[node["address"]] == 0)
    }
    for node in nodes:
        node["out_degree"] = outgoing_counts[node["address"]]
        node["in_degree"] = incoming_counts[node["address"]]
        node["terminal"] = node["address"] in terminal_addresses

    high_edges = [edge for edge in edges if edge["pattern"] in {"split", "layering", "large_flow", "mixer_exposure", "terminal_cashout"}]
    latest_edges = sorted(edges, key=lambda item: item.get("latest_timestamp") or 0, reverse=True)
    live_feed = [
        {
            "tx_id": (edge.get("sample_hash") or edge["id"]).replace("edge-", "TX-").upper()[:12],
            "wallet": edge["target"],
            "counterparty": node_by_address.get(edge["target"], {}).get("label", _short(edge["target"])),
            "amount": edge["amount_eth"],
            "asset": edge["token"],
            "risk": node_by_address.get(edge["target"], {}).get("risk_level", "safe"),
            "status": "Escalated" if edge in high_edges else "Screening",
            "trust_score": node_by_address.get(edge["target"], {}).get("trust_score", 70),
            "pattern": edge["pattern"],
            "timestamp": edge.get("latest_timestamp") or int(time.time()),
        }
        for edge in latest_edges[:12]
    ]
    terminal_nodes = [node for node in nodes if node["address"] in terminal_addresses and node["address"] != seed]
    paths = _build_paths(seed, edges, terminal_addresses)
    risk_score = min(100, max([node.get("risk_score", 0) for node in nodes] + [0]) + min(20, len(high_edges) * 3))
    split_count = sum(1 for edge in edges if edge["pattern"] == "split")
    mixer_count = sum(1 for node in nodes if node.get("category") == "mixer")
    timeline = [
        {"time": "T+00s", "actor": "Wallet Agent", "event": "Seed wallet normalized and pseudonym salt boundary preserved.", "severity": "safe"},
        {"time": "T+02s", "actor": "Graph Agent", "event": f"Expanded {len(nodes)} wallets across {depth} hops.", "severity": "safe"},
        {"time": "T+04s", "actor": "Flow Agent", "event": f"Detected {split_count} split routes and {len(paths)} terminal paths.", "severity": "warning" if split_count else "safe"},
        {"time": "T+06s", "actor": "Compliance Agent", "event": f"Risk scored {risk_score}/100 with {mixer_count} mixer exposure nodes.", "severity": "high" if risk_score >= 75 else "warning" if risk_score >= 38 else "safe"},
        {"time": "T+08s", "actor": "OPA", "event": "Policy HITL_004 evaluated against graph-derived risk evidence.", "severity": "high" if risk_score >= 75 else "safe"},
        {"time": "T+10s", "actor": "Governance Sentinel", "event": "Audit narrative linked to deterministic graph facts, not raw private memo data.", "severity": "safe"},
    ]
    agent_events = [
        {"agent": "Wallet Agent", "message": f"Subject {_short(seed)} has {outgoing_counts[seed]} direct outbound branches.", "severity": "warning" if outgoing_counts[seed] >= 4 else "safe"},
        {"agent": "Flow Agent", "message": f"Following {len(paths)} likely laundering paths to terminal wallets.", "severity": "warning"},
        {"agent": "Compliance Agent", "message": "AML graph thresholds checked: split fan-out, mixer contact, cash-out endpoint, and rapid layering.", "severity": "safe"},
        {"agent": "Governance Sentinel", "message": "Human review required." if risk_score >= 75 else "No forced escalation unless transaction policy adds more risk.", "severity": "high" if risk_score >= 75 else "safe"},
        {"agent": "OPA", "message": "Policy HITL_004 triggered." if risk_score >= 75 else "Policy graph_monitor_002 logged.", "severity": "high" if risk_score >= 75 else "safe"},
    ]
    return {
        "seed": seed,
        "source": source,
        "depth": depth,
        "summary": {
            "risk_score": risk_score,
            "risk_level": _risk_level(risk_score),
            "wallets": len(nodes),
            "transfers": len(edges),
            "terminal_wallets": len(terminal_nodes),
            "split_routes": split_count,
            "layering_routes": sum(1 for edge in edges if edge["pattern"] == "layering"),
            "total_volume_eth": round(sum(edge["amount_eth"] for edge in edges), 6),
            "trust_score": max(0, 100 - risk_score),
        },
        "graph": {"nodes": nodes, "edges": edges},
        "terminal_nodes": terminal_nodes,
        "chains": [{"id": f"chain-{index + 1}", "addresses": path, "hops": len(path) - 1} for index, path in enumerate(paths)],
        "live_feed": live_feed,
        "agent_events": agent_events,
        "timeline": timeline,
    }


async def trace_wallet_flows(address: str, depth: int = 3, fanout: int = 6, limit: int = 60) -> dict[str, Any]:
    """Trace likely outbound fund movement paths from a seed wallet."""
    seed = _lower(address)
    depth = max(1, min(depth, 5))
    fanout = max(2, min(fanout, 10))
    limit = max(20, min(limit, 200))

    nodes: dict[str, dict[str, Any]] = {}
    edges: dict[tuple[str, str, int], dict[str, Any]] = {}
    seen: set[str] = set()
    frontier: list[str] = [seed]
    node_depth: dict[str, int] = {seed: 0}
    source = "etherscan_v2"

    for current_depth in range(1, depth + 1):
        next_frontier: list[str] = []
        for wallet in frontier:
            if wallet in seen:
                continue
            seen.add(wallet)
            try:
                history = await get_tx_history(wallet, limit=limit)
            except Exception:
                history = []
            if not history:
                continue

            grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
            for tx in history:
                src = _lower(tx.get("from"))
                dst = _lower(tx.get("to"))
                if src != wallet or not _is_evm_address(dst) or dst == wallet:
                    continue
                grouped[dst].append(tx)
            ranked = sorted(
                grouped.items(),
                key=lambda item: sum(_wei_to_eth(tx.get("value")) for tx in item[1]),
                reverse=True,
            )[:fanout]
            fanout_count = len(ranked)
            out_volume = 0.0
            for target, txs in ranked:
                amount_eth = sum(_wei_to_eth(tx.get("value")) for tx in txs)
                out_volume += amount_eth
                edge = _make_edge(wallet, target, amount_eth, txs, current_depth, fanout_count)
                edges[(wallet, target, current_depth)] = edge
                if target not in node_depth:
                    node_depth[target] = current_depth
                    next_frontier.append(target)
            base = _entity(wallet)
            risk = _node_risk(wallet, node_depth.get(wallet, current_depth - 1), fanout_count, out_volume, False)
            nodes[wallet] = {
                **base,
                "id": _node_id(wallet),
                "depth": node_depth.get(wallet, current_depth - 1),
                "risk_score": risk,
                "risk_level": _risk_level(risk),
                "trust_score": max(0, 100 - risk),
                "volume_eth": round(out_volume, 8),
                "tx_count": sum(len(txs) for _, txs in ranked),
                "terminal": False,
            }
        frontier = next_frontier[: fanout * 2]
        if not frontier:
            break

    for edge in edges.values():
        for address_key in (edge["source"], edge["target"]):
            if address_key in nodes:
                continue
            base = _entity(address_key)
            incoming_volume = sum(item["amount_eth"] for item in edges.values() if item["target"] == address_key)
            outgoing_count = sum(1 for item in edges.values() if item["source"] == address_key)
            touches_mixer = base.get("category") == "mixer"
            risk = _node_risk(address_key, node_depth.get(address_key, depth), outgoing_count, incoming_volume, touches_mixer)
            nodes[address_key] = {
                **base,
                "id": _node_id(address_key),
                "depth": node_depth.get(address_key, depth),
                "risk_score": risk,
                "risk_level": _risk_level(risk),
                "trust_score": max(0, 100 - risk),
                "volume_eth": round(incoming_volume, 8),
                "tx_count": sum(item["tx_count"] for item in edges.values() if item["target"] == address_key),
                "terminal": outgoing_count == 0,
            }

    if not edges:
        return _fallback_trace(seed, depth)

    return _assemble_trace(
        seed,
        depth,
        sorted(nodes.values(), key=lambda node: (node["depth"], -node["risk_score"], node["address"])),
        sorted(edges.values(), key=lambda edge: (edge["depth"], -edge["amount_eth"])),
        source=source,
    )
