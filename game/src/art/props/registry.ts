// Prop registry. Builders register by id; getProp() caches per (id, opts).
import type { PropArt, PropBuilder } from './types';

const builders = new Map<string, PropBuilder>();
const cache = new Map<string, PropArt>();

export function registerProp(id: string, b: PropBuilder): void {
  builders.set(id, b);
  for (const k of [...cache.keys()]) if (k.startsWith(id + '|')) cache.delete(k);
}

export function hasProp(id: string): boolean {
  return builders.has(id);
}

export function propIds(): string[] {
  return [...builders.keys()];
}

export function getProp(id: string, opts: Record<string, unknown> = {}): PropArt | null {
  const key = id + '|' + JSON.stringify(opts);
  let a = cache.get(key);
  if (!a) {
    const b = builders.get(id);
    if (!b) return null;
    a = b(opts);
    cache.set(key, a);
  }
  return a;
}

/** Simple static prop from one canvas. */
export function staticProp(
  img: HTMLCanvasElement,
  ox: number,
  oy: number,
  foot: number,
  extra: Partial<PropArt> = {},
): PropArt {
  return { ox, oy, w: img.width, h: img.height, foot, img: () => img, ...extra };
}

/** Frame-cycling prop (frames advance on the motion clock). */
export function animProp(
  frames: HTMLCanvasElement[],
  ms: number,
  ox: number,
  oy: number,
  foot: number,
  extra: Partial<PropArt> = {},
): PropArt {
  return {
    ox,
    oy,
    w: frames[0].width,
    h: frames[0].height,
    foot,
    img: (env) => frames[Math.floor((env.mt + env.seed * 997) / ms) % frames.length],
    ...extra,
  };
}
