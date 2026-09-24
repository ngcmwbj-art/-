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
import { makeCanvas } from '../engine/pixel';
import { W, H } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { addItem } from '../game/state';
import { field, type FieldScene } from '../world/field';
import type { Actor } from '../world/actor';
import { setMsgPosHook } from '../world/msg';
import { registerWorldFx } from '../world/fx';
import { BOX, dialogVisible } from '../ui/dialog';
import { uiHud } from '../ui/hud';
import { drawWindow, textW, UI } from '../ui/window';

// ---------------------------------------------------------------- 2× close-ups

/**
 * An integer close-up of the field: the (W/scale × H/scale) rectangle around
 * the world point (cx, cy) fills the screen; `k` dissolves it over the 1× view.
 * It is composed into the field's own frame (the world fx 'top' layer, after
 * the light, the glows and the emotes), so the HUD, dialog windows and any
 * scene laid over the field (the night sky) all stay at 1× on top of it.
 */
export class ZoomView {
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

  /** The source rectangle in frame pixels (integer). */
  source(f: FieldScene): [number, number, number, number] {
    const sw = Math.round(W / this.scale);
    const sh = Math.round(H / this.scale);
    const sx = Math.max(0, Math.min(W - sw, Math.round(this.cx - Math.round(f.camX) - sw / 2)));
    const sy = Math.max(0, Math.min(H - sh, Math.round(this.cy - Math.round(f.camY) - sh / 2)));
    return [sx, sy, sw, sh];
  }

  /** Where world point (x, y) lands on the screen through this close-up. */
  toScreen(f: FieldScene, x: number, y: number): [number, number] {
    const [sx, sy] = this.source(f);
    return [(x - Math.round(f.camX) - sx) * this.scale, (y - Math.round(f.camY) - sy) * this.scale];
  }

