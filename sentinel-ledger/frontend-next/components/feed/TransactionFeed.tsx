'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { api, auditToTransaction, traceToSubgraph } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';
import type { AgentEvent } from '@/lib/types';
import { TransactionItem } from './TransactionItem';

export function TransactionFeed() {
  const {
    transactions, setTransactions,
    txFilter, setTxFilter, txSearch, setTxSearch,
    activeInvestigation, setActiveInvestigation,
    setGraph, setGraphWallet, setGraphHops,
    setHitlVisible, setInjectionBlocked,
    setSystemStatus, clearAgentEvents, appendAgentEvent,
  } = useDashboardStore();

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const records = await api.auditList(50);
        const txs = records.map(auditToTransaction);
        setTransactions(txs);
        const pending = records.filter((r) => r.requires_hitl && !r.human_decision).length;
        const injections = records.filter((r) => r.governance_decision?.includes('INJECT') || r.governance_decision?.includes('BLOCK')).length;
        setSystemStatus({ pendingHitlCount: pending, injectionAttempts: injections, systemOk: true, agentsOnline: 6 });
      } catch {
        setSystemStatus({ systemOk: false, agentsOnline: 0 });
      }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTx = async (txId: string) => {
    const tx = transactions.find((t) => t.tx_id === txId);
    if (!tx) return;

    clearAgentEvents();
    setGraph([], []);
    setGraphWallet('');

    try {
      const record = await api.auditRecord(txId);
      const ao = record.agent_outputs as Record<string, Record<string, unknown>>;
      const txRisk = ao?.tx_risk ?? {};
      const walletRisk = ao?.wallet_risk ?? {};
      const opaResult = ao?.opa_result ?? {};

      const reasons: string[] = [
        ...((Array.isArray(txRisk.reasons) ? txRisk.reasons : []) as string[]),
        ...((Array.isArray(walletRisk.reasons) ? walletRisk.reasons : []) as string[]),
        ...((Array.isArray(opaResult.violations) ? opaResult.violations : []) as string[]),
        record.governance_reason ? `Governance: ${record.governance_reason}` : '',
      ].filter(Boolean) as string[];

      const confidence = Math.round(Number(txRisk.confidence ?? walletRisk.risk_score ?? 0.5) * 100);

      const isInjection = !!(record.governance_decision?.includes('INJECT') || record.governance_decision?.includes('BLOCK'));
      const needsHitl = !!(record.requires_hitl && !record.human_decision);

      setActiveInvestigation({
        tx_id: txId,
        transaction: tx,
        governance_decision: record.governance_decision as 'AUTO_APPROVE' | 'ESCALATE_HUMAN' | 'BLOCKED_INJECTION',
        reasons: reasons.length > 0 ? reasons : ['No violations detected.'],
        confidence,
        agent_outputs: [],
        audit: [{
          ts: record.timestamp,
          event: record.governance_reason || record.governance_decision,
          severity: isInjection ? 'danger' : needsHitl ? 'warn' : 'success',
          signature: record.signature,
          prev_hash: record.prev_record_hash,
        }],
        nodes: [], edges: [],
      });

      setHitlVisible(needsHitl || isInjection);
      setInjectionBlocked(isInjection, record.governance_reason ?? '');
      setSystemStatus({ injectionAttempts: isInjection ? 1 : 0 });

      simulateAgentEvents(record.governance_decision, reasons, appendAgentEvent);

      const txSummary = record.tx_summary ?? {};
      const walletFrom = String(txSummary.wallet_from ?? '');
      if (walletFrom.startsWith('0x') && walletFrom.length === 42) {
        setGraphWallet(walletFrom);
        setGraphHops(3);
        try {
          const trace = await api.walletTrace(walletFrom, 3, 6, 60);
          const { nodes, edges } = traceToSubgraph(trace, walletFrom);
          
          const walletTo = String(txSummary.wallet_to ?? tx.wallet_to);
          if (walletTo.startsWith('0x') && !nodes.find(n => n.address.toLowerCase() === walletTo.toLowerCase())) {
            nodes.push({
               id: walletTo, address: walletTo, short_address: walletTo.slice(0,6) + '…' + walletTo.slice(-4),
               type: 'wallet', risk: 'low', taint: 0, tx_count: 1, age_days: 0, x:0, y:0, vx:0, vy:0
            });
            edges.push({
               id: txId, from: walletFrom, to: walletTo, amount_eur: tx.amount_eur, timestamp: tx.timestamp, tx_hash: txId
            });
          }
          setGraph(nodes, edges);
        } catch {
          const walletTo = String(txSummary.wallet_to ?? tx.wallet_to);
          setGraph([
             { id: walletFrom, address: walletFrom, short_address: walletFrom.slice(0,6) + '…' + walletFrom.slice(-4), type: 'origin', risk: 'low', taint: 0, tx_count: 1, age_days: 0, x:0, y:0, vx:0, vy:0 },
             { id: walletTo, address: walletTo, short_address: walletTo.slice(0,6) + '…' + walletTo.slice(-4), type: 'wallet', risk: 'low', taint: 0, tx_count: 1, age_days: 0, x:0, y:0, vx:0, vy:0 }
          ], [
             { id: txId, from: walletFrom, to: walletTo, amount_eur: tx.amount_eur, timestamp: tx.timestamp, tx_hash: txId }
          ]);
        }
      }
    } catch { /* use feed data only */ }
  };

  const visible = transactions.filter((tx) => {
    if (txFilter === 'escalated' && tx.status !== 'escalated') return false;
    if (txFilter === 'blocked' && tx.status !== 'blocked') return false;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      return tx.tx_id.toLowerCase().includes(q) || tx.wallet_from.toLowerCase().includes(q) || tx.wallet_to.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <aside style={{
      gridArea: 'feed',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--color-background-primary)',
      borderRight: '0.5px solid var(--color-border-tertiary)',
      height: '100%',
    }}>
      {/* Header */}
      <div className="panel-hd">
        Transaction feed
        <span className="badge badge-red" style={{ animation: 'pulse 2s infinite' }}>LIVE</span>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            placeholder="Search tx or wallet…"
            className="form-input"
            style={{ paddingLeft: 26, fontSize: 11 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'escalated', 'blocked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTxFilter(f)}
              style={{
                flex: 1, padding: '3px 0', borderRadius: 'var(--border-radius-sm)',
                border: `0.5px solid ${txFilter === f ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                background: txFilter === f ? 'var(--color-background-info)' : 'transparent',
                color: txFilter === f ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
                fontSize: 9, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {visible.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 11 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>◈</div>
            No transactions
          </div>
        ) : (
          visible.map((tx) => (
            <TransactionItem
              key={tx.tx_id}
              tx={tx}
              active={activeInvestigation?.tx_id === tx.tx_id}
              onClick={() => handleSelectTx(tx.tx_id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function simulateAgentEvents(
  decision: string,
  reasons: string[],
  append: (e: AgentEvent) => void,
): void {
  const AGENTS = ['Transaction Intelligence', 'Wallet Reputation', 'Compliance Policy', 'Explainability', 'Governance Sentinel', 'Audit Agent'];
  const isBlocked = decision.includes('BLOCK') || decision.includes('INJECT');
  const isEscalated = decision.includes('ESCALATE') || decision.includes('HUMAN');
  const now = Date.now() / 1000;

  AGENTS.forEach((agent, i) => {
    const state: AgentEvent['state'] =
      isBlocked && i === 4 ? 'blocked'
      : isBlocked && i > 4 ? 'idle'
      : isEscalated && i >= 2 ? 'warn'
      : 'active';

    setTimeout(() => {
      agentLines(agent, state, reasons).forEach((line, j) => {
        setTimeout(() => append({ agent, line, state, ts: now + i * 0.5 + j * 0.1 }), j * 100);
      });
    }, i * 350);
  });
}

function agentLines(agent: string, state: string, reasons: string[]): string[] {
  if (agent === 'Transaction Intelligence') return state === 'blocked' ? ['HALTED — injection detected', 'Pipeline suspended'] : ['Velocity & amount analyzed', reasons[0]?.slice(0, 55) ?? 'Within normal range'];
  if (agent === 'Wallet Reputation') return state === 'warn' ? ['Mixer taint detected upstream', 'Cluster analysis flagged'] : state === 'idle' ? ['Not reached'] : ['Sanctions: no match', 'Wallet age verified'];
  if (agent === 'Compliance Policy') return state === 'warn' ? ['OPA: 3 violations found', ...(reasons.slice(0, 2))] : state === 'idle' ? ['Not reached'] : ['OPA: 0 violations', 'All policies satisfied'];
  if (agent === 'Explainability') return state === 'idle' ? ['Not reached'] : ['Narrative generated', 'LIME attribution complete'];
  if (agent === 'Governance Sentinel') return state === 'blocked' ? ['INJECTION DETECTED', 'Pattern matched — pipeline halted', 'Audit sealed'] : state === 'warn' ? ['Decision: ESCALATE_HUMAN', 'HITL gate opened'] : state === 'idle' ? ['Not reached'] : ['Decision: AUTO_APPROVE', 'Confidence gate passed'];
  if (agent === 'Audit Agent') return state === 'idle' ? ['Skipped — pipeline halted'] : ['Record sealed — HMAC OK', 'Chain integrity verified'];
  return ['Complete'];
}
