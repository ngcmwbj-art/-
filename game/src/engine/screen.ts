// Low-resolution render target that is scaled up to the display canvas. On
// desktop the scale is a whole number of device pixels, so every game pixel
// stays perfectly square; the touch layout may ask for a fractional scale to
// fill a phone or tablet screen (drawn sharp-bilinear, see fixedScale).

export const W = 384;
export const H = 216;

export class Screen {
  readonly display: HTMLCanvasElement;
  readonly dctx: CanvasRenderingContext2D;
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scale = 1;
  /**
   * Device px per game px chosen by the touch layout (engine/touch.ts), or
   * null for the largest whole-number scale that fits the window. A
   * fractional scale is drawn "sharp bilinear": a whole-number
   * nearest-neighbour upscale on the canvas, then one smooth resize of that
   * by the browser (CSS size, image-rendering: auto), so every game pixel
   * still reads as an even square.
   */
  fixedScale: number | null = null;

  constructor(display: HTMLCanvasElement) {
    this.display = display;
    this.dctx = display.getContext('2d', { alpha: false })!;
    this.buffer = document.createElement('canvas');
    this.buffer.width = W;
    this.buffer.height = H;
    this.ctx = this.buffer.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    let s = this.fixedScale ?? 0;
    if (!s) {
      const availW = Math.max(W, window.innerWidth * dpr);
      const availH = Math.max(H, window.innerHeight * dpr);
      s = Math.floor(Math.min(availW / W, availH / H));
      if (s < 1) s = Math.min(availW / W, availH / H);
    }
    // A fractional scale: the canvas holds only the whole-number
    // nearest-neighbour upscale, and the browser's compositor makes the one
    // smooth resize to the size on screen (image-rendering: auto). Same
    // "sharp bilinear" picture as before, but the page no longer redraws a
    // second full-screen, device-resolution image every frame — on a phone at
    // 3× that was millions of pixels 60–120 times a second (2026-09-28: phones
    // ran hot).
    const n = Math.floor(s);
    const frac = n >= 1 && s - n > 1e-6;
    const cs = frac ? n : s;
    this.scale = cs;
    this.display.width = Math.round(W * cs);
    this.display.height = Math.round(H * cs);
    this.display.style.width = `${(W * s) / dpr}px`;
    this.display.style.height = `${(H * s) / dpr}px`;
    this.display.style.imageRendering = frac ? 'auto' : '';
    this.dctx.imageSmoothingEnabled = false;
  }

  /** Copy the low-res buffer to the display canvas, applying a whole-pixel offset (screen shake). */
  present(offX = 0, offY = 0): void {
    const d = this.dctx;
    const s = this.scale;
    const x = Math.round(offX) * s;
    const y = Math.round(offY) * s;
    // the picture covers the whole canvas; only a shake leaves an edge to clear
    if (x || y) {
      d.fillStyle = '#000';
      d.fillRect(0, 0, this.display.width, this.display.height);
    }
    d.imageSmoothingEnabled = false;
    d.drawImage(this.buffer, x, y, W * s, H * s);
  }
}
