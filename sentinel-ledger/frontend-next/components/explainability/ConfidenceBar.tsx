interface Props {
  confidence: number; // 0–100
}

export function ConfidenceBar({ confidence }: Props) {
  const safeConfidence = Number.isFinite(confidence) ? confidence : 0;
  const clamped = Math.min(100, Math.max(0, safeConfidence));
  const color =
    clamped >= 80 ? 'var(--color-text-danger)'
    : clamped >= 50 ? 'var(--color-text-warning)'
    : 'var(--color-text-success)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Risk Confidence</span>
        <span style={{ color, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{clamped}%</span>
      </div>
      <div style={{ width: '100%', height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${clamped}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 500ms ease' }} />
      </div>
    </div>
  );
}
