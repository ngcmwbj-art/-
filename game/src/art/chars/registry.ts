// Character sprite registry (the contract lives in index.ts, which re-exports
// this file). Content modules import from here to avoid import cycles.
//
// Frame conventions:
//  - Field sprites are w×h (usually 16×24). The anchor is the bottom-center
//    of the canvas (feet). Draw at (x - w/2, y - h).
//  - walk[dir] is a looping walk cycle; walk[dir][0] is the standing pose.
//  - idle[dir] (optional) is a slow idle loop (breathing / blinking / the
//    character's signature fidget), played at idleFrameMs per frame.
//  - run[dir] (optional) is the dash cycle (runFrameMs per frame).
//  - Left-facing frames are provided explicitly (no runtime flipping needed).
//  - extra: named one-off poses ('surprised', 'sit', 'sleep', 'hurt',
//    'look_up', ...). Every NPC and animal has 'look_up' (17:00).
//    extraDir[name][dir] holds direction-specific versions when they exist
//    (use poseFrame() to pick the best one).
//  - anims: named short animations (bow, peck, fry, beckon...). The first
//    frame of every anim is also available as extra[name].

import type { Dir } from '../../game/state';
import { PixelCanvas } from '../../engine/pixel';

export interface CharAnim {
  frames: HTMLCanvasElement[];
  /** ms per frame, or a per-frame list. */
  ms: number | number[];
  /** Loop (default true). One-shot anims hold their last frame. */
  loop?: boolean;
}

export interface CharSprite {
  id: string;
  w: number;
  h: number;
  walk: Record<Dir, HTMLCanvasElement[]>;
  idle?: Record<Dir, HTMLCanvasElement[]>;
  extra?: Record<string, HTMLCanvasElement>;
  /** ms per walk frame at normal walking speed. */
  walkFrameMs?: number;
  /** Drop shadow width in px (0 = none). */
  shadow?: number;
  /** ms per idle frame (default 250). */
  idleFrameMs?: number;
  /** Dash cycle. */
  run?: Record<Dir, HTMLCanvasElement[]>;
  runFrameMs?: number;
  /** Direction-specific extras (fallback: extra[name]). */
  extraDir?: Record<string, Partial<Record<Dir, HTMLCanvasElement>>>;
  /** Named animations. */
  anims?: Record<string, CharAnim>;
}

type Builder = () => CharSprite;
const builders = new Map<string, Builder>();
const cache = new Map<string, CharSprite>();

export function registerChar(id: string, b: Builder): void {
  builders.set(id, b);
  cache.delete(id);
}

export function charIds(): string[] {
  return [...builders.keys()];
}

export function hasChar(id: string): boolean {
  return builders.has(id);
}

export function charSprite(id: string): CharSprite {
  let s = cache.get(id);
  if (!s) {
    const b = builders.get(id);
    s = b ? b() : fallback(id);
    cache.set(id, s);
  }
  return s;
}

// ---- convenience lookups for the field / battle code ---------------------

/** Best frame for a named pose facing `dir` (extraDir → extra → standing). */
export function poseFrame(s: CharSprite, name: string, dir: Dir = 'down'): HTMLCanvasElement {
  return s.extraDir?.[name]?.[dir] ?? s.extra?.[name] ?? s.walk[dir][0];
}

/** Frame of a walk cycle at time t (ms). */
export function walkFrame(s: CharSprite, dir: Dir, t: number, running = false): HTMLCanvasElement {
  const set = running && s.run ? s.run[dir] : s.walk[dir];
  const ms = running && s.run ? s.runFrameMs ?? 90 : s.walkFrameMs ?? 140;
  return set[Math.floor(t / ms) % set.length];
}

/** Frame of the idle loop at time t (ms); standing frame when no idle. */
export function idleFrame(s: CharSprite, dir: Dir, t: number): HTMLCanvasElement {
  const set = s.idle?.[dir];
  if (!set || !set.length) return s.walk[dir][0];
  return set[Math.floor(t / (s.idleFrameMs ?? 250)) % set.length];
}

/** Frame of a named anim at time t (ms). Missing anim → extra/standing. */
export function animFrame(s: CharSprite, name: string, t: number, dir: Dir = 'down'): HTMLCanvasElement {
  const a = s.anims?.[name];
  if (!a) return poseFrame(s, name, dir);
  return a.frames[animIndex(a, t)];
}

/** Duration of one pass through an anim (ms). */
export function animLength(a: CharAnim): number {
  return typeof a.ms === 'number' ? a.ms * a.frames.length : a.ms.reduce((s, v) => s + v, 0);
}

export function animIndex(a: CharAnim, t: number): number {
  const n = a.frames.length;
  const total = animLength(a);
  let tt = a.loop === false ? Math.min(t, total - 1) : ((t % total) + total) % total;
  if (typeof a.ms === 'number') return Math.min(n - 1, Math.floor(tt / a.ms));
  for (let i = 0; i < n; i++) {
    if (tt < a.ms[i]) return i;
    tt -= a.ms[i];
  }
  return n - 1;
}

// ---- portraits -----------------------------------------------------------

// Portraits (dialog / status screens), 32×32. Moods: 'normal','hurt',
// 'tsukkomi','happy','surprised','ko' (party); NPC faces accept 'normal' and
// a few extras. Unknown moods fall back to 'normal'.
type PortraitBuilder = (mood: string) => HTMLCanvasElement;
const portraits = new Map<string, PortraitBuilder>();
const portraitCache = new Map<string, HTMLCanvasElement>();

export function registerPortrait(id: string, b: PortraitBuilder): void {
  portraits.set(id, b);
  for (const k of [...portraitCache.keys()]) if (k.startsWith(id + ':')) portraitCache.delete(k);
}

export function portraitIds(): string[] {
  return [...portraits.keys()];
}

export function portrait(id: string, mood = 'normal'): HTMLCanvasElement | null {
  const key = `${id}:${mood}`;
  let c = portraitCache.get(key);
  if (!c) {
    const b = portraits.get(id);
    if (!b) return null;
    c = b(mood);
    portraitCache.set(key, c);
  }
  return c;
}

// Neutral stand-in figure used only for ids nobody registered.
function fallback(id: string): CharSprite {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const shirt = ['#c9544f', '#4f7fc9', '#5aa36b', '#c9a24f', '#8b5ac9'][h % 5];
  const make = (dir: Dir, step: number) => {
    const p = new PixelCanvas(16, 24);
    p.ellipse(8, 8, 5, 5.5, '#f1c7a0');
    p.rect(3, 3, 10, 4, '#3a2a2a');
    if (dir === 'down') {
      p.set(6, 9, '#2a1f2a');
      p.set(9, 9, '#2a1f2a');
    }
    p.rect(4, 13, 8, 6, shirt);
    const l = step === 1 ? 1 : 0;
    const r = step === 3 ? 1 : 0;
    p.rect(5, 19, 2, 4 - l, '#2e3450');
    p.rect(9, 19, 2, 4 - r, '#2e3450');
    p.outline('#1a1424');
    return p.toCanvas();
  };
  const dirs: Dir[] = ['down', 'up', 'left', 'right'];
  const walk = {} as Record<Dir, HTMLCanvasElement[]>;
  for (const d of dirs) walk[d] = [0, 1, 0, 3].map((s) => make(d, s));
  return { id, w: 16, h: 24, walk, walkFrameMs: 140, shadow: 10 };
}
