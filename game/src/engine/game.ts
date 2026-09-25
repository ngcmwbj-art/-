// The Game singleton: scene stack, global UI overlay layer, global script
// runner, and screen-level post effects (fade, flash, shake).
//
// Frame order (60 Hz fixed step):
//   input.update → ui.update (modal widgets consume input) → scripts.update
//   → top scene update → fx update
// Draw order: scenes (bottom-most opaque upward) → ui → fade/flash → present.

import { Co, FRAME_MS, Runner } from './co';
import { Gfx } from './gfx';
import { Input } from './input';
import { H, Screen, W } from './screen';
import { animate } from './tween';

export interface Scene {
  /** If true, the scene below is drawn first (overlay scenes, menus). */
  transparent?: boolean;
  enter?(): void;
  exit?(): void;
  /** Called when a scene above this one is popped. */
  resume?(): void;
  update(dt: number): void;
  draw(g: Gfx): void;
}

export interface Widget {
  /** Modal widgets eat all input so scenes below don't react. */
  modal: boolean;
  done: boolean;
  update(dt: number, input: Input): void;
  draw(g: Gfx): void;
}

export class UILayer {
  widgets: Widget[] = [];
  push<T extends Widget>(w: T): T {
    this.widgets.push(w);
    return w;
  }
  remove(w: Widget): void {
    const i = this.widgets.indexOf(w);
    if (i >= 0) this.widgets.splice(i, 1);
  }
  get modal(): boolean {
    return this.widgets.some((w) => w.modal && !w.done);
  }
  update(dt: number, input: Input): void {
    // Only the top-most modal widget receives input; others still animate.
    let topModal: Widget | null = null;
    for (let i = this.widgets.length - 1; i >= 0; i--)
      if (this.widgets[i].modal && !this.widgets[i].done) {
        topModal = this.widgets[i];
        break;
      }
    for (const w of this.widgets.slice()) {
      if (w === topModal || !w.modal) w.update(dt, input);
      else w.update(dt, DEAF);
    }
    this.widgets = this.widgets.filter((w) => !w.done);
    if (topModal) input.consume();
  }
  draw(g: Gfx): void {
    for (const w of this.widgets) w.draw(g);
  }
}

// A stand-in Input that never reports anything (for non-top widgets).
const DEAF = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === 'axis') return () => ({ x: 0, y: 0 });
      return () => false;
    },
  },
) as unknown as Input;

export class Game {
  screen!: Screen;
  gfx!: Gfx;
  input!: Input;
  scenes: Scene[] = [];
  ui = new UILayer();
  /** Global script runner for event scripts / cutscenes. */
  scripts = new Runner();
  /** Milliseconds of game time since boot (paused when hidden). */
  time = 0;
  frame = 0;

  // Post effects
  fadeAlpha = 0;
  fadeColor = '#000000';
  flashAlpha = 0;
  flashColor = '#ffffff';
  private flashDecay = 0;
  private shakeTime = 0;
  private shakeDur = 0;
  private shakeAmp = 0;
  shakeX = 0;
  shakeY = 0;
  /** Extra hooks drawn after everything (debug overlays, touch pad). */
  overlays: ((g: Gfx) => void)[] = [];
  /** When > 0, the top scene's update is skipped (global hitstop). */
  freezeMs = 0;
  /** Debug: when true the rAF loop doesn't advance the simulation. */
  paused = false;

  init(canvas: HTMLCanvasElement): void {
    this.screen = new Screen(canvas);
    this.gfx = new Gfx(this.screen.ctx, W, H);
    this.input = new Input(canvas);
  }

  get top(): Scene | undefined {
    return this.scenes[this.scenes.length - 1];
  }

  push(s: Scene): void {
    this.scenes.push(s);
    s.enter?.();
  }

  pop(): Scene | undefined {
    const s = this.scenes.pop();
    s?.exit?.();
    this.top?.resume?.();
    return s;
  }

  /** Replace the whole stack with a single scene. */
  replaceAll(s: Scene): void {
    while (this.scenes.length) this.scenes.pop()?.exit?.();
    this.push(s);
  }

  /** Replace only the top scene. */
  replace(s: Scene): void {
    this.scenes.pop()?.exit?.();
    this.push(s);
  }

  // ---- post effects -------------------------------------------------
  flash(color = '#ffffff', ms = 120, alpha = 1): void {
    this.flashColor = color;
    this.flashAlpha = alpha;
    this.flashDecay = alpha / Math.max(1, ms);
  }

  /** Trauma-style shake: amplitude in pixels, decays over ms. */
  shake(amp = 3, ms = 250): void {
    if (amp >= this.shakeAmp * (this.shakeTime / Math.max(1, this.shakeDur))) {
      this.shakeAmp = amp;
      this.shakeDur = ms;
      this.shakeTime = ms;
    }
  }

  hitstop(ms: number): void {
    this.freezeMs = Math.max(this.freezeMs, ms);
  }

  *fadeOut(ms = 300, color = '#000000'): Co {
    this.fadeColor = color;
    const a0 = this.fadeAlpha;
    yield* animate(ms, (p) => (this.fadeAlpha = a0 + (1 - a0) * p));
  }

  *fadeIn(ms = 300): Co {
    const a0 = this.fadeAlpha;
    yield* animate(ms, (p) => (this.fadeAlpha = a0 * (1 - p)));
  }

  // ---- loop ---------------------------------------------------------
  tick(dt: number): void {
    this.time += dt;
    this.frame++;
    this.input.update(dt);
    this.ui.update(dt, this.input);
    this.scripts.update(dt);
    if (this.freezeMs > 0) this.freezeMs -= dt;
    else this.top?.update(dt);
    // fx
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - this.flashDecay * dt);
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / this.shakeDur);
      const a = this.shakeAmp * k * k;
      this.shakeX = Math.round((Math.random() * 2 - 1) * a);
      this.shakeY = Math.round((Math.random() * 2 - 1) * a);
    } else {
      this.shakeX = this.shakeY = 0;
      this.shakeAmp = 0;
    }
  }

  draw(): void {
    const g = this.gfx;
    // find lowest scene that must be drawn
    let start = this.scenes.length - 1;
    while (start > 0 && this.scenes[start].transparent) start--;
    if (start < 0) g.clear('#000');
    for (let i = Math.max(0, start); i < this.scenes.length; i++) this.scenes[i].draw(g);
    this.ui.draw(g);
    if (this.flashAlpha > 0) g.rect(0, 0, W, H, this.flashColor, Math.min(1, this.flashAlpha));
    if (this.fadeAlpha > 0) g.rect(0, 0, W, H, this.fadeColor, Math.min(1, this.fadeAlpha));
    for (const o of this.overlays) o(g);
    this.screen.present(this.shakeX, this.shakeY);
  }

  start(): void {
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      let el = now - last;
      last = now;
      if (el > 250) el = 250; // tab was hidden
      if (!this.paused) {
        acc += el;
        let steps = 0;
        while (acc >= FRAME_MS && steps < 5) {
          this.tick(FRAME_MS);
          acc -= FRAME_MS;
          steps++;
        }
        if (steps === 5) acc = 0;
      }
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Debug/QA: advance the simulation by exactly `ms` while paused. */
  advance(ms: number): void {
    const n = Math.max(1, Math.round(ms / FRAME_MS));
    for (let i = 0; i < n; i++) this.tick(FRAME_MS);
    this.draw();
  }
}

export const game = new Game();
