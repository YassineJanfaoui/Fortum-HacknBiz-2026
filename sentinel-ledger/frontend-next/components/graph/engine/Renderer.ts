import type { GraphEdge, GraphNode, RiskLevel, WalletType } from '@/lib/types';
import type { Viewport } from './Viewport';

// Color palette
const C = {
  nodeOrigin:     '#3b82f6',
  nodeMixer:      '#8b5cf6',
  nodeSanctioned: '#dc2626',
  nodeExchange:   '#14b8a6',
  nodeWallet:     '#475569',
  nodeCluster:    '#374151',
  ringHigh:       '#ef4444',
  ringMedium:     '#f59e0b',
  ringLow:        '#22c55e',
  ringCritical:   '#dc2626',
  taintFill:      'rgba(239,68,68,0.45)',
  edgeLine:       'rgba(139, 148, 173, 0.55)',
  edgeSelected:   'rgba(59,130,246,0.85)',
  edgeArrow:      'rgba(148,163,184,0.35)',
  edgeArrowSel:   'rgba(59,130,246,0.85)',
  labelColor:     'rgba(148,163,184,0.9)',
  labelSel:       '#f1f5f9',
  nodeBg:         '#0f172a',
  selGlow:        'rgba(59,130,246,0.25)',
};

export function nodeRadius(txCount: number): number {
  return Math.min(26, Math.max(10, 10 + Math.log1p(txCount) * 2.2));
}

function ringColor(risk: RiskLevel): string {
  if (risk === 'critical') return C.ringCritical;
  if (risk === 'high') return C.ringHigh;
  if (risk === 'medium') return C.ringMedium;
  return C.ringLow;
}

function fillColor(type: WalletType): string {
  if (type === 'origin') return C.nodeOrigin;
  if (type === 'mixer') return C.nodeMixer;
  if (type === 'sanctioned') return C.nodeSanctioned;
  if (type === 'exchange') return C.nodeExchange;
  if (type === 'cluster') return C.nodeCluster;
  return C.nodeWallet;
}

function edgeAge(ts: number): number {
  const d = (Date.now() - ts * 1000) / (1000 * 60 * 60 * 24);
  if (d < 0.04) return 1;
  if (d > 7) return 0.25;
  return 1 - (d / 7) * 0.75;
}

function edgeWidth(eur: number): number {
  return Math.min(2.5, Math.max(0.7, Math.log1p(eur) / Math.log(1e6) * 2.5));
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.45);
  ctx.lineTo(-size, size * 0.45);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

