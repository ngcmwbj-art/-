// Easing curves + coroutine-friendly tweens.

import type { Co } from './co';
import { FRAME_MS } from './co';

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => 1 - (1 - t) * (1 - t),
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicIn: (t: number) => t * t * t,
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  quartOut: (t: number) => 1 - Math.pow(1 - t, 4),
  expoOut: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoIn: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  sineOut: (t: number) => Math.sin((t * Math.PI) / 2),
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  backIn: (t: number) => {
    const c1 = 1.70158;
    return (c1 + 1) * t * t * t - c1 * t * t;
  },
  elasticOut: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  bounceOut: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Frame-rate independent exponential approach. */
export function approach(cur: number, target: number, rate: number, dtMs: number): number {
  return target + (cur - target) * Math.exp(-rate * (dtMs / 1000));
}

/**
 * Coroutine tween: animates numeric props of `obj` to `to` over `ms`.
 *   yield* tween(sprite, { x: 100, alpha: 0 }, 300, ease.quadOut);
 */
export function* tween<T extends object>(obj: T, to: Partial<Record<keyof T, number>>, ms: number, e: Ease = ease.quadOut): Co {
  const o = obj as Record<string, number>;
  const from: Record<string, number> = {};
  for (const k of Object.keys(to)) from[k] = o[k];
  let t = 0;
  while (t < ms) {
    t += FRAME_MS;
    const p = e(Math.min(1, t / ms));
    for (const k of Object.keys(to)) o[k] = lerp(from[k], (to as Record<string, number>)[k], p);
    if (t < ms) yield null;
  }
}

/** Coroutine that calls fn(p) with eased progress 0..1 over ms. */
export function* animate(ms: number, fn: (p: number) => void, e: Ease = ease.linear): Co {
  let t = 0;
  fn(0);
  while (t < ms) {
    yield null;
    t += FRAME_MS;
    fn(e(Math.min(1, t / ms)));
  }
}
