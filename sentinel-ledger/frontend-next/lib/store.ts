'use client';

import { create } from 'zustand';
import type {
  AgentEvent,
  AgentOutput,
  AuditRecord,
  GovernanceDecision,
  GraphEdge,
  GraphNode,
  Transaction,
} from './types';

export interface Investigation {
  tx_id: string;
  transaction: Transaction;
  governance_decision: GovernanceDecision | string;
  reasons: string[];
  confidence: number;
  agent_outputs: AgentOutput[];
  audit: AuditRecord[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface DashboardStore {
  // Feed
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;
  prependTransaction: (tx: Transaction) => void;
  txFilter: 'all' | 'escalated' | 'blocked';
  setTxFilter: (f: 'all' | 'escalated' | 'blocked') => void;
  txSearch: string;
  setTxSearch: (s: string) => void;

  // Active investigation
  activeInvestigation: Investigation | null;
  setActiveInvestigation: (inv: Investigation | null) => void;

  // Graph
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  graphLoading: boolean;
  setGraphLoading: (b: boolean) => void;
  graphWallet: string;
  setGraphWallet: (w: string) => void;
  graphHops: number;
  setGraphHops: (h: number) => void;

  // Agent events (streamed)
  agentEvents: AgentEvent[];
  appendAgentEvent: (e: AgentEvent) => void;
  clearAgentEvents: () => void;

  // HITL
  hitlVisible: boolean;
  setHitlVisible: (b: boolean) => void;
  injectionBlocked: boolean;
  injectionPattern: string;
  setInjectionBlocked: (blocked: boolean, pattern?: string) => void;

  // System status
  agentsOnline: number;
  pendingHitlCount: number;
  injectionAttempts: number;
  systemOk: boolean;
  setSystemStatus: (status: {
    agentsOnline?: number;
    pendingHitlCount?: number;
    injectionAttempts?: number;
    systemOk?: boolean;
  }) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Feed
  transactions: [],
  setTransactions: (txs) => set({ transactions: txs.slice(0, 50) }),
  prependTransaction: (tx) =>
    set((s) => ({ transactions: [tx, ...s.transactions].slice(0, 50) })),
  txFilter: 'all',
  setTxFilter: (txFilter) => set({ txFilter }),
  txSearch: '',
  setTxSearch: (txSearch) => set({ txSearch }),

  // Investigation
  activeInvestigation: null,
  setActiveInvestigation: (inv) => set({ activeInvestigation: inv }),

  // Graph
  graphNodes: [],
  graphEdges: [],
  setGraph: (graphNodes, graphEdges) => set({ graphNodes, graphEdges }),
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  graphLoading: false,
  setGraphLoading: (graphLoading) => set({ graphLoading }),
  graphWallet: '',
  setGraphWallet: (graphWallet) => set({ graphWallet }),
  graphHops: 3,
  setGraphHops: (graphHops) => set({ graphHops }),

  // Agent events
  agentEvents: [],
  appendAgentEvent: (e) =>
    set((s) => ({ agentEvents: [...s.agentEvents, e].slice(-200) })),
  clearAgentEvents: () => set({ agentEvents: [] }),

  // HITL
  hitlVisible: false,
  setHitlVisible: (hitlVisible) => set({ hitlVisible }),
  injectionBlocked: false,
  injectionPattern: '',
  setInjectionBlocked: (blocked, pattern = '') =>
    set({ injectionBlocked: blocked, injectionPattern: pattern }),

  // System status
  agentsOnline: 6,
  pendingHitlCount: 0,
  injectionAttempts: 0,
  systemOk: true,
  setSystemStatus: (status) => set((s) => ({ ...s, ...status })),
}));
