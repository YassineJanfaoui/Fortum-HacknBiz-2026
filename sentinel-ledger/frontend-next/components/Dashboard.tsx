'use client';

import { useCallback, useEffect, useState } from 'react';
import { TopBar } from './topbar/TopBar';
import { TransactionFeed } from './feed/TransactionFeed';
import { WalletGraph } from './graph/WalletGraph';
import { AgentFeed } from './agents/AgentFeed';
import { ExplainPanel } from './explainability/ExplainPanel';
import { AuditTimeline } from './audit/AuditTimeline';
import { HITLBar } from './hitl/HITLBar';
import { NewTransactionModal } from './NewTransactionModal';
import { useDashboardStore } from '@/lib/store';

export function Dashboard() {
  const { setSelectedNodeId, hitlVisible } = useDashboardStore();
  const [showModal, setShowModal] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      (document.querySelector('input[placeholder*="0x"]') as HTMLInputElement)?.focus();
    }
    if (e.key === 'Escape') {
      if (showModal) setShowModal(false);
      else setSelectedNodeId(null);
    }
  }, [setSelectedNodeId, showModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateRows: '44px 1fr',
        gridTemplateColumns: '260px 1fr 280px',
        gridTemplateAreas: '"topbar topbar topbar" "feed graph right"',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-background-tertiary)',
      }}>
        <TopBar onNewTx={() => setShowModal(true)} />

        <TransactionFeed />

        <main style={{
          gridArea: 'graph',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-background-primary)',
          borderRight: '0.5px solid var(--color-border-tertiary)',
          borderLeft: '0.5px solid var(--color-border-tertiary)',
        }}>
          <WalletGraph />
        </main>

        <aside style={{
          gridArea: 'right',
          display: 'grid',
          gridTemplateRows: hitlVisible ? '1fr 170px 190px 52px' : '1fr 170px 190px',
          overflow: 'hidden',
          background: 'var(--color-background-primary)',
        }}>
          <AgentFeed />
          <ExplainPanel />
          <AuditTimeline />
          {hitlVisible && <HITLBar />}
        </aside>
      </div>

      {showModal && <NewTransactionModal onClose={() => setShowModal(false)} />}
    </>
  );
}
