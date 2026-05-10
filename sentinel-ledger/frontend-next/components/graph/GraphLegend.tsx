const entries = [
  { color: '#3b82f6', label: 'Origin' },
  { color: '#8b5cf6', label: 'Mixer' },
  { color: '#dc2626', label: 'Sanctioned' },
  { color: '#14b8a6', label: 'Exchange' },
  { color: '#475569', label: 'Wallet' },
];

const riskEntries = [
  { color: '#dc2626', label: 'Critical' },
  { color: '#ef4444', label: 'High' },
  { color: '#f59e0b', label: 'Medium' },
  { color: '#22c55e', label: 'Low' },
];

export function GraphLegend() {
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12,
      background: 'rgba(7,13,26,0.88)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '8px 10px',
      display: 'flex', gap: 14,
      fontSize: 10, color: 'var(--color-text-tertiary)',
      backdropFilter: 'blur(8px)',
      userSelect: 'none',
    }}>
      <div>
        <div style={{ marginBottom: 4, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Type</div>
        {entries.map((e) => (
          <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: e.color, display: 'inline-block', flexShrink: 0 }} />
            {e.label}
          </div>
        ))}
      </div>
      <div>
        <div style={{ marginBottom: 4, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Risk ring</div>
        {riskEntries.map((e) => (
          <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', border: `1.5px solid ${e.color}`, display: 'inline-block', flexShrink: 0 }} />
            {e.label}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9 }}>
        <div style={{ marginBottom: 4, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Controls</div>
        <div>Scroll — zoom</div>
        <div>Drag — pan</div>
        <div>Click — select</div>
        <div>Dbl-click — expand</div>
      </div>
    </div>
  );
}
