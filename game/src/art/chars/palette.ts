// Shared colors, ramps and the palette law for character art.
//
// Base colors come from docs/design/00_concept.md 3.6 and the master palette
// of 30_level_art 7.1. Ramps are hue-shifted: shadows lean toward the dusk
// violets, highlights toward the sunset yellow, so every sprite sits in the
// same late-afternoon light.
//
// Palette law (30_level_art 7.1 / 7.2), enforced in two places:
//  - every material has at most four tones (darkest, shade, base, light);
//    derived tones snap to the master palette when one is close, so ramps
//    share colors instead of inventing near-duplicates;
//  - quant.ts snaps every finished sprite to the master palette plus at most
//    eight colors of its own (MAX_CUSTOM).

import { mix, toRgb } from '../../engine/pixel';

export const C = {
  // sunset
  sun0: '#FFE7A3', sun1: '#F7C27A', sun2: '#F2894B', sun3: '#E8603C', sun4: '#D9728A', sun5: '#E0567A', sun6: '#B04A7A',
  // shadow & night
  sh0: '#7A5AA0', sh1: '#5B4A7A', sh2: '#4A3A6E', sh3: '#3A2B5C', ol: '#2A2440', sh5: '#1B1733', ink: '#0B0B14',
  // neutral
  n0: '#F4F1E8', n1: '#E8E4D8', n2: '#C8C2B4', n3: '#9AA0A8', n4: '#6B7186', n5: '#3A3F48',
  // green
  g0: '#9BCB6B', g1: '#5FA85A', g2: '#3FA66B', g3: '#2E6B4A',
  // vermilion (hanko)
  red: '#E23B2E', redD: '#B8241E', redL: '#FF6A4D',
  // gold & yellow
  y0: '#FFD23F', y1: '#F6D98A', y2: '#D9A441', y3: '#A8742A',
  // blue
  b0: '#5CE1FF', b1: '#4AA8E0', b2: '#2F4A8A',
  // skin
  sk0: '#FFD9B8', sk1: '#F2B894', sk2: '#E0A882', sk3: '#C98A6A',
  // paper
  paper: '#FBF3DC', paper2: '#E8D9B5',
  white: '#FFF6D8',
};

/** pal_master (30_level_art 7.1), 48 colors. */
export const MASTER: readonly string[] = [
  '#FFF6D8', '#FFE7A3', '#F7C27A', '#F2894B', '#E8603C', '#D9728A', '#E0567A', '#B04A7A',
  '#7A5AA0', '#5B4A7A', '#4A3A6E', '#3A2B5C', '#2A2440', '#1B1733', '#0B0B14',
  '#F4F1E8', '#E8E4D8', '#C8C2B4', '#9AA0A8', '#6B7186', '#3A3F48',
  '#C9E08A', '#9BCB6B', '#5FA85A', '#3FA66B', '#2E6B4A',
  '#FF6A4D', '#E84E3C', '#E23B2E', '#B8241E', '#8A2E3A',
  '#FFD23F', '#F6D98A', '#D9A441', '#A8742A', '#C8A06A', '#8A5A3A', '#5A3A2A',
  '#5CE1FF', '#7FD1E8', '#4AA8E0', '#2F4A8A',
  '#FFD9B8', '#F2B894', '#E0A882', '#C98A6A',
  '#FBF3DC', '#E8D9B5',
];

/**
 * Character colors named by the design on top of the master palette
 * (30_level_art 9.1–9.4, 10_narrative 6). A sprite may use at most
 * MAX_CUSTOM colors outside MASTER; these are preferred when close.
 */
export const DESIGN_EXTRA: readonly string[] = [
  '#2B1E1A', // hair (Minato, mother, Sae, Inui...), eyebrows
  '#6CC48A', // Minato's tee light
  '#C8643A', // Kanenari fur shade
  '#2A1E1A', // Kanenari dot eyes
  '#F08A7A', // Kanenari cheeks
  '#C0C6CC', // zipper
  '#B8A0D0', // madam's blouse
  '#6B4A3A', // mizumaki hair
  '#8E95A6', // pigeon grey
  '#4FA37A', // pigeon neck green
  '#8A5FB0', // pigeon neck violet
  '#E07A6A', // pigeon feet
  '#F2E24B', // pigeon eye
  '#3A2B24', // mike patches
  '#F4E6A8', // mall fluorescent
];

/** Max colors outside MASTER per character (30_level_art 7.1). */
export const MAX_CUSTOM = 8;

/** A 5-slot ramp: [dark(inner line), shade, base, light, spec]. spec = light unless it is a master color. */
export type Ramp = [string, string, string, string, string];

export interface RampOpts {
  shade?: string;
  light?: string;
  dark?: string;
  spec?: string;
}

/** Build a hue-shifted 4-tone ramp around `base` (derived tones snap to MASTER). */
export function ramp(base: string, o: RampOpts = {}): Ramp {
  const shade = o.shade ?? snapMaster(mix(base, C.sh2, 0.36), 7);
  const dark = o.dark ?? snapMaster(mix(shade, C.ol, 0.5), 7);
  const light = o.light ?? snapMaster(mix(base, C.sun0, 0.34), 7);
  const spec = o.spec ?? light;
  return [dark, shade, base, light, spec];
}

