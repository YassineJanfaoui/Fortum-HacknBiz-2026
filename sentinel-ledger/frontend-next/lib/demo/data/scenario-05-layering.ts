import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);
const MIN = 60;

export const scenario05: ScenarioScript = {
  id: 'sc-05-rapid-layering',
  title: 'Rapid chain layering — 6 hops in 18 minutes',
  shortLabel: 'Layering · Escalate',
  difficulty: 'high',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'file-sar',

  transaction: {
    tx_id: '0xe5f678901234567890abcdef1234567890abcdef1234567890abcdef12345678',
    tx_hash: '0xe5f678901234567890abcdef1234567890abcdef1234567890abcdef12345678',
    wallet_from: '0xLayerA000000000000000000000000000000aaaa',
    wallet_to: '0xLayerB000000000000000000000000000000bbbb',
    amount_eur: 280000,
    token: 'ETH',
    timestamp: NOW,
    risk_level: 'high',
    risk_pct: 87,
    status: 'escalated',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      { id: 'a', address: '0xLayerA000000000000000000000000000000aaaa', short_address: '0xA…aaaa',
        type: 'origin', risk: 'high', taint: 85, tx_count: 12, age_days: 6,
        entity_label: 'Darknet-linked origin', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'b', address: '0xLayerB000000000000000000000000000000bbbb', short_address: '0xB…bbbb',
        type: 'wallet', risk: 'high', taint: 80, tx_count: 3, age_days: 4, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'c', address: '0xLayerC000000000000000000000000000000cccc', short_address: '0xC…cccc',
        type: 'wallet', risk: 'high', taint: 76, tx_count: 3, age_days: 3, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'd', address: '0xLayerD000000000000000000000000000000dddd', short_address: '0xD…dddd',
        type: 'wallet', risk: 'high', taint: 71, tx_count: 3, age_days: 3, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'e', address: '0xLayerE000000000000000000000000000000eeee', short_address: '0xE…eeee',
        type: 'wallet', risk: 'medium', taint: 66, tx_count: 2, age_days: 2, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'f', address: '0xLayerF000000000000000000000000000000ffff', short_address: '0xF…ffff',
        type: 'wallet', risk: 'medium', taint: 61, tx_count: 2, age_days: 1, x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'eab', from: 'a', to: 'b', amount_eur: 280000, timestamp: NOW - 18 * MIN, tx_hash: '0xab…' },
      { id: 'ebc', from: 'b', to: 'c', amount_eur: 280000, timestamp: NOW - 15 * MIN, tx_hash: '0xbc…' },
      { id: 'ecd', from: 'c', to: 'd', amount_eur: 280000, timestamp: NOW - 11 * MIN, tx_hash: '0xcd…' },
      { id: 'ede', from: 'd', to: 'e', amount_eur: 280000, timestamp: NOW - 7 * MIN,  tx_hash: '0xde…' },
      { id: 'eef', from: 'e', to: 'f', amount_eur: 280000, timestamp: NOW - 4 * MIN,  tx_hash: '0xef…' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 300,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'warn', line: 'Rapid chain detected: 6 wallets, 18 minutes, €280K unchanged' } },
    { delayMs: 600,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Origin funded from darknet market 6h prior (Hydra successor)' } },
    { delayMs: 900,  type: 'graph-highlight-path', payload: ['a', 'b', 'c', 'd', 'e', 'f'] },
    { delayMs: 1200, type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Intermediate wallets: no commercial activity, pure transit' } },
    { delayMs: 1500, type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'warn', line: 'OPA: POLICY:AML_LAYER_002 — velocity + chain depth exceeded' } },
    { delayMs: 1800, type: 'reason-add',  payload: 'Funds moved through 6 wallets in 18 minutes — average hold time 3 minutes per hop' },
    { delayMs: 1950, type: 'reason-add',  payload: 'No commercial activity at any intermediate hop — wallets used purely as transit' },
    { delayMs: 2100, type: 'reason-add',  payload: 'Amount unchanged at €280K throughout — no fees, splits, or aggregation' },
    { delayMs: 2250, type: 'reason-add',  payload: 'Chain begins at wallet that received from known darknet market 6 hours prior' },
    { delayMs: 2400, type: 'reason-add',  payload: 'Pattern matches MITRE ATT&CK T1583.005: layering for audit trail obfuscation' },
    { delayMs: 2600, type: 'confidence-set', payload: 87 },
    { delayMs: 2700, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'warn', line: 'Decision: ESCALATE_HUMAN — layering chain above risk threshold' } },
    { delayMs: 2900, type: 'hitl-show',   payload: {} },
    { delayMs: 3000, type: 'audit-entry', payload: { event: 'Escalated — rapid layering 6 hops/18 min', severity: 'warn' } },
    { delayMs: 3100, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Funds moved through 6 wallets in 18 minutes — average hold time 3 minutes per hop',
    'No commercial activity at any intermediate hop — wallets used purely as transit',
    'Amount unchanged at €280,000 throughout — no fees, splits, or aggregation',
    'Chain begins at wallet that received from known darknet market 6 hours prior',
    'Pattern matches MITRE ATT&CK technique T1583.005: layering for trail obfuscation',
  ],
  finalConfidence: 87,
  finalAuditTrail: [
    { ts: NOW - 3, event: 'Rapid layering chain detected', severity: 'warn', signature: 'SIG-II9D0E1F', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'Escalated — 6 hops in 18 minutes', severity: 'warn', signature: 'SIG-JJ0E1F2A', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: '€280,000 flowed through 6 freshly created wallets in 18 minutes with no commercial purpose at any hop. This is a textbook layering chain designed to sever the audit trail between the darknet-sourced origin and the eventual cash-out wallet.',
  regulatoryContext: 'Layering is the second stage of money laundering (placement → layering → integration). FATF Recommendation 16 requires reporting. MITRE ATT&CK classification applies for threat intelligence filing. SAR mandatory within 72 hours.',
  bankAction: 'File SAR immediately. Freeze all 6 wallets in the chain that touch NORDA infrastructure. Coordinate with other affected institutions if any of the wallets are custodied there. Provide full transaction chain to TRACFIN for investigation.',
};
