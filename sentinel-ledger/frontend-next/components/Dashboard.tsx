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
import { DemoPanel } from './demo/DemoPanel';
import { FreezeModal } from './demo/FreezeModal';
import { CustomerNotificationToast } from './demo/CustomerNotificationToast';
import { SARDraftPanel } from './demo/SARDraftPanel';
import { ScenarioCompleteModal } from './demo/ScenarioCompleteModal';
import { ReplayScrubber } from './demo/ReplayScrubber';

export function Dashboard() {
  const { setSelectedNodeId, hitlVisible, demoMode, mobileTab, setMobileTab } = useDashboardStore();
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
      <div className="flex flex-col md:grid h-[100dvh] w-full overflow-hidden bg-[var(--color-background-tertiary)]" style={{
        gridTemplateRows: '44px 1fr',
        gridTemplateColumns: '260px minmax(0, 1fr) 280px',
        gridTemplateAreas: '"topbar topbar topbar" "feed graph right"',
      }}>
        <TopBar onNewTx={() => setShowModal(true)} />

        {/* Mobile Tabs Header */}
        <div className="flex md:hidden bg-[var(--color-background-primary)] border-b border-[var(--color-border-tertiary)] flex-shrink-0 z-10 w-full" style={{ gridArea: 'mobile-tabs' }}>
          <button className={`flex-1 py-3 text-xs font-semibold tracking-wide ${mobileTab === 'feed' ? 'text-[var(--color-text-info)] border-b-2 border-[var(--color-text-info)]' : 'text-[var(--color-text-secondary)]'}`} onClick={() => setMobileTab('feed')}>FEED</button>
          <button className={`flex-1 py-3 text-xs font-semibold tracking-wide ${mobileTab === 'graph' ? 'text-[var(--color-text-info)] border-b-2 border-[var(--color-text-info)]' : 'text-[var(--color-text-secondary)]'}`} onClick={() => setMobileTab('graph')}>GRAPH</button>
          <button className={`flex-1 py-3 text-xs font-semibold tracking-wide ${mobileTab === 'analysis' ? 'text-[var(--color-text-info)] border-b-2 border-[var(--color-text-info)]' : 'text-[var(--color-text-secondary)]'}`} onClick={() => setMobileTab('analysis')}>ANALYSIS</button>
        </div>

        <div className={`${mobileTab === 'feed' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-h-0 border-r border-[var(--color-border-tertiary)]`} style={{ gridArea: 'feed', overflow: 'hidden' }}>
          {demoMode ? <DemoPanel /> : <TransactionFeed />}
        </div>

        <main className={`${mobileTab === 'graph' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-h-0 bg-[var(--color-background-primary)] border-x border-[var(--color-border-tertiary)]`} style={{
          gridArea: 'graph',
          overflow: 'hidden',
        }}>
          <WalletGraph />
        </main>

        <aside className={`${mobileTab === 'analysis' ? 'flex' : 'hidden'} md:grid flex-col flex-1 min-h-0 overflow-y-auto md:overflow-hidden bg-[var(--color-background-primary)]`} style={{
          gridArea: 'right',
          gridTemplateRows: hitlVisible ? '1fr 170px 190px 52px' : '1fr 170px 190px',
        }}>
          <div className="h-[300px] md:h-auto overflow-hidden"><AgentFeed /></div>
          <div className="h-[200px] md:h-auto overflow-hidden"><ExplainPanel /></div>
          <div className="h-[200px] md:h-auto overflow-hidden"><AuditTimeline /></div>
          {hitlVisible && <div className="h-auto md:h-auto overflow-hidden border-t border-[var(--color-border-tertiary)]"><HITLBar /></div>}
        </aside>
      </div>

      {showModal && <NewTransactionModal onClose={() => setShowModal(false)} />}
      
      <FreezeModal />
      <CustomerNotificationToast />
      <SARDraftPanel />
      <ScenarioCompleteModal />
      <ReplayScrubber />
    </>
  );
}
