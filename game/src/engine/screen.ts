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
   * nearest-neighbour upscale first, then one smooth resize of that, so every
   * game pixel still reads as an even square.
   */
  fixedScale: number | null = null;
  private mid: HTMLCanvasElement | null = null;
  private mctx: CanvasRenderingContext2D | null = null;

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
    this.scale = s;
    const pw = Math.round(W * s);
    const ph = Math.round(H * s);
    this.display.width = pw;
    this.display.height = ph;
    this.display.style.width = `${pw / dpr}px`;
    this.display.style.height = `${ph / dpr}px`;
    this.dctx.imageSmoothingEnabled = false;
    const n = Math.floor(s);
    if (n >= 1 && s - n > 1e-6) {
      if (!this.mid) {
        this.mid = document.createElement('canvas');
        this.mctx = this.mid.getContext('2d', { alpha: false })!;
      }
      if (this.mid.width !== W * n) {
        this.mid.width = W * n;
        this.mid.height = H * n;
      }
    } else {
      this.mid = null;
      this.mctx = null;
    }
  }

  /** Copy the low-res buffer to the display canvas, applying a whole-pixel offset (screen shake). */
  present(offX = 0, offY = 0): void {
    const d = this.dctx;
    const s = this.scale;
    d.fillStyle = '#000';
    d.fillRect(0, 0, this.display.width, this.display.height);
    const x = Math.round(offX) * s;
    const y = Math.round(offY) * s;
    if (this.mid && this.mctx) {
      const n = this.mid.width / W;
      this.mctx.imageSmoothingEnabled = false;
      this.mctx.drawImage(this.buffer, 0, 0, W * n, H * n);
      d.imageSmoothingEnabled = true;
      d.drawImage(this.mid, x, y, W * s, H * s);
    } else {
      d.imageSmoothingEnabled = false;
      d.drawImage(this.buffer, x, y, W * s, H * s);
    }
  }
}
