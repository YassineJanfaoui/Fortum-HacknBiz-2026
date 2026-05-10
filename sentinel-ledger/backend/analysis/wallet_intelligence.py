"""Wallet-level blockchain intelligence for internal fraud investigations."""
from __future__ import annotations

import asyncio
import math
import time
from collections import Counter, defaultdict
from typing import Any

from backend.analysis.chainalysis import is_sanctioned
from backend.analysis.etherscan import get_internal_transactions, get_token_transfers, get_tx_history
from backend.analysis.goplus import address_risk
from backend.analysis.heuristics import detect_rapid_chain, detect_structuring, is_mixer_behavioral

WEI_PER_ETH = 10**18

KNOWN_ENTITY_LABELS: dict[str, dict[str, str]] = {
    "0xd8da6bf26964af9d7eed9e03e53415d37aa96045": {"label": "vitalik.eth", "category": "public_wallet"},
    "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae": {"label": "Ethereum Foundation", "category": "foundation"},
    "0x28c6c06298d514db089934071355e5743bf21d60": {"label": "Binance 14", "category": "exchange"},
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": {"label": "Binance 15", "category": "exchange"},
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": {"label": "Binance 16", "category": "exchange"},
    "0x3f5ce5fbfe3e9af3971d2d3fd1b10b8f88d595ad": {"label": "Binance cold wallet", "category": "exchange"},
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": {"label": "Binance 7", "category": "exchange"},
    "0xa910f92acdaf488fa6ef02174fb86208ad7722ba": {"label": "Kraken 13", "category": "exchange"},
    "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": {"label": "Kraken 4", "category": "exchange"},
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": {"label": "Tornado Cash 0.1 ETH", "category": "mixer"},
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": {"label": "Tornado Cash 1 ETH", "category": "mixer"},
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": {"label": "Tornado Cash 10 ETH", "category": "mixer"},
}


def _lower(value: str | None) -> str:
    return (value or "").lower()


def _wei_to_eth(value: Any) -> float:
    try:
        return int(value or 0) / WEI_PER_ETH
    except (TypeError, ValueError):
        return 0.0


def _token_amount(raw_value: Any, decimals: Any) -> float:
    try:
        return int(raw_value or 0) / (10 ** int(decimals or 0))
    except (TypeError, ValueError, OverflowError):
        return 0.0


def _entity(address: str) -> dict[str, str]:
    address_lower = _lower(address)
    known = KNOWN_ENTITY_LABELS.get(address_lower)
    if known:
        return {"address": address_lower, **known}
    return {"address": address_lower, "label": f"{address_lower[:8]}...{address_lower[-6:]}", "category": "unlabeled"}


def _risk_score(*, sanctions: bool, goplus: dict[str, Any], structuring: float, mixer_pattern: bool, rapid: bool, counterparties: int) -> int:
    score = 0
    if sanctions:
        score += 90
    if goplus.get("is_malicious"):
        score += 45
    score += int(min(25, structuring * 25))
    if mixer_pattern:
        score += 25
    if rapid:
        score += 15
    if counterparties > 25:
        score += 10
    return min(100, score)


def _edge_key(src: str, dst: str, token: str) -> tuple[str, str, str]:
    return (_lower(src), _lower(dst), token.upper())


