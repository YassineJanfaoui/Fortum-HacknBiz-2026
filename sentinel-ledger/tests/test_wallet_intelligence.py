"""Wallet intelligence aggregation tests."""
import pytest

from backend.analysis.wallet_intelligence import scan_wallet


@pytest.mark.asyncio
async def test_scan_wallet_builds_counterparty_graph(monkeypatch):
    async def mock_history(wallet: str, limit: int = 250):
        return [
            {
                "hash": "0x1",
                "from": "0x1111111111111111111111111111111111111111",
                "to": wallet,
                "value": str(2 * 10**18),
                "timeStamp": "1715000000",
                "gasUsed": "21000",
                "gasPrice": "1000000000",
                "isError": "0",
            },
            {
                "hash": "0x2",
                "from": wallet,
                "to": "0x2222222222222222222222222222222222222222",
                "value": str(5 * 10**17),
                "timeStamp": "1715000300",
                "gasUsed": "21000",
                "gasPrice": "1000000000",
                "isError": "0",
            },
        ]

    async def mock_tokens(wallet: str, limit: int = 250):
        return [
            {
                "hash": "0xt",
                "from": wallet,
                "to": "0x3333333333333333333333333333333333333333",
                "value": "1000000",
                "tokenDecimal": "6",
                "tokenSymbol": "USDC",
                "timeStamp": "1715000600",
            }
        ]

    async def mock_internal(wallet: str, limit: int = 250):
        return []

    async def mock_sanctions(wallet: str):
        return False

    async def mock_goplus(wallet: str):
        return {"is_malicious": False, "risk_score": 0.0, "tags": []}

    monkeypatch.setattr("backend.analysis.wallet_intelligence.get_tx_history", mock_history)
    monkeypatch.setattr("backend.analysis.wallet_intelligence.get_token_transfers", mock_tokens)
    monkeypatch.setattr("backend.analysis.wallet_intelligence.get_internal_transactions", mock_internal)
    monkeypatch.setattr("backend.analysis.wallet_intelligence.is_sanctioned", mock_sanctions)
    monkeypatch.setattr("backend.analysis.wallet_intelligence.address_risk", mock_goplus)

    report = await scan_wallet("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", limit=100)

    assert report["summary"]["total_in_eth"] == 2
    assert report["summary"]["total_out_eth"] == 0.5
    assert report["summary"]["unique_counterparties"] == 3
    assert report["stablecoin_flow"]["USDC"]["out"] == 1
    assert len(report["graph"]["nodes"]) >= 4
    assert len(report["graph"]["edges"]) >= 3
