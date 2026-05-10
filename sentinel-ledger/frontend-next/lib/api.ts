import type {
  AnalyzeResponse,
  BackendAuditRecord,
  BackendWalletTrace,
  GraphEdge,
  GraphNode,
  RiskLevel,
  Transaction,
  WalletType,
} from './types';

export type { AnalyzeResponse, BackendAuditRecord, BackendWalletTrace, Transaction };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error((await res.text()) || `${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function auditToTransaction(r: BackendAuditRecord): Transaction {
  const txSummary = r.tx_summary ?? {};
  const agentOutputs = r.agent_outputs as Record<string, Record<string, unknown>>;
  const txRisk = agentOutputs?.tx_risk ?? {};
  const walletRisk = agentOutputs?.wallet_risk ?? {};

  const riskScore = Number(txRisk.risk_score ?? walletRisk.risk_score ?? 0);
  const riskLevel = ((): RiskLevel => {
    const raw = String(txRisk.risk_level ?? walletRisk.risk_level ?? 'low').toLowerCase();
    if (raw === 'critical') return 'critical';
    if (raw === 'high') return 'high';
    if (raw === 'medium') return 'medium';
    return 'low';
  })();

  const decision = r.governance_decision ?? '';
  const status = ((): Transaction['status'] => {
    if (r.human_decision === 'APPROVED') return 'approved';
    if (r.human_decision === 'REJECTED') return 'rejected';
    if (decision.includes('BLOCK') || decision.includes('INJECT')) return 'blocked';
    if (r.requires_hitl) return 'escalated';
    return 'approved';
  })();

  return {
    tx_id: r.tx_id,
    tx_hash: (r.inputs_hash ?? r.tx_id).slice(0, 16),
    wallet_from: String(txSummary.wallet_from ?? 'unknown'),
    wallet_to: String(txSummary.wallet_to ?? 'unknown'),
    amount_eur: Number(txSummary.amount_eur ?? 0),
    token: String(txSummary.token ?? 'ETH'),
    timestamp: r.timestamp,
    risk_level: riskLevel,
    risk_pct: Math.round(riskScore * 100),
    status,
    governance_decision: decision as Transaction['governance_decision'],
  };
}

export function traceToSubgraph(
  trace: BackendWalletTrace,
  seedAddress: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const categoryToType = (cat: string, isOrigin: boolean): WalletType => {
    if (isOrigin) return 'origin';
    const c = cat.toLowerCase();
    if (c.includes('mixer') || c.includes('tornado') || c.includes('tumbl')) return 'mixer';
    if (c.includes('sanction') || c.includes('ofac') || c.includes('blacklist')) return 'sanctioned';
    if (c.includes('exchange') || c.includes('cex') || c.includes('dex')) return 'exchange';
    return 'wallet';
  };

  const scoreToRisk = (score: number): RiskLevel => {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.35) return 'medium';
    return 'low';
  };

  const nodes: GraphNode[] = trace.graph.nodes.map((n) => ({
    id: n.id,
    address: n.address,
    short_address: n.address.length > 12
      ? `${n.address.slice(0, 6)}…${n.address.slice(-4)}`
      : n.address,
    type: categoryToType(n.category, n.address.toLowerCase() === seedAddress.toLowerCase()),
    risk: scoreToRisk(n.risk_score),
    taint: Math.round(n.risk_score * 100),
    tx_count: n.tx_count ?? 1,
    age_days: 0,
    entity_label: n.label && n.label !== n.address ? n.label : undefined,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }));

  const now = Date.now() / 1000;
  const edges: GraphEdge[] = trace.graph.edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    amount_eur: (e.amount_eth ?? 0) * 3000,
    timestamp: e.latest_timestamp ?? now,
    tx_hash: e.id,
  }));

  return { nodes, edges };
}

export const api = {
  baseUrl: API_BASE,

  auditList: (limit = 50) =>
    request<BackendAuditRecord[]>(`/audit?limit=${limit}`),

  auditRecord: (txId: string) =>
    request<BackendAuditRecord>(`/audit/${encodeURIComponent(txId)}`),

  analyze: (tx: {
    tx_id: string;
    wallet_from: string;
    wallet_to: string;
    amount_eur: number;
    token: string;
    chain?: string;
    timestamp: number;
    velocity_24h?: number;
    tx_count_7d?: number;
    jurisdiction?: string;
    memo?: string;
  }) =>
    request<AnalyzeResponse>('/analyze', { method: 'POST', body: JSON.stringify(tx) }),

  walletTrace: (address: string, depth = 3, fanout = 6, limit = 60) =>
    request<BackendWalletTrace>(
      `/wallet/${encodeURIComponent(address)}/trace?depth=${depth}&fanout=${fanout}&limit=${limit}`,
    ),

  approve: (txId: string) =>
    request<{ ok: boolean; decision: string }>(
      `/operator/approve/${encodeURIComponent(txId)}`,
      { method: 'POST' },
    ),

  reject: (txId: string) =>
    request<{ ok: boolean; decision: string }>(
      `/operator/reject/${encodeURIComponent(txId)}`,
      { method: 'POST' },
    ),

  pending: () => request<BackendAuditRecord[]>('/hitl/pending'),

  summary: () =>
    request<{
      total_transactions: number;
      total_amount_eur: number;
      pending_hitl: number;
      high_risk_transactions: number;
      decisions: Record<string, number>;
      audit_chain_ok: boolean;
      recent: BackendAuditRecord[];
    }>('/dashboard/summary'),
};
