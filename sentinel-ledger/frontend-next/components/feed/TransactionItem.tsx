'use client';

import type { Transaction } from '@/lib/types';
import { formatEur, formatTimestamp, shortAddress } from '@/lib/format';

interface Props {
  tx: Transaction;
  active: boolean;
  onClick: () => void;
}

function riskBadge(risk: string) {
  if (risk === 'critical' || risk === 'high') return 'badge badge-red';
  if (risk === 'medium') return 'badge badge-amber';
  return 'badge badge-green';
}

function statusBadge(status: string) {
  if (status === 'blocked') return 'badge badge-red';
  if (status === 'escalated' || status === 'pending') return 'badge badge-amber';
  if (status === 'approved') return 'badge badge-green';
  return 'badge badge-neutral';
}

function riskBarColor(risk: string) {
  if (risk === 'critical' || risk === 'high') return 'var(--color-text-danger)';
  if (risk === 'medium') return 'var(--color-text-warning)';
  return 'var(--color-text-success)';
}

export function TransactionItem({ tx, active, onClick }: Props) {
  return (
    <div
      className="slide-in"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-pressed={active}
      style={{
        padding: '9px 10px',
        borderRadius: 'var(--border-radius-md)',
        border: `0.5px solid ${active ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
        marginBottom: 6,
        cursor: 'pointer',
        background: active ? 'var(--color-background-info)' : 'var(--color-background-primary)',
        transition: 'border-color 120ms, background 120ms',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-secondary)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-tertiary)'; }}
    >
      {/* Row 1: ID + risk */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {tx.tx_id.slice(0, 14)}
        </span>
        <span className={riskBadge(tx.risk_level)}>{tx.risk_level.toUpperCase()}</span>
      </div>

      {/* Row 2: wallets */}
      <div className="mono" style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {shortAddress(tx.wallet_from)} → {shortAddress(tx.wallet_to)}
      </div>

      {/* Row 3: amount + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
          {formatEur(tx.amount_eur)}
        </span>
        <span className={statusBadge(tx.status)}>{tx.status}</span>
      </div>

      {/* Risk bar */}
      <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border-tertiary)' }}>
        <div style={{
          height: 3, borderRadius: 2,
          width: `${Math.min(100, Math.max(0, tx.risk_pct))}%`,
          background: riskBarColor(tx.risk_level),
          transition: 'width 400ms ease',
        }} />
      </div>

      <div className="mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
        {formatTimestamp(tx.timestamp)}
      </div>
    </div>
  );
}
