// Shared colors and ramp generation for character art.
// Base colors come from docs/design/00_concept.md 3.6. Ramps are hue-shifted:
// shadows lean toward the dusk violets, highlights toward the sunset yellow,
// so every sprite sits in the same late-afternoon light.

import { mix } from '../../engine/pixel';

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

/** A 5-step ramp: [dark(inner line), shade, base, light, spec]. */
export type Ramp = [string, string, string, string, string];

export interface RampOpts {
  shade?: string;
  light?: string;
  dark?: string;
  spec?: string;
}

/** Build a hue-shifted ramp around `base`. */
export function ramp(base: string, o: RampOpts = {}): Ramp {
  const shade = o.shade ?? mix(base, C.sh2, 0.36);
  const dark = o.dark ?? mix(shade, C.ol, 0.5);
  const light = o.light ?? mix(base, C.sun0, 0.34);
  const spec = o.spec ?? mix(light, C.white, 0.55);
  return [dark, shade, base, light, spec];
}

/** Sunset rim color for a material (the 1px lit left edge). */
export function rimOf(base: string, light: string): string {
  return mix(mix(base, C.sun2, 0.55), light, 0.25);
}

/** Outer outline tinted toward the material (selective outline). */
export function outlineOf(dark: string): string {
  return mix(dark, C.ol, 0.62);
}
