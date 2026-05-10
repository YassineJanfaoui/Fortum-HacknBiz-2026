export interface QtNode {
  x: number;
  y: number;
  mass: number;
  id?: string;
}

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

class QTCell {
  cx: number = 0;
  cy: number = 0;
  mass: number = 0;
  count: number = 0;
  node: QtNode | null = null;
  children: (QTCell | null)[] = [null, null, null, null];

  insert(n: QtNode, bounds: Bounds, depth: number): void {
    this.cx = (this.cx * this.mass + n.x * n.mass) / (this.mass + n.mass);
    this.cy = (this.cy * this.mass + n.y * n.mass) / (this.mass + n.mass);
    this.mass += n.mass;
    this.count++;

    if (this.count === 1) {
      this.node = n;
      return;
    }

    if (depth > 20) return;

    if (this.count === 2 && this.node) {
      this._insertIntoChild(this.node, bounds, depth + 1);
      this.node = null;
    }
    this._insertIntoChild(n, bounds, depth + 1);
  }

  private _insertIntoChild(n: QtNode, b: Bounds, depth: number): void {
    const hw = b.w / 2;
    const hh = b.h / 2;
    const qi = (n.x >= b.x + hw ? 1 : 0) + (n.y >= b.y + hh ? 2 : 0);
    if (!this.children[qi]) {
      this.children[qi] = new QTCell();
    }
    const nb: Bounds = {
      x: b.x + (qi & 1 ? hw : 0),
      y: b.y + (qi & 2 ? hh : 0),
      w: hw,
      h: hh,
    };
    this.children[qi]!.insert(n, nb, depth);
  }

  calcForce(
    n: QtNode,
    bounds: Bounds,
    theta: number,
    strength: number,
    outFx: { v: number },
    outFy: { v: number },
  ): void {
    if (this.count === 0) return;

    const dx = this.cx - n.x;
    const dy = this.cy - n.y;
    const distSq = dx * dx + dy * dy + 0.01;
    const dist = Math.sqrt(distSq);
    const size = Math.max(bounds.w, bounds.h);

    if (size / dist < theta || this.count === 1) {
      // Treat as single body
      if (this.mass > 0 && dist > 0.01) {
        const f = (strength * this.mass) / distSq;
        outFx.v -= f * dx;
        outFy.v -= f * dy;
      }
      return;
    }

    // Recurse into children
    const hw = bounds.w / 2;
    const hh = bounds.h / 2;
    for (let i = 0; i < 4; i++) {
      const child = this.children[i];
      if (!child) continue;
      const cb: Bounds = {
        x: bounds.x + (i & 1 ? hw : 0),
        y: bounds.y + (i & 2 ? hh : 0),
        w: hw,
        h: hh,
      };
      child.calcForce(n, cb, theta, strength, outFx, outFy);
    }
  }
}

export class QuadTree {
  private root: QTCell = new QTCell();
  private bounds: Bounds;
  private theta: number;

  constructor(bounds: Bounds, theta = 0.9) {
    this.bounds = bounds;
    this.theta = theta;
  }

  insert(node: QtNode): void {
    this.root.insert(node, this.bounds, 0);
  }

  forceOn(node: QtNode, strength: number): [number, number] {
    const fx = { v: 0 };
    const fy = { v: 0 };
    this.root.calcForce(node, this.bounds, this.theta, strength, fx, fy);
    return [fx.v, fy.v];
  }

  static build(nodes: QtNode[], width: number, height: number, theta = 0.9): QuadTree {
    const qt = new QuadTree({ x: 0, y: 0, w: width, h: height }, theta);
    for (const n of nodes) qt.insert(n);
    return qt;
  }
}
