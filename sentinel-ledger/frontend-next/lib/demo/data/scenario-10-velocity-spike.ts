import type { ScenarioScript } from '../types';

const NOW = Math.floor(Date.now() / 1000);
const MIN = 60;

function makeRecipient(i: number) {
  const hex = i.toString(16).padStart(40, '0');
  return {
    id: `r${i}`,
    address: `0x${hex}`,
    short_address: `0x${hex.slice(0, 4)}…${hex.slice(-4)}`,
    type: 'wallet' as const,
    risk: 'low' as const,
    taint: 0,
    tx_count: 1,
    age_days: Math.floor(Math.random() * 30) + 1,
    x: 0, y: 0, vx: 0, vy: 0,
  };
}

const recipients = Array.from({ length: 30 }, (_, i) => makeRecipient(i + 1));
const amounts = Array.from({ length: 30 }, () => 1800 + Math.floor(Math.random() * 400));

export const scenario10: ScenarioScript = {
  id: 'sc-10-velocity-spike-ato',
  title: 'Velocity spike — account takeover (ATO)',
  shortLabel: 'ATO · Freeze + Notify',
  difficulty: 'critical',
  expectedDecision: 'ESCALATE_HUMAN',
  hitlAction: 'freeze',

  transaction: {
    tx_id: '0xd0e1f2345678901234567890abcdef1234567890abcdef1234567890abcdef01',
    tx_hash: '0xd0e1f2345678901234567890abcdef1234567890abcdef1234567890abcdef01',
    wallet_from: '0xQuietAccount0000000000000000000000quiet1',
    wallet_to: `0x${(1).toString(16).padStart(40, '0')}`,
    amount_eur: amounts[0],
    token: 'USDC',
    timestamp: NOW,
    risk_level: 'critical',
    risk_pct: 96,
    status: 'blocked',
    governance_decision: 'ESCALATE_HUMAN',
  },

  subgraph: {
    nodes: [
      {
        id: 'origin', address: '0xQuietAccount0000000000000000000000quiet1', short_address: '0xQui…et1',
        type: 'origin', risk: 'critical', taint: 0, tx_count: 189, age_days: 1402,
        entity_label: 'Compromised client account', x: 0, y: 0, vx: 0, vy: 0,
      },
      ...recipients,
    ],
    edges: recipients.map((r, i) => ({
      id: `e${i}`,
      from: 'origin',
      to: r.id,
      amount_eur: amounts[i],
      timestamp: NOW - (60 - i * 2) * MIN,
      tx_hash: `0xtx${i.toString(16).padStart(4, '0')}`,
    })),
  },

  timeline: [
    { delayMs: 0,    type: 'audit-entry', payload: { event: 'Transaction received — ingestion layer', severity: 'info' } },
    { delayMs: 200,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'blocked', line: '⚡ Velocity: 30 tx/60 min — 87× above normal weekly rate' } },
    { delayMs: 500,  type: 'agent-line',  payload: { agent: 'Transaction Intelligence', state: 'blocked', line: 'All recipients: no prior connection to account history' } },
    { delayMs: 800,  type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'blocked', line: 'Login anomaly: new IP, foreign geolocation, 18 min prior to spike' } },
    { delayMs: 1100, type: 'agent-line',  payload: { agent: 'Wallet Reputation', state: 'blocked', line: 'Transfer amounts: €1,800–€2,200 — uniform automation pattern' } },
    { delayMs: 1400, type: 'agent-line',  payload: { agent: 'Compliance Policy', state: 'blocked', line: 'OPA: ATO_VELOCITY_001 — immediate freeze required' } },
    { delayMs: 1700, type: 'reason-add',  payload: 'Wallet executed 30 outbound transfers in 60 minutes — 87× its normal weekly velocity' },
    { delayMs: 1850, type: 'reason-add',  payload: 'Recipient wallets have no prior connection to the customer profile (zero historical overlap)' },
    { delayMs: 2000, type: 'reason-add',  payload: 'All 30 transfers between €1,800 and €2,200 — uniformity indicates automation / bot activity' },
    { delayMs: 2150, type: 'reason-add',  payload: 'Login activity 18 minutes prior originated from new IP geolocated outside customer\'s registered country' },
    { delayMs: 2300, type: 'reason-add',  payload: 'Pattern matches account-takeover (ATO) typology with high confidence' },
    { delayMs: 2500, type: 'confidence-set', payload: 96 },
    { delayMs: 2600, type: 'agent-line',  payload: { agent: 'Governance Sentinel', state: 'blocked', line: 'Decision: ESCALATE_HUMAN — ATO freeze + urgent customer notification' } },
    { delayMs: 2800, type: 'freeze-account', payload: { accountId: '0xQui…et1', amount: amounts.reduce((a, b) => a + b, 0), token: 'USDC', reason: 'Account takeover — velocity anomaly', authority: 'PSD2 Art. 97 + AML 6th Directive', caseId: 'NORDA-CASE-2026-04831' } },
    { delayMs: 3000, type: 'send-notification', payload: { channel: 'SMS + Email + In-app', subject: '🚨 Urgent: Unusual activity on your account', amount: `€${amounts.reduce((a, b) => a + b, 0).toLocaleString()} USDC` } },
    { delayMs: 3200, type: 'hitl-show',   payload: {} },
    { delayMs: 3300, type: 'audit-entry', payload: { event: 'ATO freeze applied — NORDA-CASE-2026-04831', severity: 'danger' } },
    { delayMs: 3400, type: 'final',       payload: {} },
  ],

  finalReasons: [
    'Wallet executed 30 outbound transfers in 60 minutes — 87× its normal weekly velocity',
    'All 30 recipient wallets have no prior connection to the customer\'s transaction history',
    'Transfer amounts between €1,800 and €2,200 — uniformity indicates bot/automation',
    'Login activity 18 minutes prior from new IP in a different country than the customer\'s registered address',
    'Pattern matches account-takeover (ATO) typology with high confidence',
  ],
  finalConfidence: 96,
  finalAuditTrail: [
    { ts: NOW - 2, event: 'ATO velocity anomaly — 30 tx/60min', severity: 'danger', signature: 'SIG-TT0C1D2E', prev_hash: '0x' + '0'.repeat(16) },
    { ts: NOW - 1, event: 'ATO freeze applied — NORDA-CASE-2026-04831', severity: 'danger', signature: 'SIG-UU1D2E3F', prev_hash: '0x' + '0'.repeat(16) },
  ],

  narrativeSummary: 'A normally quiet account (avg. 2 tx/week) suddenly executed 30 transfers totaling over €60,000 in 60 minutes to 30 unconnected recipients. A login from a foreign IP 18 minutes prior confirmed account takeover. The system triggered an immediate freeze before the funds cleared.',
  regulatoryContext: 'PSD2 Article 97 (Strong Customer Authentication) was likely bypassed or compromised. EBA Guidelines on ATO fraud require immediate freeze, customer notification, and incident investigation. DORA requires incident classification and potential regulatory notification if customer funds are at risk.',
  bankAction: 'Freeze all pending outbound transfers immediately. Send urgent SMS + email + in-app notification. Reset customer credentials and require re-authentication. File fraud incident report. Coordinate with recipient wallet custodians to recall funds. Open NORDA-CASE-2026-04831 fraud investigation.',
};