export interface RenderState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  hoveredId: string | null;
  viewport: Viewport;
  zoom: number;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  s: RenderState,
) {
  const { nodes, edges, selectedId, hoveredId, viewport, zoom } = s;

  // Clear in the DPR-scaled space set by the render loop (cw*dpr = canvas.width = full canvas)
  ctx.clearRect(0, 0, cw, ch);
  // Multiply viewport on top of the existing DPR transform to preserve HiDPI scaling
  ctx.transform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);

  const byId = new Map<string, GraphNode>();
  for (const n of nodes) {
    if (n.id) byId.set(n.id, n);
    if (n.address) byId.set(n.address, n);
  }

  // BFS path from selected node
  const pathNodes = new Set<string>();
  const pathEdges = new Set<string>();
  if (selectedId) {
    pathNodes.add(selectedId);
    for (let pass = 0; pass < 4; pass++) {
      const prev = [...pathNodes];
      for (const id of prev) {
        for (const e of edges) {
          if (e.from === id && !pathNodes.has(e.to)) { pathNodes.add(e.to); pathEdges.add(e.id); }
          if (e.to === id && !pathNodes.has(e.from)) { pathNodes.add(e.from); pathEdges.add(e.id); }
        }
      }
    }
  }
  const hasSel = selectedId !== null;

  // ── Edges ──────────────────────────────────────────────────────
  const fmtEur = new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const missingNodes: string[] = [];
  
  for (const edge of edges) {
    const fromId = edge.from || (edge as any).source;
    const toId = edge.to || (edge as any).target;
    const src = byId.get(fromId); const tgt = byId.get(toId);
    if (!src || !tgt) {
      missingNodes.push(`${fromId} -> ${toId}`);
      continue;
    }

    const isPath = pathEdges.has(edge.id);
    const dimmed = hasSel && !isPath;
    const opacity = edgeAge(edge.timestamp);

    ctx.globalAlpha = dimmed ? 0.06 : isPath ? 1 : opacity * 0.55;

    const dx = tgt.x - src.x; const dy = tgt.y - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;
    const nx = dx / dist; const ny = dy / dist;
    const sr = nodeRadius(src.tx_count); const tr = nodeRadius(tgt.tx_count);
    const x1 = src.x + nx * sr; const y1 = src.y + ny * sr;
    const x2 = tgt.x - nx * (tr + 5); const y2 = tgt.y - ny * (tr + 5);

    ctx.strokeStyle = isPath ? C.edgeSelected : C.edgeLine;
    ctx.lineWidth = isPath ? Math.max(edgeWidth(edge.amount_eur), 1.2) : edgeWidth(edge.amount_eur);
    ctx.setLineDash(isPath ? [5, 4] : []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);

    const ang = Math.atan2(y2 - y1, x2 - x1);
    const arSz = Math.min(5, Math.max(2.5, tr * 0.3));
    arrow(ctx, x2, y2, ang, arSz, isPath ? C.edgeArrowSel : C.edgeArrow);

    // Edge Labels
    if (!dimmed && zoom > 0.8) {
      ctx.save();
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      ctx.translate(mx, my);
      // Flip text if upside down
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) {
        ctx.rotate(ang + Math.PI);
      } else {
        ctx.rotate(ang);
      }
      ctx.font = `${Math.max(6, 7 * Math.min(1, zoom))}px ui-monospace,monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = isPath ? C.labelSel : C.labelColor;
      ctx.fillText(fmtEur.format(edge.amount_eur), 0, -3);
      ctx.restore();
    }
  }

  if (missingNodes.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('Missing nodes for edges:', missingNodes);
  }

  ctx.globalAlpha = 1;

  // ── Nodes ──────────────────────────────────────────────────────
  for (const node of nodes) {
    const r = nodeRadius(node.tx_count);
    const isSel = node.id === selectedId;
    const isHov = node.id === hoveredId;
    const inPath = pathNodes.has(node.id);
    const dimmed = hasSel && !inPath && !isSel;

    ctx.globalAlpha = dimmed ? 0.2 : 1;

    // Glow behind selected
    if (isSel) {
      const g = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 12);
      g.addColorStop(0, C.selGlow); g.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(node.x, node.y, r + 12, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    }

    // Background fill
    ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.nodeBg; ctx.fill();

    // Type fill (inner)
    const fc = fillColor(node.type);
    ctx.beginPath(); ctx.arc(node.x, node.y, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = fc + 'cc'; ctx.fill();

    // Taint overlay
    if (node.taint > 5) {
      const tr2 = r * 0.72 * (node.taint / 100);
      ctx.beginPath(); ctx.arc(node.x, node.y, tr2, 0, Math.PI * 2);
      ctx.fillStyle = C.taintFill; ctx.globalAlpha = dimmed ? 0.15 : 0.65; ctx.fill();
      ctx.globalAlpha = dimmed ? 0.2 : 1;
    }

    // Outer ring (risk)
    ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = isSel ? '#ffffff' : ringColor(node.risk);
    ctx.lineWidth = isSel ? 2 : isHov ? 1.5 : 1;
    ctx.stroke();

    // Hover ring
    if (isHov && !isSel) {
      ctx.beginPath(); ctx.arc(node.x, node.y, r + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Label
    if (!dimmed && zoom > 0.55) {
      const showLabel = zoom > 1.4 || isSel || isHov || node.type === 'origin' || node.type === 'mixer' || node.type === 'sanctioned';
      if (showLabel) {
        const sz = Math.max(8, 9 * Math.min(1, zoom));
        ctx.font = `${sz}px ui-monospace,monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = isSel ? C.labelSel : C.labelColor;
        ctx.fillText(node.entity_label ?? node.short_address, node.x, node.y + r + 4);

        if (zoom > 1.5 && node.taint > 0) {
          ctx.font = '7px ui-monospace,monospace';
          ctx.fillStyle = C.ringHigh;
          ctx.fillText(`${node.taint}%`, node.x, node.y + r + 14);
        }
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
