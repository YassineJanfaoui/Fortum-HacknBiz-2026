import { useDashboardStore } from '@/lib/store';
import { SCENARIOS } from '@/lib/demo/scenarios';
import { Play, List, X, ShieldAlert } from 'lucide-react';
import { ScenarioRunner } from '@/lib/demo/runner';
import { useEffect, useRef, useState } from 'react';

export function DemoPanel() {
  const {
    activeScenario, setActiveScenario, setDemoMode,
    prependTransaction, setActiveInvestigation, setGraph,
    appendAgentEvent, clearAgentEvents, setHitlVisible,
    setInjectionBlocked, setDemoInvestigationReasons,
    setDemoInvestigationConfidence, addDemoAuditEntry,
    openFreezeModal, showCustomerNotification, setScenarioComplete,
    setGraphHighlightPath, setSarDraftOpen
  } = useDashboardStore();

  const runnerRef = useRef<ScenarioRunner | null>(null);
  const [showTxDetails, setShowTxDetails] = useState<typeof SCENARIOS[0] | null>(null);

  useEffect(() => {
    runnerRef.current = new ScenarioRunner({
      prependTransaction, setActiveInvestigation, setGraph,
      appendAgentEvent, clearAgentEvents, setHitlVisible,
      setInjectionBlocked, setDemoInvestigationReasons,
      setDemoInvestigationConfidence, addDemoAuditEntry,
      openFreezeModal, showCustomerNotification, setScenarioComplete,
      setGraphHighlightPath, setSarDraftOpen
    });

    return () => {
      runnerRef.current?.abort();
    };
  }, [
    prependTransaction, setActiveInvestigation, setGraph,
    appendAgentEvent, clearAgentEvents, setHitlVisible,
    setInjectionBlocked, setDemoInvestigationReasons,
    setDemoInvestigationConfidence, addDemoAuditEntry,
    openFreezeModal, showCustomerNotification, setScenarioComplete,
    setGraphHighlightPath, setSarDraftOpen
  ]);

  const handlePlay = (scenario: typeof SCENARIOS[0]) => {
    setActiveScenario(scenario);
    runnerRef.current?.play(scenario);
  };

  return (
    <>
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--color-background-secondary)',
      borderRight: '0.5px solid var(--color-border-tertiary)',
      overflowY: 'auto'
    }}>
      <div style={{
        padding: '16px', borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: 'var(--color-background-secondary)', zIndex: 10
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Demo Scenarios
        </h2>
        <button className="btn" onClick={() => setDemoMode(false)} style={{ fontSize: 11, padding: '4px 8px' }}>
          Exit Demo
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SCENARIOS.map((scenario, i) => (
          <div key={scenario.id} style={{
            background: 'var(--color-background-primary)',
            border: `1px solid ${activeScenario?.id === scenario.id ? 'var(--color-text-primary)' : 'var(--color-border-tertiary)'}`,
            borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: activeScenario?.id === scenario.id ? '0 0 0 1px var(--color-text-primary)' : 'none'
          }} onClick={() => handlePlay(scenario)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {i + 1}. {scenario.title}
              </div>
              <div className={`badge badge-${
                scenario.difficulty === 'critical' ? 'red' :
                scenario.difficulty === 'high' ? 'orange' :
                scenario.difficulty === 'medium' ? 'yellow' : 'green'
              }`}>
                {scenario.difficulty}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {scenario.shortLabel}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: scenario.expectedDecision === 'AUTO_APPROVE' ? 'rgba(34, 197, 94, 0.1)' :
                            scenario.expectedDecision === 'AUTO_FREEZE' ? 'rgba(239, 68, 68, 0.1)' :
                            'rgba(245, 158, 11, 0.1)',
                color: scenario.expectedDecision === 'AUTO_APPROVE' ? 'var(--color-text-success)' :
                       scenario.expectedDecision === 'AUTO_FREEZE' ? 'var(--color-text-danger)' :
                       'var(--color-text-warning)',
              }}>
                {scenario.expectedDecision.replace('_', ' ')}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" style={{ padding: '4px 8px', fontSize: 11, gap: 4 }} onClick={(e) => { e.stopPropagation(); setShowTxDetails(scenario); }}>
                  <List size={10} /> Transactions
                </button>
                <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 11, gap: 4 }} onClick={(e) => { e.stopPropagation(); handlePlay(scenario); }}>
                  <Play size={10} /> Play
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {showTxDetails && (
      <div className="modal-overlay" onClick={() => setShowTxDetails(null)}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Transaction Details</h2>
            <button onClick={() => setShowTxDetails(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}><X size={16} /></button>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 11, maxHeight: '80vh', overflowY: 'auto' }}>
            <div>
              <label className="form-label">Transaction ID</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input mono" style={{ flex: 1, fontSize: 10 }} readOnly value={showTxDetails.transaction.tx_id} />
                <button type="button" className="btn btn-neutral" style={{ flexShrink: 0 }} disabled>Regen</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label className="form-label">wallet_from *</label>
                <input className="form-input mono" style={{ fontSize: 10 }} readOnly value={showTxDetails.transaction.wallet_from} />
              </div>
              <div>
                <label className="form-label">wallet_to *</label>
                <input className="form-input mono" style={{ fontSize: 10 }} readOnly value={showTxDetails.transaction.wallet_to} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-[10px]">
              <div>
                <label className="form-label">amount_eur (€) *</label>
                <input className="form-input" readOnly value={showTxDetails.transaction.amount_eur} />
              </div>
              <div>
                <label className="form-label">token</label>
                <input className="form-input" readOnly value={showTxDetails.transaction.token} />
              </div>
              <div>
                <label className="form-label">chain</label>
                <input className="form-input" readOnly value={showTxDetails.transaction.chain || 'ethereum'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label className="form-label">timestamp (unix)</label>
                <input className="form-input mono" style={{ fontSize: 10 }} readOnly value={showTxDetails.transaction.timestamp} />
              </div>
              <div>
                <label className="form-label">jurisdiction</label>
                <input className="form-input" readOnly value={showTxDetails.transaction.jurisdiction || 'EU'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label className="form-label">velocity_24h (tx count)</label>
                <input className="form-input" readOnly value={showTxDetails.transaction.velocity_24h ?? 'Optional'} />
              </div>
              <div>
                <label className="form-label">tx_count_7d</label>
                <input className="form-input" readOnly value={showTxDetails.transaction.tx_count_7d ?? 'Optional'} />
              </div>
            </div>
            <div>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>memo</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>Checked for prompt injection</span>
              </label>
              <textarea className="form-textarea" rows={3} readOnly value={showTxDetails.transaction.memo || 'Optional. Any attached message, note, or label.'} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 10px', borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-info)', border: '0.5px solid var(--color-border-info)',
            }}>
              <ShieldAlert size={13} style={{ color: 'var(--color-text-info)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                The <strong style={{ color: 'var(--color-text-primary)' }}>memo field</strong> is scanned by the Governance Sentinel for prompt injection attacks — patterns like{' '}
                <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,0.15)', padding: '1px 4px', borderRadius: 2 }}>IGNORE PREVIOUS INSTRUCTIONS</code>{' '}
                are automatically blocked and flagged.
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
