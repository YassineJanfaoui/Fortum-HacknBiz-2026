import { useDashboardStore } from '@/lib/store';
import { FileText, X } from 'lucide-react';

export function SARDraftPanel() {
  const { sarDraftVisible, sarCaseId, closeSarDraft, activeInvestigation } = useDashboardStore();

  if (!sarDraftVisible) return null;

  return (
    <div style={{
      position: 'fixed', top: 44, right: 0, bottom: 0, width: 400, maxWidth: '100vw', zIndex: 9000,
      background: 'var(--color-background-primary)',
      borderLeft: '1px solid var(--color-border-tertiary)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <div style={{
        padding: '16px', borderBottom: '1px solid var(--color-border-tertiary)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="var(--color-text-primary)" />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            SAR Draft Generated
          </h2>
        </div>
        <button className="btn" style={{ padding: 4 }} onClick={closeSarDraft}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border-tertiary)',
          borderRadius: 6, padding: 16, fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5
        }}>
{`CONFIDENTIAL - SUSPICIOUS ACTIVITY REPORT
TRACFIN / EU AML DIRECTIVE 6
=========================================
CASE ID:   ${sarCaseId || 'NORDA-AUTO-SAR'}
DATE:      ${new Date().toISOString().split('T')[0]}
INSTITUTION: NORDA Bank

1. SUSPECT INFORMATION
-----------------------------------------
Wallet Address: ${activeInvestigation?.transaction?.wallet_from || 'Unknown'}
Account Status: FROZEN PENDING REVIEW

2. TRANSACTION DETAILS
-----------------------------------------
Tx ID: ${activeInvestigation?.transaction?.tx_id || 'Unknown'}
Amount: ${activeInvestigation?.transaction?.amount_eur || 0} EURC
Asset: ${activeInvestigation?.transaction?.token || 'EURC'}
Jurisdiction: ${activeInvestigation?.transaction?.jurisdiction || 'Unknown'}

3. NARRATIVE / REASONS FOR SUSPICION
-----------------------------------------
Automated compliance engine flagged the following indicators:
${activeInvestigation?.reasons?.map(r => `- ${r}`).join('\n') || '- Suspicious pattern detected'}

4. ACTION TAKEN
-----------------------------------------
Transaction intercepted and blocked.
Customer account frozen.
SAR filed via automated integration.
`}
        </div>
      </div>
      
      <div style={{ padding: 16, borderTop: '1px solid var(--color-border-tertiary)' }}>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={closeSarDraft}>
          Submit to TRACFIN Portal
        </button>
      </div>
    </div>
  );
}
