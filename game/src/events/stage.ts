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
//  - keyGuide(): a control guide drawn with keycaps (arrows, Z, X/C, Shift)
//    instead of words — the keyboard's own keys, not a pad's 十字キー.
//  - quietItem(): add an item that a message already announces (no HUD card).

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas, PixelCanvas } from '../engine/pixel';
import { drawText, measure } from '../engine/font';
import type { Action } from '../engine/input';
import { W, H } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { addItem } from '../game/state';
import { field, type FieldScene } from '../world/field';
import type { Actor } from '../world/actor';
import { setMsgPosHook } from '../world/msg';
import { fxElsewhere, registerWorldFx } from '../world/fx';
import { BOX, dialogVisible } from '../ui/dialog';
import { uiHud } from '../ui/hud';
import { drawWindow, textW, UI } from '../ui/window';
import { markText } from '../engine/textzones';
import { freeSpan } from '../engine/safezones';
import { touchControlsOn } from '../engine/touch';
import { registerDebug } from '../debug';
import { examining } from '../world/interact';
import { actorAnchor, objAnchor } from '../world/marks';

// ---------------------------------------------------------------- 2× close-ups

/**
 * A close-up of the field: the (W/scale × H/scale) rectangle around the world
 * point (cx, cy) fills the screen. `k` is how far the camera has pushed in:
 * 0 = the 1× view, 1 = the close-up. In between, the visible rectangle
 * shrinks from the whole frame to the close-up's (a real camera move, one
 * picture — no dissolve of two framings over each other); at rest every
 * pixel is square (2× all over).
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
    /** The ground line (world y) the point (cx, cy) stands over, when it is up on something (the HD-2D view lifts it there). */
    public foot?: number,
  ) {
    [this.buf, this.bctx] = makeCanvas(W, H);
  }

  /** Where the frame shows the close-up's point (the HD-2D view: through its camera). */
  centre(f: FieldScene): [number, number] {
    return f.projected(this.cx, this.cy, this.foot ?? this.cy) ?? [this.cx - Math.round(f.camX), this.cy - Math.round(f.camY)];
  }

  /** The close-up's source rectangle in frame pixels (integer). */
  source(f: FieldScene): [number, number, number, number] {
    const sw = Math.round(W / this.scale);
    const sh = Math.round(H / this.scale);
    const [px, py] = this.centre(f);
    const sx = Math.max(0, Math.min(W - sw, Math.round(px - sw / 2)));
    const sy = Math.max(0, Math.min(H - sh, Math.round(py - sh / 2)));
    return [sx, sy, sw, sh];
  }

  /**
   * The rectangle shown right now: the whole frame (k = 0) closing in on the
   * close-up's (k = 1), edge by edge — the subject glides to the centre as
   * the camera pushes in. In between it is fractional (a smooth move).
   */
  view(f: FieldScene): [number, number, number, number] {
    const [sx, sy, sw, sh] = this.source(f);
    const k = Math.max(0, Math.min(1, this.k));
    if (k >= 1) return [sx, sy, sw, sh];
    return [sx * k, sy * k, W + (sw - W) * k, H + (sh - H) * k];
  }

  /** Current magnification (1 … scale). */
  mag(f: FieldScene): number {
    return W / this.view(f)[2];
  }

  /** Where world point (x, y) (standing over the ground line `foot`) lands on the screen through this close-up. */
  toScreen(f: FieldScene, x: number, y: number, foot = y): [number, number] {
    const [sx, sy, sw] = this.view(f);
    const s = W / sw;
    const [px, py] = f.projected(x, y, foot) ?? [x - Math.round(f.camX), y - Math.round(f.camY)];
    return [(px - sx) * s, (py - sy) * s];
  }

  /** Blow the frame being drawn (`g`, the world canvas) up around the centre. */
  compose(f: FieldScene, g: Gfx): void {
    if (this.k <= 0) return;
    const [sx, sy, sw, sh] = this.view(f);
    if (sw >= W - 0.01) return;
    this.bctx.clearRect(0, 0, W, H);
    this.bctx.drawImage(g.ctx.canvas, 0, 0);
    const ctx = g.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // (the HD-2D view: this frame is the clear layer over its picture, which
    // its camera crops to the same rect — the 1× layer must not stay under it)
    if (fxElsewhere(f)) ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.buf, sx, sy, sw, sh, 0, 0, W, H);
    ctx.restore();
  }
}

