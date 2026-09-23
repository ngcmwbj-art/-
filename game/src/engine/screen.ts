// Low-resolution render target that is scaled up to the display canvas with
// integer device-pixel scaling, so every game pixel stays perfectly square.

export const W = 384;
export const H = 216;

export class Screen {
  readonly display: HTMLCanvasElement;
  readonly dctx: CanvasRenderingContext2D;
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scale = 1;

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
    const availW = window.innerWidth * dpr;
    const availH = window.innerHeight * dpr;
    let s = Math.floor(Math.min(availW / W, availH / H));
    if (s < 1) s = Math.min(availW / W, availH / H);
    this.scale = s;
    const pw = Math.round(W * s);
    const ph = Math.round(H * s);
    this.display.width = pw;
    this.display.height = ph;
    this.display.style.width = `${pw / dpr}px`;
    this.display.style.height = `${ph / dpr}px`;
    this.dctx.imageSmoothingEnabled = false;
  }

  /** Copy the low-res buffer to the display canvas, applying a whole-pixel offset (screen shake). */
  present(offX = 0, offY = 0): void {
    const d = this.dctx;
    const s = this.scale;
    d.fillStyle = '#000';
    d.fillRect(0, 0, this.display.width, this.display.height);
    d.imageSmoothingEnabled = false;
    d.drawImage(this.buffer, Math.round(offX) * s, Math.round(offY) * s, W * s, H * s);
  }
}
