import type { GraphNode } from '@/lib/types';
import { formatEur, formatNumber, riskColor } from '@/lib/format';

interface Props {
  node: GraphNode;
  x: number;
  y: number;
}

export function NodeTooltip({ node, x, y }: Props) {
  const style: React.CSSProperties = {
    left: x,
    top: y,
    transform: 'translateY(-50%)',
  };

  // Clamp to viewport edges
  if (x > window.innerWidth - 260) style.left = x - 260;
  if (y < 40) style.top = y + 20;

  return (
    <div className="node-tooltip" style={style}>
      <div style={{ marginBottom: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: riskColor(node.risk),
            marginRight: 6,
            verticalAlign: 'middle',
          }}
        />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {node.type}
        </span>
      </div>

      <div className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, wordBreak: 'break-all' }}>
        {node.address}
      </div>

      {node.entity_label && (
        <div style={{ fontSize: 11, color: 'var(--accent-teal)', marginBottom: 4 }}>
          {node.entity_label}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <tbody>
          <Row label="Risk" value={node.risk.toUpperCase()} color={riskColor(node.risk)} />
          <Row label="Taint" value={`${node.taint}%`} color={node.taint > 70 ? 'var(--risk-high)' : 'var(--text-primary)'} />
          <Row label="Tx count" value={formatNumber(node.tx_count)} />
          <Row label="Volume" value={formatEur(node.tx_count * 1000)} />
          {node.age_days > 0 && <Row label="Age" value={`${node.age_days}d`} />}
        </tbody>
      </table>

      <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text-tertiary)' }}>
        Double-click to expand
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <tr>
      <td style={{ color: 'var(--text-tertiary)', paddingRight: 8, paddingBottom: 2 }}>{label}</td>
      <td style={{ color: color ?? 'var(--text-primary)', textAlign: 'right' }} className="tabular">{value}</td>
    </tr>
  );
}
