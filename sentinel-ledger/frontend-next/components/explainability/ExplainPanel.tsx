'use client';

import { useDashboardStore } from '@/lib/store';
import { ConfidenceBar } from './ConfidenceBar';

function ReasonIcon({ reason }: { reason: string }) {
  const r = reason.toLowerCase();
  if (r.includes('mixer') || r.includes('tornado')) return <span style={{ color: '#8b5cf6' }}>◈</span>;
  if (r.includes('sanction') || r.includes('ofac')) return <span style={{ color: 'var(--color-text-danger)' }}>⊗</span>;
  if (r.includes('velocity') || r.includes('threshold')) return <span style={{ color: 'var(--color-text-warning)' }}>⚡</span>;
  if (r.includes('structuring') || r.includes('9,800') || r.includes('9800')) return <span style={{ color: 'var(--color-text-danger)' }}>≈</span>;
  if (r.includes('taint')) return <span style={{ color: 'var(--color-text-danger)' }}>◉</span>;
  if (r.includes('inject') || r.includes('prompt')) return <span style={{ color: 'var(--color-text-danger)' }}>⚠</span>;
  return <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>;
}

export function ExplainPanel() {
  const { activeInvestigation, demoMode, demoInvestigationReasons, demoInvestigationConfidence } = useDashboardStore();

  if (!activeInvestigation) {
    return (
      <div style={{
        padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-text-tertiary)', fontSize: 11, height: '100%',
        flexDirection: 'column', gap: 6,
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}>
        <span style={{ fontSize: 18 }}>⬡</span>
        <span>No active investigation</span>
      </div>
    );
  }

  const { governance_decision } = activeInvestigation;
  const reasons = demoMode ? demoInvestigationReasons : activeInvestigation.reasons;
  const confidence = demoMode ? demoInvestigationConfidence : activeInvestigation.confidence;
  const decisionLabel = String(governance_decision).replace(/_/g, ' ');
  const decisionColor =
    String(governance_decision).includes('BLOCK') || String(governance_decision).includes('INJECT')
      ? 'var(--color-text-danger)'
      : String(governance_decision).includes('ESCALATE')
        ? 'var(--color-text-warning)'
        : 'var(--color-text-success)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <div className="panel-hd">
        Explainability
        <span style={{ fontSize: 9, fontWeight: 700, color: decisionColor, letterSpacing: '.04em' }}>
          {decisionLabel}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 8px' }}>
        <div style={{ marginBottom: 12 }}>
          <ConfidenceBar confidence={confidence} />
        </div>

        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Evidence
        </div>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {reasons.map((reason, i) => (
            <li key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
              <span style={{ flexShrink: 0, marginTop: 1, fontSize: 12 }}><ReasonIcon reason={reason} /></span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