const zooms: { f: FieldScene; z: ZoomView }[] = [];

registerWorldFx({
  map: '',
  anchored: true,
  draw(f, g, _cx, _cy, layer) {
    if (layer !== 'top' || !zooms.length) return;
    for (let i = zooms.length - 1; i >= 0; i--) if (zooms[i].z.done || zooms[i].f !== f) zooms.splice(i, 1);
    for (const e of zooms) e.z.compose(f, g);
  },
});

/**
 * Start a close-up of the running field: the camera pushes in over `ms`.
 * `foot`: the ground line under (cx, cy) when that point is up on something
 * (the HD-2D view frames it at its height).
 */
export function* zoomIn(cx: number, cy: number, ms = 350, scale = 2, foot?: number): Co<ZoomView> {
  const z = new ZoomView(cx, cy, scale, foot);
  const f = field();
  if (f) zooms.push({ f, z });
  if (ms <= 0) z.k = 1;
  else yield* animate(ms, (p) => (z.k = p), ease.sineInOut);
  z.k = 1;
  return z;
}

/**
 * A first talk indoors (QA round 3: the same framing as ハト係長's): close
 * on the two (2×), the pair in the middle, their feet just above the window.
 */
export function* talkZoom(a: Actor, b: Actor | null | undefined, ms = 300): Co<ZoomView> {
  // two who stand too far apart to share the frame above the window (ひのや:
  // おばあ at the back of the shop, Minato at the door) — the speaker alone
  if (b && Math.abs(a.y - b.y) > 44) return yield* zoomIn(Math.round(b.x), Math.round(b.y) - 4, ms);
  const x = b ? Math.round((a.x + b.x) / 2) : Math.round(a.x);
  const feet = Math.round(Math.max(a.y, b ? b.y : a.y));
  return yield* zoomIn(x, feet - 10, ms);
}

/**
 * Keep a close-up clean: whoever else stands in its frame below the pair
 * (their head would show over the window, cut in half) fades out while it
 * is up. `feet` is the lowest foot line of the people in the scene; returns
 * the undo (call it once the close-up is gone).
 */
export function clearBelow(z: ZoomView, feet: number, keep: Actor[]): () => void {
  const f = field();
  if (!f) return () => {};
  const [sx, sy, sw, sh] = z.source(f);
  const x0 = Math.round(f.camX) + sx;
  const y0 = Math.round(f.camY) + sy;
  const hidden: [Actor, number][] = [];
  for (const a of f.actors) {
    if (!a.visible || a.alpha <= 0 || keep.includes(a) || a === f.player || a === f.follower) continue;
    if (a.y <= feet + 4) continue;
    if (a.x < x0 - 12 || a.x > x0 + sw + 12 || a.y - 26 > y0 + sh || a.y < y0) continue;
    hidden.push([a, a.alpha]);
  }
  game.scripts.run(animate(180, (p) => hidden.forEach(([a, al]) => (a.alpha = al * (1 - p)))));
  return () => hidden.forEach(([a, al]) => (a.alpha = al));
}

/** Pull a close-up back out to the 1× view. */
export function* zoomOut(z: ZoomView, ms = 450): Co {
  if (ms > 0) yield* animate(ms, (p) => (z.k = 1 - p), ease.sineInOut);
  z.k = 0;
  z.done = true;
}

/**
 * Carry a close-up into a battle: the encounter seal lands on the close-up
 * (no pull-back first), and the close-up is let go while the battle covers
 * the whole screen, so the field comes back at 1× when the battle ends.
 * Call it right before startBattle.
 */
