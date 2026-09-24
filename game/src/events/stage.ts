// Camera and framing tools for the story scenes (not map data):
//
//  - ZoomView / zoomIn(): an integer 2× close-up of the field around a world
//    point, rendered from the field's own frame (so light, emotes and the
//    night grading come along), dissolved in and out over the 1× view.
//    Every pixel stays square: 2× all over, never a fractional scale.
//  - dialog lift: in fixed-camera rooms the bottom dialog window covered the
//    lower half of the room; while a window is up, the room slides up just
//    enough to keep the people in the scene above it.
//  - cinema(): thin letterbox bars and a dithered vignette (17:00).
//  - guideNearHanko(): the fushigi guide next to the HUD hanko it describes,
//    with a pointer and a pulse around the icon.
//  - quietItem(): add an item that a message already announces (no HUD card).

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas, PixelCanvas } from '../engine/pixel';
import { W, H } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { addItem } from '../game/state';
import { field, type FieldScene } from '../world/field';
import { registerWorldFx } from '../world/fx';
import { BOX, dialogVisible } from '../ui/dialog';
import { uiHud } from '../ui/hud';
import { drawWindow, textW, UI } from '../ui/window';

// ---------------------------------------------------------------- 2× close-ups

/** The field's world canvas (the frame without the HUD), or null. */
function worldCanvas(f: FieldScene): HTMLCanvasElement | null {
  const r = f.renderer as unknown as { wc?: HTMLCanvasElement };
  return r.wc instanceof HTMLCanvasElement ? r.wc : null;
}

/**
 * An integer close-up of the field: the (W/scale × H/scale) rectangle around
 * the world point (cx, cy) fills the screen. `k` dissolves it over the 1× view.
 * It is drawn first among the UI widgets, so dialog windows stay on top.
 */
export class ZoomView implements Widget {
  modal = false;
  done = false;
  k = 0;
  private buf: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;

  constructor(
    public cx: number,
    public cy: number,
    public scale = 2,
  ) {
    [this.buf, this.bctx] = makeCanvas(Math.ceil(W / scale), Math.ceil(H / scale));
  }

  update(): void {}

  /** Top-left of the source rectangle on screen (integer). */
  source(f: FieldScene): [number, number, number, number] {
    const sw = Math.round(W / this.scale);
    const sh = Math.round(H / this.scale);
    const sx = Math.max(0, Math.min(W - sw, Math.round(this.cx - f.camX - sw / 2)));
    const sy = Math.max(0, Math.min(H - sh, Math.round(this.cy - f.camY - sh / 2)));
    return [sx, sy, sw, sh];
  }

  draw(g: Gfx): void {
    const f = field();
    if (!f || game.top !== f || this.k <= 0) return;
    const src = worldCanvas(f) ?? g.ctx.canvas;
    const [sx, sy, sw, sh] = this.source(f);
    this.bctx.clearRect(0, 0, this.buf.width, this.buf.height);
    this.bctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    const ctx = g.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(1, this.k);
    ctx.drawImage(this.buf, 0, 0, sw, sh, 0, 0, sw * this.scale, sh * this.scale);
    ctx.restore();
    // the HUD stays at 1× on top of the close-up
    if (worldCanvas(f)) uiHud.draw(g, f);
  }
}

/** Put a close-up under every other widget and dissolve it in. */
export function* zoomIn(cx: number, cy: number, ms = 350, scale = 2): Co<ZoomView> {
  const z = new ZoomView(cx, cy, scale);
  game.ui.widgets.unshift(z);
  if (ms <= 0) z.k = 1;
  else yield* animate(ms, (p) => (z.k = p), ease.sineInOut);
  z.k = 1;
  return z;
}

/** Dissolve a close-up back to the 1× view. */
export function* zoomOut(z: ZoomView, ms = 450): Co {
  if (ms > 0) yield* animate(ms, (p) => (z.k = 1 - p), ease.sineInOut);
  z.k = 0;
  z.done = true;
}

/** Move the close-up's centre (world px) with an ease; it steps in whole source pixels. */
export function* zoomPan(z: ZoomView, cx: number, cy: number, ms: number): Co {
  const x0 = z.cx;
  const y0 = z.cy;
  yield* animate(
    ms,
    (p) => {
      z.cx = Math.round(x0 + (cx - x0) * p);
      z.cy = Math.round(y0 + (cy - y0) * p);
    },
    ease.sineInOut,
  );
}

// ---------------------------------------------------------------- the dialog lift (fixed rooms)

let lift = 0;
let liftOff = false;
/** Pause the automatic lift (a cut frames the room itself). */
export function setDialogLift(on: boolean): void {
  liftOff = !on;
}

function fixedRoom(f: FieldScene): boolean {
  return f.map.def.camera === 'fixed' || (f.map.w * 16 <= W && f.map.h * 16 <= H);
}

