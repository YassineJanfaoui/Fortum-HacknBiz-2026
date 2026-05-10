export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  pinned: boolean;
}

export interface SimEdge {
  source: string;
  target: string;
  weight: number; // ideal spring length multiplier
}

export interface SimState {
  nodes: SimNode[];
  edges: SimEdge[];
  width: number;
  height: number;
  alpha: number; // cooling factor 0–1
  settled: boolean;
}
