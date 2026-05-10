'use client';

import { useState } from 'react';
import type { AuditRecord, AuditSeverity } from '@/lib/types';
import { formatTimestamp } from '@/lib/format';

const SEVERITY_COLOR: Record<AuditSeverity, string> = {
  success: 'var(--color-text-success)',
  info:    'var(--color-text-info)',
  warn:    'var(--color-text-warning)',
  danger:  'var(--color-text-danger)',
};

interface Props {
  record: AuditRecord;
  isLast: boolean;
}

export function AuditEntry({ record, isLast }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = SEVERITY_COLOR[record.severity];

  return (
    <div style={{ position: 'relative', paddingLeft: 20, paddingBottom: isLast ? 0 : 12 }}>
      {!isLast && (
        <div style={{
          position: 'absolute', left: 7, top: 14, bottom: 0,
          width: '0.5px', background: 'var(--color-border-tertiary)',
        }} />
      )}

      <div style={{
        position: 'absolute', left: 3, top: 4,
        width: 8, height: 8, borderRadius: '50%',
        background: color,
        border: '1.5px solid var(--color-background-primary)',
        boxShadow: `0 0 4px ${color}66`,
      }} />

      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ textAlign: 'left', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
          {formatTimestamp(record.ts)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.35, marginBottom: record.policy ? 2 : 0 }}>
          {record.event}
        </div>
        {record.policy && (
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#14b8a6' }}>
            {record.policy}
          </div>
        )}
      </button>

      {expanded && (
        <div style={{
          marginTop: 6, padding: '6px 8px',
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-md)',
          border: '0.5px solid var(--color-border-tertiary)',
          fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)',
        }}>
          <div style={{ marginBottom: 2 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>SIG:</span>&nbsp;{record.signature?.slice(0, 32)}…
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>PREV:</span>&nbsp;{record.prev_hash?.slice(0, 24)}…
          </div>
        </div>
      )}
    </div>
  );
}