/** How far the room must slide up so the people in the scene clear the window. */
function wantedLift(f: FieldScene, baseY: number): number {
  const who = [f.player, f.follower, f.talking];
  for (const a of f.actors) if (a.kind === 'npc' && a.data.scripted && a.visible && a.alpha > 0.5) who.push(a);
  let feet = -1e9;
  for (const a of who) if (a && a.visible && !a.drawFn) feet = Math.max(feet, a.y + Math.max(0, a.oy) - baseY);
  const need = feet - (BOX.y - 3);
  if (need <= 0) return 0;
  // never push the room's top edge off the screen
  const roomTop = -baseY;
  return Math.max(0, Math.min(need, roomTop, 44));
}

registerWorldFx({
  map: '',
  update(f, dt) {
    if (!fixedRoom(f)) {
      lift = 0;
      return;
    }
    const [, baseY] = f.followTarget();
    const want = !liftOff && dialogVisible() && game.top === f ? wantedLift(f, baseY) : 0;
    if (want === 0 && lift === 0) return;
    lift = want + (lift - want) * Math.exp(-14 * (dt / 1000));
    if (Math.abs(lift - want) < 0.5) lift = want;
    f.camY = baseY + Math.round(lift);
  },
});

// ---------------------------------------------------------------- letterbox & vignette

const cine = { k: 0, bar: 12 };
let VIG: HTMLCanvasElement | null = null;
/** A dithered vignette (4×4 Bayer), so the darkening keeps the pixel grid. */
function vignette(): HTMLCanvasElement {
  if (VIG) return VIG;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const p = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2);
      const dy = (y - H / 2) / (H / 2);
      const d = Math.sqrt(dx * dx * 0.85 + dy * dy * 1.1);
      const v = Math.max(0, Math.min(1, (d - 0.62) / 0.55));
      if (v <= 0) continue;
      const th = (bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
      if (v > th) p.set(x, y, '#0B0B14');
    }
  VIG = p.toCanvas();
  return VIG;
}

registerWorldFx({
  map: '',
  draw(_f, g, _cx, _cy, layer) {
    if (layer !== 'top' || cine.k <= 0) return;
    const k = cine.k;
    g.alpha(0.55 * k, () => g.img(vignette(), 0, 0));
    const b = Math.round(cine.bar * ease.cubicOut(k));
    if (b > 0) {
      g.rect(0, 0, W, b, '#0B0B14');
      g.rect(0, H - b, W, b, '#0B0B14');
    }
  },
});

/** Bring the letterbox and vignette in (on) or out over `ms`. */
export function* cinema(on: boolean, ms = 400): Co {
  const k0 = cine.k;
  const k1 = on ? 1 : 0;
  yield* animate(ms, (p) => (cine.k = k0 + (k1 - k0) * p), ease.sineInOut);
  cine.k = k1;
}

export function cinemaOff(): void {
  cine.k = 0;
}

/** QA (jump): drop any framing left over from an interrupted scene. */
export function resetStaging(): void {
  cine.k = 0;
  lift = 0;
  liftOff = false;
}

// ---------------------------------------------------------------- the fushigi guide, next to the icon

class HankoGuide implements Widget {
  modal = false;
  done = false;
  private t = 0;
  constructor(
    private lines: string[],
    private ms: number,
  ) {}
  update(dt: number): void {
    this.t += dt;
    if (this.t > this.ms + 250) this.done = true;
  }
  draw(g: Gfx): void {
    const inK = Math.min(1, this.t / 180);
    const outK = this.t > this.ms ? Math.min(1, (this.t - this.ms) / 250) : 0;
    const a = inK * (1 - outK);
    const w = Math.max(...this.lines.map((l) => textW(l))) + 20;
    const h = this.lines.length * 17 + 10;
    // the HUD hanko is at (8, 190), 20×24: the note sits to its right
    const x = 38 + Math.round((1 - ease.cubicOut(inK)) * 6);
    const y = H - h - 6;
    drawWindow(g, x, y, w, h, UI, a, { curl: false });
    // a pointer from the note to the icon
    const py = 203;
    g.alpha(a, () => {
      for (let i = 0; i < 4; i++) {
        g.rect(x - 1 - i, py - 3 + i, 1, 7 - i * 2, UI.border);
        if (i < 3) g.rect(x - i, py - 2 + i, 1, 5 - i * 2, UI.bg);
      }
    });
    this.lines.forEach((l, i) => g.text(l, x + 10, y + 5 + i * 17, { color: UI.pencil, alpha: a }));
    // a vermilion pulse round the icon, twice a second
    const p = (this.t % 900) / 900;
    const r = Math.round(9 + p * 7);
    g.alpha(a * (1 - p) * 0.9, () => g.ring(18, 202, r, UI.accent));
  }
}

/** The fushigi guide beside the HUD hanko (the default guide window covered it). */
export function guideNearHanko(text: string, ms = 4500): void {
  game.ui.push(new HankoGuide(text.split('\n'), ms));
}

// ---------------------------------------------------------------- items announced by a message

/** addItem without the HUD pick-up card (the message on screen says it). */
export function* quietItem(id: string): Co<boolean> {
  const ok = addItem(id);
  yield 34;
  uiHud.clearNotes();
  return ok;
}
