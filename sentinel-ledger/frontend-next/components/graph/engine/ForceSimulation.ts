import { QuadTree } from './QuadTree';
import type { SimEdge, SimNode } from './types';

const DAMPING = 0.85;
const SPRING_STIFFNESS = 0.05;
const CENTER_STRENGTH = 0.005;
const REPULSION = 800;
const THETA = 0.9;
const MAX_VELOCITY = 8;
const SETTLED_THRESHOLD = 0.1;
const SETTLE_FRAMES = 90; // frames of low velocity before pausing

export class ForceSimulation {
  nodes: SimNode[];
  edges: SimEdge[];
  width: number;
  height: number;
  alpha: number = 1;
  settled: boolean = false;

  private idealSpring: number;
  private settledCount: number = 0;

  constructor(nodes: SimNode[], edges: SimEdge[], width: number, height: number) {
    this.nodes = nodes;
    this.edges = edges;
    this.width = width;
    this.height = height;
    this.idealSpring = 60 + Math.log(Math.max(1, nodes.length)) * 20;
  }

  /** Scatter nodes in a circle so we don't start at origin cluster */
  scatter(): void {
    const r = Math.min(this.width, this.height) * 0.35;
    this.nodes.forEach((n, i) => {
      if (n.x === 0 && n.y === 0) {
        const angle = (i / this.nodes.length) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 40;
        n.x = this.width / 2 + Math.cos(angle) * (r + jitter);
        n.y = this.height / 2 + Math.sin(angle) * (r + jitter);
        n.vx = 0;
        n.vy = 0;
      }
    });
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
        const [rfx, rfy] = qt.forceOn({ x: nd.x, y: nd.y, mass: nd.mass }, REPULSION);
        fx += rfx;
        fy += rfy;
      } else {
        // Naive O(n²) for small graphs
        for (const other of this.nodes) {
          if (other.id === nd.id) continue;
          const dx = nd.x - other.x;
          const dy = nd.y - other.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);
          const f = (REPULSION * other.mass) / distSq;
          fx += (dx / dist) * f;
          fy += (dy / dist) * f;
        }
      }

      // Centering
      fx += (cx - nd.x) * CENTER_STRENGTH;
      fy += (cy - nd.y) * CENTER_STRENGTH;

      nd.vx = (nd.vx + fx) * DAMPING;
      nd.vy = (nd.vy + fy) * DAMPING;
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
      const f = displacement * SPRING_STIFFNESS;
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

      // Soft bounds
      const pad = nd.radius + 8;
      nd.x = Math.max(pad, Math.min(this.width - pad, nd.x));
      nd.y = Math.max(pad, Math.min(this.height - pad, nd.y));

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

  /** Run N ticks synchronously for initial warmup */
  warmup(ticks = 60): void {
    this.scatter();
    const origAlpha = this.alpha;
    this.alpha = 1;
    for (let i = 0; i < ticks; i++) {
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
