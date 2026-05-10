"""Mandatory unit tests for analysis/heuristics.py — one per heuristic (spec §13)."""
import pytest
from backend.analysis.heuristics import (
    detect_structuring,
    velocity_score,
    is_mixer_behavioral,
    detect_rapid_chain,
)


# ── detect_structuring ────────────────────────────────────────────────────────

def _make_txs(amounts_eur: list[float], base_ts: int = 1715000000, spacing_s: int = 300) -> list[dict]:
    """Helper: build synthetic tx list with EUR amounts and timestamps."""
    return [
        {
            "value_eur": amt,
            "timeStamp": str(base_ts + i * spacing_s),
            "from": "0xaaa",
            "to": "0xbbb",
        }
        for i, amt in enumerate(amounts_eur)
    ]


class TestDetectStructuring:
    def test_classic_structuring_below_threshold(self):
        """5 txs of 850 EUR each → sum 4250, avg 850 > 700, CoV ~0 → HIGH score."""
        txs = _make_txs([850.0, 850.0, 860.0, 840.0, 845.0])
        score = detect_structuring(txs, threshold_eur=1000.0)
        assert score >= 0.7, f"Expected high structuring score, got {score}"

    def test_no_structuring_large_single_tx(self):
        """One large tx over threshold → not structuring."""
        txs = _make_txs([15000.0])
        assert detect_structuring(txs) == 0.0

    def test_no_structuring_too_few_txs(self):
        """Only 2 txs → can't be structuring."""
        txs = _make_txs([900.0, 950.0])
        assert detect_structuring(txs) == 0.0

    def test_no_structuring_high_variance(self):
        """3 txs all below threshold but wildly different amounts → CoV high, not structuring."""
        txs = _make_txs([100.0, 500.0, 950.0])
        score = detect_structuring(txs, threshold_eur=1000.0)
        assert score < 0.7, f"High variance should not trigger structuring, got {score}"

    def test_empty_returns_zero(self):
        assert detect_structuring([]) == 0.0


# ── velocity_score ────────────────────────────────────────────────────────────

class TestVelocityScore:
    def test_low_velocity_no_risk(self):
        assert velocity_score(0) == 0.0
        assert velocity_score(3) == 0.0
        assert velocity_score(4) == 0.0

    def test_moderate_velocity(self):
        assert velocity_score(7) == 0.2

    def test_high_velocity(self):
        score = velocity_score(15)
        assert score == 0.5

    def test_very_high_velocity(self):
        score = velocity_score(25)
        assert score == 0.8

    def test_critical_velocity(self):
        assert velocity_score(50) == 1.0
        assert velocity_score(200) == 1.0


# ── is_mixer_behavioral ────────────────────────────────────────────────────────

class TestIsMixerBehavioral:
    def test_equal_outputs_triggers(self):
        """10 identical-value outputs → mixer pattern."""
        txs = [{"value_eur": 1000.0, "to": f"0x{i:040x}"} for i in range(10)]
        assert is_mixer_behavioral(txs) is True

    def test_varied_outputs_no_trigger(self):
        """Outputs with high variance → not a mixer."""
        txs = [
            {"value_eur": v, "to": f"0x{i:040x}"}
            for i, v in enumerate([100, 2000, 500, 3000, 750, 1500, 200, 800])
        ]
        assert is_mixer_behavioral(txs) is False

    def test_too_few_outputs(self):
        """Less than 5 outputs can't confirm mixer pattern."""
        txs = [{"value_eur": 1000.0, "to": f"0x{i:040x}"} for i in range(4)]
        assert is_mixer_behavioral(txs) is False

    def test_empty_list(self):
        assert is_mixer_behavioral([]) is False


# ── detect_rapid_chain ────────────────────────────────────────────────────────

class TestDetectRapidChain:
    def test_rapid_chain_triggers(self):
        """3 txs within 10 minutes → rapid chain."""
        base = 1715000000
        txs = [
            {"timeStamp": str(base), "value": "1000000000000000000"},
            {"timeStamp": str(base + 300), "value": "1000000000000000000"},
            {"timeStamp": str(base + 600), "value": "1000000000000000000"},
        ]
        assert detect_rapid_chain(txs, window_s=1800) is True

    def test_slow_chain_no_trigger(self):
        """3 txs each 2 hours apart → NOT rapid."""
        base = 1715000000
        txs = [
            {"timeStamp": str(base), "value": "1000000000000000000"},
            {"timeStamp": str(base + 7200), "value": "1000000000000000000"},
            {"timeStamp": str(base + 14400), "value": "1000000000000000000"},
        ]
        assert detect_rapid_chain(txs, window_s=1800) is False

    def test_too_few_txs(self):
        """Only 2 txs → cannot confirm rapid chain."""
        txs = [
            {"timeStamp": "1715000000", "value": "1000000000000000000"},
            {"timeStamp": "1715000001", "value": "1000000000000000000"},
        ]
        assert detect_rapid_chain(txs, window_s=1800) is False

    def test_empty_list(self):
        assert detect_rapid_chain([]) is False
