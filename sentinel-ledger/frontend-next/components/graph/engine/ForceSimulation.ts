import { QuadTree } from './QuadTree';
import type { SimEdge, SimNode } from './types';

const THETA = 0.9;
const MAX_VELOCITY = 8;
const SETTLED_THRESHOLD = 0.1;
const SETTLE_FRAMES = 90;

export class ForceSimulation {
  nodes: SimNode[];
  edges: SimEdge[];
  width: number;
  height: number;
  alpha: number = 1;
  settled: boolean = false;

  private idealSpring: number;
  private settledCount: number = 0;

  // Node-count-adaptive constants
  private damping: number;
  private springStiffness: number;
  private centerStrength: number;
  private repulsion: number;

  constructor(nodes: SimNode[], edges: SimEdge[], width: number, height: number) {
    this.nodes = nodes;
    this.edges = edges;
    this.width = width;
    this.height = height;

    const n = Math.max(1, nodes.length);
    this.repulsion = 1800 / Math.sqrt(n / 30);
    this.springStiffness = 0.04;
    this.centerStrength = 0.006 + 0.002 * Math.log(n);
    this.damping = 0.86;
    this.idealSpring = 80 + Math.log2(n + 1) * 22;
  }

  /** BFS-seeded radial layout — hop 0 at center, each hop ring at 130px per hop. */
  scatter(): void {
    const adjacency = new Map<string, string[]>();
    for (const e of this.edges) {
      if (!adjacency.has(e.source)) adjacency.set(e.source, []);
      if (!adjacency.has(e.target)) adjacency.set(e.target, []);
      adjacency.get(e.source)!.push(e.target);
      adjacency.get(e.target)!.push(e.source);
    }

    // BFS from first node to compute hop distances
    const dist = new Map<string, number>();
    const first = this.nodes[0]?.id;
    if (first) {
      const queue = [first];
      dist.set(first, 0);
      while (queue.length) {
        const cur = queue.shift()!;
        for (const nb of adjacency.get(cur) ?? []) {
          if (!dist.has(nb)) { dist.set(nb, dist.get(cur)! + 1); queue.push(nb); }
        }
      }
    }

    const byHop = new Map<number, SimNode[]>();
    for (const n of this.nodes) {
      const d = dist.get(n.id) ?? 99;
      if (!byHop.has(d)) byHop.set(d, []);
      byHop.get(d)!.push(n);
    }

    const cx = this.width / 2;
    const cy = this.height / 2;
    const hopRadius = 130;

    byHop.forEach((nodesAtHop, hop) => {
      if (hop === 0) {
        nodesAtHop.forEach((n) => { n.x = cx; n.y = cy; n.vx = 0; n.vy = 0; });
        return;
      }
      const r = hop * hopRadius;
      nodesAtHop.forEach((n, i) => {
        const angle = (i / nodesAtHop.length) * Math.PI * 2 + hop * 0.5;
        n.x = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 20;
        n.y = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 20;
        n.vx = 0; n.vy = 0;
      });
    });
  }

  /** After warmup, fit viewport to bounding box. Returns { zoom, panX, panY }. */
  fitView(canvasW: number, canvasH: number): { zoom: number; panX: number; panY: number } {
    if (this.nodes.length === 0) return { zoom: 1, panX: 0, panY: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of this.nodes) {
      minX = Math.min(minX, n.x - n.radius);
      maxX = Math.max(maxX, n.x + n.radius);
      minY = Math.min(minY, n.y - n.radius);
      maxY = Math.max(maxY, n.y + n.radius);
    }
    const pad = 0.12;
    const gw = maxX - minX || 1;
    const gh = maxY - minY || 1;
    const zoom = Math.min(
      canvasW / (gw * (1 + pad * 2)),
      canvasH / (gh * (1 + pad * 2)),
      1.5,
    );
    const panX = canvasW / 2 - ((minX + maxX) / 2) * zoom;
    const panY = canvasH / 2 - ((minY + maxY) / 2) * zoom;
    return { zoom, panX, panY };
  }

