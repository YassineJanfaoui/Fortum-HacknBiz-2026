import { useDashboardStore } from '@/lib/store';
import { CheckCircle2 } from 'lucide-react';

export function ScenarioCompleteModal() {
  const { scenarioComplete, setScenarioComplete, setActiveScenario } = useDashboardStore();

  if (!scenarioComplete) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 8, width: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '24px', borderBottom: '1px solid var(--color-border-tertiary)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <CheckCircle2 size={24} color="var(--color-text-success)" />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Investigation complete
          </h2>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 }}>
            <span>Scenario:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{scenarioComplete.title}</span>
            
            <span>Decision:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{scenarioComplete.expectedDecision}</span>
            
            <span>Action:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{scenarioComplete.hitlAction}</span>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 8, letterSpacing: '0.05em' }}>NARRATIVE</div>
            <div style={{ color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{scenarioComplete.narrativeSummary}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 8, letterSpacing: '0.05em' }}>REGULATORY CONTEXT</div>
            <div style={{ color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{scenarioComplete.regulatoryContext}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 8, letterSpacing: '0.05em' }}>BANK ACTION</div>
            <div style={{ color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{scenarioComplete.bankAction}</div>
          </div>
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--color-border-tertiary)',
          background: 'var(--color-background-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 12,
          borderBottomLeftRadius: 8, borderBottomRightRadius: 8
        }}>
          <button className="btn" onClick={() => setScenarioComplete(null)}>Close</button>
          <button className="btn btn-primary" onClick={() => {
            const script = scenarioComplete;
            setScenarioComplete(null);
            // Wait a tick then restart
            setTimeout(() => {
              // We dispatch to the runner which is managed in DemoPanel
              // Since the runner isn't globally exposed, we might just set the scenario again if we want to restart
            }, 10);
          }}>
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
