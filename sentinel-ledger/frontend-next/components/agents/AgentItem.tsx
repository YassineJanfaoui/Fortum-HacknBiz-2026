import type { AgentEvent, AgentState } from '@/lib/types';

interface Props {
  agent: string;
  state: AgentState;
  lines: AgentEvent[];
}

const STATE_COLOR: Record<AgentState, string> = {
  active:  'var(--color-text-success)',
  warn:    'var(--color-text-warning)',
  blocked: 'var(--color-text-danger)',
  idle:    'var(--color-text-tertiary)',
};

const STATE_LABEL: Record<AgentState, string> = {
  active:  'ACTIVE',
  warn:    'FLAGGED',
  blocked: 'BLOCKED',
  idle:    'IDLE',
};

export function AgentItem({ agent, state, lines }: Props) {
  const color = STATE_COLOR[state];
  const lastLines = lines.slice(-3);

  return (
    <div style={{
      padding: '8px 10px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      background: state === 'blocked'
        ? 'var(--color-background-danger)'
        : state === 'warn'
          ? 'var(--color-background-warning)'
          : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
          ...(state === 'active' ? { boxShadow: `0 0 4px ${color}` } : {}),
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>
          {agent}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color }}>
          {STATE_LABEL[state]}
        </span>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-tertiary)' }}>
        {lastLines.length === 0 ? (
          <span>Waiting…</span>
        ) : (
          lastLines.map((ev, i) => (
            <div key={i} style={{
              paddingLeft: 13,
              color: ev.line.toUpperCase().includes('BLOCK') || ev.line.toUpperCase().includes('INJECT') || ev.line.toUpperCase().includes('HALT')
                ? 'var(--color-text-danger)'
                : ev.line.toUpperCase().includes('ESCALATE') || ev.line.toUpperCase().includes('FLAG') || ev.line.toUpperCase().includes('WARN')
                  ? 'var(--color-text-warning)'
                  : 'var(--color-text-tertiary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {ev.line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
