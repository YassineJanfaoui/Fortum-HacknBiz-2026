import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);

export const scenario01: ScenarioScript = {
  id: 'sc-01-clean-salary',
  title: 'Clean salary payment',
  shortLabel: 'Salary · Auto-approve',
  difficulty: 'low',
  expectedDecision: 'AUTO_APPROVE',
  hitlAction: 'none',

  transaction: {
    tx_id: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    tx_hash: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    wallet_from: '0xAcmeCorp4f8e2c1a9b7d6c5e4a3f2b1c0d9e8f7a',
    wallet_to: '0xEmpRet1234567890abcdef1234567890abcdef12',
    amount_eur: 4200,
    token: 'EURC',
    timestamp: NOW,
    risk_level: 'low',
    risk_pct: 4,
    status: 'approved',
    governance_decision: 'AUTO_APPROVE',
  },

  subgraph: {
    nodes: [
      { id: 'origin', address: '0xAcmeCorp4f8e2c1a9b7d6c5e4a3f2b1c0d9e8f7a', short_address: '0xAcme…f7a',
        type: 'origin', risk: 'low', taint: 0, tx_count: 8421, age_days: 1247,
        entity_label: 'Acme Corp Treasury', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'dest', address: '0xEmpRet1234567890abcdef1234567890abcdef12', short_address: '0xEmp…ef12',
        type: 'wallet', risk: 'low', taint: 0, tx_count: 142, age_days: 412,
        entity_label: 'Employee Retail Wallet', x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'e1', from: 'origin', to: 'dest', amount_eur: 4200, timestamp: NOW, tx_hash: '0xa1b2…3456' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 200,  type: 'audit-entry', payload: { event: 'PII pseudonymized — wallet hashed with HKDF', severity: 'info' } },
    { delayMs: 400,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'active', line: 'Velocity: 2/24h (limit 5) — within threshold' } },
    { delayMs: 600,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'active', line: 'Amount: €4,200 — below AML reporting threshold' } },
    { delayMs: 900,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'active', line: 'Origin: Acme Corp Treasury (verified entity, age 3.4y)' } },
    { delayMs: 1100, type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'active', line: 'Mixer exposure: 0%. No sanctions matches.' } },
    { delayMs: 1400, type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'active', line: 'OPA evaluation: 0 violations. allow=true.' } },
    { delayMs: 1700, type: 'agent-line',  payload: { agent: 'Explainability', state: 'active', line: 'Generating compliance narrative…' } },
    { delayMs: 1900, type: 'reason-add',  payload: 'Originating wallet verified as Acme Corp Treasury (KYC tier 3)' },
    { delayMs: 2000, type: 'reason-add',  payload: 'Recipient wallet has 412-day clean transaction history' },
    { delayMs: 2100, type: 'reason-add',  payload: 'Matches recurring salary payment pattern (8 prior transfers)' },
    { delayMs: 2200, type: 'reason-add',  payload: 'No anomalies in velocity, amount, or counterparty profile' },
    { delayMs: 2300, type: 'confidence-set', payload: 96 },
    { delayMs: 2400, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'active', line: 'Decision: AUTO_APPROVE. Confidence: 96%. No HITL required.' } },
    { delayMs: 2600, type: 'audit-entry', payload: { event: 'Auto-approved — POLICY:ALLOW_001 satisfied', severity: 'success' } },
    { delayMs: 2700, type: 'agent-line',  payload: { agent: 'Audit Agent', state: 'active', line: 'Record signed (HMAC-SHA256). Hash chain extended.' } },
    { delayMs: 2900, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Originating wallet verified as Acme Corp Treasury (KYC tier 3)',
    'Recipient wallet has 412-day clean transaction history',
    'Matches recurring salary payment pattern (8 prior identical transfers)',
    'No anomalies in velocity, amount, or counterparty profile',
    'Both jurisdictions (FR → FR) within EU regulatory perimeter',
  ],
  finalConfidence: 96,
  finalAuditTrail: [
    { ts: NOW - 3, event: 'Transaction received — ingestion layer', severity: 'info', signature: 'SIG-AA1B2C3D', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 2, event: 'Auto-approved — POLICY:ALLOW_001 satisfied', severity: 'success', signature: 'SIG-BB2C3D4E', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: 'Routine salary payment from Acme Corp to a verified retail employee wallet. All risk indicators normal. Full multi-agent analysis completed in 2.9 seconds and auto-approved without human review.',
  regulatoryContext: 'Standard processing under EU AML 6th Directive. No reporting obligations triggered. GDPR pseudonymization applied at ingestion per DORA Article 9.',
  bankAction: 'Transaction settled immediately. Audit record retained per DORA 7-year requirement. Customer notified via standard payment confirmation.',
};
