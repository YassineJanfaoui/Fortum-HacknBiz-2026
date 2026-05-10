import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);

export const scenario04: ScenarioScript = {
  id: 'sc-04-ofac-sanctions',
  title: 'OFAC sanctions hit — automatic freeze',
  shortLabel: 'OFAC Match · Freeze',
  difficulty: 'critical',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'freeze',

  transaction: {
    tx_id: '0xd4e5f678901234567890abcdef1234567890abcdef1234567890abcdef123456',
    tx_hash: '0xd4e5f678901234567890abcdef1234567890abcdef1234567890abcdef123456',
    wallet_from: '0xNordaClient000000000000000000000000004f8e',
    wallet_to: '0xOFACSanctioned00000000000000000000alphav',
    amount_eur: 47300,
    token: 'USDC',
    timestamp: NOW,
    risk_level: 'critical',
    risk_pct: 100,
    status: 'blocked',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      { id: 'sender', address: '0xNordaClient000000000000000000000000004f8e', short_address: '0xNOR…4f8e',
        type: 'origin', risk: 'low', taint: 0, tx_count: 342, age_days: 891,
        entity_label: 'NORDA Client Account', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'sanctioned', address: '0xOFACSanctioned00000000000000000000alphav', short_address: '0xOFAC…hav',
        type: 'sanctioned', risk: 'critical', taint: 100, tx_count: 1821, age_days: 744,
        entity_label: '⊗ OFAC SDN — ALPHV/BlackCat', x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'e1', from: 'sender', to: 'sanctioned', amount_eur: 47300, timestamp: NOW, tx_hash: '0xd4e5…3456' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 200,  type: 'audit-entry', payload: { event: 'Sanctions screening initiated — Chainalysis + OFAC list', severity: 'info' } },
    { delayMs: 500,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'blocked', line: '⊗ OFAC SDN MATCH — destination wallet confirmed sanctioned' } },
    { delayMs: 700,  type: 'audit-entry', payload: { event: '⊗ OFAC SDN hit: ALPHV/BlackCat ransomware entity', severity: 'danger' } },
    { delayMs: 900,  type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'blocked', line: 'OPA: BLOCK_SANCTIONS — EU Reg 269/2014 applies' } },
    { delayMs: 1100, type: 'reason-add',  payload: '⊗ Destination wallet matches OFAC SDN list: ALPHV/BlackCat ransomware (designated 2024-03-15)' },
    { delayMs: 1250, type: 'reason-add',  payload: 'US persons and entities (including EU branches subject to secondary sanctions) are prohibited from transacting' },
    { delayMs: 1400, type: 'reason-add',  payload: 'NORDA Bank is required to block funds immediately under EU Regulation 269/2014' },
    { delayMs: 1550, type: 'reason-add',  payload: 'Must report to competent authority within 5 working days' },
    { delayMs: 1700, type: 'reason-add',  payload: 'Continued processing would expose NORDA to civil penalties up to 50% of transaction value' },
    { delayMs: 1900, type: 'confidence-set', payload: 100 },
    { delayMs: 2000, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'blocked', line: 'Decision: ESCALATE_HUMAN — OFAC sanctions match requires operator freeze confirmation' } },
    { delayMs: 2200, type: 'freeze-account', payload: { accountId: '0xNOR…4f8e', amount: 47300, token: 'USDC', reason: 'OFAC SDN match — ALPHV/BlackCat', authority: 'EU Reg 269/2014', caseId: 'NORDA-CASE-2026-04829' } },
    { delayMs: 2400, type: 'hitl-show',   payload: {} },
    { delayMs: 2500, type: 'audit-entry', payload: { event: 'Account freeze initiated — NORDA-CASE-2026-04829', severity: 'danger' } },
    { delayMs: 2600, type: 'final',       payload: {} },
  ],

  finalReasons: [
    '⊗ Destination wallet matches OFAC SDN list: ALPHV/BlackCat ransomware operations (designated 2024-03-15)',
    'Sanctioned entity associated with ransomware extortion payments — proceeds of crime',
    'US persons and entities (including EU branches under secondary sanctions) are prohibited from transacting',
    'NORDA Bank is required to block funds immediately under EU Regulation 269/2014',
    'Continued processing would expose NORDA to civil penalties up to 50% of transaction value (≈€23,650)',
  ],
  finalConfidence: 100,
  finalAuditTrail: [
    { ts: NOW - 2, event: 'OFAC SDN match confirmed', severity: 'danger', signature: 'SIG-GG7B8C9D', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'Account freeze initiated — NORDA-CASE-2026-04829', severity: 'danger', signature: 'SIG-HH8C9D0E', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: 'A NORDA client attempted to transfer €47,300 USDC to a wallet directly matching the OFAC SDN list for ALPHV/BlackCat ransomware operations. The system blocked the transaction in 2.6 seconds and initiated an automatic account freeze pending human confirmation.',
  regulatoryContext: 'EU Regulation 269/2014 (Ukraine sanctions) and the US OFAC SDN list designation (ALPHV/BlackCat, March 2024) both apply. NORDA must block funds, report to the competent authority within 5 working days, and retain all evidence for at least 5 years.',
  bankAction: 'Freeze client account immediately. Auto-generate case file NORDA-CASE-2026-04829. File regulatory report within 5 working days. Notify client account is frozen pending compliance investigation — do not reveal sanctions target (tipping-off prohibition).',
};
