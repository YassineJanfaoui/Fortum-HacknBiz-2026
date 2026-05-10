import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

export const scenario06: ScenarioScript = {
  id: 'sc-06-wash-trading',
  title: 'NFT wash trading — coordinated cluster',
  shortLabel: 'Wash Trading · Escalate',
  difficulty: 'high',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'file-sar',

  transaction: {
    tx_id: '0xf6789012345678901234567890abcdef1234567890abcdef1234567890abcdef',
    tx_hash: '0xf6789012345678901234567890abcdef1234567890abcdef1234567890abcdef',
    wallet_from: '0xClusterA0000000000000000000000000000aaab',
    wallet_to: '0xExternalBuyer0000000000000000000000ffff',
    amount_eur: 16400,
    token: 'ETH',
    timestamp: NOW,
    risk_level: 'high',
    risk_pct: 83,
    status: 'escalated',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      { id: 'ca', address: '0xClusterA0000000000000000000000000000aaab', short_address: '0xCl.A…aaab',
        type: 'origin', risk: 'high', taint: 72, tx_count: 28, age_days: 42,
        entity_label: 'Cluster wallet A (same beneficial owner)', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'cb', address: '0xClusterB0000000000000000000000000000bbbc', short_address: '0xCl.B…bbbc',
        type: 'cluster', risk: 'high', taint: 71, tx_count: 24, age_days: 40,
        entity_label: 'Cluster wallet B (same beneficial owner)', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'cc', address: '0xClusterC0000000000000000000000000000cccd', short_address: '0xCl.C…cccd',
        type: 'cluster', risk: 'high', taint: 69, tx_count: 19, age_days: 39,
        entity_label: 'Cluster wallet C (same beneficial owner)', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'mx', address: '0xMixer2Funding00000000000000000000002222', short_address: '0xMix…2222',
        type: 'mixer', risk: 'critical', taint: 100, tx_count: 4821, age_days: 901,
        entity_label: 'Tornado Cash 0.1 ETH', x: 0, y: 0, vx: 0, vy: 0 },
      { id: 'buyer', address: '0xExternalBuyer0000000000000000000000ffff', short_address: '0xBuy…ffff',
        type: 'wallet', risk: 'low', taint: 0, tx_count: 89, age_days: 621,
        entity_label: 'External NFT buyer', x: 0, y: 0, vx: 0, vy: 0 },
    ],
    edges: [
      { id: 'emx', from: 'mx', to: 'ca', amount_eur: 1600, timestamp: NOW - 11 * DAY, tx_hash: '0xemx…' },
      { id: 'eab', from: 'ca', to: 'cb', amount_eur: 4800, timestamp: NOW - 10 * DAY, tx_hash: '0xeab…' },
      { id: 'ebc', from: 'cb', to: 'cc', amount_eur: 15200, timestamp: NOW - 7 * DAY, tx_hash: '0xebc…' },
      { id: 'eca', from: 'cc', to: 'ca', amount_eur: 15200, timestamp: NOW - 5 * DAY, tx_hash: '0xeca…' },
      { id: 'eab2',from: 'ca', to: 'cb', amount_eur: 15600, timestamp: NOW - 3 * DAY, tx_hash: '0xeab2…' },
      { id: 'esale',from: 'ca', to: 'buyer', amount_eur: 16400, timestamp: NOW, tx_hash: '0xsale…' },
    ],
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 300,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Common-input ownership: all 3 cluster wallets share same beneficial owner' } },
    { delayMs: 700,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'warn', line: 'Cluster funded via Tornado Cash 11 days before trading sequence' } },
    { delayMs: 1000, type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'warn', line: 'Asset CryptoArtifact #4729 traded at: 0.4→1.2→3.8→4.1 ETH (925% inflation)' } },
    { delayMs: 1400, type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'warn', line: 'OPA: POLICY:NFT_WASH_001 — same-cluster circular trading detected' } },
    { delayMs: 1700, type: 'reason-add',  payload: 'Three wallets cluster to same beneficial owner via common-input ownership heuristic' },
    { delayMs: 1850, type: 'reason-add',  payload: 'NFT (CryptoArtifact #4729) traded between cluster members at successively rising prices: 0.4→1.2→3.8 ETH' },
    { delayMs: 2000, type: 'reason-add',  payload: 'External buyer purchased at 4.1 ETH — 925% above the asset\'s first observed price' },
    { delayMs: 2150, type: 'reason-add',  payload: 'Cluster received initial funding from privacy mixer 11 days before trading sequence began' },
    { delayMs: 2300, type: 'reason-add',  payload: 'Pattern consistent with NFT-based money laundering: clean external funds replace tainted cluster funds' },
    { delayMs: 2500, type: 'confidence-set', payload: 83 },
    { delayMs: 2600, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'warn', line: 'Decision: ESCALATE_HUMAN — wash trading + mixer funding confirmed' } },
    { delayMs: 2800, type: 'hitl-show',   payload: {} },
    { delayMs: 2900, type: 'audit-entry', payload: { event: 'Escalated — NFT wash trading cluster detected', severity: 'warn' } },
    { delayMs: 3000, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Three wallets cluster to same beneficial owner via common-input ownership heuristic',
    'NFT (CryptoArtifact #4729) traded between cluster members at prices: 0.4→1.2→3.8→4.1 ETH (925% inflation)',
    'External buyer purchased at 4.1 ETH — 925% above the asset\'s first observed price',
    'Cluster received initial funding from privacy mixer 11 days before trading sequence began',
    'Pattern consistent with NFT-based money laundering: clean external buyer funds replace tainted cluster funds',
  ],
  finalConfidence: 83,
  finalAuditTrail: [
    { ts: NOW - 2, event: 'NFT wash trading cluster identified', severity: 'warn', signature: 'SIG-KK1F2A3B', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'Escalated — same beneficial owner cluster', severity: 'warn', signature: 'SIG-LL2A3B4C', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: 'Three wallets sharing the same beneficial owner traded an NFT among themselves at artificially inflated prices before selling to an external buyer. This is NFT wash trading — a technique used to launder funds by converting tainted crypto into apparently "clean" proceeds from a legitimate art sale.',
  regulatoryContext: 'FATF guidance on Virtual Assets (October 2021) explicitly identifies NFT wash trading as a money laundering typology. EU Markets in Crypto-Assets Regulation (MiCA) Article 91 prohibits market manipulation. SAR filing required under AML 6th Directive.',
  bankAction: 'Block the outgoing sale. Freeze the cluster wallets. File SAR with TRACFIN. Forward case to the market surveillance unit for MiCA Art. 91 referral. Notify the NFT marketplace platform of the coordinated manipulation.',
};
