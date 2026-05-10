"""Pure statistical heuristics for AML pattern detection — deterministic, no external calls."""
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

_WEI_PER_ETH = 1e18
_ETH_EUR_APPROX = 3000.0  # rough approximation for heuristics; not used for financials


def _to_eur_approx(value_wei: str) -> float:
    """Convert wei string to approximate EUR for heuristic purposes only."""
    try:
        return float(value_wei) / _WEI_PER_ETH * _ETH_EUR_APPROX
    except (ValueError, TypeError):
        return 0.0


def detect_structuring(
    txs: list[dict],
    threshold_eur: float = 1000.0,
    window_h: int = 48,
) -> float:
    """
    Structuring (smurfing) detection score in [0, 1]. >0.7 = high suspicion.

    Triggers when:
    - >= 3 txs in window
    - All amounts < threshold
    - Sum > threshold
    - CoV < 0.15 (suspiciously similar amounts)
    - Avg amount > threshold * 0.7 (just below threshold)

    Accepts txs with either:
    - "value_eur": float (EUR amount, direct)
    - "value": str (wei amount from Etherscan — converted approximately)
    """
    if len(txs) < 3:
        return 0.0

    # Filter to window
    try:
        timestamps = [int(t.get("timeStamp", 0)) for t in txs]
        now_ts = max(timestamps) if timestamps else 0
    except (ValueError, TypeError):
        return 0.0

    window_s = window_h * 3600
    recent = [
        t for t in txs
        if now_ts - int(t.get("timeStamp", 0)) <= window_s
    ]

    if len(recent) < 3:
        return 0.0

    # Extract amounts
    amounts = []
    for t in recent:
        if "value_eur" in t:
            amounts.append(float(t["value_eur"]))
        else:
            amounts.append(_to_eur_approx(str(t.get("value", "0"))))

    amounts = [a for a in amounts if a > 0]
    if len(amounts) < 3:
        return 0.0

    arr = np.array(amounts)
    total = float(arr.sum())
    avg = float(arr.mean())
    std = float(arr.std()) if len(arr) > 1 else 0.0

    # Conditions
    all_below_threshold = bool(np.all(arr < threshold_eur))
    sum_above_threshold = total > threshold_eur
    cov = std / avg if avg > 0 else 1.0
    similar_amounts = cov < 0.15
    close_to_threshold = avg > threshold_eur * 0.7

    conditions_met = sum([
        all_below_threshold,
        sum_above_threshold,
        similar_amounts,
        close_to_threshold,
    ])

    # Score: 0 if < 3 conditions, scales to 1.0 when all 4 met
    if conditions_met < 3:
        return 0.0
    if conditions_met == 3:
        return 0.65
    return 0.85


def velocity_score(velocity_24h: int) -> float:
    """
    Transaction velocity risk score in [0, 1].

    0-4:   0.0 (normal)
    5-9:   0.2 (low concern)
    10-19: 0.5 (medium concern)
    20-49: 0.8 (high concern)
    50+:   1.0 (critical)
    """
    if velocity_24h <= 4:
        return 0.0
    elif velocity_24h <= 9:
        return 0.2
    elif velocity_24h <= 19:
        return 0.5
    elif velocity_24h <= 49:
        return 0.8
    else:
        return 1.0


def round_amount_bias(txs: list[dict]) -> float:
    """
    Fraction of transactions with suspiciously round ETH amounts.
    High score may indicate automated laundering (e.g., exactly 1.0 ETH repeatedly).
    """
    if not txs:
        return 0.0

    round_count = 0
    for t in txs:
        try:
            val_wei = int(t.get("value", 0))
            # Round if divisible by 0.1 ETH (1e17 wei)
            if val_wei > 0 and val_wei % int(1e17) == 0:
                round_count += 1
        except (ValueError, TypeError):
            continue

    return round_count / len(txs) if txs else 0.0


def is_mixer_behavioral(outputs: list[dict]) -> bool:
    """
    Detect mixer-like behavior: many equal-value outputs within a short window.

    A mixer characteristically sends identical amounts to many different addresses.
    Triggers when: >= 5 outputs with CoV < 0.05.
    """
    if len(outputs) < 5:
        return False

    try:
        amounts = []
        for t in outputs:
            if "value_eur" in t:
                amounts.append(float(t["value_eur"]))
            else:
                amounts.append(_to_eur_approx(str(t.get("value", "0"))))
        amounts = [a for a in amounts if a > 0]
        if len(amounts) < 5:
            return False
        arr = np.array(amounts)
        avg = float(arr.mean())
        std = float(arr.std())
        cov = std / avg if avg > 0 else 1.0
        return cov < 0.05
    except Exception:
        return False


def detect_rapid_chain(
    txs_sorted_by_time: list[dict],
    window_s: int = 1800,
) -> bool:
    """
    Detect rapid-chain (layering) pattern: >= 3 transactions within a 30-minute window.

    Expects txs to be sorted ascending by timeStamp.
    """
    if len(txs_sorted_by_time) < 3:
        return False

    try:
        timestamps = [int(t.get("timeStamp", 0)) for t in txs_sorted_by_time]
    except (ValueError, TypeError):
        return False

    # Sliding window: check if any 3 consecutive txs fit inside window_s
    for i in range(len(timestamps) - 2):
        if timestamps[i + 2] - timestamps[i] <= window_s:
            return True
    return False
