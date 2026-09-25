// Rig: pose model + sprite assembly shared by every field character.
//
// A character is a draw function `(f: Fig, p: Pose) => void` that paints one
// frame for a view: 'down' (front), 'up' (back) or 'left' (side). Right-facing
// frames are the left view drawn with p.mirror = true and flipped before
// lighting, so the sun still comes from the left.
//
// buildSprite() turns a draw function + a small spec into a CharSprite with
// walk / idle / run cycles, extras (direction-aware) and named anims.

import type { Dir } from '../../game/state';
import { Fig, type FigMeta, type Mats, type RenderOpts } from './fig';
import type { CharAnim, CharSprite } from './registry';
import { protectColors } from './palette';

export type View = 'down' | 'up' | 'left';

export interface Pose {
  view: View;
  /** Actual facing (right = mirrored left). */
  dir: Dir;
  mirror: boolean;
  /** Walk/run frame 0..3 (0 = standing). */
  step: number;
  run: boolean;
  /** Whole upper body offset (+ = down). */
  bob: number;
  /** Idle breathing offset: idle keys with breath 1 arrive here as -1, so
   * `bob - breath` lowers the head and torso by 1px (exhale). */
  breath: number;
  blink: boolean;
  /** Second blink frame (fully closed); blink alone = half-closed. */
  blinkClosed: boolean;
  /** Head tilted back looking at the sky. */
  lookUp: boolean;
  /** Current action / pose name ('' = plain). */
  act: string;
  /** Frame within the action. */
  ph: number;
  /** Idle loop frame index (for small secondary motion). */
  tick: number;
  /** Mode of the frame being built. */
  mode: 'walk' | 'run' | 'idle' | 'extra' | 'anim';
}

export type DrawFn = (f: Fig, p: Pose) => void;

export function pose(o: Partial<Pose> & { view: View }): Pose {
  return {
    dir: o.view === 'left' ? 'left' : o.view,
    mirror: false,
    step: 0,
    run: false,
    bob: 0,
    breath: 0,
    blink: false,
    blinkClosed: false,
    lookUp: false,
    act: '',
    ph: 0,
    tick: 0,
    mode: 'walk',
    ...o,
  };
}

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];

/** Idle frames are emitted on this uniform tick (ms). */
export const TICK = 60;

function viewOf(d: Dir): View {
  return d === 'right' ? 'left' : d;
}

/** Idle frame description (one entry per frame of the loop). */
export interface IdleKey {
  breath?: number;
  blink?: boolean;
  act?: string;
  ph?: number;
}

export interface SpriteSpec {
  id: string;
  w?: number;
  h?: number;
  mats: Mats;
  draw: DrawFn;
  walkFrameMs?: number;
  /** Walk cycle bob per frame (default [0,-1,0,-1]). */
  walkBob?: number[];
  /** Number of walk frames (default 4). */
  walkFrames?: number;
  /** Include a dash cycle. */
  run?: boolean;
  runFrameMs?: number;
  runBob?: number[];
  /** Idle loop keys per direction (or for all). Default: breathing + blink. */
  idle?: IdleKey[] | Partial<Record<Dir, IdleKey[]>>;
  idleFrameMs?: number;
  /** Extras: name → pose override (optionally per-direction views). */
  extras?: Record<string, ExtraSpec>;
  /** Named anims: name → frames of pose overrides. */
  anims?: Record<string, AnimSpec>;
  /**
   * Held poses as looping, direction-aware anims (breathing, blinks and the
   * fidget included). 'idle' = the idle loop of each facing; a key list (per
   * facing or for all) is played like an idle loop, keys without an act use
   * the pose name. Overrides an anim of the same name.
   */
  poses?: Record<string, PoseLoop>;
  shadow?: number;
  render?: RenderOpts;
  /** Directions that do not exist for this sprite reuse another view. */
  views?: Partial<Record<Dir, Dir>>;
  /** Design colours kept exactly (see CharSprite.keep / palette.protectColors). */
  keep?: readonly string[];
}

export interface ExtraSpec {
  /** Pose overrides for this extra. */
  p?: Partial<Pose>;
  /** Directions to build (default: ['down']). 'all' = four directions. */
  dirs?: Dir[] | 'all';
}

export interface AnimSpec {
  frames: Partial<Pose>[];
  ms: number | number[];
  loop?: boolean;
  /** Facing of the frames (default 'down'). */
  dir?: Dir;
  /** Build the anim for these facings too (direction-aware, see animsDir). */
  dirs?: Dir[] | 'all';
}

export type PoseLoop = 'idle' | IdleKey[] | Partial<Record<Dir, IdleKey[]>>;

