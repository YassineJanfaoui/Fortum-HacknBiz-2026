export function shortAddress(address: string, pre = 6, suf = 4): string {
  if (!address || address.length <= pre + suf + 2) return address ?? '';
  return `${address.slice(0, pre)}…${address.slice(-suf)}`;
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString('en-GB', { hour12: false });
  }
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

export function riskColor(risk: string): string {
  switch (risk) {
    case 'critical': return 'var(--risk-critical)';
    case 'high':     return 'var(--risk-high)';
    case 'medium':   return 'var(--risk-medium)';
    default:         return 'var(--risk-low)';
  }
}

export function riskLabel(risk: string): string {
  return risk.toUpperCase();
}

export function decisionColor(d: string): string {
  if (d.includes('BLOCK') || d.includes('INJECT')) return 'var(--risk-high)';
  if (d.includes('ESCALATE') || d.includes('HUMAN')) return 'var(--risk-medium)';
  return 'var(--risk-low)';
}

export function statusColor(status: string): string {
  switch (status) {
    case 'blocked':   return 'var(--risk-high)';
    case 'escalated': return 'var(--risk-medium)';
    case 'approved':  return 'var(--risk-low)';
    case 'rejected':  return 'var(--risk-critical)';
    default:          return 'var(--accent-blue)';
  }
}
