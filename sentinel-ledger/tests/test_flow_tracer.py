"""Multi-hop wallet flow tracing tests."""
import pytest

from backend.analysis.flow_tracer import trace_wallet_flows


SEED = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
HOP1_A = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
HOP1_B = "0xcccccccccccccccccccccccccccccccccccccccc"
HOP2 = "0xdddddddddddddddddddddddddddddddddddddddd"
HOP3 = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"


def _tx(src: str, dst: str, eth: int, hash_id: str, ts: int = 1715000000) -> dict:
    return {
        "hash": hash_id,
        "from": src,
        "to": dst,
        "value": str(eth * 10**18),
        "timeStamp": str(ts),
        "isError": "0",
    }


@pytest.mark.asyncio
async def test_trace_wallet_flows_expands_multiple_hops(monkeypatch):
    async def mock_history(wallet: str, limit: int = 60):
        wallet = wallet.lower()
        return {
            SEED: [
                _tx(SEED, HOP1_A, 10, "0x1"),
                _tx(SEED, HOP1_B, 8, "0x2"),
            ],
            HOP1_A: [_tx(HOP1_A, HOP2, 7, "0x3")],
            HOP1_B: [_tx(HOP1_B, HOP2, 6, "0x4")],
            HOP2: [_tx(HOP2, HOP3, 5, "0x5")],
            HOP3: [],
        }.get(wallet, [])

    monkeypatch.setattr("backend.analysis.flow_tracer.get_tx_history", mock_history)

    report = await trace_wallet_flows(SEED, depth=3, fanout=4, limit=40)

    assert report["summary"]["wallets"] == 5
    assert report["summary"]["transfers"] == 5
    assert report["summary"]["terminal_wallets"] >= 1
    assert any(edge["depth"] == 3 for edge in report["graph"]["edges"])
    assert any(HOP3 in chain["addresses"] for chain in report["chains"])
    assert report["live_feed"]
    assert report["agent_events"]
    assert report["timeline"]


@pytest.mark.asyncio
async def test_trace_wallet_flows_returns_demo_graph_when_no_edges(monkeypatch):
    async def mock_history(wallet: str, limit: int = 60):
        return []

    monkeypatch.setattr("backend.analysis.flow_tracer.get_tx_history", mock_history)

    report = await trace_wallet_flows(SEED, depth=2, fanout=4, limit=40)

    assert report["source"] == "synthetic_fallback"
    assert report["summary"]["wallets"] > 1
    assert report["graph"]["edges"]