/** Standard idle: 1s breathing (4 frames × 250ms), blink once per 4s. */
export function breathingIdle(len = 16, blinkAt = [13]): IdleKey[] {
  const out: IdleKey[] = [];
  for (let i = 0; i < len; i++) out.push({ breath: i % 4 >= 2 ? 1 : 0, blink: blinkAt.includes(i) });
  return out;
}

/** Repeat idle keys. */
export function rep(keys: IdleKey[], n: number): IdleKey[] {
  const out: IdleKey[] = [];
  for (let i = 0; i < n; i++) out.push(...keys);
  return out;
}

/**
 * Headroom rendered above every frame (30_level_art 7.8: the walk bob and
 * look_up lift the head by 1–2px). Frames are drawn into a canvas PAD rows
 * taller than declared; buildSprite() then crops every frame of the sprite
 * to the highest row any of them uses, so a sprite whose art never leaves
 * its declared canvas keeps its size, and one that does is never clipped.
 */
export const PAD = 4;

/** Top-most opaque row of each rendered frame (in its uncropped canvas). */
const topRow = new WeakMap<HTMLCanvasElement, number>();

/**
 * Glow layer and light anchor of a finished frame (canvas coordinates of
 * that frame), when its draw function recorded any (Fig.glowPx / halo /
 * lanternAt). nightlight.ts turns it into charGlow() / lanternOf().
 */
const frameMetas = new WeakMap<HTMLCanvasElement, FigMeta>();

export function frameMeta(c: HTMLCanvasElement): FigMeta | undefined {
  return frameMetas.get(c);
}

/** Attach glow / lantern data to a canvas built outside renderFrame (composited frames). */
export function setFrameMeta(c: HTMLCanvasElement, m: FigMeta | undefined): void {
  if (m) frameMetas.set(c, m);
}

/** A copy of `m` moved by (dx, dy). */
export function shiftMeta(m: FigMeta, dx: number, dy: number): FigMeta {
  return {
    glow: m.glow.map((g) => ({ ...g, x: g.x + dx, y: g.y + dy })),
    halo: m.halo.map((h) => ({ ...h, x: h.x + dx, y: h.y + dy })),
    lantern: m.lantern ? { ...m.lantern, x: m.lantern.x + dx, y: m.lantern.y + dy } : undefined,
  };
}

export function renderFrame(spec: SpriteSpec, p: Pose): HTMLCanvasElement {
  const w = spec.w ?? 16;
  const h = spec.h ?? 24;
  if (spec.keep) protectColors(spec.keep);
  const f = new Fig(w, h, spec.mats, PAD);
  spec.draw(f, p);
  if (p.mirror) f.flip();
  const meta = f.meta();
  const pc = f.render(spec.render);
  let top = pc.h;
  for (let i = 0; i < pc.data.length; i++)
    if (pc.data[i] >>> 24) {
      top = (i / pc.w) | 0;
      break;
    }
  const c = pc.toCanvas();
  topRow.set(c, top);
  if (meta) frameMetas.set(c, shiftMeta(meta, 0, PAD));
  return c;
}

export interface HeadroomReport {
  /** Rows above the declared canvas the sprite needed (0 = none). */
  used: number;
  /** Frames whose art reached the top of the headroom (would be cut off). */
  clipped: number;
}

const headroom = new Map<string, HeadroomReport>();

/** How much headroom a built sprite used, and whether any frame still touches the top. */
export function headroomReport(id: string): HeadroomReport | undefined {
  return headroom.get(id);
}

/**
 * Crop every frame of a freshly built sprite to a shared height: the
 * declared height plus the headroom the highest frame needs. Frames stay
 * anchored at the feet (bottom centre), as the contract requires.
 */
