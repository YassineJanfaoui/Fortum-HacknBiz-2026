import { useDashboardStore } from '@/lib/store';

export function FreezeModal() {
  const { freezeModal, closeFreezeModal } = useDashboardStore();

  if (!freezeModal?.open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 8, width: 520, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--color-border-tertiary)',
          background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-text-danger)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-danger)' }}>
            Account Freeze — Confirmation
          </h2>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <div className="grid grid-cols-1 md:grid-cols-[120px_minmax(0,1fr)] gap-2">
            <span>Account ID:</span>
            <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{freezeModal.accountId}</span>
            
            <span>Frozen amount:</span>
            <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-word' }}>
              {new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(freezeModal.amount)} {freezeModal.token}
            </span>
            
            <span>Reason:</span>
            <span style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{freezeModal.reason}</span>
            
            <span>Case file:</span>
            <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{freezeModal.caseId}</span>
            
            <span>Authority:</span>
            <span style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{freezeModal.authority}</span>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>Regulatory report — auto-generated:</div>
            <div style={{
              background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)',
              borderRadius: 4, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {`CASE: ${freezeModal.caseId}\nENTITY: ${freezeModal.accountId}\nACTION: FREEZE (Immediate)\nAUTHORITY: ${freezeModal.authority}\n\nAutomated block executed per NORDA AML Policy. Full SAR draft attached for regulatory submission.`}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-[12px] mt-2">
            <span>Operator e-signature:</span>
            <input type="text" placeholder="Type name to sign..." className="input" style={{ flex: 1 }} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-end gap-3 p-4 md:px-6 md:py-4 bg-[var(--color-background-secondary)] border-t border-[var(--color-border-tertiary)] rounded-b-lg">
          <button className="btn" onClick={closeFreezeModal}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'var(--color-text-danger)' }} onClick={closeFreezeModal}>
            Confirm freeze + file
          </button>
        </div>
      </div>
    </div>
  );
}
