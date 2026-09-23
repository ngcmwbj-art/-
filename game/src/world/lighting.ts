// Stage colour grading, sky colours and shadow parameters (30_level_art 7.3 /
// 7.4). The field keeps one interpolated `Grade`; setStage() tweens between
// the presets (0→1 0.6s, 1→2 1.5s, 2→night 3.0s).

import { toRgb } from '../engine/pixel';

export type RGB = [number, number, number];

export interface Grade {
  skyTop: RGB;
  skyBot: RGB;
  /** Extra thin horizon line colour (stage 2) – alpha in horizonA. */
  horizon: RGB;
  horizonA: number;
  mul: RGB;
  glare: RGB;
  glareA: number;
  topDark: RGB;
  topA: number;
  shadow: RGB;
  shadowA: number;
  shadowLen: number;
  /** 0 = sun direction (ESE), 1 = every shadow points at the mall. */
  toMall: number;
  /** 0..1 how "night" it is (lamps on, sun shadows off). */
  night: number;
  rim: RGB;
  /** Motion scale of stage-sensitive ambient animation (0 = frozen at stage 1). */
  motion: number;
}

const hx = (h: string): RGB => toRgb(h);

export const GRADES: Record<number, Grade> = {
  0: {
    skyTop: hx('#F7C27A'), skyBot: hx('#F2894B'), horizon: hx('#FFE7A3'), horizonA: 0,
    mul: hx('#FFF3E6'), glare: hx('#F2894B'), glareA: 0.18, topDark: hx('#3A2B5C'), topA: 0,
    shadow: hx('#5B4A7A'), shadowA: 0.35, shadowLen: 1.3, toMall: 0, night: 0, rim: hx('#F2894B'), motion: 1,
  },
  1: {
    skyTop: hx('#D9728A'), skyBot: hx('#F2894B'), horizon: hx('#FFE7A3'), horizonA: 0,
    mul: hx('#F9E4EC'), glare: hx('#D9728A'), glareA: 0.16, topDark: hx('#3A2B5C'), topA: 0.08,
    shadow: hx('#4A3A6E'), shadowA: 0.38, shadowLen: 1.4, toMall: 0, night: 0, rim: hx('#F2894B'), motion: 0,
  },
  2: {
    skyTop: hx('#7A5AA0'), skyBot: hx('#E0567A'), horizon: hx('#FFE7A3'), horizonA: 1,
    mul: hx('#E4D8F0'), glare: hx('#E0567A'), glareA: 0.14, topDark: hx('#3A2B5C'), topA: 0.18,
    shadow: hx('#3A2B5C'), shadowA: 0.42, shadowLen: 1.2, toMall: 1, night: 0, rim: hx('#E0567A'), motion: 0.6,
  },
  3: {
    skyTop: hx('#1B1733'), skyBot: hx('#3A2B5C'), horizon: hx('#FFF6D8'), horizonA: 0,
    mul: hx('#6E6A9E'), glare: hx('#F2894B'), glareA: 0, topDark: hx('#1B1733'), topA: 0.25,
    shadow: hx('#1B1733'), shadowA: 0.3, shadowLen: 0, toMall: 0, night: 1, rim: hx('#FFE7A3'), motion: 1,
  },
};

/** Indoor multiply colours per outdoor stage (pal_indoor). */
export const INDOOR_MUL: Record<number, RGB> = {
  0: hx('#FFF0DC'),
  1: hx('#F7E2E8'),
  2: hx('#E6DCEF'),
  3: hx('#8A86B0'),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpC = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function lerpGrade(a: Grade, b: Grade, t: number): Grade {
  return {
    skyTop: lerpC(a.skyTop, b.skyTop, t),
    skyBot: lerpC(a.skyBot, b.skyBot, t),
    horizon: lerpC(a.horizon, b.horizon, t),
    horizonA: lerp(a.horizonA, b.horizonA, t),
    mul: lerpC(a.mul, b.mul, t),
    glare: lerpC(a.glare, b.glare, t),
    glareA: lerp(a.glareA, b.glareA, t),
    topDark: lerpC(a.topDark, b.topDark, t),
    topA: lerp(a.topA, b.topA, t),
    shadow: lerpC(a.shadow, b.shadow, t),
    shadowA: lerp(a.shadowA, b.shadowA, t),
    shadowLen: lerp(a.shadowLen, b.shadowLen, t),
    toMall: lerp(a.toMall, b.toMall, t),
    night: lerp(a.night, b.night, t),
    rim: lerpC(a.rim, b.rim, t),
    motion: lerp(a.motion, b.motion, t),
  };
}

export function cloneGrade(g: Grade): Grade {
  return lerpGrade(g, g, 0);
}

export function css(c: RGB, a = 1): string {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

/** Shadow direction for an object at world tile position (tx,ty). */
export function shadowDir(g: Grade, tx: number, ty: number, mallX = 50, mallY = 4): [number, number] {
  const sun: [number, number] = [1.0, 0.25];
  if (g.toMall <= 0) return sun;
  let th = Math.atan2(-(mallY - ty), mallX - tx); // screen y down → north positive
  if (th < 0) th = th < -Math.PI / 2 ? Math.PI / 2 : 0;
  if (th > Math.PI / 2) th = Math.PI / 2;
  const mall: [number, number] = [Math.cos(th), -0.65 * Math.sin(th)];
  // rotate smoothly between the two directions
  const a0 = Math.atan2(sun[1], sun[0]);
  const a1 = Math.atan2(mall[1], mall[0]);
  const a = a0 + (a1 - a0) * g.toMall;
  const l0 = Math.hypot(sun[0], sun[1]);
  const l1 = Math.hypot(mall[0], mall[1]);
  const l = l0 + (l1 - l0) * g.toMall;
  return [Math.cos(a) * l, Math.sin(a) * l];
}