function cropHeadroom(s: CharSprite): void {
  const all = new Set<HTMLCanvasElement>();
  const add = (c: HTMLCanvasElement | undefined) => c && topRow.has(c) && all.add(c);
  for (const d of DIRS) {
    s.walk[d]?.forEach(add);
    s.idle?.[d]?.forEach(add);
    s.run?.[d]?.forEach(add);
  }
  for (const c of Object.values(s.extra ?? {})) add(c);
  for (const o of Object.values(s.extraDir ?? {})) for (const c of Object.values(o)) add(c);
  for (const a of Object.values(s.anims ?? {})) a.frames.forEach(add);
  for (const o of Object.values(s.animsDir ?? {})) for (const a of Object.values(o)) a?.frames.forEach(add);
  let top = PAD;
  let clipped = 0;
  for (const c of all) {
    const t = topRow.get(c)!;
    top = Math.min(top, t);
    if (t === 0) clipped++;
  }
  headroom.set(s.id, { used: PAD - top, clipped });
  const map = new Map<HTMLCanvasElement, HTMLCanvasElement>();
  for (const c of all) {
    const n = document.createElement('canvas');
    n.width = c.width;
    n.height = c.height - top;
    n.getContext('2d')!.drawImage(c, 0, -top);
    const m = frameMetas.get(c);
    if (m) frameMetas.set(n, shiftMeta(m, 0, -top));
    map.set(c, n);
  }
  const sw = (c: HTMLCanvasElement) => map.get(c) ?? c;
  const swList = (l: HTMLCanvasElement[]) => l.map(sw);
  for (const d of DIRS) {
    if (s.walk[d]) s.walk[d] = swList(s.walk[d]);
    if (s.idle?.[d]) s.idle[d] = swList(s.idle[d]);
    if (s.run?.[d]) s.run[d] = swList(s.run[d]);
  }
  for (const k of Object.keys(s.extra ?? {})) s.extra![k] = sw(s.extra![k]);
  for (const o of Object.values(s.extraDir ?? {})) for (const d of Object.keys(o) as Dir[]) o[d] = sw(o[d]!);
  const anim = (a: CharAnim) => ({ ...a, frames: swList(a.frames) });
  const done = new Map<CharAnim, CharAnim>();
  const swA = (a: CharAnim) => {
    let r = done.get(a);
    if (!r) done.set(a, (r = anim(a)));
    return r;
  };
  for (const k of Object.keys(s.anims ?? {})) s.anims![k] = swA(s.anims![k]);
  for (const o of Object.values(s.animsDir ?? {})) for (const d of Object.keys(o) as Dir[]) if (o[d]) o[d] = swA(o[d]!);
}

function framePose(dir: Dir, o: Partial<Pose>): Pose {
  const view = viewOf(dir);
  return pose({ ...o, view, dir, mirror: dir === 'right' });
}

/**
 * Frames of an idle-style loop for facing `d`. Every key lasts idleFrameMs
 * (nominal); frames are emitted on a uniform TICK so blinks can be half
 * (60ms) → closed (60ms) → open. `act` fills in keys without their own act.
 */
function idleLoop(spec: SpriteSpec, d: Dir, ks: IdleKey[], act = '', mode: Pose['mode'] = 'idle'): HTMLCanvasElement[] {
  const ticks = Math.max(1, Math.round((spec.idleFrameMs ?? 250) / TICK));
  // Frames are shared between keys with the same breath/blink/act/ph unless
  // the draw function reads p.tick (secondary motion: sway, blinking LEDs,
  // rollers...), which is detected on the first render of each key kind.
  const cache = new Map<string, HTMLCanvasElement>();
  const usesTick = new Map<string, boolean>();
  const get = (k: IdleKey, i: number, blink: number) => {
    const a = k.act ?? act;
    const shared = `${k.breath ?? 0}|${blink}|${a}|${k.ph ?? 0}`;
    const sens = usesTick.get(shared);
    const key = sens ? `${shared}|${i}` : shared;
    let c = sens === undefined ? undefined : cache.get(key);
    if (!c) {
      // breathing lowers the head and torso by 1px (30_level_art 7.8)
      const p = framePose(d, { breath: -(k.breath ?? 0), blink: blink > 0, blinkClosed: blink > 1, act: a, ph: k.ph ?? 0, tick: i, mode });
      let read = false;
      let tv = i;
      Object.defineProperty(p, 'tick', {
        get: () => ((read = true), tv),
        set: (v: number) => (tv = v),
        enumerable: true,
        configurable: true,
      });
      c = renderFrame(spec, p);
      if (sens === undefined) usesTick.set(shared, read);
      cache.set(read ? `${shared}|${i}` : shared, c);
    }
    return c;
  };
  const frames: HTMLCanvasElement[] = [];
  ks.forEach((k, i) => {
    for (let t = 0; t < ticks; t++) {
      const blink = k.blink ? (t === 0 ? 1 : t === 1 ? 2 : ticks > 3 && t === 2 ? 1 : 0) : 0;
      frames.push(get(k, i, blink));
    }
  });
  return frames;
}

