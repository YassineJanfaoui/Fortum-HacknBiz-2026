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
import type { ScenarioScript } from './demo/types';

export interface FreezeModalState {
  open: boolean;
  accountId: string;
  amount: number;
  token: string;
  reason: string;
  authority: string;
  caseId: string;
}

export interface CustomerNotificationState {
  visible: boolean;
  channel: string;
  subject: string;
  amount: string;
  time: string;
}

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
  graphHighlightPath: string[];
  setGraphHighlightPath: (ids: string[]) => void;

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

  // Demo State
  demoMode: boolean;
  setDemoMode: (b: boolean) => void;
  activeScenario: ScenarioScript | null;
  setActiveScenario: (script: ScenarioScript | null) => void;
  demoInvestigationReasons: string[];
  setDemoInvestigationReasons: (reasons: string[]) => void;
  demoInvestigationConfidence: number;
  setDemoInvestigationConfidence: (v: number) => void;
  addDemoAuditEntry: (entry: { event: string; severity: string }) => void;
  freezeModal: FreezeModalState | null;
  openFreezeModal: (payload: any) => void;
  closeFreezeModal: () => void;
  customerNotification: CustomerNotificationState | null;
  showCustomerNotification: (payload: any) => void;
  hideCustomerNotification: () => void;
  scenarioComplete: ScenarioScript | null;
  setScenarioComplete: (script: ScenarioScript | null) => void;
  sarDraftVisible: boolean;
  sarCaseId: string;
  setSarDraftOpen: (caseId: string) => void;
  closeSarDraft: () => void;
  replayVisible: boolean;
  setReplayVisible: (b: boolean) => void;
  replayTimeMs: number;
  setReplayTimeMs: (ms: number) => void;
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
  graphHighlightPath: [],
  setGraphHighlightPath: (ids) => set({ graphHighlightPath: ids }),

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

  // Demo State
  demoMode: false,
  setDemoMode: (b) => set({ demoMode: b }),
  activeScenario: null,
  setActiveScenario: (script) => set({ activeScenario: script }),
  demoInvestigationReasons: [],
  setDemoInvestigationReasons: (reasons) => set((s) => ({ demoInvestigationReasons: [...s.demoInvestigationReasons, ...reasons] })),
  demoInvestigationConfidence: 0,
  setDemoInvestigationConfidence: (v) => set({ demoInvestigationConfidence: v }),
  addDemoAuditEntry: (entry) => set((s) => ({
    activeInvestigation: s.activeInvestigation ? {
      ...s.activeInvestigation,
      audit: [...s.activeInvestigation.audit, { ...entry, timestamp: Date.now() / 1000 } as any]
    } : null
  })),
  freezeModal: null,
  openFreezeModal: (payload) => set({ freezeModal: { open: true, ...payload } }),
  closeFreezeModal: () => set({ freezeModal: null }),
  customerNotification: null,
  showCustomerNotification: (payload) => set({ customerNotification: { visible: true, ...payload, time: new Date().toLocaleTimeString('en-GB', { hour12: false }) } }),
  hideCustomerNotification: () => set({ customerNotification: null }),
  scenarioComplete: null,
  setScenarioComplete: (script) => set({ scenarioComplete: script }),
  sarDraftVisible: false,
  sarCaseId: '',
  setSarDraftOpen: (caseId) => set({ sarDraftVisible: true, sarCaseId: caseId }),
  closeSarDraft: () => set({ sarDraftVisible: false, sarCaseId: '' }),
  replayVisible: false,
  setReplayVisible: (b) => set({ replayVisible: b }),
  replayTimeMs: 0,
  setReplayTimeMs: (ms) => set({ replayTimeMs: ms }),
}));
