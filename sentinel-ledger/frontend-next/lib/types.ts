export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type WalletType = 'origin' | 'mixer' | 'sanctioned' | 'exchange' | 'wallet' | 'cluster';
export type GovernanceDecision = 'AUTO_APPROVE' | 'ESCALATE_HUMAN' | 'BLOCKED_INJECTION';
export type TxStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'blocked';
export type AgentState = 'active' | 'warn' | 'blocked' | 'idle';
export type AuditSeverity = 'info' | 'warn' | 'danger' | 'success';

export interface Transaction {
  tx_id: string;
  tx_hash: string;
  wallet_from: string;
  wallet_to: string;
  amount_eur: number;
  token: string;
  timestamp: number;
  risk_level: RiskLevel;
  risk_pct: number;
  status: TxStatus;
  governance_decision?: GovernanceDecision;
}

export interface GraphNode {
  id: string;
  address: string;
  short_address: string;
  type: WalletType;
  risk: RiskLevel;
  taint: number;
  tx_count: number;
  age_days: number;
  entity_label?: string;
  cluster_id?: string;
  // Physics state (mutable during simulation)
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned?: boolean;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  amount_eur: number;
  timestamp: number;
  tx_hash: string;
}

export interface InvestigationDetail {
  tx_id: string;
  transaction: Transaction;
  governance_decision: GovernanceDecision;
  reasons: string[];
  confidence: number;
  agent_outputs: AgentOutput[];
  audit: AuditRecord[];
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };
}

export interface AgentOutput {
  agent: string;
  state: AgentState;
  output: Record<string, unknown>;
  log: string[];
}

export interface AuditRecord {
  ts: number;
  event: string;
  policy?: string;
  severity: AuditSeverity;
  signature: string;
  prev_hash: string;
}

export interface AgentEvent {
  agent: string;
  line: string;
  state: AgentState;
  ts: number;
}

export interface SubgraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: Record<string, unknown>;
}

// Backend audit record shape (from /audit endpoint)
export interface BackendAuditRecord {
  tx_id: string;
  timestamp: number;
  tx_summary?: Record<string, unknown>;
  inputs_hash: string;
  agent_outputs: Record<string, unknown>;
  governance_decision: string;
  governance_reason: string;
  requires_hitl?: boolean;
  explanation: string;
  zk_bundle: Record<string, unknown>;
  human_decision?: string | null;
  human_actor_id?: string | null;
  prev_record_hash: string;
  signature: string;
}

// Backend analyze response
export interface AnalyzeResponse {
  tx_id: string;
  governance_decision: string;
  governance_reason: string;
  requires_hitl: boolean;
  explanation: string;
  tx_risk?: {
    risk_score: number;
    risk_level: string;
    reasons: string[];
    confidence: number;
    velocity_flag: boolean;
    structuring_flag: boolean;
    amount_eur: number;
  };
  wallet_risk?: {
    risk_score: number;
    risk_level: string;
    reasons: string[];
    sanctions_match: boolean;
    mixer_exposure: boolean;
    taint_pct: number;
  };
  opa_result?: {
    violations?: string[];
    allow?: boolean;
    requires_sar?: boolean;
  };
  zk_bundle?: Record<string, unknown>;
}

// Backend wallet trace shape
export interface BackendTraceNode {
  id: string;
  address: string;
  label: string;
  category: string;
  depth: number;
  risk_score: number;
  risk_level: string;
  trust_score: number;
  volume_eth: number;
  tx_count: number;
  terminal: boolean;
}

export interface BackendTraceEdge {
  id: string;
  source: string;
  target: string;
  token: string;
  amount_eth: number;
  tx_count: number;
  depth: number;
  pattern: string;
  latest_timestamp?: number;
  animated: boolean;
}

export interface BackendWalletTrace {
  seed: string;
  graph: {
    nodes: BackendTraceNode[];
    edges: BackendTraceEdge[];
  };
  summary: {
    risk_score: number;
    risk_level: string;
    wallets: number;
    transfers: number;
    total_volume_eth: number;
  };
}