async def scan_wallet(wallet: str, limit: int = 250) -> dict[str, Any]:
    """Build an Arkham-style wallet intelligence view from Etherscan account APIs."""
    wallet_lower = _lower(wallet)
    limit = max(25, min(limit, 1000))

    normal_result, token_result, internal_result, sanctions_result, goplus_result = await asyncio.gather(
        get_tx_history(wallet, limit=limit),
        get_token_transfers(wallet, limit=limit),
        get_internal_transactions(wallet, limit=min(limit, 250)),
        is_sanctioned(wallet),
        address_risk(wallet),
        return_exceptions=True,
    )

    normal_txs = normal_result if isinstance(normal_result, list) else []
    token_txs = token_result if isinstance(token_result, list) else []
    internal_txs = internal_result if isinstance(internal_result, list) else []
    sanctions = bool(sanctions_result) if not isinstance(sanctions_result, Exception) else False
    goplus = goplus_result if isinstance(goplus_result, dict) else {"is_malicious": False, "risk_score": 0.0, "tags": []}

    counterparties: Counter[str] = Counter()
    counterparty_volume: defaultdict[str, float] = defaultdict(float)
    edge_volume: defaultdict[tuple[str, str, str], float] = defaultdict(float)
    token_flow: defaultdict[str, dict[str, float]] = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    timestamps: list[int] = []
    gas_spend_eth = 0.0
    total_in_eth = 0.0
    total_out_eth = 0.0
    largest_tx_eth = 0.0

    for tx in normal_txs:
        src = _lower(tx.get("from"))
        dst = _lower(tx.get("to"))
        if not src or not dst:
            continue
        value_eth = _wei_to_eth(tx.get("value"))
        largest_tx_eth = max(largest_tx_eth, value_eth)
        try:
            timestamps.append(int(tx.get("timeStamp", 0)))
        except (TypeError, ValueError):
            pass

        if src == wallet_lower:
            total_out_eth += value_eth
            counterparties[dst] += 1
            counterparty_volume[dst] += value_eth
            gas_spend_eth += _wei_to_eth(int(tx.get("gasUsed", 0) or 0) * int(tx.get("gasPrice", 0) or 0))
        elif dst == wallet_lower:
            total_in_eth += value_eth
            counterparties[src] += 1
            counterparty_volume[src] += value_eth

        edge_volume[_edge_key(src, dst, "ETH")] += value_eth

    for tx in internal_txs:
        src = _lower(tx.get("from"))
        dst = _lower(tx.get("to"))
        if src and dst:
            edge_volume[_edge_key(src, dst, "ETH_INTERNAL")] += _wei_to_eth(tx.get("value"))

    for tx in token_txs:
        src = _lower(tx.get("from"))
        dst = _lower(tx.get("to"))
        symbol = str(tx.get("tokenSymbol") or "TOKEN").upper()[:16]
        amount = _token_amount(tx.get("value"), tx.get("tokenDecimal"))
        if src == wallet_lower:
            token_flow[symbol]["out"] += amount
            counterparties[dst] += 1
        elif dst == wallet_lower:
            token_flow[symbol]["in"] += amount
            counterparties[src] += 1
        if src and dst:
            edge_volume[_edge_key(src, dst, symbol)] += amount
        try:
            timestamps.append(int(tx.get("timeStamp", 0)))
        except (TypeError, ValueError):
            pass

    timestamps = sorted({ts for ts in timestamps if ts > 0})
    now = int(time.time())
    recent_24h = sum(1 for ts in timestamps if now - ts <= 86400)
    active_days = max(1, math.ceil((timestamps[-1] - timestamps[0]) / 86400)) if len(timestamps) >= 2 else 1
    tx_per_day = round((len(normal_txs) + len(token_txs)) / active_days, 2)

    structuring = detect_structuring(normal_txs)
    mixer_pattern = is_mixer_behavioral(normal_txs[:40])
    rapid = detect_rapid_chain(sorted(normal_txs, key=lambda t: int(t.get("timeStamp", 0) or 0)))
    score = _risk_score(
        sanctions=sanctions,
        goplus=goplus,
        structuring=structuring,
        mixer_pattern=mixer_pattern,
        rapid=rapid,
        counterparties=len(counterparties),
    )

    reasons: list[str] = []
    if sanctions:
        reasons.append("Sanctions screening returned a positive match.")
    if goplus.get("is_malicious"):
        reasons.append("GoPlus returned malicious address indicators.")
    if structuring >= 0.65:
        reasons.append("Repeated near-threshold transfers suggest structuring.")
    if mixer_pattern:
        reasons.append("Repeated uniform outgoing transfers resemble mixer behavior.")
    if rapid:
        reasons.append("Rapid sequential transfers suggest layering.")
    if len(counterparties) > 25:
        reasons.append("High counterparty breadth for the requested window.")
    if not reasons:
        reasons.append("No critical deterministic fraud indicators in the fetched window.")

    top_counterparties = [
        {
            **_entity(address),
            "tx_count": count,
            "volume_eth": round(counterparty_volume[address], 6),
        }
        for address, count in counterparties.most_common(12)
    ]

    nodes_by_address: dict[str, dict[str, Any]] = {
        wallet_lower: {**_entity(wallet_lower), "role": "subject", "tx_count": len(normal_txs) + len(token_txs), "volume_eth": round(total_in_eth + total_out_eth, 6)}
    }
    for cp in top_counterparties:
        nodes_by_address[cp["address"]] = {**cp, "role": "counterparty"}

    edges = []
    for (src, dst, token), amount in sorted(edge_volume.items(), key=lambda item: item[1], reverse=True)[:80]:
        if src not in nodes_by_address and dst not in nodes_by_address:
            continue
        nodes_by_address.setdefault(src, {**_entity(src), "role": "expanded", "tx_count": 0, "volume_eth": 0})
        nodes_by_address.setdefault(dst, {**_entity(dst), "role": "expanded", "tx_count": 0, "volume_eth": 0})
        edges.append({"source": src, "target": dst, "token": token, "amount": round(amount, 6)})

    stablecoins = {symbol: flow for symbol, flow in token_flow.items() if symbol in {"USDT", "USDC", "DAI", "PYUSD", "USDE"}}
    graph = {"nodes": list(nodes_by_address.values())[:40], "edges": edges[:80]}

    return {
        "wallet": wallet_lower,
        "entity": _entity(wallet_lower),
        "source": "etherscan_v2",
        "fetched": {
            "normal_transactions": len(normal_txs),
            "token_transfers": len(token_txs),
            "internal_transactions": len(internal_txs),
            "window_limit": limit,
        },
        "summary": {
            "risk_score": score,
            "risk_level": "critical" if score >= 85 else "high" if score >= 60 else "medium" if score >= 30 else "low",
            "total_in_eth": round(total_in_eth, 6),
            "total_out_eth": round(total_out_eth, 6),
            "net_flow_eth": round(total_in_eth - total_out_eth, 6),
            "largest_tx_eth": round(largest_tx_eth, 6),
            "gas_spend_eth": round(gas_spend_eth, 6),
            "unique_counterparties": len(counterparties),
            "recent_24h_count": recent_24h,
            "tx_per_day": tx_per_day,
            "first_seen": timestamps[0] if timestamps else None,
            "last_seen": timestamps[-1] if timestamps else None,
        },
        "risk_indicators": {
            "sanctions_match": sanctions,
            "goplus": goplus,
            "structuring_score": round(structuring, 3),
            "mixer_behavior": mixer_pattern,
            "rapid_chain": rapid,
            "reasons": reasons,
        },
        "stablecoin_flow": stablecoins,
        "top_counterparties": top_counterparties,
        "graph": graph,
        "recent_transactions": [
            {
                "hash": tx.get("hash"),
                "from": _lower(tx.get("from")),
                "to": _lower(tx.get("to")),
                "value_eth": round(_wei_to_eth(tx.get("value")), 6),
                "timestamp": int(tx.get("timeStamp", 0) or 0),
                "method": tx.get("functionName") or tx.get("methodId") or "transfer",
                "is_error": tx.get("isError") == "1",
            }
            for tx in normal_txs[:25]
        ],
    }