  /** Blow the frame being drawn (`g`, the world canvas) up around the centre. */
  compose(f: FieldScene, g: Gfx): void {
    if (this.k <= 0) return;
    const [sx, sy, sw, sh] = this.source(f);
    this.bctx.clearRect(0, 0, this.buf.width, this.buf.height);
    this.bctx.drawImage(g.ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    const ctx = g.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(1, this.k);
    ctx.drawImage(this.buf, 0, 0, sw, sh, 0, 0, sw * this.scale, sh * this.scale);
    ctx.restore();
  }
}

const zooms: { f: FieldScene; z: ZoomView }[] = [];

registerWorldFx({
  map: '',
  draw(f, g, _cx, _cy, layer) {
    if (layer !== 'top' || !zooms.length) return;
    for (let i = zooms.length - 1; i >= 0; i--) if (zooms[i].z.done || zooms[i].f !== f) zooms.splice(i, 1);
    for (const e of zooms) e.z.compose(f, g);
  },
});

/** Start a close-up of the running field and dissolve it in. */
export function* zoomIn(cx: number, cy: number, ms = 350, scale = 2): Co<ZoomView> {
  const z = new ZoomView(cx, cy, scale);
  const f = field();
  if (f) zooms.push({ f, z });
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

/** The close-up on screen right now (fully dissolved in), if any. */
function activeZoom(f: FieldScene): ZoomView | null {
  for (const e of zooms) if (e.f === f && !e.z.done && e.z.k >= 0.5) return e.z;
  return null;
}

/** World → screen, through the close-up when there is one. */
function screenOf(f: FieldScene, x: number, y: number): [number, number, number] {
  const z = activeZoom(f);
  if (z) return [...z.toScreen(f, x, y), z.scale];
  return [x - Math.round(f.camX), y - Math.round(f.camY), 1];
}

// ---------------------------------------------------------------- the dialog lift (fixed rooms)

let lift = 0;
let liftMap = '';
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
  // the room's top rows are its back wall: up to 24 px of it may leave the screen
  const roomTop = -baseY + 24;
  return Math.max(0, Math.min(need, roomTop, 44));
}

registerWorldFx({
  map: '',
  update(f, dt) {
    // a new room starts level
    if (f.map.id !== liftMap) {
      liftMap = f.map.id;
      lift = 0;
    }
    if (!dialogVisible()) boxPos = 'bottom';
    if (!fixedRoom(f) || activeZoom(f)) {
      lift = 0;
      return;
    }
    const [, baseY] = f.followTarget();
    const want = !liftOff && dialogVisible() && boxPos === 'bottom' && game.top === f ? wantedLift(f, baseY) : 0;
    if (want === 0 && lift === 0) return;
    lift = want + (lift - want) * Math.exp(-14 * (dt / 1000));
    if (Math.abs(lift - want) < 0.5) lift = want;
    f.camY = baseY + Math.round(lift);
  },
});

// ---------------------------------------------------------------- the window moves up (msg blocks)

/** Where the current msg window went (the lift only applies under a bottom window). */
let boxPos: 'top' | 'bottom' = 'bottom';

/** The top window with its name tag reaches this far down the screen. */
const TOP_BOX_BOTTOM = 8 + BOX.h + 14;

/**
 * Before each speaker's pages: if the people in the scene would stand under
 * the bottom window (a cutscene near the bottom of a room that fits the
 * screen, a close-up), and the room can't simply slide up to clear them, the
 * window goes to the top — unless that would cover them too.
 */
function autoPos(speaker: string): 'top' | 'bottom' | undefined {
  const f = field();
  if (!f || game.top !== f || f.map.id !== liftMap) return (boxPos = 'bottom');
  const who = new Set<Actor>();
  const add = (a: Actor | null | undefined) => {
    if (a && a.visible && a.alpha > 0.5 && !a.drawFn) who.add(a);
  };
  add(f.player);
  if (f.follower) add(f.follower);
  add(f.talking);
  const id = speaker.split(':')[0];
  if (id === 'flip' || id === 'npc_kanenari') add(f.follower ?? f.actorById('npc_kanenari'));
  else if (id.startsWith('npc_')) add(f.actorById(id));
  // in a fixed room, measured from the room's own framing (a lift already
  // under way doesn't count)
  const [, baseY] = f.followTarget();
  const room = fixedRoom(f) && !activeZoom(f);
  let feet = -1e9;
  let head = 1e9;
  for (const a of who) {
    const fy = a.y + Math.max(0, a.oy);
    const [x, y0, k] = screenOf(f, a.x, fy);
    const y = room ? fy - baseY : y0;
    if (x < -8 || x > W + 8 || y < 0 || y > H + 24 * k) continue;
    feet = Math.max(feet, y);
    head = Math.min(head, y - 22 * k);
  }
  let pos: 'top' | 'bottom' = 'bottom';
  const need = feet - (BOX.y - 3);
  if (need > 0) {
    // a fixed room slides up by itself when that is enough
    const lifts = room && !liftOff && wantedLift(f, baseY) >= need - 0.5;
    if (!lifts && head > TOP_BOX_BOTTOM) pos = 'top';
  }
  boxPos = pos;
  return pos;
}
setMsgPosHook(autoPos);

// ---------------------------------------------------------------- letterbox & vignette

const cine = { k: 0, bar: 12 };
let VIG: HTMLCanvasElement | null = null;
/** A soft vignette: only the corners and the edges darken (like the world's light pools, a smooth ramp). */
function vignette(): HTMLCanvasElement {
  if (VIG) return VIG;
  const [c, ctx] = makeCanvas(W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(1, H / W);
  const r = W * 0.62;
  const grd = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r * 1.02);
  grd.addColorStop(0, 'rgba(11,11,20,0)');
  grd.addColorStop(0.6, 'rgba(11,11,20,0.35)');
  grd.addColorStop(1, 'rgba(11,11,20,0.8)');
  ctx.fillStyle = grd;
  ctx.fillRect(-W, -W, W * 2, W * 2);
  ctx.restore();
  VIG = c;
  return VIG;
}

registerWorldFx({
  map: '',
  draw(_f, g, _cx, _cy, layer) {
    if (layer !== 'top' || cine.k <= 0) return;
    const k = cine.k;
    g.alpha(0.7 * k, () => g.img(vignette(), 0, 0));
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
  zooms.length = 0;
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
