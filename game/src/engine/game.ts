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
  /** While this scene is on the stack the screen never rests (a battle, the endings): Game.resting. */
  keepAwake?: boolean;
}

export interface Widget {
  /** Modal widgets eat all input so scenes below don't react. */
  modal: boolean;
  done: boolean;
  /** A close-up game (大写し): on touch, a tap anywhere on the window is けってい (engine/touch.ts). */
  closeup?: boolean;
  /**
   * A close-up game's card (改善会議 2026-10-25 の1, ui/closeup.ts): shown once, the first
   * time it is played (`id` → the saved flag howto_<id>). `line` is one short line, keys as
   * {Z} {X} {←→} {↑↓} {十字} (drawn as the device names them); `pic` one of the shared pictures.
   */
  howto?: { id: string; line: string; pic?: string };
  /**
   * もどる on a close-up game quits it (改善会議 2026-10-25 の4, ui/closeup.ts). `quit()`
   * returning true: the widget took it itself (its own quit path). `quittable()` false:
   * もどる is the widget's own for now (its result card).
   */
  quit?(): boolean;
  quittable?(): boolean;
  update(dt: number, input: Input): void;
  draw(g: Gfx): void;
}

/** The close-up games' common part (ui/closeup.ts): the first card, もどる to quit. */
export interface CloseupHooks {
  pushed(w: Widget): void;
  /** The close-up game is the top modal widget this frame: true = it hears nothing this frame. */
  input(w: Widget, input: Input): boolean;
}

export class UILayer {
  widgets: Widget[] = [];
  closeupHooks: CloseupHooks | null = null;
  /** A card over everything (ui/closeup.ts): while it is up, the game stands still (Game.tick). */
  hold: Widget | null = null;
  push<T extends Widget>(w: T): T {
    this.widgets.push(w);
    if (w.closeup) this.closeupHooks?.pushed(w);
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
    const deaf = !!topModal?.closeup && !!this.closeupHooks?.input(topModal, input);
    for (const w of this.widgets.slice()) {
      if (w === topModal && !deaf) w.update(dt, input);
      else if (!w.modal) w.update(dt, input);
      else w.update(dt, DEAF);
    }
    this.widgets = this.widgets.filter((w) => !w.done);
    if (topModal) input.consume();
  }
  draw(g: Gfx): void {
    for (const w of this.widgets) w.draw(g);
    this.hold?.draw(g);
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
  /**
   * Left alone (改善会議 2026-10-24 の5): no key, touch, click or pad for
   * REST_AFTER_MS, the picture is drawn only REST_FPS times a second and a
   * little darker; the first input brings it back at once. Only the drawing
   * slows: the game's time (the scenes, the dialog's typing, the clock) ticks
   * at 60 Hz as always, and the sound goes on (audio/keepalive.ts — a sound
   * stopped on the iPad did not come back). Never in a battle or a close-up
   * game (keepAwake scenes, closeup widgets).
   */
  resting = false;
  /** Real time (performance.now) of the last input. */
  lastInputAt = performance.now();
  /** How dark the resting picture is now (0 → REST_DIM, eased in; 0 at once on input). */
  private restDim = 0;
  /** QA: frames drawn (the rest's pace is seen from this). */
  drawn = 0;

  init(canvas: HTMLCanvasElement): void {
    this.screen = new Screen(canvas);
    this.gfx = new Gfx(this.screen.ctx, W, H);
    this.input = new Input(canvas);
    // any key, touch, click, mouse move or wheel is someone there (capture: before a handler stops it)
    const wake = () => this.wake();
    for (const ev of ['keydown', 'pointerdown', 'pointermove', 'touchstart', 'wheel']) window.addEventListener(ev, wake, { capture: true, passive: true });
  }

  /** Someone is there: the full pace and brightness come back on the next frame. */
  wake(): void {
    this.lastInputAt = performance.now();
  }

  /** Should the screen rest now (left alone long enough, nothing that must stay smooth on screen)? */
  private wantsRest(now: number): boolean {
    if (this.paused || now - this.lastInputAt < REST_AFTER_MS) return false;
    if (this.scenes.some((s) => s.keepAwake)) return false;
    return !this.ui.widgets.some((w) => w.closeup && !w.done);
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
    if (!this.ui.hold) this.time += dt;
    this.frame++;
    this.input.update(dt);
    // (a pad's buttons have no DOM event: a press seen here wakes the screen too)
    if (this.input.anyKeyThisFrame) this.wake();
    // a card over everything (a close-up game's first card): the rest stands still, the time too
    const hold = this.ui.hold;
    if (hold) {
      hold.update(dt, this.input);
      this.input.consume();
      if (hold.done) this.ui.hold = null;
      return;
    }
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
    // resting: a little darker (over the HD-2D town too — the buffer lies on top of it)
    if (this.restDim > 0) g.rect(0, 0, W, H, '#000000', this.restDim);
    this.screen.present(this.shakeX, this.shakeY);
    this.drawn++;
  }

  start(): void {
    let last = performance.now();
    let acc = 0;
    // Drawn only when the simulation moved: on a 90/120 Hz phone the browser
    // calls back 2× as often as the game ticks, and drawing (and scaling up)
    // the same picture twice was half of what made phones run hot
    // (2026-09-28). A paused game (QA stepping) still draws each callback.
    // Resting (left alone): the ticks go on as they are, the drawing waits for its slower beat
    let lastDrawAt = 0;
    let restFrom = 0;
    const loop = (now: number) => {
      let el = now - last;
      last = now;
      if (el > 250) el = 250; // tab was hidden
      let steps = 0;
      if (!this.paused) {
        acc += el;
        while (acc >= FRAME_MS && steps < 5) {
          this.tick(FRAME_MS);
          acc -= FRAME_MS;
          steps++;
        }
        if (steps === 5) acc = 0;
      }
      const rest = this.wantsRest(now);
      if (rest !== this.resting) {
        this.resting = rest;
        restFrom = now;
        // (back at once: the next frame is drawn bright)
        if (!rest) this.restDim = 0;
      }
      if (rest) this.restDim = REST_DIM * Math.min(1, (now - restFrom) / REST_DIM_MS);
      // (a frame's worth of slack: the beat is kept on a 60 Hz callback)
      const due = !rest || now - lastDrawAt >= 1000 / REST_FPS - 8;
      if ((steps > 0 && due) || this.paused) {
        this.draw();
        lastDrawAt = now;
      }
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

/** Left alone this long (ms of real time), the screen rests (Game.resting). */
export const REST_AFTER_MS = 120000;
/** Frames drawn a second while resting. */
export const REST_FPS = 15;
/** How much darker the resting picture is (black over it), reached over REST_DIM_MS. */
const REST_DIM = 0.28;
const REST_DIM_MS = 1500;

export const game = new Game();
