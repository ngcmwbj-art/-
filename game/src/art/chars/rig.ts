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
import { Fig, type Mats, type RenderOpts } from './fig';
import type { CharAnim, CharSprite } from './registry';

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
  /** Idle breathing: 1 = inhale (head & shoulders up 1px). */
  breath: number;
  blink: boolean;
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
    lookUp: false,
    act: '',
    ph: 0,
    tick: 0,
    mode: 'walk',
    ...o,
  };
}

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];

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
  shadow?: number;
  render?: RenderOpts;
  /** Directions that do not exist for this sprite reuse another view. */
  views?: Partial<Record<Dir, Dir>>;
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
  dir?: Dir;
}

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

export function renderFrame(spec: SpriteSpec, p: Pose): HTMLCanvasElement {
  const w = spec.w ?? 16;
  const h = spec.h ?? 24;
  const f = new Fig(w, h, spec.mats);
  spec.draw(f, p);
  if (p.mirror) f.flip();
  return f.render(spec.render).toCanvas();
}

function framePose(dir: Dir, o: Partial<Pose>): Pose {
  const view = viewOf(dir);
  return pose({ ...o, view, dir, mirror: dir === 'right' });
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
    const frames: HTMLCanvasElement[] = [];
    for (let i = 0; i < nWalk; i++)
      frames.push(renderFrame(spec, framePose(d, { step: i, bob: bobs[i % bobs.length], mode: 'walk' })));
    walk[d] = frames;
    // idle
    const keys = Array.isArray(spec.idle) ? spec.idle : (spec.idle?.[d] ?? (spec.idle ? undefined : breathingIdle()));
    const ks = keys ?? breathingIdle();
    const cache = new Map<string, HTMLCanvasElement>();
    idle[d] = ks.map((k, i) => {
      const key = `${k.breath ?? 0}|${k.blink ? 1 : 0}|${k.act ?? ''}|${k.ph ?? 0}`;
      let c = cache.get(key);
      if (!c) {
        c = renderFrame(spec, framePose(d, { breath: k.breath ?? 0, blink: !!k.blink, act: k.act ?? '', ph: k.ph ?? 0, tick: i, mode: 'idle' }));
        cache.set(key, c);
      }
      return c;
    });
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
  if (spec.anims)
    for (const name of Object.keys(spec.anims)) {
      const a = spec.anims[name];
      const d = a.dir ?? 'down';
      const cache = new Map<string, HTMLCanvasElement>();
      const frames = a.frames.map((o) => {
        const key = JSON.stringify(o);
        let c = cache.get(key);
        if (!c) {
          c = renderFrame(spec, framePose(d, { act: name, mode: 'anim', ...o }));
          cache.set(key, c);
        }
        return c;
      });
      anims[name] = { frames, ms: a.ms, loop: a.loop };
      if (!extra[name]) extra[name] = frames[0];
    }

  return {
    id: spec.id,
    w: spec.w ?? 16,
    h: spec.h ?? 24,
    walk,
    idle,
    extra,
    extraDir,
    anims,
    run,
    walkFrameMs: spec.walkFrameMs ?? 140,
    runFrameMs: spec.runFrameMs ?? 90,
    idleFrameMs: spec.idleFrameMs ?? 250,
    shadow: spec.shadow ?? 10,
  };
}
