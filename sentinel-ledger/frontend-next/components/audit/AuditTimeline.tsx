'use client';

import { useDashboardStore } from '@/lib/store';
import { AuditEntry } from './AuditEntry';

export function AuditTimeline() {
  const { activeInvestigation } = useDashboardStore();
  const records = activeInvestigation?.audit ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '0.5px solid var(--color-border-tertiary)', height: '100%' }}>
      <div className="panel-hd">
        Audit Trail
        {records.length > 0 && (
          <span style={{ fontSize: 9, color: 'var(--color-text-success)', fontWeight: 600 }}>
            ✓ Chain OK
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 6px 10px' }}>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 11, paddingTop: 20 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>◎</div>
            No events recorded
          </div>
        ) : (
          records.map((r, i) => (
            <AuditEntry key={i} record={r} isLast={i === records.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}
