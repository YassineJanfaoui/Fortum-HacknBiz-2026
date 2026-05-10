import type { ScenarioScript, ScenarioStep } from './types';

export interface RunnerDispatch {
  prependTransaction: (tx: ScenarioScript['transaction']) => void;
  setActiveInvestigation: (inv: {
    tx_id: string;
    transaction: ScenarioScript['transaction'];
    governance_decision: string;
    reasons: string[];
    confidence: number;
    agent_outputs: [];
    audit: ScenarioScript['finalAuditTrail'];
    nodes: [];
    edges: [];
  } | null) => void;
  setGraph: (nodes: ScenarioScript['subgraph']['nodes'], edges: ScenarioScript['subgraph']['edges']) => void;
  appendAgentEvent: (e: { agent: string; line: string; state: 'active' | 'warn' | 'blocked' | 'idle'; ts: number }) => void;
  clearAgentEvents: () => void;
  setHitlVisible: (b: boolean) => void;
  setInjectionBlocked: (b: boolean, pattern?: string) => void;
  setDemoInvestigationReasons: (reasons: string[]) => void;
  setDemoInvestigationConfidence: (v: number) => void;
  addDemoAuditEntry: (entry: { event: string; severity: string }) => void;
  openFreezeModal: (detail: ScenarioScript['timeline'][0]['payload']) => void;
  showCustomerNotification: (detail: ScenarioScript['timeline'][0]['payload']) => void;
  setScenarioComplete: (script: ScenarioScript | null) => void;
  setGraphHighlightPath: (ids: string[]) => void;
  setSarDraftOpen: (caseId: string) => void;
}

export class ScenarioRunner {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private script: ScenarioScript | null = null;

  constructor(private dispatch: RunnerDispatch) {}

  play(script: ScenarioScript) {
    this.abort();
    this.script = script;

    // Reset UI
    this.dispatch.clearAgentEvents();
    this.dispatch.setHitlVisible(false);
    this.dispatch.setInjectionBlocked(false);
    this.dispatch.setScenarioComplete(null);
    this.dispatch.setDemoInvestigationReasons([]);
    this.dispatch.setDemoInvestigationConfidence(0);
    this.dispatch.setGraphHighlightPath([]);

    // Seed initial state
    this.dispatch.prependTransaction(script.transaction);
    this.dispatch.setActiveInvestigation({
      tx_id: script.transaction.tx_id,
      transaction: script.transaction,
      governance_decision: script.expectedDecision,
      reasons: [],
      confidence: 0,
      agent_outputs: [],
      audit: [],
      nodes: [],
      edges: [],
    });
    this.dispatch.setGraph(script.subgraph.nodes, script.subgraph.edges);

    // Schedule timeline steps
    for (const step of script.timeline) {
      const t = setTimeout(() => this._execute(step, script), step.delayMs);
      this.timers.push(t);
    }
  }

  abort() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.script = null;
  }

  private _execute(step: ScenarioStep, script: ScenarioScript) {
    const ts = Date.now() / 1000;
    switch (step.type) {
      case 'agent-line':
        this.dispatch.appendAgentEvent({ ...step.payload, ts });
        break;
      case 'audit-entry':
        this.dispatch.addDemoAuditEntry(step.payload);
        break;
      case 'reason-add':
        // We accumulate reasons via setDemoInvestigationReasons which appends
        this.dispatch.setDemoInvestigationReasons([step.payload]);
        break;
      case 'confidence-set':
        this.dispatch.setDemoInvestigationConfidence(step.payload as number);
        break;
      case 'hitl-show':
        this.dispatch.setHitlVisible(true);
        break;
      case 'injection-alert':
        this.dispatch.setInjectionBlocked(true, step.payload as string);
        break;
      case 'freeze-account':
        this.dispatch.openFreezeModal(step.payload);
        break;
      case 'send-notification':
        this.dispatch.showCustomerNotification(step.payload);
        break;
      case 'graph-highlight-path':
        this.dispatch.setGraphHighlightPath(step.payload as string[]);
        break;
      case 'sar-draft':
        this.dispatch.setSarDraftOpen(step.payload as string);
        break;
      case 'final':
        this.dispatch.setScenarioComplete(script);
        break;
      default:
        break;
    }
  }
}