export function zoomIntoBattle(z: ZoomView): void {
  const f = field();
  const t0 = performance.now();
  game.scripts.run(
    (function* (): Co {
      yield () => {
        const top = game.top as { transparent?: boolean } | null;
        const covered = !!top && top !== f && top.transparent === false;
        return covered || z.done || performance.now() - t0 > 4000;
      };
      z.k = 0;
      z.done = true;
    })(),
  );
}

/** Push a close-up further in (or back) to another magnification, e.g. 2× → 3×. */
export function* zoomScale(z: ZoomView, to: number, ms: number): Co {
  const s0 = z.scale;
  if (ms > 0) yield* animate(ms, (p) => (z.scale = s0 + (to - s0) * p), ease.sineInOut);
  z.scale = to;
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

/**
 * The close-ups blowing up field `f`'s frame right now, as one rect of the
 * frame (they are composed in order, each over the last one's picture), and
 * the frame px the last one looks at — for the HD-2D view, whose camera
 * narrows to the same rect (hd2d/view.ts).
 */
export function closeUp(f: FieldScene): { rect: [number, number, number, number]; at: [number, number] } | null {
  let r: [number, number, number, number] | null = null;
  let at: [number, number] = [W / 2, H / 2];
  for (const e of zooms) {
    if (e.f !== f || e.z.done || e.z.k <= 0) continue;
    const v = e.z.view(f);
    if (v[2] >= W - 0.01) continue;
    const c = e.z.centre(f);
    if (!r) {
      r = v;
      at = c;
      continue;
    }
    const k: number = r[2] / W;
    const r0: [number, number, number, number] = r;
    r = [r0[0] + v[0] * k, r0[1] + v[1] * k, v[2] * k, v[3] * k];
    at = [r0[0] + c[0] * k, r0[1] + c[1] * k];
  }
  return r ? { rect: r, at } : null;
}

/** The close-up on screen right now (fully dissolved in), if any. */
function activeZoom(f: FieldScene): ZoomView | null {
  for (const e of zooms) if (e.f === f && !e.z.done && e.z.k >= 0.5) return e.z;
  return null;
}

/** World → screen, through the close-up when there is one. */
function screenOf(f: FieldScene, x: number, y: number, foot = y): [number, number, number] {
  const z = activeZoom(f);
  if (z) return [...z.toScreen(f, x, y, foot), z.mag(f)];
  const p = f.projected(x, y, foot);
  return p ? [p[0], p[1], 1] : [x - Math.round(f.camX), y - Math.round(f.camY), 1];
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
  if (f.map.def.camera === 'fixed' || (f.map.w * 16 <= W && f.map.h * 16 <= H)) return true;
  // 星見台's rooms that fit the screen's height but not its width (the
  // school: the gathering room and the dark corridor) lift the same way
  return f.map.id.startsWith('map_hoshi_') && f.map.def.kind === 'indoor' && f.map.h * 16 <= H;
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
    if (!dialogVisible()) {
      boxPos = 'bottom';
      convPos = null;
    }
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

/** A cut that frames itself around the window (a close-up with the speaker above it). */
let forcedPos: 'top' | 'bottom' | null = null;
export function forceBoxPos(pos: 'top' | 'bottom' | null): void {
  forcedPos = pos;
}

/** The top window with its name tag reaches this far down the screen. */
const TOP_BOX_BOTTOM = 8 + BOX.h + 14;

/**
 * The place chosen for the conversation on screen (2026-10-21 改善会議: the
 * window doesn't hop up and down while one conversation goes on). Set by the
 * first msg block's choice; kept while the window stays open (the next
 * speaker, the next block straight after); cleared when it closes.
 */
let convPos: 'top' | 'bottom' | null = null;

/** Someone (or something) the window should keep clear of, in screen px. */
interface Seen {
  id: string;
  /** Screen x, the top (head / the mark over it) and the feet. */
  x: number;
  head: number;
  feet: number;
  /** Who speaks or is spoken to / looked at: the one that matters most. */
  key: boolean;
}

/**
 * The people of the scene (and the thing being examined) where the screen
 * shows them right now — through the HD-2D camera and any close-up
 * (screenOf); in a 2D fixed room measured from the room's own framing (a
 * lift already under way doesn't count).
 */
function seenOf(f: FieldScene, speakers: readonly string[]): Seen[] {
  const who = new Map<Actor, boolean>();
  const add = (a: Actor | null | undefined, key = false) => {
    if (a && a.visible && a.alpha > 0.5 && !a.drawFn) who.set(a, key || !!who.get(a));
  };
  add(f.player);
  if (f.follower) add(f.follower);
  add(f.talking, true);
  for (const sp of speakers) {
    const id = sp.split(':')[0];
    if (id === 'flip' || id === 'npc_kanenari') add(f.follower ?? f.actorById('npc_kanenari'), true);
    else if (id.startsWith('npc_')) add(f.actorById(id), true);
  }
  const [, baseY] = f.followTarget();
  // (HD-2D: where its camera shows them — a room's 2D rows are not where they stand on screen)
  const room = fixedRoom(f) && !activeZoom(f) && !f.projected(0, 0);
  const out: Seen[] = [];
  const push = (id: string, x: number, top: number, foot: number, key: boolean) => {
    const [sx, sy0, k] = screenOf(f, x, foot);
    const [, hy0] = screenOf(f, x, top, foot);
    const sy = room ? foot - baseY : sy0;
    const hy = room ? top - baseY : hy0;
    if (sx < -8 || sx > W + 8 || sy < 0 || hy > H || sy > H + 24 * k) return;
    out.push({ id, x: sx, head: hy, feet: sy, key });
  };
  for (const [a, key] of who) {
    const fy = a.y + Math.max(0, a.oy);
    // the top of the head (its picture's height: world/marks.ts actorAnchor)
    push(a.id, a.x + a.ox, Math.min(actorAnchor(a).y + 3, fy - 22), fy, key);
  }
  // the thing examined: its picture's top (where its きらり 「！」 stood) to its foot
  const o = examining();
  if (o && f.map.objects.includes(o)) {
    const at = objAnchor(f, o);
    push(o.id, at.x, at.y, at.foot, true);
  }
  return out;
}

/** Of `seen`, the ones a window at `pos` would cover (the bottom one: their feet; the top one with its tag: their heads). */
function coveredAt(seen: readonly Seen[], pos: 'top' | 'bottom'): Seen[] {
  return seen.filter((s) => (pos === 'bottom' ? s.feet > BOX.y - 3 : s.head < TOP_BOX_BOTTOM));
}

/** QA: the conversations whose window went up or still covers someone (the last 400). */
const posLog: { map: string; speakers: string; pos: 'top' | 'bottom'; covered: string[] }[] = [];

/**
 * Before each speaker's pages: if the people in the scene would stand under
 * the bottom window (a cutscene near the bottom of a room that fits the
 * screen, a close-up, the HD-2D camera low on the map), and the room can't
 * simply slide up to clear them, the window goes to the top — unless that
 * would cover them too (or cover who speaks, when the bottom doesn't). Chosen
 * for the whole msg block at once, and kept for the rest of the
 * conversation (convPos).
 */
function autoPos(speaker: string, block: readonly string[] = [speaker]): 'top' | 'bottom' | undefined {
  if (forcedPos) return (boxPos = forcedPos);
  const f = field();
  if (!f || game.top !== f || f.map.id !== liftMap) return (boxPos = 'bottom');
  // the window is still up from the last speaker: it stays where it is
  if (convPos && dialogVisible()) return (boxPos = convPos);
  const seen = seenOf(f, block.includes(speaker) ? block : [speaker, ...block]);
  const [, baseY] = f.followTarget();
  const room = fixedRoom(f) && !activeZoom(f);
  let pos: 'top' | 'bottom' = 'bottom';
  const under = coveredAt(seen, 'bottom');
  let lifts = false;
  if (under.length) {
    // a fixed room slides up by itself when that is enough
    const need = Math.max(...under.map((s) => s.feet)) - (BOX.y - 3);
    lifts = room && !liftOff && wantedLift(f, baseY) >= need - 0.5;
    const over = coveredAt(seen, 'top');
    if (!lifts && (!over.length || (under.some((s) => s.key) && !over.some((s) => s.key)))) pos = 'top';
  }
  boxPos = pos;
  convPos = pos;
  // (only what is worth a look: the window moved up, or someone is still under it)
  const still = pos === 'bottom' && lifts ? [] : coveredAt(seen, pos);
  if (import.meta.env.DEV && (pos === 'top' || still.length)) {
    posLog.push({ map: f.map.id, speakers: [...new Set(block)].join(' '), pos, covered: still.map((s) => s.id) });
    if (posLog.length > 400) posLog.shift();
  }
  return pos;
}
if (import.meta.env.DEV) {
  /** QA: where the conversations' windows went (`clear`: start a new log). Covered: who the window still hides. */
  registerDebug('boxPosLog', (clear = false) => {
    const r = posLog.slice();
    if (clear) posLog.length = 0;
    return r;
  });
  /** QA: right now, whom each window place would cover (the people of the scene, through the HD-2D camera). */
  registerDebug('boxCover', (speaker = 'narr') => {
    const f = field();
    if (!f) return null;
    const seen = seenOf(f, [speaker]);
    return { seen: seen.map((s) => ({ ...s, x: Math.round(s.x), head: Math.round(s.head), feet: Math.round(s.feet) })), bottom: coveredAt(seen, 'bottom').map((s) => s.id), top: coveredAt(seen, 'top').map((s) => s.id) };
  });
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
  // (screen space)
  anchored: true,
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
  forcedPos = null;
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

// ---------------------------------------------------------------- control guides with keycaps

/** A key to draw: an arrow ('up' …) or a key's legend ('Z', 'Shift'). */
export type GuideKey = 'up' | 'down' | 'left' | 'right' | (string & {});
/** One line of a key guide: the keys, then what they do. */
export type KeyRow = [keys: GuideKey[], label: string];

const ARROW: Record<string, string[]> = {
  up: ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..', '..###..'],
  down: ['..###..', '..###..', '..###..', '..###..', '#######', '.#####.', '..###..', '...#...'],
  left: ['...#....', '..##....', '.#######', '########', '.#######', '..##....', '...#....'],
  right: ['....#...', '....##..', '#######.', '########', '#######.', '....##..', '....#...'],
};

/** The action each drawn key stands for (a held key sinks in). */
const KEY_ACTION: Record<string, Action> = {
  up: 'up', down: 'down', left: 'left', right: 'right', Z: 'confirm', X: 'cancel', C: 'menu', Shift: 'dash',
  けってい: 'confirm', もどる: 'cancel', メニュー: 'menu', ダッシュ: 'dash',
};
const ARROWS = ['up', 'down', 'left', 'right'];
/** On the touch pad the 4 arrows are one control (held: any of them sinks it). */
const DPAD = '十字キー';
/** The keyboard's keys as the touch pad names its buttons (engine/touch.ts). */
const TOUCH_NAME: Record<string, string> = { Z: 'けってい', X: 'もどる', C: 'メニュー', Shift: 'ダッシュ' };

/**
 * The keys a row shows on this device (2026-10-21 改善会議: with the touch pad
 * up, 「Z」「X」「Shift」 and the 4 arrows mean nothing — the pad's own names).
 * PC: as given. Touch: Z→けってい, X→もどる, C→メニュー, Shift→ダッシュ, all four
 * arrows → 十字キー (one or two arrows stay arrows: they say which way);
 * 「X / C → メニュー」 is the one メニュー button (もどる steps aside on the field).
 */
export function deviceKeys(keys: readonly GuideKey[]): GuideKey[] {
  if (!touchControlsOn()) return [...keys];
  const out: GuideKey[] = [];
  if (ARROWS.every((a) => keys.includes(a))) out.push(DPAD);
  for (const k of keys) {
    if (out.includes(DPAD) && ARROWS.includes(k)) continue;
    const n = TOUCH_NAME[k] ?? k;
    if (!out.includes(n)) out.push(n);
  }
  if (out.includes('メニュー') && out.includes('もどる')) out.splice(out.indexOf('もどる'), 1);
  return out;
}

/** Is the control a drawn key stands for held down (十字キー: any arrow)? */
function keyHeld(k: GuideKey): boolean {
  if (k === DPAD) return ARROWS.some((a) => game.input.down(a as Action));
  const act = KEY_ACTION[k];
  return !!act && game.input.down(act);
}

const CAPS = new Map<string, HTMLCanvasElement>();
/**
 * A keycap (built once): a cream top lit from above, a 2 px skirt below it,
 * the ink outline with rounded corners, the legend (or an arrow) in pencil.
 */
export function keycap(k: GuideKey): HTMLCanvasElement {
  const hit = CAPS.get(k);
  if (hit) return hit;
  const arrow = ARROW[k];
  const tw = arrow ? arrow[0].length : measure(k);
  const w = Math.max(17, tw + 10);
  const h = 19;
  const p = new PixelCanvas(w, h);
  p.rect(1, 1, w - 2, h - 2, '#B8AE98');
  p.rect(1, 1, w - 2, h - 5, UI.cream);
  p.hline(2, w - 3, 1, '#FFFFFF');
  p.vline(1, 2, h - 6, '#FFFFFF');
  p.hline(1, w - 2, h - 4, '#D8CCAE');
  p.vline(w - 2, 2, h - 5, UI.paperDark);
  p.strokeRect(0, 0, w, h, UI.border);
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) p.set(x, y, 'transparent');
  for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) p.set(x, y, UI.border);
  if (arrow) {
    const ax = Math.floor((w - arrow[0].length) / 2);
    const ay = Math.floor((h - 4 - arrow.length) / 2);
    arrow.forEach((row, j) => [...row].forEach((c, i) => c === '#' && p.set(ax + i, ay + j, UI.pencil)));
  }
  const c = p.toCanvas();
  if (!arrow) drawText(c.getContext('2d')!, k, Math.floor((w - tw) / 2), 1, { color: UI.pencil });
  CAPS.set(k, c);
  return c;
}

/**
 * When a key guide may go (2026-10-21 改善会議: 「1歩 歩くまで 消さない」):
 * 'step' — the player has walked one tile; a list of actions — one of them was
 * pressed; omitted — any action the guide shows was pressed. Until then it
 * stays past its time (`max`: the longest it waits, ms; 0 = no limit).
 */
export interface KeyGuideUntil {
  until?: 'step' | Action[];
  max?: number;
}

/** The menu & dash guide (5.9): until the player runs or opens the menu (40 s at most: both are optional). */
export const GUIDE_MENU_UNTIL: KeyGuideUntil = { until: ['dash', 'menu', 'cancel'], max: 40000 };

class KeyGuide implements Widget {
  modal = false;
  done = false;
  private t = 0;
  /** When it starts to fade (ms of t), once the player did what it says. */
  private outAt = -1;
  private acted = false;
  private from: [string, number, number] | null = null;
  constructor(
    private rows: KeyRow[],
    private ms: number,
    private x0: number,
    private opt: KeyGuideUntil,
  ) {
    const p = field()?.player;
    if (p) this.from = [field()!.map.id, p.tileX, p.tileY];
  }
  /** The actions this guide asks for (its keys' actions). */
  private actions(): Action[] {
    if (this.opt.until && this.opt.until !== 'step') return this.opt.until;
    const out = new Set<Action>();
    for (const [keys] of this.rows) for (const k of keys) if (KEY_ACTION[k]) out.add(KEY_ACTION[k]);
    return [...out];
  }
  private didIt(): boolean {
    if (this.opt.until === 'step') {
      const f = field();
      const p = f?.player;
      if (!f || !p || !this.from) return true;
      return f.map.id !== this.from[0] || p.tileX !== this.from[1] || p.tileY !== this.from[2];
    }
    return this.actions().some((a) => game.input.pressed(a) || game.input.down(a));
  }
  update(dt: number): void {
    // a conversation over it: it waits (hidden) and doesn't count the time
    if (dialogVisible()) return;
    this.t += dt;
    if (!this.acted && this.didIt()) this.acted = true;
    if (this.outAt < 0) {
      const max = this.opt.max ?? (this.opt.until === 'step' ? 0 : 20000);
      if (this.acted || (max > 0 && this.t >= max)) this.outAt = Math.max(this.ms, this.t);
    }
    if (this.outAt >= 0 && this.t > this.outAt + 250) this.done = true;
  }
  private capsW(keys: GuideKey[]): number {
    return keys.reduce((a, k) => a + keycap(k).width, 0) + (keys.length - 1) * 2;
  }
  draw(g: Gfx): void {
    if (dialogVisible()) return;
    const rows = this.rows.map(([k, l]) => [deviceKeys(k), l] as KeyRow);
    const inK = Math.min(1, this.t / 180);
    const outK = this.outAt >= 0 && this.t > this.outAt ? Math.min(1, (this.t - this.outAt) / 250) : 0;
    const a = inK * (1 - outK);
    const kw = Math.max(...rows.map(([k]) => this.capsW(k)));
    const w = kw + 8 + Math.max(...rows.map(([, l]) => textW(l))) + 20;
    const rh = 22;
    const h = rows.length * rh + 9;
    // (iPad held sideways: right of the D-pad fixed in the corner)
    const x = Math.max(this.x0, freeSpan(H - h - 8, H - 2).x0 + 2);
    const y = H - h - 8 + Math.round((1 - ease.cubicOut(inK)) * 6);
    // brief: a touch control in its way fades out while it shows — only for
    // its first seconds (a guide waiting for the player mustn't hide a button)
    markText(x, H - h - 8, w, h + 6, this.t < this.ms);
    drawWindow(g, x, y, w, h, UI, a, { curl: false });
    rows.forEach(([keys, label], i) => {
      const ry = y + 5 + i * rh;
      // the keys, right-aligned in their column; a key being held sinks in
      let kx = x + 10 + kw - this.capsW(keys);
      for (const k of keys) {
        const img = keycap(k);
        g.img(img, kx, ry + (keyHeld(k) ? 1 : 0), { alpha: a });
        kx += img.width + 2;
      }
      g.text(label, x + 10 + kw + 8, ry + 2, { color: UI.pencil, alpha: a });
    });
  }
}

/**
 * A control guide at the bottom left, the keys drawn as keycaps (the touch
 * pad's names when it is up: deviceKeys). `x` moves it right of the HUD
 * hanko (38) once the case is in the corner. It shows at least `ms`, and
 * then waits until the player did what it says (`opt`, KeyGuideUntil).
 */
export function keyGuide(rows: KeyRow[], ms = 4500, x = 8, opt: KeyGuideUntil = {}): void {
  game.ui.push(new KeyGuide(rows, ms, x, opt));
}

/** Take every key guide away at once (a close-up game quit with もどる: ui/closeup.ts). */
export function clearKeyGuides(): void {
  for (const w of game.ui.widgets) if (w instanceof KeyGuide) w.done = true;
}

// ---------------------------------------------------------------- items announced by a message

/** addItem without the HUD pick-up card (the message on screen says it). */
export function* quietItem(id: string): Co<boolean> {
  const ok = addItem(id);
  yield 34;
  uiHud.clearNotes();
  return ok;
}
