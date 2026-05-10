'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Plus, PlayCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

interface Props {
  onNewTx: () => void;
}

export function TopBar({ onNewTx }: Props) {
  const { agentsOnline, pendingHitlCount, injectionAttempts, systemOk, demoMode, setDemoMode } = useDashboardStore();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const alertCount = pendingHitlCount + injectionAttempts;

  return (
    <header style={{
      gridArea: 'topbar',
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '0 16px',
      background: 'var(--color-background-primary)',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      zIndex: 50, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, userSelect: 'none' }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.08em', color: 'var(--color-text-primary)' }}>
          SENTINEL&nbsp;
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.08em', color: 'var(--color-text-danger)' }}>
          LEDGER
        </span>
      </div>

      <div style={{ width: '0.5px', height: 18, background: 'var(--color-border-tertiary)' }} />

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
        <span className="pulse" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: systemOk ? 'var(--color-text-success)' : 'var(--color-text-danger)', flexShrink: 0 }} />
        Live
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
        Agents:&nbsp;
        <span style={{ color: agentsOnline === 6 ? 'var(--color-text-success)' : 'var(--color-text-warning)', fontWeight: 600 }}>
          {agentsOnline}/6
        </span>
      </div>

      {alertCount > 0 && (
        <div className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={10} />
          {alertCount} alert{alertCount !== 1 ? 's' : ''}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Demo Mode Toggle */}
      <button
        onClick={() => setDemoMode(!demoMode)}
        className={`btn ${demoMode ? 'btn-primary' : ''}`}
        style={{ gap: 6 }}
      >
        <PlayCircle size={12} />
        {demoMode ? 'Exit Demo' : 'Demo Mode'}
      </button>

      {/* New Transaction button */}
      <button
        onClick={onNewTx}
        className="btn btn-primary"
        aria-label="Analyze new transaction"
      >
        <Plus size={12} />
        New Transaction
      </button>

      <div style={{ width: '0.5px', height: 18, background: 'var(--color-border-tertiary)' }} />

      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
        NORDA Bank&nbsp;·&nbsp;AML Compliance&nbsp;·&nbsp;
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{clock}</span>
      </div>
    </header>
  );
}
