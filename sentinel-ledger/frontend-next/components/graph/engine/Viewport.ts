export class Viewport {
  x: number = 0;
  y: number = 0;
  scale: number = 1;

  readonly minScale = 0.2;
  readonly maxScale = 4;

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /** Zoom toward a screen-space point (mx, my). */
  zoomAt(mx: number, my: number, delta: number): void {
    const factor = delta > 0 ? 0.9 : 1.1;
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    const ratio = newScale / this.scale;

    this.x = mx - ratio * (mx - this.x);
    this.y = my - ratio * (my - this.y);
    this.scale = newScale;
  }

  /** Convert screen coordinates to world coordinates. */
  screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.x) / this.scale, (sy - this.y) / this.scale];
  }

  /** Convert world coordinates to screen coordinates. */
  worldToScreen(wx: number, wy: number): [number, number] {
    return [wx * this.scale + this.x, wy * this.scale + this.y];
  }

  applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.scale, 0, 0, this.scale, this.x, this.y);
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
  }

  /** Center world rectangle (0,0,w,h) in a canvas of (cw, ch). */
  fitToWorld(worldW: number, worldH: number, canvasW: number, canvasH: number): void {
    const s = Math.min(canvasW / worldW, canvasH / worldH, 1) * 0.9;
    this.scale = s;
    this.x = (canvasW - worldW * s) / 2;
    this.y = (canvasH - worldH * s) / 2;
  }
}
