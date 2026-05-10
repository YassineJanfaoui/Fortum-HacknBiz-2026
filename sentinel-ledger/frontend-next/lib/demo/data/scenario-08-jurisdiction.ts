import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);

export const scenario08: ScenarioScript = {
  id: 'sc-08-jurisdiction',
  title: 'High-risk jurisdiction — North Korea (DPRK)',
  shortLabel: 'DPRK Jurisdiction · Freeze',
  difficulty: 'critical',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'freeze',

  transaction: {
    tx_id: '0xb8c9d0e1f2345678901234567890abcdef1234567890abcdef1234567890abcd',
    tx_hash: '0xb8c9d0e1f2345678901234567890abcdef1234567890abcdef1234567890abcd',
    wallet_from: '0xDPRKRelated000000000000000000000000dprk1',
    wallet_to: '0xNordaClient000000000000000000000000004f8e',
    amount_eur: 85000,
    token: 'ETH',
    timestamp: NOW,
    risk_level: 'critical',
    risk_pct: 97,
    status: 'escalated',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      { id: 'dprk', address: '0xDPRKRelated000000000000000000000000dprk1', short_address: '0xDPRK…prk1',
        type: 'sanctioned', risk: 'critical', taint: 97, tx_count: 31, age_days: 201,
        entity_label: '⊗ DPRK-linked wallet (KP jurisdiction)', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'client', address: '0xNordaClient000000000000000000000000004f8e', short_address: '0xNOR…4f8e',
        type: 'wallet', risk: 'low', taint: 0, tx_count: 342, age_days: 891,
        entity_label: 'NORDA Client Account', x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'e1', from: 'dprk', to: 'client', amount_eur: 85000, timestamp: NOW, tx_hash: '0xb8c9…abcd' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 300,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'warn', line: 'Jurisdiction check: origin KP (North Korea) — sanctioned state' } },
    { delayMs: 600,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'blocked', line: '⊗ DPRK-linked wallet: EU Regulation 2017/1509 applies' } },
    { delayMs: 900,  type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'blocked', line: 'OPA: BLOCK_JURISDICTION — DPRK comprehensive sanctions' } },
    { delayMs: 1200, type: 'reason-add',  payload: 'Originating jurisdiction: North Korea (KP) — sanctioned under EU Regulation 2017/1509' },
    { delayMs: 1350, type: 'reason-add',  payload: 'EU comprehensive sanctions prohibit financial dealings with DPRK persons or entities' },
    { delayMs: 1500, type: 'reason-add',  payload: 'Even in absence of specific entity match, jurisdictional sanctions apply' },
    { delayMs: 1650, type: 'reason-add',  payload: 'Customer profile shows no prior history of KP-related transactions — anomaly flagged' },
    { delayMs: 1800, type: 'reason-add',  payload: 'Mandatory Enhanced Due Diligence: customer KYC re-verification + senior management approval required' },
    { delayMs: 2000, type: 'confidence-set', payload: 97 },
    { delayMs: 2100, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'blocked', line: 'Decision: ESCALATE_HUMAN — DPRK jurisdiction, funds held pending EDD' } },
    { delayMs: 2300, type: 'freeze-account', payload: { accountId: '0xNOR…4f8e', amount: 85000, token: 'ETH', reason: 'DPRK-linked incoming transfer', authority: 'EU Reg 2017/1509', caseId: 'NORDA-CASE-2026-04830' } },
    { delayMs: 2500, type: 'hitl-show',   payload: {} },
    { delayMs: 2600, type: 'audit-entry', payload: { event: 'Funds held — DPRK comprehensive sanctions', severity: 'danger' } },
    { delayMs: 2700, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Originating jurisdiction: North Korea (KP) — sanctioned under EU Regulation 2017/1509',
    'EU comprehensive sanctions prohibit all financial dealings with DPRK persons or entities',
    'Even without a specific entity SDN match, jurisdictional sanctions apply to all KP-sourced funds',
    'Customer profile shows no prior history of KP-related transactions — out-of-pattern activity',
    'Mandatory Enhanced Due Diligence: KYC re-verification + senior management approval required before release',
  ],
  finalConfidence: 97,
  finalAuditTrail: [
    { ts: NOW - 2, event: 'DPRK jurisdiction confirmed', severity: 'danger', signature: 'SIG-PP6E7F8A', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'Funds held — EU Reg 2017/1509', severity: 'danger', signature: 'SIG-QQ7F8A9B', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: '€85,000 ETH incoming from a DPRK-linked wallet triggered comprehensive jurisdiction sanctions under EU Regulation 2017/1509. The funds are held pending Enhanced Due Diligence — even without a specific entity match on the SDN list, North Korean jurisdiction alone mandates a freeze.',
  regulatoryContext: 'EU Council Regulation 2017/1509 (DPRK sanctions) imposes comprehensive restrictions on all financial transfers to/from North Korea. NORDA must hold the funds, initiate EDD, obtain senior management authorization, and report to the competent authority within 5 days.',
  bankAction: 'Hold incoming funds. Open EDD case NORDA-CASE-2026-04830. Request the customer explain expected source and relationship to DPRK. Require senior compliance officer sign-off before any release. Notify the competent authority within 5 working days.',
};
