'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

export function HITLBar() {
  const { activeInvestigation, hitlVisible, setHitlVisible, setActiveInvestigation, setSystemStatus, setReplayVisible, setReplayTimeMs, activeScenario } = useDashboardStore();
  const [acting, setActing] = useState(false);

  const handleAction = useCallback(async (action: 'approve' | 'reject') => {
    if (!activeInvestigation || acting) return;
    setActing(true);
    try {
      const fn = action === 'approve' ? api.approve : api.reject;
      await fn(activeInvestigation.tx_id);

      setActiveInvestigation({
        ...activeInvestigation,
        transaction: {
          ...activeInvestigation.transaction,
          status: action === 'approve' ? 'approved' : 'rejected',
        },
        audit: [
          ...activeInvestigation.audit,
          {
            ts: Date.now() / 1000,
            event: `Human decision: ${action.toUpperCase()} — operator signed`,
            severity: action === 'approve' ? 'success' : 'danger',
            signature: `OPR-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
            prev_hash: activeInvestigation.audit[activeInvestigation.audit.length - 1]?.signature ?? '0x0',
          },
        ],
      });
      setSystemStatus({ pendingHitlCount: 0 });
      setTimeout(() => setHitlVisible(false), 300);
    } catch { /* ignore */ } finally {
      setActing(false);
    }
  }, [activeInvestigation, acting, setActiveInvestigation, setHitlVisible, setSystemStatus]);

  if (!hitlVisible) return null;

  return (
    <div className="hitl-appear" style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 10px',
      background: 'var(--color-background-danger)',
      borderTop: '0.5px solid var(--color-border-danger)',
      height: '100%',
    }}>
      <span style={{ fontSize: 10, color: 'var(--color-text-danger)', fontWeight: 700, letterSpacing: '.06em', flex: 1 }}>
        ESCALATED — HUMAN REVIEW
      </span>

      <button onClick={() => handleAction('approve')} disabled={acting} className="btn btn-success" aria-label="Approve">
        <CheckCircle2 size={11} />
        Approve
      </button>

      <button onClick={() => handleAction('reject')} disabled={acting} className="btn btn-danger" aria-label="Reject">
        <XCircle size={11} />
        Reject
      </button>

      <button className="btn btn-neutral" aria-label="Replay" onClick={() => {
        if (activeScenario) {
          setReplayVisible(true);
          const maxTime = activeScenario.timeline[activeScenario.timeline.length - 1].delayMs;
          setReplayTimeMs(maxTime);
        }
      }}>
        <PlayCircle size={11} />
        Replay
      </button>
    </div>
  );
}
