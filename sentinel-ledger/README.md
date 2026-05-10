# Sentinel Ledger

> Multi-agent AML/fraud-detection governance platform for blockchain transactions,
> with cryptographically verifiable compliance proofs and deterministic AI guardrails.

## Quick Start

```bash
# 1. Clone and enter repo
cd sentinel-ledger

# 2. Create virtual env (recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# 3. Install Python deps
pip install -r requirements.txt

# 4. Install OPA
# Mac:   brew install opa
# Linux: apt install opa
# Windows: winget install OPA.OPA
#   OR download from https://www.openpolicyagent.org/docs/latest/#running-opa

# 5. Copy and fill in secrets
cp .env.example .env
python scripts/generate_secrets.py  # prints generated secrets — paste into .env
# Then add ANTHROPIC_API_KEY and ETHERSCAN_API_KEY

# 6. Build sanctions Merkle tree (downloads OFAC SDN ~4MB)
python scripts/build_sanctions.py

# 7. Start backend API
uvicorn backend.api.main:app --reload --port 8000

# 8. Start frontend (new terminal)
streamlit run frontend/app.py --server.port 8501
```

## Demo Scenarios

```bash
# Scenario 1 — Clean transaction → AUTO_APPROVE
make demo-clean
# (Windows PowerShell alternative)
# Invoke-RestMethod -Uri http://localhost:8000/analyze -Method Post -ContentType "application/json" -Body (Get-Content demos/tx_clean.json -Raw)

# Scenario 2 — Suspicious transaction → ESCALATE_HUMAN
make demo-suspicious

# Scenario 3 — Prompt injection attack → BLOCK_INJECTION
make demo-injection
```

### 🎤 Pitch Script (1-Minute Demo)

**"Welcome to Sentinel Ledger, the future of AI-driven compliance."**

**[Click 'Run Full Demo' in Sidebar]**

1. **"First, we process a standard transaction."**
   * *(Clean Tx runs)*
   * "Our pipeline evaluates heuristics, checks sanctions via cryptographic proofs, and uses Gemini AI to assess behavioral risk. Because it's a routine payment, the deterministic Governance Sentinel auto-approves it instantly. No human needed."

2. **"Next, a suspicious invoice payment."**
   * *(Suspicious Tx runs)*
   * "Here, the transaction hits a high velocity and structuring triggers. The AI flags anomalous behavior, but more importantly, our Open Policy Agent (OPA) strictly flags it for exceeding AML thresholds. The Sentinel safely escalates it for human review. In the Evidence Explorer, a compliance officer sees a concise, AI-generated summary that separates fact from noise."

3. **"Finally, a malicious attack."**
   * *(Injection Tx runs)*
   * "Bad actors will try to trick AI by injecting commands like 'Ignore all AML rules'. But our architecture is built for defense. The injection guard catches the payload before the LLM even sees the raw instructions. The transaction is instantly blocked, and a tamper-proof audit record is cryptographically signed into the ledger."

**[Navigate to Verifier Page]**
"And the best part? Every decision is mathematically verifiable. Regulators or auditors can re-run the HMAC chain and verify the Merkle non-inclusion proofs. We don't just ask them to trust the AI — we prove it with math."

## Architecture

Six agents in a LangGraph pipeline → one deterministic Governance Sentinel decides:

```
TxIntelligence → WalletReputation → ZKCompliance → CompliancePolicy → Explainability → GovernanceSentinel → Audit
```

**Defendable claims:**
- Every decision is bounded by a deterministic state machine, not an LLM.
- Sanctions screening produces a verifiable Merkle non-inclusion proof — judges can verify it themselves.
- The pipeline detects contradictions between deterministic policy and LLM signals — that's our injection defense.
- Pseudonymization uses per-transaction HKDF-derived salts, not a global static salt.

## Running Tests

```bash
pytest tests/ -v
```

## Project Structure

See `sentinel_ledger_buildspec.md` §5 for the full tree.

## OPA on Windows (note)

`make` targets use Unix syntax. On Windows use PowerShell equivalents or install `make` via `winget install GnuWin32.Make` or use Git Bash.
