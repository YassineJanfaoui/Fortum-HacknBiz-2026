import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);
const H = 3600;

export const scenario03: ScenarioScript = {
  id: 'sc-03-mixer-tornado',
  title: 'Mixer-linked transaction (Tornado Cash)',
  shortLabel: 'Mixer · Escalate',
  difficulty: 'high',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'reject',

  transaction: {
    tx_id: '0xc3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef1234',
    tx_hash: '0xc3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef1234',
    wallet_from: '0xTainted9100000000000000000000000000009100',
    wallet_to: '0xNordaCustody0000000000000000000000000099',
    amount_eur: 38000,
    token: 'ETH',
    timestamp: NOW,
    risk_level: 'high',
    risk_pct: 91,
    status: 'escalated',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      { id: 'mixer', address: '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf', short_address: '0x910C…9dbf',
        type: 'mixer', risk: 'critical', taint: 100, tx_count: 98241, age_days: 1098,
        entity_label: 'Tornado Cash 1 ETH', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'mid1', address: '0xMidway11111111111111111111111111111111aa', short_address: '0xMid1…11aa',
        type: 'cluster', risk: 'high', taint: 95, tx_count: 7, age_days: 18, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'mid2', address: '0xMidway22222222222222222222222222222222bb', short_address: '0xMid2…22bb',
        type: 'cluster', risk: 'high', taint: 92, tx_count: 4, age_days: 16, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'tainted', address: '0xTainted9100000000000000000000000000009100', short_address: '0xTai…9100',
        type: 'origin', risk: 'high', taint: 91, tx_count: 3, age_days: 14, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'sibling1', address: '0xSibling1000000000000000000000000000001cc', short_address: '0xSib1…1cc',
        type: 'wallet', risk: 'medium', taint: 88, tx_count: 2, age_days: 14, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'sibling2', address: '0xSibling2000000000000000000000000000002dd', short_address: '0xSib2…2dd',
        type: 'wallet', risk: 'medium', taint: 85, tx_count: 3, age_days: 13, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'sibling3', address: '0xSibling3000000000000000000000000000003ee', short_address: '0xSib3…3ee',
        type: 'wallet', risk: 'medium', taint: 82, tx_count: 1, age_days: 12, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'sibling4', address: '0xSibling4000000000000000000000000000004ff', short_address: '0xSib4…4ff',
        type: 'wallet', risk: 'medium', taint: 79, tx_count: 2, age_days: 12, x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'norda', address: '0xNordaCustody0000000000000000000000000099', short_address: '0xNOR…0099',
        type: 'exchange', risk: 'low', taint: 0, tx_count: 45821, age_days: 2100,
        entity_label: 'NORDA Bank Custody', x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'em1', from: 'mixer',   to: 'mid1',    amount_eur: 42000, timestamp: NOW - 14 * 24 * H, tx_hash: '0xem1…' },
      { id: 'em2', from: 'mixer',   to: 'sibling1', amount_eur: 38000, timestamp: NOW - 14 * 24 * H, tx_hash: '0xem2…' },
      { id: 'em3', from: 'mixer',   to: 'sibling2', amount_eur: 35000, timestamp: NOW - 13 * 24 * H, tx_hash: '0xem3…' },
      { id: 'em4', from: 'mixer',   to: 'sibling3', amount_eur: 31000, timestamp: NOW - 13 * 24 * H, tx_hash: '0xem4…' },
      { id: 'em5', from: 'mixer',   to: 'sibling4', amount_eur: 29000, timestamp: NOW - 12 * 24 * H, tx_hash: '0xem5…' },
      { id: 'e12', from: 'mid1',    to: 'mid2',     amount_eur: 41000, timestamp: NOW - 16 * H, tx_hash: '0xe12…' },
      { id: 'e2t', from: 'mid2',    to: 'tainted',  amount_eur: 40000, timestamp: NOW - 14 * H, tx_hash: '0xe2t…' },
      { id: 'etn', from: 'tainted', to: 'norda',    amount_eur: 38000, timestamp: NOW,           tx_hash: '0xetn…' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 300,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'active', line: 'Amount: €38,000 — above AML monitoring threshold' } },
    { delayMs: 700,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Taint score: 91% — traced 2 hops to Tornado Cash' } },
    { delayMs: 1000, type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Funded by mixer 14 hours before this transaction' } },
    { delayMs: 1300, type: 'graph-highlight-path', payload: ['mixer', 'mid1', 'mid2', 'tainted', 'norda'] },
    { delayMs: 1600, type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'warn', line: 'OPA: POLICY:OFAC_MIXER_001 — mixer on FATF gray list' } },
    { delayMs: 1900, type: 'reason-add',  payload: 'Sender wallet has 91% taint traced through 2 hops to Tornado Cash mixer (0x910C…9dbf)' },
    { delayMs: 2050, type: 'reason-add',  payload: 'Wallet was funded by mixer 14 hours before this transaction — consistent with rapid placement-layering' },
    { delayMs: 2200, type: 'reason-add',  payload: 'No legitimate KYC trail — wallet has no prior interactions with verified entities' },
    { delayMs: 2350, type: 'reason-add',  payload: 'Mixer is on FATF gray list and OFAC SDN list (designated August 2022)' },
    { delayMs: 2500, type: 'reason-add',  payload: 'Receiving the funds at NORDA would create direct sanctions exposure by transitivity' },
    { delayMs: 2700, type: 'confidence-set', payload: 88 },
    { delayMs: 2800, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'warn', line: 'Decision: ESCALATE_HUMAN — mixer taint above 85% threshold' } },
    { delayMs: 3000, type: 'hitl-show',   payload: {} },
    { delayMs: 3100, type: 'audit-entry', payload: { event: 'Escalated — Tornado Cash taint 91%', severity: 'warn' } },
    { delayMs: 3200, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Sender wallet has 91% taint traced through 2 hops to Tornado Cash mixer (0x910C…9dbf)',
    'Wallet was funded by mixer 14 hours before this transaction — consistent with rapid placement-layering pattern',
    'No legitimate KYC trail — wallet has no prior interactions with verified entities',
    'Mixer is on FATF gray list and OFAC SDN list (designated August 2022)',
    'Receiving the funds at NORDA would create direct exposure to OFAC-sanctioned entity by transitivity',
  ],
  finalConfidence: 88,
  finalAuditTrail: [
    { ts: NOW - 3, event: 'Transaction received — ingestion layer', severity: 'info', signature: 'SIG-EE5F6A7B', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'Escalated — mixer taint 91%', severity: 'warn', signature: 'SIG-FF6A7B8C', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: 'Funds flowing into NORDA have 91% taint score traceable 2 hops through a Tornado Cash mixer. The mixer round occurred 14 hours prior, consistent with rapid placement-then-integration layering. Accepting these funds would give NORDA direct OFAC sanctions exposure.',
  regulatoryContext: 'Tornado Cash is on the OFAC Specially Designated Nationals list (August 2022). EU Regulation 2016/679 and AML 6th Directive require rejection and SAR filing. Transitivity of sanctions exposure means NORDA cannot claim lack of knowledge once the taint is flagged.',
  bankAction: 'Reject the transaction. File SAR. Notify customer that incoming transfer was refused due to compliance — without disclosing the specific reason (tipping-off prohibition under AML 6 Art. 39). Update wallet allow-list to permanently block the originating address.',
};
