interface Props {
  ok: boolean;
  label?: string;
}

export function StatusIndicator({ ok, label = 'All systems operational' }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={label}>
      <span
        className={ok ? 'status-pulse' : ''}
        style={{
          display: 'inline-block',
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: ok ? 'var(--risk-low)' : 'var(--risk-high)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{ok ? 'LIVE' : 'DEGRADED'}</span>
    </div>
  );
}
