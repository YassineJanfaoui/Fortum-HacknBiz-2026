'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '@/lib/types';
import { ForceSimulation } from './engine/ForceSimulation';
import { SpatialHash } from './engine/HitTest';
import { nodeRadius, renderFrame } from './engine/Renderer';
import { Viewport } from './engine/Viewport';
import type { SimEdge, SimNode } from './engine/types';
import { NodeTooltip } from './NodeTooltip';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  onExpandNode?: (address: string) => void;
  loading?: boolean;
}

function toSimNodes(nodes: GraphNode[]): SimNode[] {
  return nodes.map((n) => ({
    id: n.id,
    x: n.x ?? 0,
    y: n.y ?? 0,
    vx: n.vx ?? 0,
    vy: n.vy ?? 0,
    radius: nodeRadius(n.tx_count),
    mass: Math.max(1, Math.log(Math.max(1, n.tx_count))),
    pinned: n.pinned ?? false,
  }));
}

function toSimEdges(edges: GraphEdge[]): SimEdge[] {
  return edges.map((e) => ({
    source: e.from,
    target: e.to,
    weight: 1,
  }));
}

export function GraphCanvas({ nodes, edges, selectedId, onSelectNode, onExpandNode, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ForceSimulation | null>(null);
  const vpRef = useRef<Viewport>(new Viewport());
  const hashRef = useRef<SpatialHash>(new SpatialHash(60));
  const rafRef = useRef<number>(0);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // Interaction state stored in ref to avoid stale closures
  const interRef = useRef({
    isPanning: false,
    isDragging: false,
    dragNodeId: '',
    lastMouseX: 0,
    lastMouseY: 0,
    lastClickTime: 0,
    lastClickId: '',
  });

  // Sync positions from sim back to node array
  const syncPositions = useCallback((simNodes: SimNode[], gNodes: GraphNode[]) => {
    const map = new Map(simNodes.map((n) => [n.id, n]));
    for (const gn of gNodes) {
      const sn = map.get(gn.id);
      if (sn) { gn.x = sn.x; gn.y = sn.y; gn.vx = sn.vx; gn.vy = sn.vy; }
    }
  }, []);

  // Initialize / reinitialize simulation when nodes change
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const w = wrap.clientWidth || 800;
    const h = wrap.clientHeight || 600;

    const simNodes = toSimNodes(nodes);
    const simEdges = toSimEdges(edges);

    const sim = new ForceSimulation(simNodes, simEdges, w, h);
    sim.warmup(80);
    syncPositions(simNodes, nodes);
    simRef.current = sim;

    hashRef.current.build(simNodes);
    vpRef.current.reset();
  }, [nodes, edges, syncPositions]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      simRef.current?.setSize(w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const loop = () => {
      const sim = simRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (sim && !sim.settled) {
        sim.tick();
        syncPositions(sim.nodes, nodes);
        hashRef.current.build(sim.nodes);
      }

      renderFrame(ctx, canvas.width / dpr, canvas.height / dpr, {
        nodes,
        edges,
        selectedId,
        hoveredId: hoveredNode?.id ?? null,
        viewport: vpRef.current,
        zoom: vpRef.current.scale,
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  // Re-run when selection or hover changes (but not on every render tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, selectedId, hoveredNode, syncPositions]);

  // ─── Mouse/Pointer event handlers ────────────────────────────────

  const getWorldPos = useCallback((e: React.MouseEvent): [number, number] => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    return vpRef.current.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const [wx, wy] = getWorldPos(e as unknown as React.MouseEvent);
    const hit = hashRef.current.pick(wx, wy);

    if (hit) {
      interRef.current.isDragging = true;
      interRef.current.dragNodeId = hit.id;
      simRef.current?.pinNode(hit.id, wx, wy);
    } else {
      interRef.current.isPanning = true;
    }

    interRef.current.lastMouseX = e.clientX;
    interRef.current.lastMouseY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }, [getWorldPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const inter = interRef.current;
    const dx = e.clientX - inter.lastMouseX;
    const dy = e.clientY - inter.lastMouseY;
    inter.lastMouseX = e.clientX;
    inter.lastMouseY = e.clientY;

    if (inter.isPanning) {
      vpRef.current.pan(dx, dy);
      simRef.current?.wakeUp();
    } else if (inter.isDragging) {
      const [wx, wy] = getWorldPos(e as unknown as React.MouseEvent);
      simRef.current?.pinNode(inter.dragNodeId, wx, wy);
    }

    // Hover
    const [wx, wy] = getWorldPos(e as unknown as React.MouseEvent);
    const hit = hashRef.current.pick(wx, wy);
    const found = hit ? nodes.find((n) => n.id === hit.id) ?? null : null;
    setHoveredNode(found);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setTooltipPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 });
  }, [getWorldPos, nodes]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const inter = interRef.current;

    if (inter.isDragging) {
      simRef.current?.unpinNode(inter.dragNodeId);
    }

    inter.isPanning = false;
    inter.isDragging = false;
    inter.dragNodeId = '';
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    const inter = interRef.current;
    const [wx, wy] = getWorldPos(e);
    const hit = hashRef.current.pick(wx, wy);
    const now = Date.now();

    if (hit) {
      const node = nodes.find((n) => n.id === hit.id);
      if (node) {
        // Double-click to expand
        if (now - inter.lastClickTime < 350 && inter.lastClickId === hit.id) {
          onExpandNode?.(node.address);
        } else {
          onSelectNode(node.id === selectedId ? null : node.id);
        }
        inter.lastClickTime = now;
        inter.lastClickId = hit.id;
        simRef.current?.wakeUp();
      }
    } else {
      onSelectNode(null);
      inter.lastClickId = '';
    }
  }, [getWorldPos, nodes, selectedId, onSelectNode, onExpandNode]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    vpRef.current.zoomAt(mx, my, e.deltaY);
    simRef.current?.wakeUp();
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`graph-canvas-wrap${dragging ? ' dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onMouseLeave={onMouseLeave}
    >
      <canvas
        ref={canvasRef}
        onWheel={onWheel}
        style={{ display: 'block', width: '100%', height: '100%' }}
        aria-label="Wallet relationship graph"
      />

      {loading && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,14,26,0.7)',
            color: 'var(--text-secondary)',
            fontSize: 12, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}
        >
          Computing layout…
        </div>
      )}

      {nodes.length === 0 && !loading && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)', fontSize: 12, gap: 8,
          }}
        >
          <span style={{ fontSize: 28 }}>◈</span>
          <span>Enter a wallet address to explore the graph</span>
        </div>
      )}

      {hoveredNode && (
        <NodeTooltip node={hoveredNode} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </div>
  );
}
