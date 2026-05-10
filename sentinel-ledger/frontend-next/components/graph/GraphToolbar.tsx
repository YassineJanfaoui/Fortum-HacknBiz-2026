'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

interface Props {
  onSearch: (address: string, hops: number) => void;
  loading?: boolean;
}

export function GraphToolbar({ onSearch, loading }: Props) {
  const { graphWallet, setGraphWallet, graphHops, setGraphHops } = useDashboardStore();
  const [localAddr, setLocalAddr] = useState(graphWallet);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = localAddr.trim();
    if (addr.length >= 10) {
      setGraphWallet(addr);
      onSearch(addr, graphHops);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 12px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-background-secondary)',
      flexShrink: 0,
    }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Search size={11} style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-tertiary)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={localAddr}
          onChange={(e) => setLocalAddr(e.target.value)}
          placeholder="0x… wallet address"
          aria-label="Wallet address"
          className="form-input mono"
          style={{ paddingLeft: 26, fontSize: 11 }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-border-info)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-secondary)')}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Hops</span>
        {[1, 2, 3, 4, 5].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setGraphHops(h)}
            style={{
              width: 22, height: 22, borderRadius: 3,
              border: `0.5px solid ${graphHops === h ? 'var(--color-border-info)' : 'var(--color-border-secondary)'}`,
              background: graphHops === h ? 'var(--color-background-info)' : 'transparent',
              color: graphHops === h ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
              fontSize: 11, cursor: 'pointer', lineHeight: 1,
            }}
          >
            {h}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading || localAddr.trim().length < 10}
        className="btn btn-primary"
      >
        {loading ? 'Loading…' : 'Trace'}
      </button>
    </form>
  );
}
