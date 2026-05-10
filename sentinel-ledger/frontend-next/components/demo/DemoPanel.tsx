import { useDashboardStore } from '@/lib/store';
import { SCENARIOS } from '@/lib/demo/scenarios';
import { Play } from 'lucide-react';
import { ScenarioRunner } from '@/lib/demo/runner';
import { useEffect, useRef } from 'react';

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
              
              <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 11, gap: 4 }} onClick={(e) => { e.stopPropagation(); handlePlay(scenario); }}>
                <Play size={10} /> Play
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
