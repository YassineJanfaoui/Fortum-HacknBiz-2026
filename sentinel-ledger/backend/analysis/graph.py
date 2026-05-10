"""NetworkX-based wallet graph construction, clustering, and taint scoring."""
import logging
from typing import Optional

import networkx as nx

logger = logging.getLogger(__name__)


def build_2hop_graph(tx_history: list[dict], seed: str) -> nx.DiGraph:
    """
    Build a directed transaction graph from wallet tx history.

    Nodes: wallet addresses (lowercase)
    Edges: transactions (weight=value_wei, timestamp attribute)
    Covers up to 2 hops from the seed wallet.
    """
    g = nx.DiGraph()
    seed_lower = seed.lower()

    # 1-hop: direct transactions involving seed
    hop1_addresses: set[str] = {seed_lower}

    for tx in tx_history:
        src = tx.get("from", "").lower()
        dst = tx.get("to", "").lower()
        if not src or not dst:
            continue

        try:
            value = int(tx.get("value", 0))
            ts = int(tx.get("timeStamp", 0))
        except (ValueError, TypeError):
            value, ts = 0, 0

        if src == seed_lower or dst == seed_lower:
            g.add_edge(src, dst, weight=value, timestamp=ts)
            hop1_addresses.add(src)
            hop1_addresses.add(dst)

    # 2-hop: seed the second ring (we only have seed's tx history so this is approximate)
    # For a full 2-hop we'd need to fetch tx history for hop1_addresses too.
    # In Phase 2 we build from what we have; deeper analysis deferred.

    logger.debug("Graph built: %d nodes, %d edges for seed %s", g.number_of_nodes(), g.number_of_edges(), seed[:12])
    return g


def cluster_id(graph: nx.DiGraph, wallet: str) -> str:
    """
    Return a stable cluster identifier for the wallet based on weak connected component.
    Approximation for hackathon: just the index of the WCC the wallet belongs to.
    """
    if not graph.has_node(wallet.lower()):
        return f"solo_{wallet[:8].lower()}"

    undirected = graph.to_undirected()
    for i, component in enumerate(nx.weakly_connected_components(graph)):
        if wallet.lower() in component:
            # Use the lexicographically smallest node in the cluster as stable ID
            rep = min(component)
            return f"cluster_{rep[:8]}"

    return f"solo_{wallet[:8].lower()}"


def taint_score_haircut(
    graph: nx.DiGraph,
    target: str,
    flagged: set[str],
    max_hops: int = 5,
) -> float:
    """
    Haircut-model taint score: propagate taint from flagged nodes upstream.

    Returns a score in [0, 1] representing how much of the target's incoming
    value is traceable to flagged addresses.
    """
    if not flagged or not graph.has_node(target.lower()):
        return 0.0

    target_lower = target.lower()
    flagged_lower = {f.lower() for f in flagged if graph.has_node(f.lower())}
    
    if not flagged_lower:
        return 0.0

    if target_lower in flagged_lower:
        return 1.0

    # BFS from target going backwards (predecessors) up to max_hops
    taint_map: dict[str, float] = {f: 1.0 for f in flagged_lower}
    visited: set[str] = set(flagged_lower)

    frontier = list(flagged_lower)
    for _hop in range(max_hops):
        next_frontier = []
        for node in frontier:
            for successor in graph.successors(node):
                if successor not in visited:
                    # Propagate taint proportionally by value
                    total_out = sum(
                        data.get("weight", 1)
                        for _, _, data in graph.out_edges(node, data=True)
                    )
                    if total_out == 0:
                        continue
                    edge_data = graph.get_edge_data(node, successor, default={})
                    edge_weight = edge_data.get("weight", 1)
                    propagated = taint_map.get(node, 0.0) * (edge_weight / total_out)
                    taint_map[successor] = min(1.0, taint_map.get(successor, 0.0) + propagated)
                    visited.add(successor)
                    next_frontier.append(successor)
        frontier = next_frontier
        if not frontier:
            break

    return round(min(1.0, taint_map.get(target_lower, 0.0)), 4)


def chain_depth(
    graph: nx.DiGraph,
    seed: str,
    time_window_seconds: int = 1800,
) -> int:
    """
    Count transactions involving the seed within a short time window.
    Higher depth = more rapid chaining = higher layering suspicion.
    """
    seed_lower = seed.lower()
    if not graph.has_node(seed_lower):
        return 0

    edges = list(graph.in_edges(seed_lower, data=True)) + list(graph.out_edges(seed_lower, data=True))
    if not edges:
        return 0

    timestamps = [d.get("timestamp", 0) for _, _, d in edges]
    if not timestamps:
        return 0

    max_ts = max(timestamps)
    in_window = [ts for ts in timestamps if max_ts - ts <= time_window_seconds]
    return len(in_window)


def mixer_proximity_hops(
    graph: nx.DiGraph,
    target: str,
    known_mixers: set[str],
) -> Optional[int]:
    """
    Return the shortest path length from target to any known mixer, or None.
    """
    if not known_mixers or not graph.has_node(target.lower()):
        return None

    undirected = graph.to_undirected()
    best: Optional[int] = None
    for mixer in known_mixers:
        mixer_lower = mixer.lower()
        if not undirected.has_node(mixer_lower):
            continue
        try:
            length = nx.shortest_path_length(undirected, target.lower(), mixer_lower)
            if best is None or length < best:
                best = length
        except nx.NetworkXNoPath:
            continue

    return best
