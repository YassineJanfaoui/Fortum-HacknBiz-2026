# Sentinel Ledger

> Multi-agent AML/fraud-detection governance platform for blockchain transactions,
> with cryptographically verifiable compliance proofs and deterministic AI guardrails.

## Quick Start

### Windows PowerShell

```powershell
cd sentinel-ledger
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd frontend-next
npm install
cd ..
python scripts/generate_secrets.py
# Copy .env.example to .env, paste generated internal secrets, then add GEMINI_API_KEY and ETHERSCAN_API_KEY.
python scripts/build_sanctions.py
powershell -ExecutionPolicy Bypass -File scripts/start_dev.ps1
```

Open `http://127.0.0.1:3000`.

### Manual / Unix-like

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
# Then add GEMINI_API_KEY and ETHERSCAN_API_KEY

# 6. Build sanctions Merkle tree (downloads OFAC SDN ~4MB)
python scripts/build_sanctions.py

# 7. Start backend API
uvicorn backend.api.main:app --reload --port 8000

# 8. Start the professional Next.js dashboard (new terminal)
cd frontend-next
npm install
npm run dev
```

## Clean Generated Files

```powershell
powershell -ExecutionPolicy Bypass -File scripts/clean_generated.ps1
```

This removes local caches, `.next`, the generated SQLite audit database, stray root package locks, and duplicate root-level OPA binaries. It does not delete `.env`, `.venv`, `node_modules`, or source files.

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

## Internal Dashboard

The primary UI is the Next.js dashboard in `frontend-next/`.

Key operator views:
- **Graph Ops**: multi-hop transaction intelligence graph with animated fund movement, split-route markers, terminal endpoints, live feed, agent activity, and governance timeline.
- **Transaction Scan**: full Sentinel pipeline for a bank transfer or crypto deposit event.
- **Audit Ledger**: signed audit records with OPA findings, wallet risk, LLM call count, Merkle root, HMAC signature, HITL controls, and independent proof checks.

Example live wallet scans:

```bash
# Public wallet
curl "http://localhost:8000/wallet/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/intelligence?limit=50"

# High-volume exchange wallet
curl "http://localhost:8000/wallet/0x28C6c06298d514Db089934071355E5743bf21d60/intelligence?limit=50"

# Multi-hop flow trace for the graph dashboard
curl "http://localhost:8000/wallet/0x28C6c06298d514Db089934071355E5743bf21d60/trace?depth=3&fanout=6&limit=60"
```

The Etherscan wrapper uses the current V2 endpoint with `chainid=1`. If the key or network fails, demo transaction analysis still falls back safely, and the graph trace returns a deterministic demo cluster so the dashboard remains usable. Live intelligence is most useful with a valid `ETHERSCAN_API_KEY`.

### 🎤 Pitch Script (1-Minute Demo)

**"Welcome to Sentinel Ledger, the future of AI-driven compliance."**

**[Open the Next.js dashboard at http://localhost:3000]**

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
cd frontend-next && npm run build
```

## Project Structure

See `docs/sentinel_ledger_buildspec.md` §5 for the original build tree.

## OPA on Windows (note)

`make` targets use Unix syntax. On Windows use PowerShell equivalents or install `make` via `winget install GnuWin32.Make` or use Git Bash.
