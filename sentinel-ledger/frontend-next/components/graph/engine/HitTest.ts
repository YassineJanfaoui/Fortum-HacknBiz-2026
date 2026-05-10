import type { SimNode } from './types';

/** O(1) average-case spatial hash for picking nodes by world coordinates. */
export class SpatialHash {
  private cells: Map<number, SimNode[]> = new Map();
  private cellSize: number;
  private nodes: SimNode[] = [];

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  build(nodes: SimNode[]): void {
    this.nodes = nodes;
    this.cells.clear();
    for (const n of nodes) {
      const key = this._key(n.x, n.y);
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key)!.push(n);
    }
  }

  /** Returns the node at world position (wx, wy) or null. */
  pick(wx: number, wy: number): SimNode | null {
    // Check surrounding cells
    const cx = Math.floor(wx / this.cellSize);
    const cy = Math.floor(wy / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this._encode(cx + dx, cy + dy);
        const bucket = this.cells.get(key);
        if (!bucket) continue;
        for (const n of bucket) {
          const dist = Math.sqrt((wx - n.x) ** 2 + (wy - n.y) ** 2);
          if (dist <= n.radius + 4) return n;
        }
      }
    }
    return null;
  }

  private _key(wx: number, wy: number): number {
    return this._encode(Math.floor(wx / this.cellSize), Math.floor(wy / this.cellSize));
  }

  private _encode(cx: number, cy: number): number {
    // Cantor pairing-style hash
    return (cx + 10000) * 100000 + (cy + 10000);
  }
}
