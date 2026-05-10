import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);
const H = 3600;

export const scenario02: ScenarioScript = {
  id: 'sc-02-structuring',
  title: 'Structuring (smurfing) detected',
  shortLabel: 'Structuring · Escalate',
  difficulty: 'medium',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'file-sar',

  transaction: {
    tx_id: '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567b',
    tx_hash: '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567b',
    wallet_from: '0xSuspect111111111111111111111111111111111a',
    wallet_to: '0xRecipient5000000000000000000000000000aa05',
    amount_eur: 9800,
    token: 'USDC',
    timestamp: NOW,
    risk_level: 'medium',
    risk_pct: 72,
    status: 'escalated',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      { id: 'suspect', address: '0xSuspect111111111111111111111111111111111a', short_address: '0xSus…11a',
        type: 'origin', risk: 'medium', taint: 0, tx_count: 47, age_days: 89,
        entity_label: 'Unverified individual', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'r1', address: '0xRecipient1000000000000000000000000000aa01', short_address: '0xR1…aa01',
        type: 'wallet', risk: 'medium', taint: 0, tx_count: 3, age_days: 12, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'r2', address: '0xRecipient2000000000000000000000000000aa02', short_address: '0xR2…aa02',
        type: 'wallet', risk: 'medium', taint: 0, tx_count: 2, age_days: 11, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'r3', address: '0xRecipient3000000000000000000000000000aa03', short_address: '0xR3…aa03',
        type: 'wallet', risk: 'medium', taint: 0, tx_count: 4, age_days: 9, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'r4', address: '0xRecipient4000000000000000000000000000aa04', short_address: '0xR4…aa04',
        type: 'wallet', risk: 'medium', taint: 0, tx_count: 2, age_days: 8, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'r5', address: '0xRecipient5000000000000000000000000000aa05', short_address: '0xR5…aa05',
        type: 'wallet', risk: 'medium', taint: 0, tx_count: 1, age_days: 5, x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'e1', from: 'suspect', to: 'r1', amount_eur: 9800, timestamp: NOW - 36 * H, tx_hash: '0xe1…' },
      { id: 'e2', from: 'suspect', to: 'r2', amount_eur: 9800, timestamp: NOW - 28 * H, tx_hash: '0xe2…' },
      { id: 'e3', from: 'suspect', to: 'r3', amount_eur: 9800, timestamp: NOW - 19 * H, tx_hash: '0xe3…' },
      { id: 'e4', from: 'suspect', to: 'r4', amount_eur: 9800, timestamp: NOW - 11 * H, tx_hash: '0xe4…' },
      { id: 'e5', from: 'suspect', to: 'r5', amount_eur: 9800, timestamp: NOW - 1 * H,  tx_hash: '0xe5…' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 300,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'active', line: 'Velocity: 18 tx/24h — elevated (limit 5)' } },
    { delayMs: 600,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'warn', line: 'Structuring signal: 5×€9,800 in 36h — CV=0.0%' } },
    { delayMs: 900,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'active', line: 'Origin wallet: unverified, age 89 days' } },
    { delayMs: 1100, type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'All 5 recipients created within 12 days of each other' } },
    { delayMs: 1400, type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'warn', line: 'OPA: POLICY:AML_STRUCT_001 violated — aggregate €49,000' } },
    { delayMs: 1700, type: 'reason-add',  payload: 'Detected 5 outgoing transfers of €9,800 within 36 hours from a single wallet' },
    { delayMs: 1850, type: 'reason-add',  payload: 'Each transfer is 2% below the €10,000 AML reporting threshold — statistically improbable absent intent' },
    { delayMs: 2000, type: 'reason-add',  payload: 'Sum of structured transfers: €49,000 (would have triggered single-transfer reporting if combined)' },
    { delayMs: 2150, type: 'reason-add',  payload: 'Coefficient of variation across amounts: 0.0% — identical sub-threshold values' },
    { delayMs: 2300, type: 'reason-add',  payload: 'Recipient wallets all created within 12 days of each other, no prior interaction with origin' },
    { delayMs: 2450, type: 'reason-add',  payload: 'Originating wallet is unverified (no KYC tier) and only 89 days old' },
    { delayMs: 2600, type: 'confidence-set', payload: 91 },
    { delayMs: 2700, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'warn', line: 'Decision: ESCALATE_HUMAN — structuring pattern confirmed' } },
    { delayMs: 2900, type: 'hitl-show',   payload: {} },
    { delayMs: 3000, type: 'audit-entry', payload: { event: 'Escalated for human review — structuring pattern', severity: 'warn' } },
    { delayMs: 3100, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Detected 5 outgoing transfers of €9,800 within 36 hours from a single wallet',
    'Each transfer is 2% below the €10,000 AML reporting threshold — statistically improbable absent intent',
    'Sum of structured transfers: €49,000 (would have triggered single-transfer reporting if combined)',
    'Coefficient of variation across amounts: 0.0% — identical sub-threshold values signal automation',
    'Recipient wallets all created within 12 days of each other, no prior interaction with origin',
    'Originating wallet is unverified (no KYC tier) and only 89 days old',
  ],
  finalConfidence: 91,
  finalAuditTrail: [
    { ts: NOW - 3, event: 'Transaction received — ingestion layer', severity: 'info', signature: 'SIG-CC3D4E5F', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'Escalated — structuring pattern confirmed', severity: 'warn', signature: 'SIG-DD4E5F6A', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: 'A wallet executed 5 transfers of exactly €9,800 each within 36 hours to 5 newly created recipient wallets. This pattern is consistent with structuring (smurfing) — deliberate fragmentation of large transactions to evade the €10,000 AML reporting threshold under EU AML Directive 6.',
  regulatoryContext: 'Triggers mandatory Suspicious Activity Report (SAR) filing under FATF Recommendation 20. The transaction itself does not exceed the threshold, but the aggregate pattern does. Failure to file is a regulatory violation carrying fines up to 10% of annual turnover.',
  bankAction: 'Compliance team must (1) file SAR with TRACFIN within 48 hours, (2) freeze originating wallet pending investigation, (3) flag all 5 recipient wallets for enhanced monitoring, (4) notify customer of compliance hold per AML 6 Art. 35 without disclosing the SAR (tipping-off prohibition).',
};
