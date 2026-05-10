'use client';

import { useCallback, useState } from 'react';
import { X, Send, Loader2, ShieldAlert } from 'lucide-react';
import { api, traceToSubgraph } from '@/lib/api';
import type { AnalyzeResponse } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

interface Props {
  onClose: () => void;
}

const CHAINS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bnb'];
const TOKENS = ['ETH', 'USDC', 'USDT', 'WBTC', 'DAI', 'MATIC', 'BNB'];
const JURISDICTIONS = ['EU', 'US', 'UK', 'CH', 'SG', 'AE', 'OTHER'];

function genTxId() {
  return '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

export function NewTransactionModal({ onClose }: Props) {
  const {
    prependTransaction, setActiveInvestigation, setHitlVisible,
    setInjectionBlocked, setSystemStatus, clearAgentEvents, appendAgentEvent,
    setGraph, setGraphWallet, setGraphHops,
  } = useDashboardStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const [form, setForm] = useState({
    tx_id:          genTxId(),
    wallet_from:    '',
    wallet_to:      '',
    amount_eur:     '',
    token:          'ETH',
    chain:          'ethereum',
    timestamp:      Math.floor(Date.now() / 1000).toString(),
    jurisdiction:   'EU',
    velocity_24h:   '',
    tx_count_7d:    '',
    memo:           '',
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.wallet_from.trim() || !form.wallet_to.trim() || !form.amount_eur) {
      setError('wallet_from, wallet_to and amount_eur are required.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        tx_id:        form.tx_id || genTxId(),
        wallet_from:  form.wallet_from.trim(),
        wallet_to:    form.wallet_to.trim(),
        amount_eur:   Number(form.amount_eur),
        token:        form.token,
        chain:        form.chain,
        timestamp:    Number(form.timestamp) || Math.floor(Date.now() / 1000),
        jurisdiction: form.jurisdiction,
        velocity_24h: form.velocity_24h ? Number(form.velocity_24h) : undefined,
        tx_count_7d:  form.tx_count_7d ? Number(form.tx_count_7d) : undefined,
        memo:         form.memo || undefined,
      };

      const resp = await api.analyze(payload);
      setResult(resp);

      const isInjection = resp.governance_decision?.includes('INJECT') || resp.governance_decision?.includes('BLOCK');
      const needsHitl   = resp.requires_hitl;

      // Build a Transaction from the response
      const tx = {
        tx_id:               payload.tx_id,
        tx_hash:             payload.tx_id.slice(0, 16),
        wallet_from:         payload.wallet_from,
        wallet_to:           payload.wallet_to,
        amount_eur:          payload.amount_eur,
        token:               payload.token,
        timestamp:           payload.timestamp,
        risk_level:          (resp.tx_risk?.risk_level as 'low' | 'medium' | 'high' | 'critical') ?? 'low',
        risk_pct:            Math.round((resp.tx_risk?.risk_score ?? 0) * 100),
        status:              isInjection ? 'blocked' as const : needsHitl ? 'escalated' as const : 'approved' as const,
        governance_decision: resp.governance_decision as 'AUTO_APPROVE' | 'ESCALATE_HUMAN' | 'BLOCKED_INJECTION',
      };

      prependTransaction(tx);

      const reasons: string[] = [
        ...((resp.tx_risk?.reasons ?? []) as string[]),
        ...((resp.wallet_risk?.reasons ?? []) as string[]),
        ...((resp.opa_result?.violations ?? []) as string[]),
        resp.governance_reason ? `Governance: ${resp.governance_reason}` : '',
      ].filter(Boolean) as string[];

      clearAgentEvents();
      setGraph([], []);
      setGraphWallet('');

      setActiveInvestigation({
        tx_id:               payload.tx_id,
        transaction:         tx,
        governance_decision: resp.governance_decision as 'AUTO_APPROVE' | 'ESCALATE_HUMAN' | 'BLOCKED_INJECTION',
        reasons:             reasons.length > 0 ? reasons : ['No violations detected.'],
        confidence:          Math.round((resp.tx_risk?.confidence ?? resp.tx_risk?.risk_score ?? 0.5) * 100),
        agent_outputs:       [],
        audit: [{
          ts:        payload.timestamp,
          event:     resp.governance_reason || resp.governance_decision,
          severity:  isInjection ? 'danger' : needsHitl ? 'warn' : 'success',
          signature: `SIG-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
          prev_hash: '0x' + '0'.repeat(16),
        }],
        nodes: [], edges: [],
      });

      setHitlVisible(needsHitl || !!isInjection);
      setInjectionBlocked(!!isInjection, resp.governance_reason ?? '');
      setSystemStatus({ injectionAttempts: isInjection ? 1 : 0 });

      // Animate agent pipeline
      simulateAgentEvents(resp.governance_decision, reasons, appendAgentEvent);

      // Load graph for wallet_from
      if (payload.wallet_from.startsWith('0x') && payload.wallet_from.length === 42) {
        setGraphWallet(payload.wallet_from);
        setGraphHops(3);
        try {
          const trace = await api.walletTrace(payload.wallet_from, 3, 6, 60);
          const { nodes, edges } = traceToSubgraph(trace, payload.wallet_from);
          setGraph(nodes, edges);
        } catch { /* graph unavailable */ }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [form, prependTransaction, setActiveInvestigation, setHitlVisible, setInjectionBlocked,
      setSystemStatus, clearAgentEvents, appendAgentEvent, setGraph, setGraphWallet, setGraphHops, onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              New Transaction Analysis
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Submit for full 6-agent AML pipeline evaluation
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tx ID */}
          <div>
            <label className="form-label">Transaction ID</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="form-input mono"
                value={form.tx_id}
                onChange={(e) => set('tx_id', e.target.value)}
                placeholder="0x…"
                style={{ flex: 1, fontSize: 10 }}
              />
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => set('tx_id', genTxId())}
                style={{ flexShrink: 0 }}
              >
                Regen
              </button>
            </div>
          </div>

          {/* Wallets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label">wallet_from *</label>
              <input
                className="form-input mono"
                value={form.wallet_from}
                onChange={(e) => set('wallet_from', e.target.value)}
                placeholder="0x…"
                style={{ fontSize: 10 }}
              />
            </div>
            <div>
              <label className="form-label">wallet_to *</label>
              <input
                className="form-input mono"
                value={form.wallet_to}
                onChange={(e) => set('wallet_to', e.target.value)}
                placeholder="0x…"
                style={{ fontSize: 10 }}
              />
            </div>
          </div>

          {/* Amount + Token + Chain */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label">amount_eur (€) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={form.amount_eur}
                onChange={(e) => set('amount_eur', e.target.value)}
                placeholder="9800"
              />
            </div>
            <div>
              <label className="form-label">token</label>
              <select className="form-select" value={form.token} onChange={(e) => set('token', e.target.value)}>
                {TOKENS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">chain</label>
              <select className="form-select" value={form.chain} onChange={(e) => set('chain', e.target.value)}>
                {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Timestamp + Jurisdiction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label">timestamp (unix)</label>
              <input
                type="number"
                className="form-input mono"
                value={form.timestamp}
                onChange={(e) => set('timestamp', e.target.value)}
                style={{ fontSize: 10 }}
              />
            </div>
            <div>
              <label className="form-label">jurisdiction</label>
              <select className="form-select" value={form.jurisdiction} onChange={(e) => set('jurisdiction', e.target.value)}>
                {JURISDICTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          {/* Risk signals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label">velocity_24h (tx count)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.velocity_24h}
                onChange={(e) => set('velocity_24h', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="form-label">tx_count_7d</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.tx_count_7d}
                onChange={(e) => set('tx_count_7d', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>memo</span>
              <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                Checked for prompt injection
              </span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.memo}
              onChange={(e) => set('memo', e.target.value)}
              placeholder="Optional. Any attached message, note, or label."
            />
          </div>

          {/* Injection warning hint */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 10px', borderRadius: 'var(--border-radius-md)',
            background: 'var(--color-background-info)',
            border: '0.5px solid var(--color-border-info)',
          }}>
            <ShieldAlert size={13} style={{ color: 'var(--color-text-info)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              The <strong style={{ color: 'var(--color-text-primary)' }}>memo field</strong> is scanned by the Governance Sentinel for prompt injection attacks — patterns like{' '}
              <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,0.15)', padding: '1px 4px', borderRadius: 2 }}>
                IGNORE PREVIOUS INSTRUCTIONS
              </code>{' '}
              are automatically blocked and flagged.
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 10px', borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-danger)',
              border: '0.5px solid var(--color-border-danger)',
              fontSize: 11, color: 'var(--color-text-danger)',
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-neutral">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
              {loading ? 'Analyzing…' : 'Submit for Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function simulateAgentEvents(
  decision: string,
  reasons: string[],
  append: (e: { agent: string; line: string; state: 'active' | 'warn' | 'blocked' | 'idle'; ts: number }) => void,
): void {
  const AGENTS = ['Transaction Intelligence', 'Wallet Reputation', 'Compliance Policy', 'Explainability', 'Governance Sentinel', 'Audit Agent'];
  const isBlocked   = decision.includes('BLOCK') || decision.includes('INJECT');
  const isEscalated = decision.includes('ESCALATE') || decision.includes('HUMAN');
  const now = Date.now() / 1000;

  AGENTS.forEach((agent, i) => {
    const state: 'active' | 'warn' | 'blocked' | 'idle' =
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
  if (agent === 'Compliance Policy') return state === 'warn' ? ['OPA: violations found', ...(reasons.slice(0, 2))] : state === 'idle' ? ['Not reached'] : ['OPA: 0 violations', 'All policies satisfied'];
  if (agent === 'Explainability') return state === 'idle' ? ['Not reached'] : ['Narrative generated', 'LIME attribution complete'];
  if (agent === 'Governance Sentinel') return state === 'blocked' ? ['INJECTION DETECTED', 'Pattern matched — pipeline halted', 'Audit sealed'] : state === 'warn' ? ['Decision: ESCALATE_HUMAN', 'HITL gate opened'] : state === 'idle' ? ['Not reached'] : ['Decision: AUTO_APPROVE', 'Confidence gate passed'];
  if (agent === 'Audit Agent') return state === 'idle' ? ['Skipped — pipeline halted'] : ['Record sealed — HMAC OK', 'Chain integrity verified'];
  return ['Complete'];
}
