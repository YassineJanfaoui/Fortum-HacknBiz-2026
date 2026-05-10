interface Props {
  confidence: number; // 0–100
}

export function ConfidenceBar({ confidence }: Props) {
  const clamped = Math.min(100, Math.max(0, confidence));
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
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${clamped}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      </div>
    </div>
  );
}