/** Lit left fill edge: the material's own light tone (no extra color). */
export function rimOf(_base: string, light: string): string {
  return light;
}

/**
 * Sunset rim drawn in the outline column (30_level_art 7.5, 9.1/9.2 'm').
 * Every rim pixel is written as RIM_MARK so quant.ts can find it and paint
 * the rim color of the current stage (#F2894B / #E0567A / none at night).
 */
export const RIM_MARK = '#F3884C';
/** Rim of materials that are sunset-colored themselves (Kanenari's fur, the cone): one step paler. */
export const RIM_MARK_HI = '#F6C17B';
export const RIM_DEFAULT = '#F2894B';

export function outerRimOf(_base: string): string {
  return RIM_MARK;
}

/** Top/left outer outline: the material's darkest tone (7.5 colored outline). */
export function outlineOf(dark: string): string {
  return dark;
}

// ---- color science (for snapping) -------------------------------------------

export type Lab = [number, number, number];

const labCache = new Map<number, Lab>();

function lin(v: number): number {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** CIE L*a*b* (D65) of a packed 0xRRGGBB. */
export function labOf(rgb: number): Lab {
  let l = labCache.get(rgb);
  if (l) return l;
  const r = lin((rgb >> 16) & 255);
  const g = lin((rgb >> 8) & 255);
  const b = lin(rgb & 255);
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  l = [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  labCache.set(rgb, l);
  return l;
}

/** Symmetric CIE94 color difference. */
export function dE(a: Lab, b: Lab): number {
  const dL = a[0] - b[0];
  const c1 = Math.hypot(a[1], a[2]);
  const c2 = Math.hypot(b[1], b[2]);
  const dC = c1 - c2;
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  const dH2 = Math.max(0, da * da + db * db - dC * dC);
  const c = Math.sqrt(c1 * c2);
  const sc = 1 + 0.045 * c;
  const sh = 1 + 0.015 * c;
  return Math.sqrt(dL * dL + (dC / sc) ** 2 + dH2 / (sh * sh));
}

export function packHex(h: string): number {
  const [r, g, b] = toRgb(h.slice(0, 7));
  return (r << 16) | (g << 8) | b;
}

export function unpackHex(v: number): string {
  return '#' + v.toString(16).padStart(6, '0').toUpperCase();
}

export const MASTER_PACKED: readonly number[] = MASTER.map(packHex);
export const MASTER_SET: ReadonlySet<number> = new Set(MASTER_PACKED);
export const EXTRA_PACKED: readonly number[] = DESIGN_EXTRA.map(packHex);
/**
 * Colors other colors may snap to: the master palette minus #0B0B14 (虚),
 * which is only for the pitch dark inside the zipper / a drop — a hair or
 * trouser shadow that happens to be near-black must not turn into it.
 */
export const SNAP_TARGETS: readonly number[] = MASTER_PACKED.filter((c) => c !== 0x0b0b14);

/** Snap distance for a color: dark tones are told apart less easily, so they merge sooner. */
export function snapTol(c: number, base: number): number {
  const L = labOf(c)[0];
  return L < 22 ? base * 2 : L < 32 ? base * 1.5 : base;
}

/** Nearest color of `list` (packed) to `c` (packed) and its distance. */
export function nearest(c: number, list: readonly number[]): [number, number] {
  const L = labOf(c);
  let best = list[0];
  let bd = Infinity;
  for (const k of list) {
    const d = dE(L, labOf(k));
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return [best, bd];
}

/** The nearest MASTER color when it is within `tol` (CIE94), else `c` itself. Alpha is kept. */
export function snapMaster(c: string, tol = 6): string {
  if (c.length > 7 && c.slice(7, 9).toLowerCase() !== 'ff') return c;
  const v = packHex(c);
  if (MASTER_SET.has(v)) return c;
  const [m, d] = nearest(v, SNAP_TARGETS);
  return d <= snapTol(v, tol) ? unpackHex(m) : c;
}

export function isMaster(c: string): boolean {
  return MASTER_SET.has(packHex(c));
}

// ---- design colours kept exactly (chapter 2) ---------------------------------
//
// Chapter 2 names character colours that sit close to a master tone on
// purpose (52 8.1: the F1 cattle's warm blacks are not the violet outline;
// 52 10.3: the village's work clothes). A sprite lists them in its `keep`
// (SpriteSpec / CharSprite): Fig does not snap them to the master palette
// and quant.ts keeps them as the sprite's own colours. Only exact hex values
// are protected, so no existing sprite changes.

const protectedSet = new Set<string>();

/** Keep these exact colours through Fig's palette law (see SpriteSpec.keep). */
export function protectColors(list: readonly string[]): void {
  for (const c of list) protectedSet.add(c.slice(0, 7).toUpperCase());
}

export function isProtected(c: string): boolean {
  return protectedSet.size > 0 && c.length >= 7 && protectedSet.has(c.slice(0, 7).toUpperCase());
}

/** 52 8.1: the five colours chapter 2 adds to the palette. */
export const CH2_COLORS = {
  cowBlack: '#2B2A30',
  cowLight: '#45434C',
  cowSheen: '#6E6A78',
  oldWood: '#8E867A',
  oldWoodD: '#5E574E',
} as const;
