// Character sprite contract (field sprites for the party, NPCs, animals and
// field enemies). The character art team owns the implementation; the
// world team only calls charSprite()/portrait().
//
// Frame conventions:
//  - Field sprites are w×h (usually 16×24). The anchor is the bottom-center
//    of the canvas (feet). Draw at (x - w/2, y - h).
//  - walk[dir] is a looping walk cycle; walk[dir][0] is the standing pose.
//  - idle[dir] (optional) is a slow idle loop (breathing / blinking).
//  - Left-facing frames are provided explicitly (no runtime flipping needed).
//  - extra: named one-off poses ('surprised', 'sit', 'sleep', 'hurt', ...).

import type { Dir } from '../../game/state';
import { PixelCanvas } from '../../engine/pixel';

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

export function charSprite(id: string): CharSprite {
  let s = cache.get(id);
  if (!s) {
    const b = builders.get(id);
    s = b ? b() : fallback(id);
    cache.set(id, s);
  }
  return s;
}

// Portraits (dialog / status screens). Size is up to the art team (e.g. 40×40).
type PortraitBuilder = (mood: string) => HTMLCanvasElement;
const portraits = new Map<string, PortraitBuilder>();
const portraitCache = new Map<string, HTMLCanvasElement>();

export function registerPortrait(id: string, b: PortraitBuilder): void {
  portraits.set(id, b);
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

// Neutral stand-in figure used only until a real sprite is registered.
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
