'use client';

import { useMemo } from 'react';
import { ShieldX } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { AgentItem } from './AgentItem';
import type { AgentEvent, AgentState } from '@/lib/types';

const AGENT_ORDER = [
  'Transaction Intelligence',
  'Wallet Reputation',
  'Compliance Policy',
  'Explainability',
  'Governance Sentinel',
  'Audit Agent',
];

export function AgentFeed() {
  const { agentEvents, activeInvestigation, injectionBlocked, injectionPattern } = useDashboardStore();

  const agentMap = useMemo(() => {
    const map = new Map<string, AgentEvent[]>();
    for (const agent of AGENT_ORDER) map.set(agent, []);
    for (const ev of agentEvents) {
      if (!map.has(ev.agent)) map.set(ev.agent, []);
      map.get(ev.agent)!.push(ev);
    }
    return map;
  }, [agentEvents]);

  const getState = (agent: string): AgentState => {
    const events = agentMap.get(agent);
    if (!events || events.length === 0) return 'idle';
    return events[events.length - 1].state;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '0.5px solid var(--color-border-tertiary)', height: '100%' }}>
      <div className="panel-hd">
        Agent Pipeline
        {activeInvestigation && (
          <span className="mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>
            {activeInvestigation.tx_id.slice(0, 14)}
          </span>
        )}
      </div>

      {/* Injection alert banner */}
      {injectionBlocked && (
        <div className="injection-alert" style={{ margin: '6px 8px', borderRadius: 'var(--border-radius-md)', padding: '8px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ShieldX size={12} style={{ color: 'var(--color-text-danger)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-danger)', letterSpacing: '.04em' }}>
              PROMPT INJECTION BLOCKED
            </span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
            Malicious payload detected in transaction memo. Pipeline suspended.
          </div>
          {injectionPattern && (
            <code style={{
              display: 'block', fontSize: 9, fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-danger)',
              background: 'rgba(239,68,68,0.12)', padding: '4px 7px',
              borderRadius: 3, wordBreak: 'break-all',
            }}>
              {injectionPattern}
            </code>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeInvestigation ? (
          AGENT_ORDER.map((agent) => (
            <AgentItem
              key={agent}
              agent={agent}
              state={getState(agent)}
              lines={agentMap.get(agent) ?? []}
            />
          ))
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 11 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>⬡</div>
            Select a transaction to view agent activity
          </div>
        )}
      </div>
    </div>
  );
}
