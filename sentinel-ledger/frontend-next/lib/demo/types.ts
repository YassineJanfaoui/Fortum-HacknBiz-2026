import type { AuditRecord, GraphEdge, GraphNode, Transaction } from '@/lib/types';

export type HitlAction = 'none' | 'approve' | 'reject' | 'freeze' | 'notify-customer' | 'file-sar';
export type ScenarioDifficulty = 'low' | 'medium' | 'high' | 'critical';

export interface FreezeDetail {
  accountId: string;
  amount: number;
  token: string;
  reason: string;
  authority: string;
  caseId: string;
}

export interface ScenarioStep {
  delayMs: number;
  type:
    | 'agent-line'
    | 'graph-add-node'
    | 'graph-add-edge'
    | 'graph-highlight-path'
    | 'audit-entry'
    | 'reason-add'
    | 'confidence-set'
    | 'hitl-show'
    | 'injection-alert'
    | 'freeze-account'
    | 'send-notification'
    | 'sar-draft'
    | 'final';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

export interface ScenarioScript {
  id: string;
  title: string;
  shortLabel: string;
  difficulty: ScenarioDifficulty;
  expectedDecision: string;
  hitlAction: HitlAction;

  transaction: Transaction;
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };

  timeline: ScenarioStep[];

  finalReasons: string[];
  finalConfidence: number;
  finalAuditTrail: AuditRecord[];

  narrativeSummary: string;
  regulatoryContext: string;
  bankAction: string;
}