export function buildSprite(spec: SpriteSpec): CharSprite {
  const nWalk = spec.walkFrames ?? 4;
  const bobs = spec.walkBob ?? [0, -1, 0, -1];
  const walk = {} as Record<Dir, HTMLCanvasElement[]>;
  const idle = {} as Record<Dir, HTMLCanvasElement[]>;
  let run: Record<Dir, HTMLCanvasElement[]> | undefined;
  const alias = spec.views ?? {};

  for (const d of DIRS) {
    const src = alias[d];
    if (src && src !== d) continue;
    const wf: HTMLCanvasElement[] = [];
    for (let i = 0; i < nWalk; i++)
      wf.push(renderFrame(spec, framePose(d, { step: i, bob: bobs[i % bobs.length], mode: 'walk' })));
    walk[d] = wf;
    const keys = Array.isArray(spec.idle) ? spec.idle : (spec.idle?.[d] ?? (spec.idle ? undefined : breathingIdle()));
    const frames = idleLoop(spec, d, keys ?? breathingIdle());
    idle[d] = frames;
    if (spec.run) {
      run ??= {} as Record<Dir, HTMLCanvasElement[]>;
      const rb = spec.runBob ?? [0, -1, 0, -1];
      run[d] = [0, 1, 2, 3].map((i) => renderFrame(spec, framePose(d, { step: i, run: true, bob: rb[i], mode: 'run' })));
    }
  }
  for (const d of DIRS) {
    const src = alias[d];
    if (src && src !== d) {
      walk[d] = walk[src];
      idle[d] = idle[src];
      if (run) run[d] = run[src];
    }
  }

  const extra: Record<string, HTMLCanvasElement> = {};
  const extraDir: Record<string, Partial<Record<Dir, HTMLCanvasElement>>> = {};
  const ex = { look_up: { dirs: 'all' as const, p: { lookUp: true } }, ...(spec.extras ?? {}) };
  for (const name of Object.keys(ex)) {
    const e = (ex as Record<string, ExtraSpec>)[name];
    const dirs = e.dirs === 'all' ? DIRS : (e.dirs ?? ['down']);
    const byDir: Partial<Record<Dir, HTMLCanvasElement>> = {};
    for (const d of dirs) {
      const src = alias[d];
      if (src && src !== d && byDir[src]) {
        byDir[d] = byDir[src];
        continue;
      }
      byDir[d] = renderFrame(spec, framePose(src ?? d, { act: name, mode: 'extra', ...(e.p ?? {}) }));
    }
    extra[name] = byDir[dirs[0]]!;
    if (dirs.length > 1) extraDir[name] = byDir;
  }

  const anims: Record<string, CharAnim> = {};
  const animsDir: Record<string, Partial<Record<Dir, CharAnim>>> = {};
  const buildAnim = (name: string, a: AnimSpec, d: Dir): CharAnim => {
    const src = alias[d] ?? d;
    const cache = new Map<string, HTMLCanvasElement>();
    const frames = a.frames.map((o) => {
      const key = JSON.stringify(o);
      let c = cache.get(key);
      if (!c) {
        c = renderFrame(spec, framePose(src, { act: name, mode: 'anim', ...o }));
        cache.set(key, c);
      }
      return c;
    });
    return { frames, ms: a.ms, loop: a.loop };
  };
  if (spec.anims)
    for (const name of Object.keys(spec.anims)) {
      const a = spec.anims[name];
      const d = a.dir ?? 'down';
      anims[name] = buildAnim(name, a, d);
      if (a.dirs) {
        const byDir: Partial<Record<Dir, CharAnim>> = { [d]: anims[name] };
        for (const dd of a.dirs === 'all' ? DIRS : a.dirs) byDir[dd] ??= buildAnim(name, a, dd);
        animsDir[name] = byDir;
      }
      if (!extra[name]) extra[name] = anims[name].frames[0];
    }
  if (spec.poses)
    for (const name of Object.keys(spec.poses)) {
      const loop = spec.poses[name];
      const byDir: Partial<Record<Dir, CharAnim>> = {};
      for (const d of DIRS) {
        let frames: HTMLCanvasElement[];
        if (loop === 'idle') frames = idle[d];
        else {
          const keys = Array.isArray(loop) ? loop : (loop[d] ?? loop[alias[d] ?? d]);
          if (!keys) {
            frames = idle[d];
          } else {
            const src = alias[d] ?? d;
            frames = src !== d && byDir[src] ? byDir[src]!.frames : idleLoop(spec, src, keys, name);
          }
        }
        byDir[d] = { frames, ms: TICK };
      }
      anims[name] = byDir.down!;
      animsDir[name] = byDir;
      if (!extra[name]) extra[name] = byDir.down!.frames[0];
    }

  const sprite: CharSprite = {
    id: spec.id,
    w: spec.w ?? 16,
    h: spec.h ?? 24,
    walk,
    idle,
    extra,
    extraDir,
    anims,
    animsDir,
    run,
    walkFrameMs: spec.walkFrameMs ?? 150,
    runFrameMs: spec.runFrameMs ?? 95,
    idleFrameMs: TICK,
    shadow: spec.shadow ?? 10,
    keep: spec.keep,
  };
  cropHeadroom(sprite);
  return sprite;
}