  tick(): void {
    if (this.settled) return;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const n = this.nodes.length;

    // Build adjacency for collision avoidance
    // Barnes-Hut repulsion
    let qt: QuadTree | null = null;
    if (n > 50) {
      qt = QuadTree.build(
        this.nodes.map((nd) => ({ x: nd.x, y: nd.y, mass: nd.mass, id: nd.id })),
        this.width,
        this.height,
        THETA,
      );
    }

    // Apply forces
    for (const nd of this.nodes) {
      if (nd.pinned) continue;

      let fx = 0;
      let fy = 0;

      // Repulsion
      if (qt) {
        const [rfx, rfy] = qt.forceOn({ x: nd.x, y: nd.y, mass: nd.mass }, this.repulsion);
        fx += rfx;
        fy += rfy;
      } else {
        for (const other of this.nodes) {
          if (other.id === nd.id) continue;
          const dx = nd.x - other.x;
          const dy = nd.y - other.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);
          const f = (this.repulsion * other.mass) / distSq;
          fx += (dx / dist) * f;
          fy += (dy / dist) * f;
        }
      }

      // Centering
      fx += (cx - nd.x) * this.centerStrength;
      fy += (cy - nd.y) * this.centerStrength;

      nd.vx = (nd.vx + fx) * this.damping;
      nd.vy = (nd.vy + fy) * this.damping;
    }

    // Spring attraction along edges
    for (const edge of this.edges) {
      const src = this.nodes.find((nd) => nd.id === edge.source);
      const tgt = this.nodes.find((nd) => nd.id === edge.target);
      if (!src || !tgt) continue;

      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const ideal = this.idealSpring * (edge.weight || 1);
      const displacement = dist - ideal;
      const f = displacement * this.springStiffness;
      const nx = dx / dist;
      const ny = dy / dist;

      if (!src.pinned) { src.vx += nx * f; src.vy += ny * f; }
      if (!tgt.pinned) { tgt.vx -= nx * f; tgt.vy -= ny * f; }
    }

    // Integrate positions + collision avoidance
    let maxV = 0;
    for (const nd of this.nodes) {
      if (nd.pinned) continue;

      // Clamp velocity
      const speed = Math.sqrt(nd.vx * nd.vx + nd.vy * nd.vy);
      if (speed > MAX_VELOCITY) {
        nd.vx = (nd.vx / speed) * MAX_VELOCITY;
        nd.vy = (nd.vy / speed) * MAX_VELOCITY;
      }

      nd.x += nd.vx * this.alpha;
      nd.y += nd.vy * this.alpha;

      // Bounds clamping removed to allow infinite pan/zoom canvas space without glitching
      
      maxV = Math.max(maxV, speed);
    }

    // Collision resolution (simple pass)
    this._resolveCollisions();

    // Cool down
    this.alpha = Math.max(0.001, this.alpha * 0.99);

    // Settle detection
    if (maxV < SETTLED_THRESHOLD) {
      this.settledCount++;
      if (this.settledCount > SETTLE_FRAMES) {
        this.settled = true;
      }
    } else {
      this.settledCount = 0;
    }
  }

  private _resolveCollisions(): void {
    const len = this.nodes.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.radius + b.radius + 4;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          if (!a.pinned) { a.x -= nx * push; a.y -= ny * push; }
          if (!b.pinned) { b.x += nx * push; b.y += ny * push; }
        }
      }
    }
  }

  /** Run N ticks synchronously for initial warmup (count adapts to graph size). */
  warmup(ticks?: number): void {
    const adaptiveTicks = ticks ?? Math.min(300, 60 + this.nodes.length * 1.5);
    this.scatter();
    const origAlpha = this.alpha;
    this.alpha = 1;
    for (let i = 0; i < adaptiveTicks; i++) {
      this.tick();
    }
    this.alpha = origAlpha;
    this.settled = false;
    this.settledCount = 0;
  }

  wakeUp(): void {
    this.settled = false;
    this.settledCount = 0;
    this.alpha = Math.max(0.3, this.alpha);
  }

  setSize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  pinNode(id: string, x: number, y: number): void {
    const nd = this.nodes.find((n) => n.id === id);
    if (nd) { nd.x = x; nd.y = y; nd.pinned = true; nd.vx = 0; nd.vy = 0; }
    this.wakeUp();
  }

  unpinNode(id: string): void {
    const nd = this.nodes.find((n) => n.id === id);
    if (nd) nd.pinned = false;
  }
}
