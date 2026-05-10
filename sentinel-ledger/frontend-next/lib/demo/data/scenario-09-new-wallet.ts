import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

export const scenario09: ScenarioScript = {
  id: 'sc-09-new-wallet-anomaly',
  title: 'New wallet — large incoming transfer (mule account)',
  shortLabel: 'Mule Account · Notify',
  difficulty: 'medium',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'notify-customer',

  transaction: {
    tx_id: '0xc9d0e1f2345678901234567890abcdef1234567890abcdef1234567890abcdef',
    tx_hash: '0xc9d0e1f2345678901234567890abcdef1234567890abcdef1234567890abcdef',
    wallet_from: '0xP2PExchange000000000000000000000000pp2p1',
    wallet_to: '0xNewWallet4Days0000000000000000000000neww',
    amount_eur: 380000,
    token: 'USDC',
    timestamp: NOW,
    risk_level: 'high',
    risk_pct: 78,
    status: 'escalated',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      { id: 'p2p', address: '0xP2PExchange000000000000000000000000pp2p1', short_address: '0xP2P…pp2p',
        type: 'exchange', risk: 'medium', taint: 42, tx_count: 8821, age_days: 412,
        entity_label: 'P2P Exchange (high-risk juris.)', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'new', address: '0xNewWallet4Days0000000000000000000000neww', short_address: '0xNew…neww',
        type: 'origin', risk: 'high', taint: 0, tx_count: 3, age_days: 4,
        entity_label: 'New wallet (4 days old)', x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'e1', from: 'p2p', to: 'new', amount_eur: 380000, timestamp: NOW - 2 * DAY, tx_hash: '0xfund…' },
      { id: 'e2', from: 'new', to: 'p2p', amount_eur: 380000, timestamp: NOW, tx_hash: '0xc9d0…cdef' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 300,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'warn', line: 'Amount: €380,000 — significantly above customer profile average' } },
    { delayMs: 600,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Recipient wallet age: 4 days — created 2026-05-06' } },
    { delayMs: 900,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Sender: P2P exchange in high-risk jurisdiction (no KYC guarantee)' } },
    { delayMs: 1200, type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'warn', line: 'OPA: EDD_NEW_WALLET_001 — new wallet + large amount triggers EDD' } },
    { delayMs: 1500, type: 'reason-add',  payload: 'Recipient wallet age: 4 days — created 2026-05-06, only 3 lifetime transactions' },
    { delayMs: 1650, type: 'reason-add',  payload: 'No prior transaction history with the sender or any verified entity' },
    { delayMs: 1800, type: 'reason-add',  payload: 'This single transfer (€380,000) is the wallet\'s third lifetime transaction' },
    { delayMs: 1950, type: 'reason-add',  payload: 'Funding source is a P2P exchange in a high-risk jurisdiction (no KYC guarantee on counterparties)' },
    { delayMs: 2100, type: 'reason-add',  payload: 'Pattern matches FATF typology 7.4: mule account activation for money laundering' },
    { delayMs: 2300, type: 'confidence-set', payload: 78 },
    { delayMs: 2400, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'warn', line: 'Decision: ESCALATE_HUMAN — request customer confirmation before release' } },
    { delayMs: 2600, type: 'send-notification', payload: { channel: 'SMS + Email + In-app', subject: 'Action required — incoming transfer review', amount: '€380,000 USDC' } },
    { delayMs: 2800, type: 'hitl-show',   payload: {} },
    { delayMs: 2900, type: 'audit-entry', payload: { event: 'Customer notified — awaiting confirmation', severity: 'warn' } },
    { delayMs: 3000, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Recipient wallet age: 4 days — created 2026-05-06, only 3 lifetime transactions',
    'No prior transaction history with the sender or any verified entity',
    'Single transfer of €380,000 is the wallet\'s third ever transaction — highly anomalous',
    'Funding source is a P2P exchange in a high-risk jurisdiction (limited KYC on counterparties)',
    'Pattern matches FATF typology 7.4: mule account activation for money laundering',
  ],
  finalConfidence: 78,
  finalAuditTrail: [
    { ts: NOW - 2, event: 'New wallet anomaly flagged', severity: 'warn', signature: 'SIG-RR8A9B0C', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'Customer notification sent', severity: 'warn', signature: 'SIG-SS9B0C1D', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: 'A 4-day-old wallet received €380,000 from a P2P exchange — this is the wallet\'s third ever transaction. New wallets receiving large sums with no prior legitimate activity strongly correlate with mule accounts used in money laundering operations.',
  regulatoryContext: 'FATF typology 7.4 (mule account activation) applies. AML 6th Directive Art. 18(3) requires Enhanced Due Diligence when transaction patterns are inconsistent with the customer\'s known activity. Customer must provide satisfactory explanation or funds are frozen.',
  bankAction: 'Hold the transfer pending customer confirmation. Send urgent notification via SMS + email + in-app. Request customer confirm: (1) they were expecting this transfer, (2) the source of funds. If customer does not respond within 48h or explanation is unsatisfactory, freeze and file SAR.',
};
