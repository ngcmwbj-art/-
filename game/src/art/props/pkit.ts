// Prop construction helpers: standing props anchored on a tile, animated
// frame props, flat decals, and a hook registry for effects the world
// module draws into props (curve mirror, etc.).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import type { PropArt, PropEnv } from './types';

export interface StandOpts {
  /** Anchor x of the image's bottom-centre inside the tile (px). */
  cx?: number;
  /** Tile-relative y of the image's bottom row + 1 (default 16). */
  base?: number;
  /** Long-shadow caster height (0 = none; default image height if ≥12). */
  shadow?: number;
  contact?: number;
  /** Depth-sort y relative to the tile top (default base - 1). */
  foot?: number;
  extra?: Partial<PropArt>;
}

export function stand(img: HTMLCanvasElement, o: StandOpts = {}): PropArt {
  const cx = o.cx ?? 8;
  const base = o.base ?? 16;
  const sh = o.shadow ?? (img.height >= 12 ? img.height : 0);
  return {
    ox: Math.round(cx - img.width / 2),
    oy: base - img.height,
    w: img.width,
    h: img.height,
    foot: o.foot ?? base - 1,
    img: () => img,
    shadow: sh || undefined,
    contact: o.contact ?? Math.max(6, Math.round(img.width * 0.7)),
    contactX: cx,
    ...o.extra,
  };
}

/** A standing prop whose image is picked per frame. */
export function standAnim(frames: HTMLCanvasElement[], pick: (env: PropEnv) => number, o: StandOpts = {}): PropArt {
  const a = stand(frames[0], o);
  a.img = (env) => frames[Math.max(0, Math.min(frames.length - 1, pick(env)))] ?? frames[0];
  a.shadowImg = () => frames[0];
  return a;
}

/** Flat decal (drawn in the decal layer, never y-sorted). */
export function flat(img: HTMLCanvasElement, ox = 0, oy = 0, extra: Partial<PropArt> = {}): PropArt {
  return { ox, oy, w: img.width, h: img.height, foot: 0, flat: true, img: () => img, ...extra };
}

export function flatAnim(frames: HTMLCanvasElement[], pick: (env: PropEnv) => number, ox = 0, oy = 0, extra: Partial<PropArt> = {}): PropArt {
  return { ox, oy, w: frames[0].width, h: frames[0].height, foot: 0, flat: true, img: (env) => frames[pick(env)] ?? frames[0], ...extra };
}

/** Build n frames with a painter. */
export function mkFrames(n: number, w: number, h: number, paint: (p: PixelCanvas, k: number) => void, post?: (p: PixelCanvas) => void): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let k = 0; k < n; k++) {
    const p = new PixelCanvas(w, h);
    paint(p, k);
    post?.(p);
    out.push(p.toCanvas());
  }
  return out;
}

/** Common frame pickers. */
export const pick = {
  /** Loop on the motion clock (stops in stage 1). */
  loop: (n: number, ms: number) => (env: PropEnv) => Math.floor((env.mt + env.seed * 997) / ms) % n,
  /** Loop on real time (never stops). */
  loopT: (n: number, ms: number) => (env: PropEnv) => Math.floor((env.t + env.seed * 997) / ms) % n,
  /** Stage-dependent: [s0 frames..] loop, s1 frozen at `frozen`, s2 fixed at `ne`. */
  staged: (n: number, ms: number, frozen: number, ne: number) => (env: PropEnv) =>
    env.stage === 1 ? frozen : env.stage === 2 ? ne : Math.floor((env.mt + env.seed * 997) / ms) % n,
};

/** fx_float (stage 2): 1–2px bob, 2.4s period, random phase. */
export function floatOffset(env: PropEnv, amp = 2): number {
  if (env.stage !== 2) return 0;
  return -Math.round((Math.sin((env.t / 2400) * Math.PI * 2 + env.seed * 6.28) * 0.5 + 0.5) * amp) - (amp > 1 ? 0 : 0);
}

// ---- hooks the world module installs --------------------------------------------------

type Hook = (g: Gfx, x: number, y: number, env: PropEnv) => void;
const hooks = new Map<string, Hook>();
export function setPropHook(name: string, fn: Hook): void {
  hooks.set(name, fn);
}
export function propHook(name: string): Hook | undefined {
  return hooks.get(name);
}
