// Fast integer hashes and noise for procedural ground art.
import { hash2, valueNoise } from '../../engine/rng';

export { hash2, valueNoise };

/** 32-bit integer hash of (x, y, seed). */
export function ihash(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((seed | 0) + 0x9e37, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

/** [0,1) hash. */
export function h01(x: number, y: number, seed = 0): number {
  return ihash(x, y, seed) / 4294967296;
}

/** Fractal value noise (2 octaves) in [0,1). */
export function fbm(x: number, y: number, seed = 0): number {
  return valueNoise(x, y, seed) * 0.65 + valueNoise(x * 2.1, y * 2.1, seed + 17) * 0.35;
}

/** Deterministic PRNG for art builders (so the same prop always looks the same). */
export function mulberry(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to a seed. */
export function strSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
